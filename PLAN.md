# Public Event Purchase Flow

## Summary

- Current event data lives in `public.events` with: `id`, `title`, `description`, `date`, `time`, `location`, `capacity`, `available`, `image_url`, `is_hidden`, timestamps. There is no pricing field and no stored booking link.
- The only existing “upcoming” rule is in [src/app/dashboard/page.tsx](/c:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/dashboard/page.tsx:144): `date >= today`. `src/app/dashboard/events/page.tsx` currently does **not** filter past events.
- “Visible” is controlled by `events.is_hidden`; admin toggles it in [src/app/admin/events/page.tsx](/c:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/admin/events/page.tsx:286).
- `/blog` currently renders only published posts from `posts`; there is no event section and no public event detail route. `/blog/[slug]` is blog-post-only.
- `/dashboard/events` is already accessible to any authenticated user because middleware only protects `/dashboard`; the page itself fetches visible events and uses `hasMembershipAccess()` only to switch between enabled WhatsApp vs disabled CTA.
- The existing member booking link is not stored in DB; it is generated inline in [src/app/dashboard/events/page.tsx](/c:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/dashboard/events/page.tsx:127) as `https://wa.me/34665652251?text=Hola, me gustaría reservar una plaza para el evento: {title}`.
- Admin event CRUD is currently client-side direct Supabase writes in [src/app/admin/events/page.tsx](/c:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/admin/events/page.tsx:353); there is no dedicated API/server action for events.
- Redsys single-payment flow already exists and should be reused: `prepare*RedirectPayment()` in [src/app/actions/payment.ts](/c:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/actions/payment.ts:150), signed redirect form, `payment_transactions` ledger, and webhook verification/fulfillment in [src/app/api/payments/redsys/notification/route.ts](/c:/Users/sanzp/Desktop/PEÑA%20LS/penya-madridista/src/app/api/payments/redsys/notification/route.ts:191).
- Live Supabase check confirms `public.event_external_assists` does not exist yet, and `events` has no price column today. Anonymous reads of visible events already work through the anon key.

## Key Decisions

- Event details should use a dedicated route, not a modal.
  Reason: shareable URL, public access, cleaner Redsys return URLs, and no collision with `/blog/[slug]`. Route: `/blog/events/[id]`.
- Event payments should be first-class in the ledger with an explicit `payment_transactions.event_id`, not metadata-only.
  Reason: stronger server-side association, simpler verification, easier future reporting, and it matches the existing dedicated `subscription_id` / `order_id` pattern better than a metadata-only link.
- `event_external_assists` should only be written through a server action with admin/service-role access.
  Reason: attendee creation is gated by payment status and must not depend on client-trusted state or public insert policies.

## Schema

```sql
alter table public.events
  add column if not exists one_time_price_cents integer null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_one_time_price_cents_nonnegative'
  ) then
    alter table public.events
      add constraint events_one_time_price_cents_nonnegative
      check (one_time_price_cents is null or one_time_price_cents >= 0);
  end if;
end $$;

comment on column public.events.one_time_price_cents is
  'Optional one-time public ticket price in euro cents. Null means the event cannot be purchased by non-members.';

alter table public.payment_transactions
  add column if not exists event_id uuid null references public.events(id);

create index if not exists idx_payment_transactions_event_id
  on public.payment_transactions (event_id);

create table if not exists public.event_external_assists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  payment_transaction_id uuid not null references public.payment_transactions(id),
  redsys_order text not null,
  user_id uuid null references public.users(id),
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_event_external_assists_payment_transaction_id
  on public.event_external_assists (payment_transaction_id);

create unique index if not exists idx_event_external_assists_redsys_order
  on public.event_external_assists (redsys_order);

create index if not exists idx_event_external_assists_event_id
  on public.event_external_assists (event_id);

create index if not exists idx_event_external_assists_user_id
  on public.event_external_assists (user_id);

alter table public.event_external_assists enable row level security;

comment on table public.event_external_assists is
  'External attendee records captured after successful one-time event payments.';
```

## Implementation Changes

- Shared event/payment utilities
  - Add a small shared event helper module for:
    - `getUpcomingVisibleEvents()` using the existing rule `date >= today` plus `is_hidden = false`
    - `getEventWhatsappBookingLink(title)` using the exact current WhatsApp destination/message
    - optional `getViewerEventAccess(user)` to classify `member` vs `authenticated_non_member` vs `anonymous`
  - Reuse `formatShopPrice()` for event ticket display.
  - Extend Redsys types to support `PaymentContext = "shop" | "membership" | "event"` and add `OrderPrefix = "E"` for event payments.

- Admin events
  - Extend the event type and form in `src/app/admin/events/page.tsx` with `one_time_price_cents`.
  - Render the admin input as a decimal euro field, but persist cents.
  - Validation:
    - empty => `null`
    - `0`, positive integers, and `N.NN` / `N,NN` accepted
    - negative or more than 2 decimals rejected client-side before submit
  - Existing events remain valid with `null` price.

- Public blog and event detail
  - Update `/blog` to add a new “Próximos eventos” section above the blog post grid.
  - Only show upcoming + visible events there.
  - Each event card links to `/blog/events/[id]`.
  - Create `/blog/events/[id]` as a public server-rendered detail page.
  - On the detail page:
    - anonymous visitor: can read event and, if `one_time_price_cents` is set, start one-time Redsys purchase
    - logged-in member: sees the direct WhatsApp booking CTA only
    - logged-in non-member: sees the Redsys purchase CTA
    - if no price is configured and viewer is not a member, show details only, no purchase CTA

