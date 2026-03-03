# Email Communications & GDPR Compliance Rollout (Supabase Auth + App Emails)

## Summary
Implement a unified email system across auth, member invites, event notifications, and marketing campaigns, with GDPR-compliant legal links and unsubscribe/preference management.  
This rollout includes:
1. Supabase Auth template setup and URL configuration guidance.
2. Refactor of app-sent emails to a shared template system.
3. New preference center + unsubscribe flow.
4. Manual admin-triggered event email campaigns.
5. Admin marketing campaign sending with delivery tracking.

## Implementation Plan

### 1. Database and schema migration
Create a new SQL migration in `supabase/migrations` that adds the minimum schema needed for campaign sending, consent granularity, and auditability.

Changes:
- Add `public.users.event_notifications boolean not null default true`.
- Add `public.newsletter_subscribers.unsubscribed_at timestamptz null`.
- Create `public.email_campaigns` with fields:
  - `id uuid pk default gen_random_uuid()`
  - `kind text check in ('event','marketing')`
  - `status text check in ('draft','sending','sent','failed')`
  - `subject text not null`
  - `preview_text text null`
  - `html_body text not null`
  - `text_body text null`
  - `event_id uuid null references public.events(id) on delete set null`
  - `segment text not null`
  - `recipient_count int not null default 0`
  - `sent_count int not null default 0`
  - `failed_count int not null default 0`
  - `created_by uuid not null references public.users(id)`
  - `created_at/updated_at/sent_at timestamptz`
- Create `public.email_deliveries` with fields:
  - `id uuid pk default gen_random_uuid()`
  - `campaign_id uuid not null references public.email_campaigns(id) on delete cascade`
  - `recipient_email text not null`
  - `recipient_user_id uuid null references public.users(id) on delete set null`
  - `recipient_source text check in ('users','newsletter_subscribers')`
  - `status text check in ('pending','sent','failed','skipped_unsubscribed')`
  - `provider_message_id text null`
  - `error_message text null`
  - `sent_at/created_at timestamptz`
  - Unique `(campaign_id, recipient_email)`.
- Create `public.communication_preference_audit` with fields:
  - `id uuid pk default gen_random_uuid()`
  - `email text not null`
  - `user_id uuid null references public.users(id) on delete set null`
  - `channel text check in ('marketing','events')`
  - `old_value boolean`
  - `new_value boolean not null`
  - `source text check in ('dashboard','preference_center','unsubscribe_link','admin')`
  - `created_at timestamptz default now()`.

Security:
- Enable RLS on new tables.
- Add admin-only policies for campaign/delivery tables.
- Add admin-read policy for audit table.
- Add insert policies for server-role paths as needed.

Post-migration:
- Regenerate `src/types/supabase.ts`.

### 2. Shared email templating system
Refactor email rendering into reusable modules under `src/lib/email/`:

Files to add:
- `src/lib/email/templates/layout.ts`
- `src/lib/email/templates/member-invite.ts`
- `src/lib/email/templates/event-notification.ts`
- `src/lib/email/templates/marketing.ts`
- `src/lib/email/preferences-token.ts`

Behavior:
- Shared branded layout and footer for all app emails.
- Extract existing template at `src\app\actions\admin-members.ts` function: `generateMemberInvitationTemplate(token: string)`
- Footer always includes:
  - `/privacy-policy`
  - `/aviso-legal`
  - `/terms-and-conditions`
  - Contact email `info@lorenzosanz.com`
- Marketing/event emails include:
  - Manage preferences link
  - One-click unsubscribe link
- Invite/transactional app emails include legal links and preference-center link, but no forced unsubscribe CTA.

`sendEmail` enhancements:
- Extend helper to accept optional headers so marketing/event can set `List-Unsubscribe`.
- Keep Hostinger SMTP transport unchanged.

### 3. Preference center and unsubscribe endpoints
Add public email-preference flows driven by signed tokens (no login required).

Files to add:
- `src/app/email-preferences/page.tsx`
- `src/app/unsubscribe/route.ts` (GET one-click)
- `src/app/api/email-preferences/route.ts` (POST update)

Token model:
- Stateless HMAC token signed with new env var `EMAIL_PREFERENCES_SECRET`.
- Payload includes `email`, optional `user_id`, `exp`.
- Expiration default: 30 days.

Update logic:
- If `users` row exists for email:
  - Update `marketing_emails` and/or `event_notifications`.
- If `newsletter_subscribers` row exists for email:
  - Set `status='unsubscribed'` and `unsubscribed_at=now()` on marketing unsubscribe.
- Write every change to `communication_preference_audit`.

UI:
- `/email-preferences` shows toggles:
  - Marketing emails
  - Event notifications
- Transactional/account-critical emails remain enabled regardless of these toggles.

### 4. Member invite email refactor
Update `src/app/actions/admin-members.ts`:
- Replace inline HTML with shared template function.
- Keep existing invite token behavior.
- Add legal footer and preferences link.
- Keep subject/content Spanish.

### 5. Event notification campaign flow (manual admin send)
Add manual send flow from admin events UI.

Backend:
- Add server action module `src/app/actions/admin-email-campaigns.ts` with:
  - `createEventCampaign(eventId, subjectOverride?, previewText?)`
  - `sendCampaign(campaignId)`
  - `sendTestCampaign(campaignId, testEmail)`
