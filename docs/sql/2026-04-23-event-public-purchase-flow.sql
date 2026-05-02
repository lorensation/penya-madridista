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

do $$
begin
  if to_regclass('public.event_assists') is null
     and to_regclass('public.event_external_assists') is not null then
    alter table public.event_external_assists rename to event_assists;
  end if;
end $$;

create table if not exists public.event_assists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  user_id uuid null references public.users(id),
  payment_transaction_id uuid null references public.payment_transactions(id),
  email text not null,
  name text not null,
  apellido1 text null,
  apellido2 text null,
  phone text null,
  amount_cents integer null,
  currency text not null default '978',
  redsys_order text null,
  payment_status text not null default 'pending',
  payment_authorized_at timestamptz null,
  ds_authorization_code text null,
  last_four text null,
  data_confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.event_assists
  alter column phone drop not null;

alter table public.event_assists
  add column if not exists apellido1 text null,
  add column if not exists apellido2 text null,
  add column if not exists amount_cents integer null,
  add column if not exists currency text not null default '978',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_authorized_at timestamptz null,
  add column if not exists ds_authorization_code text null,
  add column if not exists last_four text null,
  add column if not exists data_confirmed_at timestamptz null;

drop index if exists public.idx_event_assists_payment_transaction_id;
create unique index idx_event_assists_payment_transaction_id
  on public.event_assists (payment_transaction_id);

drop index if exists public.idx_event_assists_redsys_order;
create unique index idx_event_assists_redsys_order
  on public.event_assists (redsys_order);

create unique index if not exists idx_event_assists_event_user
  on public.event_assists (event_id, user_id)
  where user_id is not null;

create index if not exists idx_event_assists_event_id
  on public.event_assists (event_id);

create index if not exists idx_event_assists_user_id
  on public.event_assists (user_id);

alter table public.event_assists enable row level security;

comment on table public.event_assists is
  'Attendance records for event registrations, including paid one-time tickets.';

comment on column public.event_assists.data_confirmed_at is
  'Set when the attendee has confirmed or completed their displayed registration data.';

-- Remove the superseded table name if both tables exist in a partially applied environment.
do $$
begin
  if to_regclass('public.event_assists') is not null
     and to_regclass('public.event_external_assists') is not null then
    execute $sql$
      insert into public.event_assists (
        event_id,
        user_id,
        payment_transaction_id,
        email,
        name,
        phone,
        redsys_order,
        created_at,
        updated_at
      )
      select
        event_id,
        user_id,
        payment_transaction_id,
        email,
        name,
        phone,
        redsys_order,
        created_at,
        updated_at
      from public.event_external_assists
      on conflict (payment_transaction_id) do nothing
    $sql$;

    drop table public.event_external_assists;
  end if;
end $$;
