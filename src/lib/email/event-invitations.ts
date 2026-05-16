export interface EventAssistRecipientRow {
  id: string
  email: string
  user_id: string | null
  name?: string | null
  apellido1?: string | null
  apellido2?: string | null
}

export interface EventInvitationImageSource {
  image_url?: string | null
  invite_image_url?: string | null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export function resolveEventInvitationImageUrl(
  event: EventInvitationImageSource,
  imageUrlOverride?: string | null,
): string | null {
  const override = imageUrlOverride?.trim()
  if (override) {
    return override
  }

  return event.invite_image_url?.trim() || event.image_url?.trim() || null
}

export function buildEventAttendeeDeliveryRows(
  campaignId: string,
  attendees: EventAssistRecipientRow[],
) {
  const rows: Array<{
    campaign_id: string
    recipient_email: string
    recipient_user_id: string | null
    recipient_source: "event_assists"
    status: "pending"
  }> = []
  const seen = new Set<string>()

  for (const attendee of attendees) {
    const email = normalizeEmail(attendee.email)
    if (!email || !isValidEmail(email) || seen.has(email)) {
      continue
    }

    seen.add(email)
    rows.push({
      campaign_id: campaignId,
      recipient_email: email,
      recipient_user_id: attendee.user_id,
      recipient_source: "event_assists",
      status: "pending",
    })
  }

  return rows
}