- Recipient query for event campaigns:
  - Active members only.
  - `users.is_member = true`
  - Subscription status active (and accept `trialing` if present in data)
  - `users.event_notifications = true`
  - dedupe by email.

Frontend:
- Update `src/app/admin/events/page.tsx`:
  - Add action button “Enviar notificación por email”.
  - Add confirm modal + optional preview text.
  - Show send result summary (sent/failed/skipped).
  - Prevent accidental duplicate send by checking existing sent campaign for same event unless explicitly confirmed.

### 6. Marketing campaigns (admin UI + backend)
Create admin email campaigns page.

Files:
- `src/app/admin/emails/page.tsx`
- Optional route/action helpers in `src/app/actions/admin-email-campaigns.ts`

Features:
- Create campaign (subject, preview text, HTML body, text body).
- Segment selection:
  - `all_opted_in` (default): users with `marketing_emails=true` + newsletter subscribers `status='active'`.
  - `members_opted_in`: users with `is_member=true` and `marketing_emails=true`.
  - `newsletter_only`: newsletter subscribers `status='active'`.
- Test send to a single address before full send.
- Full send with delivery logging to `email_deliveries`.
- Campaign history list with status and counts.

### 7. Auth flow alignment + Supabase template readiness
Unify redirect paths and callback handling so Supabase template placeholders work reliably.

Code updates:
- Fix `src/context/AuthContext.tsx` reset redirect from `/auth/reset-password` to `/reset-password`.
- Normalize base URL usage to avoid double-slash issues.
- Update `src/app/auth/callback/route.ts` to support both:
  - `code` flow via `exchangeCodeForSession`
  - `token_hash + type` flow via `verifyOtp`
- Preserve `next` redirect support after verification.

### 8. Supabase dashboard setup documentation
Add `docs/supabase-auth-email-setup.md` with step-by-step exact config.

Document:
- Site URL and Redirect URLs for prod + localhost.
- Template snippets for:
  - Confirm signup
  - Reset password
  - Invite user (member invite)
  - Password changed notification
- Placeholder meanings:
  - `{{ .ConfirmationURL }}`
  - `{{ .Token }}`
  - `{{ .TokenHash }}`
  - `{{ .SiteURL }}`
  - `{{ .Email }}`
  - `{{ .Data }}`
  - `{{ .RedirectTo }}`
- Recommended template URL pattern using token hash:
  - `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}`

### 9. Auth hooks guidance (documentation-only in this rollout)
Add `docs/supabase-auth-hooks.md` with practical guidance:

- Not required for this rollout because dashboard templates + app SMTP cover needs.
- When to use hooks:
  - `send_email` hook for fully custom auth mail sending pipeline.
  - `before_user_created` for signup constraints/blocklists.
  - `custom_access_token` for role/claim enrichment.
- Keep existing webhook endpoint `/api/webhooks/supabase` as current post-signup sync mechanism.

## Important Public API / Interface / Type Changes

- `public.users`:
  - New `event_notifications: boolean`.
- `public.newsletter_subscribers`:
  - New `unsubscribed_at: timestamptz | null`.
- New tables:
  - `email_campaigns`
  - `email_deliveries`
  - `communication_preference_audit`
- New app endpoints/routes:
  - `GET /email-preferences`
  - `GET /unsubscribe`
  - `POST /api/email-preferences`
- New env var:
  - `EMAIL_PREFERENCES_SECRET`
- Type updates:
  - Regenerated `src/types/supabase.ts`
  - Any affected local interfaces in settings/events/admin email modules.

## Test Cases and Scenarios

1. Auth confirm email template link verifies account and lands on intended post-auth page.
2. Forgot-password email link opens `/reset-password`, token is accepted, password updates successfully.
3. Password-changed notification sends from Supabase and contains legal footer links.
4. Member invite email sends with legal links and valid invite completion link.
5. Marketing unsubscribe one-click link disables marketing for both `users` and `newsletter_subscribers` records when applicable.
6. Preference center token tampering is rejected.
7. Preference center token expiry is enforced.
8. Event campaign send from admin targets only active members with `event_notifications=true`.
9. Marketing campaign `all_opted_in` deduplicates duplicate emails across users/newsletter lists.
10. Delivery logging writes sent/failed statuses and campaign counters match totals.
11. Users who unsubscribed do not receive subsequent event/marketing campaigns.
12. Transactional emails continue regardless of marketing/event opt-out.

## Assumptions and Defaults Chosen

- Scope: full stack now (auth templates + app templates + unsubscribe + event + marketing).
- Unsubscribe model: preference center plus one-click unsubscribe for marketing/event emails.
- Event notification trigger: manual admin send only.
- Event audience default: active members only.
- Marketing model: admin campaigns implemented now.
- Language: Spanish primary copy for templates and UI.
- SMTP provider remains Hostinger (already configured).
- Supabase auth emails remain configured in dashboard; hooks are documented but not enabled by default.

## External References
- Supabase Email Templates: https://supabase.com/docs/guides/auth/auth-email-templates
- Supabase Redirect URLs: https://supabase.com/docs/guides/auth/redirect-urls
- Supabase Auth Hooks: https://supabase.com/docs/guides/auth/auth-hooks
- Supabase Send Email Hook: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook
