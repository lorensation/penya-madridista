-- Redsys membership monitoring queries
-- These are mirrored by /api/payments/redsys/monitor and can also be run manually.

-- Membership payments stuck pending longer than 30 minutes.
select id, redsys_order, member_id, amount_cents, created_at, updated_at
from public.payment_transactions
where context = 'membership'
  and status = 'pending'
  and created_at < now() - interval '30 minutes'
order by created_at;

-- Authorized membership transactions without matching subscription row for the same order.
select pt.id, pt.redsys_order, pt.member_id, pt.authorized_at, pt.subscription_id
from public.payment_transactions pt
left join public.subscriptions s
  on s.member_id = pt.member_id
 and s.redsys_last_order = pt.redsys_order
where pt.context = 'membership'
  and pt.status = 'authorized'
  and s.id is null;

-- Subscriptions stuck in pending_profile longer than 24 hours.
select s.id, s.member_id, s.redsys_last_order, s.created_at, s.updated_at, u.email
from public.subscriptions s
join public.users u on u.id = s.member_id
where s.status = 'pending_profile'
  and coalesce(s.updated_at, s.created_at) < now() - interval '24 hours'
order by coalesce(s.updated_at, s.created_at);

-- Authorized membership transactions missing card tail data.
select id, redsys_order, member_id, authorized_at
from public.payment_transactions
where status = 'authorized'
  and context = 'membership'
  and last_four is null
order by authorized_at desc nulls last;

-- Recent membership transaction errors worth reviewing.
select id, redsys_order, member_id, ds_response, created_at, updated_at
from public.payment_transactions
where context = 'membership'
  and status = 'error'
  and updated_at >= now() - interval '24 hours'
order by updated_at desc;
