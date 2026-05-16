import test from "node:test"
import assert from "node:assert/strict"
import {
  buildPendingMembershipHotfixCandidates,
  formatPendingMembershipHotfixDecision,
} from "../scripts/redsys-hotfix-pending-memberships"
import type { RedsysCsvRow } from "../scripts/redsys-reconcile-csv"

function redsysRow(overrides: Partial<RedsysCsvRow> = {}): RedsysCsvRow {
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
    lastFour: null,
    cardNumber: "",
    paymentType: "Challenge Visa",
    currency: "EUR",
    rawResult: "Autorizada 298669",
    category: "successful_authorization",
    ...overrides,
  }
}

const pendingMembership = {
  id: "8a3b4843-bbeb-4717-8f3d-8ccc5199cbae",
  redsys_order: "2605M9OC7Ycn",
  status: "pending",
  context: "membership",
  transaction_type: "0",
  amount_cents: 6000,
  member_id: "31bb9156-b342-483e-bb71-e001d4267a87",
  ds_authorization_code: null,
  last_four: null,
  authorized_at: null,
  created_at: "2026-05-15T19:00:15.386413+00:00",
  updated_at: "2026-05-15T19:00:15.386413+00:00",
  subscription_id: null,
  metadata: {
    interval: "annual",
    planName: "Adulto Anual",
    planType: "over25",
  },
}

test("hotfix dry-run selects only strict pending membership matches", () => {
  const decisions = buildPendingMembershipHotfixCandidates({
    rows: [redsysRow()],
    transactions: [pendingMembership],
    subscriptions: [],
  })

  assert.equal(decisions.length, 1)
  assert.equal(decisions[0].action, "would_update")
  assert.equal(decisions[0].order, "2605M9OC7Ycn")
  assert.equal(decisions[0].authorizationCode, "298669")
  assert.equal(decisions[0].amountCents, 6000)
  assert.deepEqual(decisions[0].reasons, ["matched_csv_authorized_payment"])
  assert.match(formatPendingMembershipHotfixDecision(decisions[0], true), /WOULD UPDATE/)
})

test("hotfix skips ambiguous or unsafe rows with explicit reasons", () => {
  const decisions = buildPendingMembershipHotfixCandidates({
    rows: [
      redsysRow({ order: "AMOUNTBAD", amountCents: 3000, amountEurosCents: 3000 }),
      redsysRow({ order: "SHOPORDER" }),
      redsysRow({ order: "MISSINGDB" }),
      redsysRow({ order: "REFUND", category: "successful_devolution", operationType: "Devolucion" }),
      redsysRow({ order: "AUTHORIZED" }),
    ],
    transactions: [
      { ...pendingMembership, redsys_order: "AMOUNTBAD" },
      { ...pendingMembership, redsys_order: "SHOPORDER", context: "shop" },
      { ...pendingMembership, redsys_order: "AUTHORIZED", status: "authorized" },
    ],
    subscriptions: [],
  })

  assert.deepEqual(
    decisions.map((decision) => [decision.order, decision.action, decision.reasons]),
    [
      ["AMOUNTBAD", "skipped", ["amount_mismatch"]],
      ["SHOPORDER", "skipped", ["not_membership_context"]],
      ["MISSINGDB", "skipped", ["transaction_not_found"]],
      ["AUTHORIZED", "skipped", ["transaction_not_pending"]],
    ],
  )
})
