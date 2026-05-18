import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const membershipPageSource = readFileSync(
  join(process.cwd(), "src", "app", "membership", "page.tsx"),
  "utf8",
)

test("membership checkout uses a default plan and fixed annual interval", () => {
  assert.match(membershipPageSource, /useState<PlanType>\("over25"\)/)
  assert.doesNotMatch(membershipPageSource, /selectedPaymentOption/)
  assert.doesNotMatch(membershipPageSource, /Pago de la suscripci/)
  assert.doesNotMatch(membershipPageSource, /popular/)
  assert.doesNotMatch(membershipPageSource, /POPULAR/)
  assert.match(
    membershipPageSource,
    /prepareMembershipRedirectPayment\(\s*selectedPlan,\s*"annual",\s*termsAcceptedSubscription,\s*\)/,
  )
  assert.match(membershipPageSource, /const isSelectedPlanUnavailable = selectedPlan === "under25"/)
  assert.match(
    membershipPageSource,
    /disabled=\{!selectedPlan \|\| isSelectedPlanUnavailable \|\| !termsAcceptedSubscription\}/,
  )
})
