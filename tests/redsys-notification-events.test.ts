import test from "node:test"
import assert from "node:assert/strict"
import {
  buildRedsysNotificationEventInsert,
  buildRedsysNotificationEventInput,
  recordRedsysNotificationEvent,
} from "../src/lib/redsys/notification-events"

test("builds a durable Redsys notification event insert", () => {
  const insert = buildRedsysNotificationEventInsert({
    event: "redsys.notification.failed",
    reason: "invalid_signature",
    redsys_order: "2604MB3de22V",
    transaction_id: "txn_123",
    member_id: "member_123",
    context: "membership",
    status_before: "pending",
    status_after: "pending",
    ds_response: "0000",
    authorization_code: "739293",
    amount: "6000",
    content_type: "application/x-www-form-urlencoded",
    signature_version: "HMAC_SHA256_V1",
    transaction_type: "0",
    error_message: "signature mismatch",
  })

  assert.equal(insert.event, "redsys.notification.failed")
  assert.equal(insert.reason, "invalid_signature")
  assert.equal(insert.redsys_order, "2604MB3de22V")
  assert.equal(insert.transaction_id, "txn_123")
  assert.equal(insert.member_id, "member_123")
  assert.equal(insert.status_before, "pending")
  assert.equal(insert.status_after, "pending")
  assert.equal(insert.ds_response, "0000")
  assert.equal(insert.ds_authorization_code, "739293")
  assert.equal(insert.amount, "6000")
  assert.equal(insert.raw, null)
})

test("records Redsys notification events as best-effort inserts", async () => {
  const calls: unknown[] = []
  const admin = {
    from(table: string) {
      assert.equal(table, "redsys_notification_events")
      return {
        insert(payload: unknown) {
          calls.push(payload)
          return Promise.resolve({ error: new Error("network unavailable") })
        },
      }
    },
  }

  await assert.doesNotReject(() =>
    recordRedsysNotificationEvent(admin, {
      event: "redsys.notification.failed",
      reason: "missing_fields",
      content_type: "text/plain",
      has_merchant_parameters: false,
      has_signature: false,
    }),
  )

  assert.equal(calls.length, 1)
  assert.equal((calls[0] as { reason: string }).reason, "missing_fields")
})

test("builds enriched notification audit input from decoded Redsys params", () => {
  const input = buildRedsysNotificationEventInput({
    event: "redsys.notification.received",
    reason: "success",
    contentType: "application/x-www-form-urlencoded",
    signatureVersion: "HMAC_SHA256_V1",
    hasMerchantParameters: true,
    hasSignature: true,
    responseParams: {
      Ds_Order: "2605M9OC7Ycn",
      Ds_Response: "0000",
      Ds_AuthorisationCode: "298669",
      Ds_Amount: "6000",
      Ds_MerchantCode: "372123456",
      Ds_Terminal: "1",
      Ds_TransactionType: "0",
      Ds_CardNumber: "454881******0003",
    },
    expectedAmount: 6000,
    expectedMerchantCode: "372123456",
    expectedTerminal: "1",
  })

  const insert = buildRedsysNotificationEventInsert(input)

  assert.equal(insert.event, "redsys.notification.received")
  assert.equal(insert.reason, "success")
  assert.equal(insert.redsys_order, "2605M9OC7Ycn")
  assert.equal(insert.ds_response, "0000")
  assert.equal(insert.ds_authorization_code, "298669")
  assert.equal(insert.amount, "6000")
  assert.equal(insert.content_type, "application/x-www-form-urlencoded")
  assert.equal(insert.signature_version, "HMAC_SHA256_V1")
  assert.equal(insert.transaction_type, "0")
  assert.equal(insert.expected_amount, 6000)
  assert.equal(insert.received_amount, "6000")
  assert.equal(insert.expected_merchant_code, "372123456")
  assert.equal(insert.received_merchant_code, "372123456")
  assert.equal(insert.expected_terminal, "1")
  assert.equal(insert.received_terminal, "1")
  assert.equal(insert.has_merchant_parameters, true)
  assert.equal(insert.has_signature, true)
  assert.deepEqual(insert.raw, {
    redsys_params: {
      Ds_Amount: "6000",
      Ds_AuthorisationCode: "298669",
      Ds_CardNumber: "454881******0003",
      Ds_MerchantCode: "372123456",
      Ds_Order: "2605M9OC7Ycn",
      Ds_Response: "0000",
      Ds_Terminal: "1",
      Ds_TransactionType: "0",
    },
  })
})
