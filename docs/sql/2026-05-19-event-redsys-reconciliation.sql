-- Redsys event payment reconciliation for "Celebracion Efemerides de la Septima Copa de Europa".
--
-- Source CSV: OperacionesExportadas_Evento.csv
-- Purpose:
--   1. Trust only non-refunded, authorized event payments from the Redsys export.
--   2. Repair payment_transactions that were marked error by the terminal "1" vs "001" mismatch.
--   3. Create missing event_assists rows from already mappable payment_transactions.
--
-- Excluded on purpose:
--   - 2605EvV7z0V2: authorized and then refunded in Redsys.
--   - 2605E08ciJLL, 2605EiKlOvUZ: "Sin Finalizar 9998".
--
-- Idempotency:
--   - Existing payment_transactions are updated by redsys_order only when they match event, amount,
--     context, and member_id requirements.
--   - event_assists uses the existing unique payment_transaction_id conflict target.
--   - Confirmed attendee data is preserved; reruns only refresh payment metadata.

begin;

create temp table redsys_event_reconcile_source (
  redsys_order text primary key,
  event_id uuid not null,
  authorized_at timestamptz not null,
  amount_cents integer not null,
  authorization_code text not null,
  last_four text null,
  note text not null
) on commit drop;

insert into redsys_event_reconcile_source (
  redsys_order,
  event_id,
  authorized_at,
  amount_cents,
  authorization_code,
  last_four,
  note
) values
  ('2605E557bNzM', '19cc73d0-d7ec-4a1f-bf78-98e08f3b9de4', '2026-05-02 12:56:59+02', 1000, '183553', '4515', 'legacy 10 EUR valid event ticket'),
  ('2605ErJ1pNXA', '19cc73d0-d7ec-4a1f-bf78-98e08f3b9de4', '2026-05-12 16:56:58+02', 1000, '04020G', '3295', 'legacy 10 EUR valid event ticket'),
  ('2605E4evewLc', '19cc73d0-d7ec-4a1f-bf78-98e08f3b9de4', '2026-05-14 12:12:35+02', 1000, '327020', '3043', 'legacy 10 EUR valid event ticket'),
  ('2605ECLprRsP', '19cc73d0-d7ec-4a1f-bf78-98e08f3b9de4', '2026-05-14 21:30:56+02', 1000, '071998', '6900', 'legacy 10 EUR valid event ticket'),
  ('2605ELfCndEH', '19cc73d0-d7ec-4a1f-bf78-98e08f3b9de4', '2026-05-15 11:38:19+02', 1000, 'N6BHLH', '3700', 'legacy 10 EUR valid event ticket'),
  ('2605Eyc68lmB', '19cc73d0-d7ec-4a1f-bf78-98e08f3b9de4', '2026-05-18 12:01:25+02', 2000, '098692', '6014', 'current 20 EUR valid event ticket'),
  ('2605EITYEzFH', '19cc73d0-d7ec-4a1f-bf78-98e08f3b9de4', '2026-05-18 12:31:44+02', 2000, '09339G', '3295', 'current 20 EUR valid event ticket'),
  ('2605E5hA8Hfa', '19cc73d0-d7ec-4a1f-bf78-98e08f3b9de4', '2026-05-18 16:34:13+02', 2000, '544544', '5883', 'current 20 EUR valid event ticket'),
  ('2605EcvLFrsB', '19cc73d0-d7ec-4a1f-bf78-98e08f3b9de4', '2026-05-18 22:52:37+02', 2000, '659000', '8425', 'current 20 EUR valid event ticket');

-- Preview before changes. Capture this result if your SQL client supports it.
select
  src.redsys_order,
  src.note,
  pt.id as payment_transaction_id,
  pt.status as payment_status_before,
  pt.context,
  pt.event_id,
  pt.member_id,
  pt.amount_cents as db_amount_cents,
  pt.ds_authorization_code as db_authorization_code,
  pt.last_four as db_last_four,
  ea.id as event_assist_id,
  ea.payment_status as assist_payment_status,
  ea.data_confirmed_at
from redsys_event_reconcile_source src
left join public.payment_transactions pt on pt.redsys_order = src.redsys_order
left join public.event_assists ea on ea.payment_transaction_id = pt.id
order by src.authorized_at;

create temp table redsys_event_reconcile_eligible on commit drop as
select
  pt.id,
  pt.redsys_order,
  pt.status as status_before,
  src.event_id,
  src.authorized_at,
  src.amount_cents,
  src.authorization_code,
  src.last_four,
  src.note
from redsys_event_reconcile_source src
join public.payment_transactions pt on pt.redsys_order = src.redsys_order
where pt.context = 'event'
  and pt.event_id = src.event_id
  and pt.amount_cents = src.amount_cents
  and pt.member_id is not null
  and pt.status in ('pending', 'error', 'authorized');

