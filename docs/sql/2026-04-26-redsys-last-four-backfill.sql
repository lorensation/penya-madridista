-- Production data-quality runbook: Redsys last_four backfill
-- Source: OperacionesExportadas_20260426T153107.csv
-- This updates only already-authorized transactions/subscriptions with null last_four.
-- Unknown or untrusted card tails remain null.
-- Helper tables are regular short-lived tables for SQL-console compatibility
-- and are explicitly dropped after commit.

drop table if exists public._redsys_last_four_subscription_changes;
drop table if exists public._redsys_last_four_transaction_changes;
drop table if exists public._redsys_card_tail_source;

begin;

create table public._redsys_card_tail_source (
  redsys_order text primary key,
  authorization_code text not null,
  last_four text not null,
  source_file text not null
);

insert into public._redsys_card_tail_source values
  ('2604MLbhyfNg', '741936', '2715', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MF6hmXBN', 'KD7NA5', '3324', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MhtJMfk2', '219779', '5340', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MZtnsqeq', '641171', '4058', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604Mr05f9zC', '076228', '2715', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MZvFTDNc', '932186', '0721', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604Mbu1Bgk7', '104580', '8531', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604Me6AlEH8', '288764', '4058', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MZlwTx1l', '833604', '4515', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MuISOIcx', '527780', '9138', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604Mu4HdrzJ', '743769', '8109', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MtgPF3I5', '222894', '9045', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604M8fLec2r', '155544', '0026', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MHWHvhft', '713416', '0623', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MHdIghq4', 'NPGSTJ', '6219', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MHnelsUC', '988649', '1765', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604MA6Irl6x', '438983', '6672', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604M1c2xqkq', '197457', '4802', 'OperacionesExportadas_20260426T153107.csv'),
  ('2604M1bn36P3', '942141', '1954', 'OperacionesExportadas_20260426T153107.csv');

-- Preview transaction rows that would change.
select
  pt.id,
  pt.redsys_order,
  pt.status,
  pt.context,
  pt.member_id,
  pt.ds_authorization_code,
  pt.last_four as current_last_four,
  src.last_four as new_last_four,
  src.source_file
from public.payment_transactions pt
join public._redsys_card_tail_source src on src.redsys_order = pt.redsys_order
where pt.status = 'authorized'
  and pt.last_four is null
order by pt.authorized_at desc nulls last;

create table public._redsys_last_four_transaction_changes as
with updated as (
  update public.payment_transactions pt
  set
    last_four = src.last_four,
    ds_authorization_code = coalesce(pt.ds_authorization_code, src.authorization_code),
    updated_at = now()
  from public._redsys_card_tail_source src
  where src.redsys_order = pt.redsys_order
    and pt.status = 'authorized'
    and pt.last_four is null
  returning pt.id, pt.redsys_order, pt.member_id, pt.last_four
)
select * from updated;

create table public._redsys_last_four_subscription_changes as
with updated as (
  update public.subscriptions s
  set
    last_four = src.last_four,
    updated_at = now()
  from public._redsys_card_tail_source src
  where src.redsys_order = s.redsys_last_order
    and s.last_four is null
  returning s.id, s.member_id, s.redsys_last_order, s.last_four
)
select * from updated;

-- Audit output.
select
  'payment_transactions' as table_name,
  id,
  redsys_order,
  member_id,
  last_four
from public._redsys_last_four_transaction_changes
union all
select
  'subscriptions' as table_name,
  id,
  redsys_last_order as redsys_order,
  member_id,
  last_four
from public._redsys_last_four_subscription_changes
order by table_name, redsys_order;

commit;

drop table if exists public._redsys_last_four_subscription_changes;
drop table if exists public._redsys_last_four_transaction_changes;
drop table if exists public._redsys_card_tail_source;
