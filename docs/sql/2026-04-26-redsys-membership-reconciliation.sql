-- Production hotfix runbook: Redsys membership reconciliation
-- Source: OperacionesExportadas_20260426T153107.csv
-- Purpose:
--   1. Preview trusted Redsys-authorized membership orders.
--   2. Authorize only the seven non-refunded blocking orders that are still not authorized.
--   3. Create/link the matching subscription state.
--   4. Emit an after/audit result for rollback.
--
-- Important:
--   - 2604MLbhyfNg is intentionally excluded because the same export also shows
--     an authorized refund for that order and the user already has valid membership state.
--   - This script is idempotent: a successful re-run should change zero rows.
--   - Helper tables are created as regular short-lived tables because some SQL
--     consoles do not keep temp tables alive across a whole pasted run.

drop table if exists public._redsys_reconcile_changed;
drop table if exists public._redsys_reconcile_before;
drop table if exists public._redsys_reconcile_source;

begin;

create table public._redsys_reconcile_source (
  redsys_order text primary key,
  email text not null,
  authorized_at timestamptz not null,
  amount_cents integer not null,
  authorization_code text not null,
  last_four text not null,
  include_in_reconcile boolean not null,
  note text not null
);

insert into public._redsys_reconcile_source values
  ('2604MLbhyfNg', 'jose@wagman.de', '2026-04-23 14:18:59+02', 6000, '741936', '2715', false, 'exclude: same CSV shows authorized refund and user has other valid membership payment'),
  ('2604MhtJMfk2', 'jigomezcalleja@gmail.com', '2026-04-23 15:48:30+02', 6000, '219779', '5340', true, 'blocking pending membership'),
  ('2604MuISOIcx', 'luishm72@gmail.com', '2026-04-23 19:39:44+02', 6000, '527780', '9138', true, 'blocking pending membership'),
  ('2604Mu4HdrzJ', 'tetegoval14@gmail.com', '2026-04-23 22:02:43+02', 6000, '743769', '8109', true, 'blocking pending membership'),
  ('2604MHdIghq4', 'francisco@trajesguzman.com', '2026-04-24 15:14:59+02', 6000, 'NPGSTJ', '6219', true, 'blocking pending membership'),
  ('2604MHnelsUC', 'rwhyteguerra@gmail.com', '2026-04-26 11:12:57+02', 6000, '988649', '1765', true, 'blocking pending membership'),
  ('2604M1c2xqkq', 'rvillauriz@gmail.com', '2026-04-26 12:25:09+02', 6000, '197457', '4802', true, 'blocking pending membership'),
  ('2604M1bn36P3', 'enprados@gmail.com', '2026-04-26 12:42:45+02', 6000, '942141', '1954', true, 'blocking pending membership');

-- Preview all source orders before changing anything.
select
  src.include_in_reconcile,
  src.note,
  src.redsys_order,
  src.email as csv_email,
  u.email as db_email,
  pt.id as transaction_id,
  pt.context,
  pt.status,
  pt.amount_cents,
  pt.ds_response,
  pt.ds_authorization_code,
  pt.last_four,
  pt.authorized_at,
  pt.member_id,
  u.profile_completed_at,
  s.id as existing_subscription_id,
  s.status as existing_subscription_status,
  s.redsys_last_order
from public._redsys_reconcile_source src
left join public.payment_transactions pt on pt.redsys_order = src.redsys_order
left join public.users u on u.id = pt.member_id
left join public.subscriptions s on s.member_id = pt.member_id
order by src.include_in_reconcile desc, src.redsys_order;

create table public._redsys_reconcile_before as
select
  pt.*,
  src.authorized_at as csv_authorized_at,
  src.authorization_code as csv_authorization_code,
  src.last_four as csv_last_four
from public.payment_transactions pt
join public._redsys_reconcile_source src on src.redsys_order = pt.redsys_order
where src.include_in_reconcile = true
  and pt.context = 'membership'
  and pt.status <> 'authorized'
  and pt.amount_cents = src.amount_cents
  and coalesce(pt.metadata->>'type', '') <> 'card_update'
  and not exists (
    select 1
    from public.subscriptions s
    where s.member_id = pt.member_id
      and s.status in ('active', 'trialing', 'canceled')
      and s.redsys_last_order is distinct from pt.redsys_order
  );

do $$
declare
  eligible_count integer;
begin
  select count(*) into eligible_count from public._redsys_reconcile_before;

  if eligible_count > 7 then
    raise exception 'Expected at most 7 rows to reconcile; found %', eligible_count;
  end if;

  if exists (
    select 1
    from public._redsys_reconcile_before
    where member_id is null
       or metadata->>'planType' is null
  ) then
    raise exception 'One or more reconciliation rows are missing member_id or plan metadata';
  end if;
end $$;