do $$
declare
  source_count integer;
  eligible_count integer;
  unmappable_count integer;
begin
  select count(*) into source_count from redsys_event_reconcile_source;
  select count(*) into eligible_count from redsys_event_reconcile_eligible;
  select count(*)
  into unmappable_count
  from redsys_event_reconcile_source src
  left join redsys_event_reconcile_eligible el using (redsys_order)
  where el.redsys_order is null;

  if source_count <> 9 then
    raise exception 'Expected 9 source rows, found %', source_count;
  end if;

  if unmappable_count > 0 then
    raise exception 'Found % Redsys event payments that cannot be safely mapped; inspect preview before running repair', unmappable_count;
  end if;
end $$;

create temp table redsys_event_reconcile_changed on commit drop as
with updated as (
  update public.payment_transactions pt
  set
    status = 'authorized',
    ds_response = coalesce(pt.ds_response, '0000'),
    ds_authorization_code = coalesce(pt.ds_authorization_code, el.authorization_code),
    last_four = coalesce(pt.last_four, el.last_four),
    authorized_at = coalesce(pt.authorized_at, el.authorized_at),
    metadata = coalesce(pt.metadata, '{}'::jsonb) || jsonb_build_object(
      'redsys_event_reconciliation',
      jsonb_build_object(
        'source', 'OperacionesExportadas_Evento.csv',
        'note', el.note,
        'reconciled_at', now()
      )
    ),
    updated_at = now()
  from redsys_event_reconcile_eligible el
  where pt.id = el.id
    and (
      pt.status is distinct from 'authorized'
      or pt.ds_response is null
      or pt.ds_authorization_code is null
      or pt.last_four is null
      or pt.authorized_at is null
    )
  returning
    pt.id,
    pt.redsys_order,
    el.status_before,
    pt.status as status_after,
    pt.member_id,
    pt.event_id,
    pt.amount_cents,
    pt.currency,
    pt.authorized_at,
    pt.ds_authorization_code,
    pt.last_four
)
select * from updated;

insert into public.event_assists (
  event_id,
  user_id,
  payment_transaction_id,
  email,
  name,
  apellido1,
  apellido2,
  phone,
  amount_cents,
  currency,
  redsys_order,
  payment_status,
  payment_authorized_at,
  ds_authorization_code,
  last_four,
  updated_at
)
select
  pt.event_id,
  pt.member_id,
  pt.id,
  coalesce(nullif(trim(m.email), ''), nullif(trim(u.email), '')) as email,
  coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), ''), nullif(trim(u.email), '')) as name,
  nullif(trim(m.apellido1), ''),
  nullif(trim(m.apellido2), ''),
  nullif(trim(m.telefono::text), ''),
  pt.amount_cents,
  pt.currency,
  pt.redsys_order,
  pt.status,
  pt.authorized_at,
  pt.ds_authorization_code,
  pt.last_four,
  now()
from redsys_event_reconcile_eligible el
join public.payment_transactions pt on pt.id = el.id
left join public.users u on u.id = pt.member_id
left join public.miembros m on m.user_uuid = pt.member_id
where pt.status = 'authorized'
  and coalesce(nullif(trim(m.email), ''), nullif(trim(u.email), '')) is not null
  and coalesce(nullif(trim(m.name), ''), nullif(trim(u.name), ''), nullif(trim(u.email), '')) is not null
on conflict (payment_transaction_id) do update
set
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  payment_status = excluded.payment_status,
  payment_authorized_at = excluded.payment_authorized_at,
  ds_authorization_code = excluded.ds_authorization_code,
  last_four = excluded.last_four,
  updated_at = now();

-- After/audit report. A successful rerun should show no unsafe gaps and no duplicate assists.
select
  src.redsys_order,
  pt.id as payment_transaction_id,
  pt.status as payment_status_after,
  pt.ds_response,
  pt.ds_authorization_code,
  pt.last_four,
  pt.authorized_at,
  ea.id as event_assist_id,
  ea.payment_status as assist_payment_status,
  ea.amount_cents as assist_amount_cents,
  ea.data_confirmed_at,
  case
    when pt.id is null then 'missing_payment_transaction'
    when pt.member_id is null then 'missing_member_id'
    when ea.id is null then 'missing_event_assist'
    when pt.status <> 'authorized' then 'payment_not_authorized'
    else 'ok'
  end as reconciliation_status
from redsys_event_reconcile_source src
left join public.payment_transactions pt on pt.redsys_order = src.redsys_order
left join public.event_assists ea on ea.payment_transaction_id = pt.id
order by src.authorized_at;

commit;
