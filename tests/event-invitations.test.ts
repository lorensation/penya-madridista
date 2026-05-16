import test from "node:test"
import assert from "node:assert/strict"
import {
  buildEventAttendeeDeliveryRows,
  resolveEventInvitationImageUrl,
} from "../src/lib/email/event-invitations"
import { renderEventAttendeeInvitationEmail } from "../src/lib/email/templates/event-notification"

const inviteUrl =
  "https://dlijdwtlrmutbcdyeugq.supabase.co/storage/v1/object/public/images/events/invites/invitacion-evento20mayo.jpeg"

test("renders attendee invitation emails with attendee name and invitation image", () => {
  const html = renderEventAttendeeInvitationEmail({
    eventTitle: "Celebracion Efemerides",
    eventDate: "20 de mayo de 2026",
    eventTime: "20:00",
    eventLocation: "Madrid",
    eventDescription: "Acto con socios y simpatizantes.",
    attendeeName: "Nabil",
    attendeeEmail: "nabil@example.com",
    invitationImageUrl: inviteUrl,
  })

  assert.match(html, /Hola Nabil/)
  assert.match(html, /Celebracion Efemerides/)
  assert.match(html, /20 de mayo de 2026/)
  assert.match(html, /invitacion-evento20mayo\.jpeg/)
})

test("prefers event invite image before regular event image and override", () => {
  assert.equal(
    resolveEventInvitationImageUrl({
      image_url: "https://example.com/event.jpg",
      invite_image_url: inviteUrl,
    }),
    inviteUrl,
  )

  assert.equal(
    resolveEventInvitationImageUrl(
      {
        image_url: "https://example.com/event.jpg",
        invite_image_url: inviteUrl,
      },
      "https://example.com/override.jpg",
    ),
    "https://example.com/override.jpg",
  )
})

test("builds unique pending delivery rows for event attendees only", () => {
  const rows = buildEventAttendeeDeliveryRows("campaign-1", [
    {
      id: "assist-1",
      user_id: "user-1",
      email: " Test@Example.com ",
    },
    {
      id: "assist-2",
      user_id: "user-2",
      email: "test@example.com",
    },
    {
      id: "assist-3",
      user_id: null,
      email: "other@example.com",
    },
  ])

  assert.deepEqual(rows, [
    {
      campaign_id: "campaign-1",
      recipient_email: "test@example.com",
      recipient_user_id: "user-1",
      recipient_source: "event_assists",
      status: "pending",
    },
    {
      campaign_id: "campaign-1",
      recipient_email: "other@example.com",
      recipient_user_id: null,
      recipient_source: "event_assists",
      status: "pending",
    },
  ])
})
