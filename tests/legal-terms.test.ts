import test from "node:test"
import assert from "node:assert/strict"
import {
  isTermsAccepted,
  getTermsAcceptanceError,
} from "../src/lib/legal/terms"

test("accepts only explicit true for legal terms consent", () => {
  assert.equal(isTermsAccepted(true), true)
  assert.equal(isTermsAccepted(false), false)
  assert.equal(isTermsAccepted(undefined), false)
  assert.equal(isTermsAccepted(null), false)
  assert.equal(isTermsAccepted("true"), false)
  assert.equal(isTermsAccepted(1), false)
})

test("returns a registration error when terms are not accepted", () => {
  assert.equal(getTermsAcceptanceError(true), null)
  assert.equal(
    getTermsAcceptanceError(false),
    "Debes aceptar los Terminos y Condiciones para registrarte.",
  )
})
