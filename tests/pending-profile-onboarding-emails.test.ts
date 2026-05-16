import test from "node:test"
import assert from "node:assert/strict"
import {
  buildPendingProfileOnboardingEmail,
  findMojibake,
} from "../scripts/send-pending-profile-onboarding-emails"
import { buildDefaultEmailFrom } from "../src/lib/email"

test("builds pending profile onboarding email without mojibake", () => {
  const email = buildPendingProfileOnboardingEmail({
    memberName: "madridista",
    planName: "Adulto Anual",
    completeProfileUrl: "https://www.lorenzosanz.com/complete-profile?order=2605M9OC7Ycn&userId=user-1",
    deadlineIso: "2026-05-22T19:00:21Z",
  })

  assert.equal(email.subject, "Completa tu alta en la Pena Lorenzo Sanz")
  assert.equal(findMojibake(email.subject), false)
  assert.equal(findMojibake(email.html), false)
  assert.match(email.html, /Completar mi alta/)
  assert.match(email.html, /membres&iacute;a/)
  assert.equal(findMojibake(buildDefaultEmailFrom("noreply@lorenzosanz.com")), false)
})

test("detects mojibake before sending onboarding email", () => {
  assert.equal(findMojibake("PeÃ±a Lorenzo Sanz"), true)
  assert.equal(findMojibake("Pe&ntilde;a Lorenzo Sanz"), false)
})
