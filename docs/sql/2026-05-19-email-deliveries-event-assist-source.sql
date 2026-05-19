alter table public.email_deliveries
  drop constraint if exists email_deliveries_recipient_source_check;

alter table public.email_deliveries
  add constraint email_deliveries_recipient_source_check
  check (recipient_source in ('users', 'newsletter_subscribers', 'event_assists'));

alter table public.email_deliveries
  drop constraint if exists email_deliveries_status_check;

alter table public.email_deliveries
  add constraint email_deliveries_status_check
  check (status in ('pending', 'sent', 'failed', 'skipped_unsubscribed', 'skipped'));

comment on constraint email_deliveries_recipient_source_check on public.email_deliveries is
  'Allowed email delivery recipient sources, including event_assists for paid attendee invitations.';

comment on constraint email_deliveries_status_check on public.email_deliveries is
  'Allowed email delivery statuses, including skipped for non-sendable attendee invitation rows.';
