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
