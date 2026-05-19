import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import {
  sendEventAttendeeInvitation,
  type EventAttendeeInvitationAdminClient,
} from "../src/lib/email/event-attendee-invitations"

interface AttendeeRow {
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

interface EventRow {
  id: string
  title: string
  date: string
  time: string | null
  location: string | null
  description: string | null
  image_url: string | null
  invite_image_url: string | null
}

function makeAttendee(overrides: Partial<AttendeeRow> = {}): AttendeeRow {
  return {
    id: "assist-1",
    event_id: "event-1",
    email: "test@example.com",
    name: "Test User",
    apellido1: null,
    apellido2: null,
    user_id: "user-1",
    payment_status: "authorized",
    invitation_email_status: "pending",
    invitation_email_sent_at: null,
    invitation_email_last_attempt_at: null,
    invitation_email_error: null,
    invitation_email_message_id: null,
    ...overrides,
  }
}

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
  return {
    id: "event-1",
    title: "Celebracion Efemerides",
    date: "2026-05-20",
    time: "20:00",
    location: "Madrid",
    description: "Acto con socios y simpatizantes.",
    image_url: null,
    invite_image_url: "https://example.com/invitacion-evento20mayo.jpeg",
    ...overrides,
  }
}

class FakeQuery {
  private filters: Array<{ column: string; operator: "eq" | "is" | "in"; value: unknown }> = []
  private shouldReturnSelection = false

  constructor(
    private readonly table: string,
    private readonly rows: Record<string, unknown[]>,
    private readonly updatePayload?: Record<string, unknown>,
  ) {}

  select() {
    this.shouldReturnSelection = true
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, operator: "eq", value })
    return this
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, operator: "is", value })
    return this
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, operator: "in", value })
    return this
  }

  async maybeSingle() {
    const matches = this.matchingRows()

    if (this.updatePayload) {
      if (matches.length === 0) {
        return { data: null, error: null }
      }

      Object.assign(matches[0], this.updatePayload)
      return { data: this.shouldReturnSelection ? matches[0] : null, error: null }
    }

    return { data: matches[0] ?? null, error: null }
  }

  private matchingRows() {
    return (this.rows[this.table] ?? []).filter((row) =>
      this.filters.every((filter) => {
        const value = (row as Record<string, unknown>)[filter.column]
        if (filter.operator === "eq") return value === filter.value
        if (filter.operator === "is") return value === filter.value
        if (filter.operator === "in") return (filter.value as unknown[]).includes(value)
        return false
      }),
    )
  }
}

function makeAdmin(attendees: AttendeeRow[], events: EventRow[]): EventAttendeeInvitationAdminClient {
  const rows: Record<string, unknown[]> = {
    event_assists: attendees,
    events,
  }

  return {
    from(table: string) {
      return {
        select() {
          return new FakeQuery(table, rows).select()
        },
        update(payload: Record<string, unknown>) {
          return new FakeQuery(table, rows, payload)
        },
      }
    },
  }
}

test("migration adds event assist invitation delivery state", () => {
  const sql = fs.readFileSync(
    "docs/sql/2026-05-19-event-assist-invitation-email-state.sql",
    "utf8",
  )

  assert.match(sql, /invitation_email_status/)
  assert.match(sql, /invitation_email_sent_at/)
  assert.match(sql, /idx_event_assists_invitation_email_status/)
})

test("automatic attendee invitation skips non-authorized attendees", async () => {
  const attendee = makeAttendee({ payment_status: "pending" })
  let sendCount = 0

  const result = await sendEventAttendeeInvitation({
    admin: makeAdmin([attendee], [makeEvent()]),
    attendeeId: attendee.id,
    mode: "automatic",
    now: () => new Date("2026-05-19T10:00:00.000Z"),
    sendEmail: async () => {
      sendCount++
      return { success: true, messageId: "msg-1" }
    },
  })

  assert.equal(result.success, true)
  assert.equal(result.skipped, true)
  assert.equal(result.reason, "payment_not_authorized")
  assert.equal(sendCount, 0)
  assert.equal(attendee.invitation_email_status, "pending")
})