create table public._redsys_reconcile_changed as
with updated as (
  update public.payment_transactions pt
  set
    status = 'authorized',
    ds_response = coalesce(pt.ds_response, '0000'),
    ds_authorization_code = coalesce(pt.ds_authorization_code, b.csv_authorization_code),
    last_four = coalesce(pt.last_four, b.csv_last_four),
    authorized_at = coalesce(pt.authorized_at, b.csv_authorized_at),
    onboarding_status = case
      when u.profile_completed_at is null then 'pending_profile'
      else 'completed'
    end,
    grace_expires_at = case
      when u.profile_completed_at is null then coalesce(pt.grace_expires_at, b.csv_authorized_at + interval '7 days')
      else null
    end,
    onboarding_completed_at = case
      when u.profile_completed_at is null then null
      else coalesce(pt.onboarding_completed_at, u.profile_completed_at)
    end,
    refund_review_status = case
      when u.profile_completed_at is null then
        case when pt.refund_review_status = 'resolved_completed' then 'not_applicable' else pt.refund_review_status end
      else
        case when pt.refund_review_status = 'pending_review' then 'resolved_completed' else 'not_applicable' end
    end,
    updated_at = now()
  from public._redsys_reconcile_before b
  join public.users u on u.id = b.member_id
  where pt.id = b.id
    and pt.status = b.status
  returning pt.*
)
select
  u.*,
  b.status as status_before,
  b.ds_response as ds_response_before,
  b.ds_authorization_code as auth_code_before,
  b.last_four as last_four_before,
  b.authorized_at as authorized_at_before
from updated u
join public._redsys_reconcile_before b on b.id = u.id;

with sub_source as (
  select
    c.member_id,
    c.redsys_order,
    c.authorized_at,
    c.last_four,
    c.redsys_token,
    c.redsys_token_expiry,
    c.cof_txn_id,
    c.metadata->>'planType' as plan_type,
    case
      when c.metadata->>'planType' in ('under25', 'over25') then 'annual'
      when c.metadata->>'planType' = 'family' and c.metadata->>'interval' in ('monthly', 'annual') then c.metadata->>'interval'
      else c.metadata->>'interval'
    end as payment_type,
    case when u.profile_completed_at is null then 'pending_profile' else 'active' end as subscription_status
  from public._redsys_reconcile_changed c
  join public.users u on u.id = c.member_id
)
insert into public.subscriptions (
  member_id,
  plan_type,
  payment_type,
  status,
  start_date,
  end_date,
  last_four,
  redsys_token,
  redsys_token_expiry,
  redsys_cof_txn_id,
  redsys_last_order,
  cancel_at_period_end,
  canceled_at,
  updated_at
)
select
  member_id,
  plan_type,
  payment_type,
  subscription_status,
  authorized_at,
  case
    when payment_type = 'monthly' then authorized_at + interval '1 month'
    when payment_type = 'annual' then authorized_at + interval '1 year'
    when payment_type = 'decade' then authorized_at + interval '10 years'
    else null
  end,
  last_four,
  redsys_token,
  redsys_token_expiry,
  cof_txn_id,
  redsys_order,
  false,
  null,
  now()
from sub_source
where plan_type is not null
  and payment_type is not null
on conflict (member_id) do update
set
  plan_type = excluded.plan_type,
  payment_type = excluded.payment_type,
  status = excluded.status,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  last_four = coalesce(public.subscriptions.last_four, excluded.last_four),
  redsys_token = coalesce(excluded.redsys_token, public.subscriptions.redsys_token),
  redsys_token_expiry = coalesce(excluded.redsys_token_expiry, public.subscriptions.redsys_token_expiry),
  redsys_cof_txn_id = coalesce(excluded.redsys_cof_txn_id, public.subscriptions.redsys_cof_txn_id),
  redsys_last_order = excluded.redsys_last_order,
  cancel_at_period_end = false,
  canceled_at = null,
  updated_at = now()
where public.subscriptions.status in ('pending_profile', 'inactive', 'incomplete', 'unpaid')
   or public.subscriptions.redsys_last_order = excluded.redsys_last_order;

update public.payment_transactions pt
set
  subscription_id = s.id,
  updated_at = now()
from public._redsys_reconcile_changed c
join public.subscriptions s
  on s.member_id = c.member_id
 and s.redsys_last_order = c.redsys_order
where pt.id = c.id;

update public.users u
set is_member = true,
    updated_at = now()
from public._redsys_reconcile_changed c
where u.id = c.member_id
  and u.profile_completed_at is not null;

-- After/audit output. Capture this result before commit if your SQL console allows it.
select
  c.redsys_order,
  c.member_id,
  u.email,
  c.status_before,
  pt.status as status_after,
  c.auth_code_before,
  pt.ds_authorization_code as auth_code_after,
  c.last_four_before,
  pt.last_four as last_four_after,
  c.authorized_at_before,
  pt.authorized_at as authorized_at_after,
  pt.onboarding_status,
  pt.subscription_id,
  s.status as subscription_status,
  u.profile_completed_at,
  u.is_member
from public._redsys_reconcile_changed c
join public.payment_transactions pt on pt.id = c.id
join public.users u on u.id = pt.member_id
left join public.subscriptions s on s.id = pt.subscription_id
order by pt.authorized_at;

commit;

drop table if exists public._redsys_reconcile_changed;
drop table if exists public._redsys_reconcile_before;
drop table if exists public._redsys_reconcile_source;
