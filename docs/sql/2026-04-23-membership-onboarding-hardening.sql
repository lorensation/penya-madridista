alter table public.users
add column if not exists profile_completed_at timestamptz null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_status_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      drop constraint subscriptions_status_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'subscriptions_status_check'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_status_check
      check (
        status = any (
          array[
            'active'::text,
            'trialing'::text,
            'pending_profile'::text,
            'canceled'::text,
            'past_due'::text,
            'expired'::text,
            'inactive'::text,
            'unpaid'::text,
            'incomplete'::text
          ]
        )
      );
  end if;
end $$;

alter table public.payment_transactions
add column if not exists authorized_at timestamptz null,
add column if not exists onboarding_status text not null default 'not_applicable',
add column if not exists grace_expires_at timestamptz null,
add column if not exists first_reminder_sent_at timestamptz null,
add column if not exists final_reminder_sent_at timestamptz null,
add column if not exists refund_review_status text not null default 'not_applicable',
add column if not exists refund_review_flagged_at timestamptz null,
add column if not exists onboarding_completed_at timestamptz null;

create index if not exists idx_users_profile_completed_at
on public.users (profile_completed_at);

create index if not exists idx_payment_transactions_membership_onboarding
on public.payment_transactions (
  context,
  status,
  onboarding_status,
  refund_review_status,
  authorized_at
);

update public.users as u
set profile_completed_at = coalesce(u.profile_completed_at, coalesce(u.updated_at, u.created_at, now()))
from public.miembros as m
where m.user_uuid = u.id
  and u.profile_completed_at is null
  and coalesce(nullif(trim(m.name), ''), '') <> ''
  and coalesce(nullif(trim(m.apellido1), ''), '') <> ''
  and coalesce(nullif(trim(m.dni_pasaporte), ''), '') <> ''
  and coalesce(m.telefono, 0) > 0
  and m.fecha_nacimiento is not null
  and m.fecha_nacimiento <> '1990-01-01'
  and coalesce(nullif(trim(m.direccion), ''), '') <> ''
  and coalesce(nullif(trim(m.poblacion), ''), '') <> ''
  and m.cp is not null
  and coalesce(nullif(trim(m.provincia), ''), '') <> ''
  and coalesce(nullif(trim(m.pais), ''), '') <> '';

update public.payment_transactions
set authorized_at = updated_at
where context = 'membership'
  and status = 'authorized'
  and authorized_at is null;

update public.payment_transactions as pt
set subscription_id = s.id
from public.subscriptions as s
where pt.context = 'membership'
  and pt.subscription_id is null
  and pt.member_id is not null
  and s.member_id = pt.member_id;

update public.payment_transactions as pt
set onboarding_status = 'completed',
    onboarding_completed_at = coalesce(pt.onboarding_completed_at, u.profile_completed_at, pt.updated_at, pt.created_at),
    grace_expires_at = null,
    refund_review_status = case
      when pt.refund_review_status = 'pending_review' then 'resolved_completed'
      else 'not_applicable'
    end
from public.users as u
where pt.context = 'membership'
  and pt.status = 'authorized'
  and pt.member_id = u.id
  and u.profile_completed_at is not null;

update public.payment_transactions as pt
set onboarding_status = 'pending_profile',
    grace_expires_at = coalesce(pt.grace_expires_at, pt.authorized_at + interval '7 days'),
    refund_review_status = case
      when pt.refund_review_status = 'resolved_completed' then 'not_applicable'
      else pt.refund_review_status
    end,
    onboarding_completed_at = null
where pt.context = 'membership'
  and pt.status = 'authorized'
  and pt.member_id is not null
  and coalesce(pt.onboarding_status, 'not_applicable') <> 'completed'
  and not exists (
    select 1
    from public.users as u
    where u.id = pt.member_id
      and u.profile_completed_at is not null
  );
