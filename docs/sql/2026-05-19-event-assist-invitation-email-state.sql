alter table public.event_assists
  add column if not exists invitation_email_status text null default 'pending',
  add column if not exists invitation_email_sent_at timestamptz null,
  add column if not exists invitation_email_last_attempt_at timestamptz null,
  add column if not exists invitation_email_error text null,
  add column if not exists invitation_email_message_id text null;

update public.event_assists
set invitation_email_status = 'pending'
where invitation_email_status is null
  and payment_status = 'authorized';

create index if not exists idx_event_assists_invitation_email_status
  on public.event_assists (event_id, invitation_email_status);

comment on column public.event_assists.invitation_email_status is
  'Latest attendee invitation email delivery status: pending, sending, sent, failed, or skipped.';

comment on column public.event_assists.invitation_email_sent_at is
  'Timestamp of the latest successful attendee invitation email send.';

comment on column public.event_assists.invitation_email_last_attempt_at is
  'Timestamp of the latest attendee invitation email attempt.';

comment on column public.event_assists.invitation_email_error is
  'Latest attendee invitation email error, if delivery failed.';

comment on column public.event_assists.invitation_email_message_id is
  'Provider message id for the latest successful attendee invitation email.';