test("automatic attendee invitation sends once and records success", async () => {
  const attendee = makeAttendee()
  const sentTo: string[] = []

  const result = await sendEventAttendeeInvitation({
    admin: makeAdmin([attendee], [makeEvent()]),
    attendeeId: attendee.id,
    mode: "automatic",
    now: () => new Date("2026-05-19T10:00:00.000Z"),
    sendEmail: async ({ to }) => {
      sentTo.push(String(to))
      return { success: true, messageId: "msg-1" }
    },
  })

  assert.equal(result.success, true)
  assert.equal(result.skipped, false)
  assert.deepEqual(sentTo, ["test@example.com"])
  assert.equal(attendee.invitation_email_status, "sent")
  assert.equal(attendee.invitation_email_sent_at, "2026-05-19T10:00:00.000Z")
  assert.equal(attendee.invitation_email_message_id, "msg-1")
  assert.equal(attendee.invitation_email_error, null)
})

test("automatic attendee invitation skips already sent attendees", async () => {
  const attendee = makeAttendee({
    invitation_email_status: "sent",
    invitation_email_sent_at: "2026-05-18T10:00:00.000Z",
  })
  let sendCount = 0

  const result = await sendEventAttendeeInvitation({
    admin: makeAdmin([attendee], [makeEvent()]),
    attendeeId: attendee.id,
    mode: "automatic",
    sendEmail: async () => {
      sendCount++
      return { success: true, messageId: "msg-1" }
    },
  })

  assert.equal(result.success, true)
  assert.equal(result.skipped, true)
  assert.equal(result.reason, "already_sent")
  assert.equal(sendCount, 0)
})

test("failed attendee invitation records error without clearing payment state", async () => {
  const attendee = makeAttendee()

  const result = await sendEventAttendeeInvitation({
    admin: makeAdmin([attendee], [makeEvent()]),
    attendeeId: attendee.id,
    mode: "automatic",
    now: () => new Date("2026-05-19T10:00:00.000Z"),
    sendEmail: async () => ({ success: false, error: new Error("smtp unavailable") }),
  })

  assert.equal(result.success, false)
  assert.equal(attendee.payment_status, "authorized")
  assert.equal(attendee.invitation_email_status, "failed")
  assert.equal(attendee.invitation_email_sent_at, null)
  assert.equal(attendee.invitation_email_error, "smtp unavailable")
})

test("thrown attendee invitation errors are recorded without clearing payment state", async () => {
  const attendee = makeAttendee()

  const result = await sendEventAttendeeInvitation({
    admin: makeAdmin([attendee], [makeEvent()]),
    attendeeId: attendee.id,
    mode: "automatic",
    now: () => new Date("2026-05-19T10:00:00.000Z"),
    sendEmail: async () => {
      throw new Error("smtp exploded")
    },
  })

  assert.equal(result.success, false)
  assert.equal(result.reason, "send_failed")
  assert.equal(attendee.payment_status, "authorized")
  assert.equal(attendee.invitation_email_status, "failed")
  assert.equal(attendee.invitation_email_sent_at, null)
  assert.equal(attendee.invitation_email_error, "smtp exploded")
})

test("manual attendee invitation resends already sent attendees", async () => {
  const attendee = makeAttendee({
    invitation_email_status: "sent",
    invitation_email_sent_at: "2026-05-18T10:00:00.000Z",
    invitation_email_message_id: "old-msg",
  })
  let sendCount = 0

  const result = await sendEventAttendeeInvitation({
    admin: makeAdmin([attendee], [makeEvent()]),
    attendeeId: attendee.id,
    mode: "manual",
    now: () => new Date("2026-05-19T10:00:00.000Z"),
    sendEmail: async () => {
      sendCount++
      return { success: true, messageId: "new-msg" }
    },
  })

  assert.equal(result.success, true)
  assert.equal(result.skipped, false)
  assert.equal(sendCount, 1)
  assert.equal(attendee.invitation_email_status, "sent")
  assert.equal(attendee.invitation_email_sent_at, "2026-05-19T10:00:00.000Z")
  assert.equal(attendee.invitation_email_message_id, "new-msg")
})
