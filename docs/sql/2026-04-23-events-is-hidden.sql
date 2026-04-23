alter table public.events
  add column if not exists is_hidden boolean not null default false;

comment on column public.events.is_hidden is
  'When true, the event remains manageable in admin but is excluded from user-facing event queries.';
