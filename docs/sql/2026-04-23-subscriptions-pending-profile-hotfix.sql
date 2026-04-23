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
end $$;
