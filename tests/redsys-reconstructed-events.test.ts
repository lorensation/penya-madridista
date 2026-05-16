import test from "node:test"
import assert from "node:assert/strict"
import {
  buildReconstructedNotificationEvents,
  type ExistingRedsysNotificationEvent,
} from "../scripts/redsys-reconstruct-notification-events"
import type { PaymentTransactionCandidate, RedsysCsvRow } from "../scripts/redsys-reconcile-csv"

function csvRow(overrides: Partial<RedsysCsvRow> = {}): RedsysCsvRow {
  return {
    date: "15/05/2026",
    time: "21:00:21",
    operationType: "Autorizacion",
    order: "2605M9OC7Ycn",
    authorized: true,
    authorizationCode: "298669",
    amountCents: 6000,
    amountEurosCents: 6000,
    authorizedAt: "2026-05-15T21:00:21+02:00",
    lastFour: "3084",
    cardNumber: "476173******3084",
    paymentType: "Challenge Visa",
    currency: "EUR",
    rawResult: "Autorizada 298669",
    category: "successful_authorization",
    ...overrides,
  }
}

function transaction(overrides: Partial<PaymentTransactionCandidate> = {}): PaymentTransactionCandidate {
  return {
    id: "txn-1",
    redsys_order: "2605M9OC7Ycn",
    status: "authorized",
    context: "membership",
    transaction_type: "0",
    amount_cents: 6000,
    member_id: "member-1",
    ds_authorization_code: "298669",
    last_four: "3084",
    authorized_at: "2026-05-15T19:00:21Z",
    created_at: "2026-05-15T19:00:15Z",
    updated_at: "2026-05-16T09:00:00Z",
    subscription_id: "sub-1",
    metadata: { planType: "over25", interval: "annual" },
    ...overrides,
  }
}

test("builds synthetic reconstructed Redsys notification event inserts", () => {
  const events = buildReconstructedNotificationEvents({
    rows: [csvRow()],
    transactions: [transaction()],
    existingEvents: [],
  })

  assert.equal(events.length, 1)
  assert.equal(events[0].event, "redsys.notification.reconstructed")
  assert.equal(events[0].reason, "reconstructed_successful_authorization_from_redsys_csv")
  assert.equal(events[0].redsys_order, "2605M9OC7Ycn")
  assert.equal(events[0].transaction_id, "txn-1")
  assert.equal(events[0].member_id, "member-1")
  assert.equal(events[0].context, "membership")
  assert.equal(events[0].status_after, "authorized")
  assert.equal(events[0].authorization_code, "298669")
  assert.equal(events[0].amount, "6000")
  assert.equal(events[0].received_amount, "6000")
  assert.equal(events[0].has_merchant_parameters, false)
  assert.equal(events[0].has_signature, false)
  assert.deepEqual(events[0].raw, {
    source: "redsys_console_csv",
    synthetic: true,
    csv_date: "15/05/2026",
    csv_time: "21:00:21",
    csv_operation_type: "Autorizacion",
    csv_category: "successful_authorization",
    csv_result: "Autorizada 298669",
    csv_authorization_code: "298669",
    csv_amount_cents: 6000,
    csv_last_four: "3084",
  })
})

test("does not reconstruct duplicate historical Redsys events", () => {
  const existingEvents: ExistingRedsysNotificationEvent[] = [
    {
      redsys_order: "2605M9OC7Ycn",
      reason: "reconstructed_successful_authorization_from_redsys_csv",
    },
  ]

  const events = buildReconstructedNotificationEvents({
    rows: [csvRow()],
    transactions: [transaction()],
    existingEvents,
  })

  assert.equal(events.length, 0)
})
