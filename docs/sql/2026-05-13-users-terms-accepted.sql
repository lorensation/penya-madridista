alter table public.users
add column if not exists terms_accepted boolean;

update public.users
set terms_accepted = true
where terms_accepted is null;

alter table public.users
alter column terms_accepted set default false;

alter table public.users
alter column terms_accepted set not null;

comment on column public.users.terms_accepted is
  'Explicit acceptance of site Terms and Conditions during registration.';
