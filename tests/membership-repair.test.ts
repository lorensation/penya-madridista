import test from "node:test"
import assert from "node:assert/strict"
import {
  buildTrustedRedsysAuthorizationParams,
} from "../src/lib/membership/onboarding"

test("builds trusted Redsys authorization params from reconciliation data", () => {
  const params = buildTrustedRedsysAuthorizationParams({
    order: "2605M3c8rDwS",
    amountCents: 6000,
    authorizationCode: "674084",
    lastFour: "0041",
  })

  assert.equal(params.Ds_Order, "2605M3c8rDwS")
  assert.equal(params.Ds_Amount, "6000")
  assert.equal(params.Ds_Response, "0000")
  assert.equal(params.Ds_AuthorisationCode, "674084")
  assert.equal(params.Ds_CardNumber, "************0041")
})

test("omits masked card data when reconciliation has no last four", () => {
  const params = buildTrustedRedsysAuthorizationParams({
    order: "2605MVM3t4Hs",
    amountCents: 6000,
    authorizationCode: "984300",
  })

  assert.equal(params.Ds_CardNumber, undefined)
})
