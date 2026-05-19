import { sendEmail as defaultSendEmail } from "@/lib/email"
import {
  resolveEventInvitationImageUrl,
} from "@/lib/email/event-invitations"
import { renderEventAttendeeInvitationEmail } from "@/lib/email/templates/event-notification"

type DbErrorLike = { message?: string } | null

interface MaybeSingleResult<T> {
  data: T | null
  error: DbErrorLike
}

interface QueryBuilder<T> {
  select(columns?: string): QueryBuilder<T>
  eq(column: string, value: unknown): QueryBuilder<T>
  is(column: string, value: unknown): QueryBuilder<T>
  in(column: string, value: unknown[]): QueryBuilder<T>
  maybeSingle(): Promise<MaybeSingleResult<T>>
}

interface TableBuilder<T> {
  select(columns?: string): QueryBuilder<T>
  update(payload: Record<string, unknown>): QueryBuilder<T>
}

export interface EventAttendeeInvitationAdminClient {
  from(table: string): TableBuilder<unknown>
}

interface EventInvitationAttendeeRow {
  id: string
  event_id: string
  email: string
  name: string
  apellido1: string | null
  apellido2: string | null
  user_id: string | null
  payment_status: string
  invitation_email_status: string | null
  invitation_email_sent_at: string | null
  invitation_email_last_attempt_at: string | null
  invitation_email_error: string | null
  invitation_email_message_id: string | null
}

interface EventInvitationEventRow {
  id: string
  title: string
  date: string
  time: string | null
  location: string | null
  description: string | null
  image_url: string | null
  invite_image_url: string | null
}

type SendEmailInput = Parameters<typeof defaultSendEmail>[0]
type SendEmailResult = Awaited<ReturnType<typeof defaultSendEmail>>

export type EventAttendeeInvitationMode = "automatic" | "manual"

export interface EventAttendeeInvitationResult {
  success: boolean
  skipped: boolean
  reason?: string
  messageId?: string
  error?: string
}

interface EventAttendeeInvitationInput {
  admin: EventAttendeeInvitationAdminClient
  attendeeId: string
  mode: EventAttendeeInvitationMode
  imageUrlOverride?: string | null
  now?: () => Date
  sendEmail?: (input: SendEmailInput) => Promise<SendEmailResult>
}

interface EventAttendeeInvitationForTransactionInput {
  admin: EventAttendeeInvitationAdminClient
  paymentTransactionId: string
  mode?: EventAttendeeInvitationMode
  imageUrlOverride?: string | null
  now?: () => Date
  sendEmail?: (input: SendEmailInput) => Promise<SendEmailResult>
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

function formatDateES(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unknown error")
  }

  return String(error || "Unknown error")
}

async function loadAttendee(
  admin: EventAttendeeInvitationAdminClient,
  attendeeId: string,
): Promise<EventInvitationAttendeeRow | null> {
  const { data, error } = await admin
    .from("event_assists")
    .select(
      "id, event_id, email, name, apellido1, apellido2, user_id, payment_status, invitation_email_status, invitation_email_sent_at, invitation_email_last_attempt_at, invitation_email_error, invitation_email_message_id",
    )
    .eq("id", attendeeId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed loading event attendee: ${errorMessage(error)}`)
  }

  return data as EventInvitationAttendeeRow | null
}

async function loadAttendeeIdByPaymentTransaction(
  admin: EventAttendeeInvitationAdminClient,
  paymentTransactionId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("event_assists")
    .select("id")
    .eq("payment_transaction_id", paymentTransactionId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed loading event attendee by payment transaction: ${errorMessage(error)}`)
  }

  return (data as { id?: string } | null)?.id ?? null
}

