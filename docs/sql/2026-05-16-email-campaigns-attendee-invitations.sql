alter table public.email_campaigns
  drop constraint if exists email_campaigns_kind_check;

alter table public.email_campaigns
  add constraint email_campaigns_kind_check
  check (kind in ('event', 'marketing', 'event_attendee_invitation'));

comment on constraint email_campaigns_kind_check on public.email_campaigns is
  'Allowed campaign types, including event attendee invitation emails sent to paid event_assists rows.';
