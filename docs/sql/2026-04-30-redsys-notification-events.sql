-- Durable Redsys webhook and return-path audit trail.
-- Server-side service-role code writes these rows; end users do not need direct access.

create table if not exists public.redsys_notification_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  reason text not null,
  redsys_order text,
  transaction_id uuid,
  member_id uuid references public.users(id) on delete set null,
  context text,
  status_before text,
  status_after text,
  ds_response text,
  ds_authorization_code text,
  amount text,
  content_type text,
  signature_version text,
  transaction_type text,
  expected_amount integer,
  received_amount text,
  expected_merchant_code text,
  received_merchant_code text,
  expected_terminal text,
  received_terminal text,
  has_merchant_parameters boolean,
  has_signature boolean,
  error_message text,
  raw jsonb,
  created_at timestamptz not null default now()
);

comment on table public.redsys_notification_events is
  'Durable audit trail for Redsys webhook and return-page payment recovery events.';

create index if not exists idx_redsys_notification_events_order
on public.redsys_notification_events (redsys_order, created_at desc);

create index if not exists idx_redsys_notification_events_reason
on public.redsys_notification_events (reason, created_at desc);

create index if not exists idx_redsys_notification_events_member
on public.redsys_notification_events (member_id, created_at desc);

alter table public.redsys_notification_events enable row level security;