async function loadEvent(
  admin: EventAttendeeInvitationAdminClient,
  eventId: string,
): Promise<EventInvitationEventRow | null> {
  const { data, error } = await admin
    .from("events")
    .select("id, title, date, time, location, description, image_url, invite_image_url")
    .eq("id", eventId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed loading event for attendee invitation: ${errorMessage(error)}`)
  }

  return data as EventInvitationEventRow | null
}

async function updateAttendeeInvitationState(
  admin: EventAttendeeInvitationAdminClient,
  attendeeId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await admin
    .from("event_assists")
    .update(payload)
    .eq("id", attendeeId)
    .select("id")
    .maybeSingle()

  if (error) {
    throw new Error(`Failed updating attendee invitation state: ${errorMessage(error)}`)
  }
}

async function claimAutomaticInvitation(
  admin: EventAttendeeInvitationAdminClient,
  attendeeId: string,
  nowIso: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("event_assists")
    .update({
      invitation_email_status: "sending",
      invitation_email_last_attempt_at: nowIso,
      invitation_email_error: null,
      updated_at: nowIso,
    })
    .eq("id", attendeeId)
    .eq("payment_status", "authorized")
    .is("invitation_email_sent_at", null)
    .in("invitation_email_status", ["pending", "failed"])
    .select("id")
    .maybeSingle()

  if (error) {
    throw new Error(`Failed claiming attendee invitation send: ${errorMessage(error)}`)
  }

  return Boolean(data)
}

async function markInvalidEmail(
  admin: EventAttendeeInvitationAdminClient,
  attendeeId: string,
  nowIso: string,
  message: string,
) {
  await updateAttendeeInvitationState(admin, attendeeId, {
    invitation_email_status: "failed",
    invitation_email_last_attempt_at: nowIso,
    invitation_email_error: message,
    updated_at: nowIso,
  })
}

export async function sendEventAttendeeInvitation(
  input: EventAttendeeInvitationInput,
): Promise<EventAttendeeInvitationResult> {
  const nowIso = (input.now ?? (() => new Date()))().toISOString()
  const sendEmail = input.sendEmail ?? defaultSendEmail
  const attendee = await loadAttendee(input.admin, input.attendeeId)

  if (!attendee) {
    return { success: false, skipped: false, reason: "attendee_not_found", error: "Asistente no encontrado" }
  }

  if (attendee.payment_status !== "authorized") {
    return { success: true, skipped: true, reason: "payment_not_authorized" }
  }

  if (input.mode === "automatic" && attendee.invitation_email_sent_at) {
    return { success: true, skipped: true, reason: "already_sent" }
  }

  const recipientEmail = normalizeEmail(attendee.email)
  if (!isValidEmail(recipientEmail)) {
    const message = "Invalid attendee email"
    await markInvalidEmail(input.admin, attendee.id, nowIso, message)
    return { success: false, skipped: false, reason: "invalid_email", error: message }
  }

  const event = await loadEvent(input.admin, attendee.event_id)
  if (!event) {
    return { success: false, skipped: false, reason: "event_not_found", error: "Evento no encontrado" }
  }

  if (input.mode === "automatic") {
    const claimed = await claimAutomaticInvitation(input.admin, attendee.id, nowIso)
    if (!claimed) {
      return { success: true, skipped: true, reason: "already_sending_or_sent" }
    }
  } else {
    await updateAttendeeInvitationState(input.admin, attendee.id, {
      invitation_email_status: "sending",
      invitation_email_last_attempt_at: nowIso,
      invitation_email_error: null,
      updated_at: nowIso,
    })
  }

  const attendeeName = attendee.name?.trim() || recipientEmail
  const invitationImageUrl = resolveEventInvitationImageUrl(event, input.imageUrlOverride)
  const html = renderEventAttendeeInvitationEmail({
    eventTitle: event.title,
    eventDate: formatDateES(event.date),
    eventTime: event.time,
    eventLocation: event.location,
    eventDescription: event.description,
    attendeeName,
    attendeeEmail: recipientEmail,
    invitationImageUrl,
  })

  let result: SendEmailResult
  try {
    result = await sendEmail({
      to: recipientEmail,
      subject: `Confirmacion de asistencia: ${event.title}`,
      html,
    })
  } catch (error) {
    const message = errorMessage(error)
    await updateAttendeeInvitationState(input.admin, attendee.id, {
      invitation_email_status: "failed",
      invitation_email_last_attempt_at: nowIso,
      invitation_email_error: message,
      updated_at: nowIso,
    })

    return { success: false, skipped: false, reason: "send_failed", error: message }
  }

  if (result.success) {
    await updateAttendeeInvitationState(input.admin, attendee.id, {
      invitation_email_status: "sent",
      invitation_email_sent_at: nowIso,
      invitation_email_last_attempt_at: nowIso,
      invitation_email_error: null,
      invitation_email_message_id: result.messageId || null,
      updated_at: nowIso,
    })

    return {
      success: true,
      skipped: false,
      messageId: result.messageId,
    }
  }

  const message = errorMessage(result.error)
  await updateAttendeeInvitationState(input.admin, attendee.id, {
    invitation_email_status: "failed",
    invitation_email_last_attempt_at: nowIso,
    invitation_email_error: message,
    updated_at: nowIso,
  })

  return { success: false, skipped: false, reason: "send_failed", error: message }
}

export async function sendEventAttendeeInvitationForPaymentTransaction(
  input: EventAttendeeInvitationForTransactionInput,
): Promise<EventAttendeeInvitationResult> {
  const attendeeId = await loadAttendeeIdByPaymentTransaction(input.admin, input.paymentTransactionId)

  if (!attendeeId) {
    return { success: false, skipped: false, reason: "attendee_not_found", error: "Asistente no encontrado" }
  }

  return sendEventAttendeeInvitation({
    admin: input.admin,
    attendeeId,
    mode: input.mode ?? "automatic",
    imageUrlOverride: input.imageUrlOverride,
    now: input.now,
    sendEmail: input.sendEmail,
  })
}