- Event purchase flow
  - Add `prepareEventRedirectPayment(eventId)` in `src/app/actions/payment.ts`.
  - Server-side checks before creating a transaction:
    - event exists
    - event is upcoming
    - event is not hidden
    - `one_time_price_cents` is a positive integer
  - Insert `payment_transactions` row with:
    - `context = "event"`
    - `event_id = event.id`
    - `member_id = authenticated user id or null`
    - `amount_cents = event.one_time_price_cents`
    - metadata snapshot with at least `eventTitle` and `priceCents`
  - Redirect URLs:
    - `/blog/events/[id]/redsys/ok?order=...`
    - `/blog/events/[id]/redsys/ko?order=...`

- Redsys webhook and success pages
  - Update the webhook to accept `context = "event"` and mark the transaction authorized/denied using the existing verification path.
  - Event context does not perform downstream fulfillment at webhook time beyond transaction finalization; attendee capture stays as a separate post-payment step.
  - Create event OK/KO pages under `/blog/events/[id]/redsys/ok` and `/blog/events/[id]/redsys/ko`.
  - OK page behavior:
    - load transaction by `order`
    - require `context = "event"` and `event_id` match the route param
    - if `authorized`: show attendee form or unlocked CTA depending on whether an assist row already exists
    - if `pending`: show verification-in-progress state and auto-refresh until webhook settles
    - otherwise: show failure/retry messaging
  - KO page behavior mirrors existing shop/membership pages, but if the transaction is already authorized it should route the user toward the OK page so the attendee step can still complete.

- Attendee form and CTA unlock
  - Add a server action like `saveEventExternalAssist({ order, eventId, name, email, phone })`.
  - Server-side validation with zod:
    - `name` non-empty
    - `email` valid
    - `phone` non-empty; preserve formatting rather than over-normalizing
  - Server-side authorization rules:
    - transaction exists
    - `context = "event"`
    - transaction is `authorized`
    - `event_id` matches
  - Insert or upsert by `payment_transaction_id` so the same paid order cannot create duplicate assists and retries stay idempotent.
  - Persist `user_id` from `payment_transactions.member_id` when present.
  - Only render the WhatsApp CTA after a successful assist write or when an assist already exists for that order.
  - Use the exact same WhatsApp link helper as members.

- Dashboard events
  - Update `/dashboard/events` to use the shared helper and upcoming-visible query.
  - Keep the page accessible to any authenticated user.
  - Members keep the direct WhatsApp button.
  - Authenticated non-members get a purchase CTA that links into the new public event detail/payment flow.
  - Update copy so the page no longer reads as member-exclusive.

- Types
  - Update `src/types/supabase.ts` manually for:
    - `events.one_time_price_cents`
    - `payment_transactions.event_id`
    - full `event_external_assists` table shape
  - Update any local `Event` interfaces that mirror the DB row.

## Test Plan

- Admin
  - Create an event with price empty, save, edit again, and confirm `one_time_price_cents` stays `null`.
  - Create/edit an event with `12`, `12.5`, `12,50`; confirm cents persist as `1200`, `1250`, `1250`.
  - Reject invalid price inputs like `-1`, `12.999`, `abc`.

- Public/blog
  - `/blog` shows only future, non-hidden events.
  - Hidden event does not appear on `/blog` or `/dashboard/events`.
  - Past event does not appear in the new event showcase.
  - `/blog/events/[id]` is publicly reachable without login for a visible upcoming event.

- Role behavior
  - Anonymous user sees detail + price + buy CTA, never direct WhatsApp CTA.
  - Authenticated non-member sees detail + buy CTA on the event detail page and purchase entry from `/dashboard/events`.
  - Authenticated member sees direct WhatsApp CTA on both `/blog/events/[id]` and `/dashboard/events`, and is not forced through Redsys.

- Payment and attendee capture
  - Preparing an event payment creates a `payment_transactions` row with `context = "event"` and matching `event_id`.
  - Webhook authorization flips the transaction to `authorized`.
  - OK page does not unlock CTA while transaction is `pending`, `denied`, or missing.
  - After authorized payment, submitting the attendee form creates exactly one `event_external_assists` row for that order.
  - Resubmitting the same form updates/reuses the same row rather than duplicating it.
  - After the assist row exists, the WhatsApp CTA becomes available.

- Regression
  - Existing membership flow still redirects through Redsys unchanged.
  - Existing shop flow still uses the same webhook logic unchanged.
  - `npm run lint` passes after the changes.

## Assumptions

- `one_time_price_cents = null` means the event is viewable but not purchasable by non-members.
- One successful event payment equals one attendee record and one WhatsApp unlock flow.
- `capacity` and `available` remain informational only; this plan does not add stock-like seat locking or automatic decrementing because the current member booking path is still off-platform via WhatsApp.
- The WhatsApp destination stays `34665652251` with the current message format; it is moved to a shared helper, not changed.
- Purchased-event access is scoped to the paid order success path; this plan does not add a broader “my event tickets” history view.
- Events with linked payments should effectively stop being freely deletable because the new foreign keys preserve financial/audit integrity.
