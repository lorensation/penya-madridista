/**
 * Stateless HMAC-based token for email preference management.
 * Allows users to manage preferences without logging in.
 *
 * Token payload: email, optional user_id, expiration.
 * Signed with EMAIL_PREFERENCES_SECRET env var.
 */

import { createHmac, timingSafeEqual } from "crypto"

const DEFAULT_EXPIRY_DAYS = 30

interface PreferencesTokenPayload {
  email: string
  userId?: string
  exp: number // Unix timestamp (seconds)
}

function getSecret(): string {
  const secret = process.env.EMAIL_PREFERENCES_SECRET
  if (!secret) {
    throw new Error("EMAIL_PREFERENCES_SECRET environment variable is not set")
  }
  return secret
}

function sign(payload: string): string {
  const hmac = createHmac("sha256", getSecret())
  hmac.update(payload)
  return hmac.digest("hex")
}

/**
 * Generate a signed preferences token.
 */
export function generatePreferencesToken(
  email: string,
  userId?: string,
  expiryDays: number = DEFAULT_EXPIRY_DAYS
): string {
  const exp = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60
  const payload: PreferencesTokenPayload = { email, exp }
  if (userId) {
    payload.userId = userId
  }

  const payloadJson = JSON.stringify(payload)
  const payloadB64 = Buffer.from(payloadJson).toString("base64url")
  const signature = sign(payloadB64)

  return `${payloadB64}.${signature}`
}

/**
 * Verify and decode a preferences token.
 * Returns the payload if valid, or null if invalid/expired.
 */
export function verifyPreferencesToken(token: string): PreferencesTokenPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 2) return null

    const [payloadB64, providedSignature] = parts

    // Verify signature
    const expectedSignature = sign(payloadB64)
    const sigBuffer = Buffer.from(providedSignature, "hex")
    const expectedBuffer = Buffer.from(expectedSignature, "hex")

    if (sigBuffer.length !== expectedBuffer.length) return null
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null

    // Decode payload
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8")
    const payload: PreferencesTokenPayload = JSON.parse(payloadJson)

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null

    // Basic validation
    if (!payload.email || typeof payload.email !== "string") return null

    return payload
  } catch {
    return null
  }
}
