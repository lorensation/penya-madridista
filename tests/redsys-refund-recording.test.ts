import test from "node:test"
import assert from "node:assert/strict"
import {
  buildRedsysRefundMetadata,
  hasRemainingActiveMembershipAfterRefund,
} from "../src/lib/redsys/refund-recording"

test("builds refund metadata without overwriting original payment fields", () => {
  const metadata = buildRedsysRefundMetadata({
    existingMetadata: { planType: "over25", interval: "annual" },
    source: "admin_dashboard",
    originalOrder: "2604MZlwTx1l",
    originalTransactionId: "txn-original",
    refundRequestId: "refund-request",
    amountCents: 6000,
    authorizationCode: "813613",
    dsResponse: "0900",
    lastFour: "4515",
    processedAt: "2026-05-01T12:00:00.000Z",
  })

  assert.equal(metadata.planType, "over25")
  assert.equal(metadata.interval, "annual")
  assert.deepEqual(metadata.redsys_refund, {
    source: "admin_dashboard",
    original_order: "2604MZlwTx1l",
    original_transaction_id: "txn-original",
    refund_request_id: "refund-request",
    amount_cents: 6000,
    authorization_code: "813613",
    ds_response: "0900",
    last_four: "4515",
    processed_at: "2026-05-01T12:00:00.000Z",
  })
})

test("keeps membership active when another order-scoped active subscription remains", () => {
  assert.equal(
    hasRemainingActiveMembershipAfterRefund([
      { id: "refunded-subscription", status: "canceled" },
      { id: "other-subscription", status: "active" },
    ]),
    true,
  )
  assert.equal(
    hasRemainingActiveMembershipAfterRefund([
      { id: "refunded-subscription", status: "canceled" },
      { id: "expired-subscription", status: "inactive" },
    ]),
    false,
  )
})
