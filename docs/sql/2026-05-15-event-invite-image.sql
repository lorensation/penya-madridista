alter table public.events
  add column if not exists invite_image_url text null;

comment on column public.events.invite_image_url is
  'Public Supabase Storage URL for the event invitation image used in attendee confirmation emails.';
