import test from "node:test"
import assert from "node:assert/strict"
import { createReturnPendingReviewAlert } from "../src/lib/payments/return-review-alerts"

test("creates an audit event when a user returns from Redsys but the transaction is still pending", async () => {
  const inserts: unknown[] = []
  const admin = {
    from(table: string) {
      assert.equal(table, "redsys_notification_events")
      return {
        insert(payload: unknown) {
          inserts.push(payload)
          return Promise.resolve({ error: null })
        },
      }
    },
  }

  await createReturnPendingReviewAlert(admin, {
    order: "2604MB3de22V",
    memberId: "1ff5bdef-eb86-4734-80ea-6f72ec079970",
    status: "pending",
    hasSignedReturnParams: false,
  })

  assert.equal(inserts.length, 1)
  const payload = inserts[0] as {
    event: string
    reason: string
    redsys_order: string
    member_id: string
    context: string
    status_before: string
    status_after: string
    raw: Record<string, unknown>
  }
  assert.equal(payload.event, "redsys.return.review_required")
  assert.equal(payload.reason, "pending_after_return")
  assert.equal(payload.redsys_order, "2604MB3de22V")
  assert.equal(payload.member_id, "1ff5bdef-eb86-4734-80ea-6f72ec079970")
  assert.equal(payload.context, "membership")
  assert.equal(payload.status_before, "pending")
  assert.equal(payload.status_after, "pending")
  assert.equal(payload.raw.has_signed_return_params, false)
})
