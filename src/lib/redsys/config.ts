/**
 * RedSys/Getnet Configuration
 *
 * Environment variables required:
 *   REDSYS_MERCHANT_CODE   — FUC (merchant code from Getnet)
 *   REDSYS_TERMINAL        — Terminal number (default "1")
 *   REDSYS_SECRET_KEY      — Base64-encoded merchant key (from Getnet admin)
 *   REDSYS_ENV             — "test" | "production" (default "test")
 *
 * Public (client-side):
 *   NEXT_PUBLIC_REDSYS_MERCHANT_CODE — Same FUC (needed by InSite iframe)
 *   NEXT_PUBLIC_REDSYS_TERMINAL      — Same terminal
 *   NEXT_PUBLIC_REDSYS_ENV           — Same env flag
 */

import type { SignatureVersion } from "./types"

// ── Endpoint URLs ────────────────────────────────────────────────────────────

export const REDSYS_ENDPOINTS = {
  test: {
    trataPeticion:  "https://sis-t.redsys.es:25443/sis/rest/trataPeticionREST",
    iniciaPeticion: "https://sis-t.redsys.es:25443/sis/rest/iniciaPeticionREST",
    insiteJs:       "https://sis-t.redsys.es:25443/sis/NC/sandbox/redsysV3.js",
    adminPortal:    "https://sis-t.redsys.es:25443/sis/adminWeb/",
  },
  production: {
    trataPeticion:  "https://sis.redsys.es/sis/rest/trataPeticionREST",
    iniciaPeticion: "https://sis.redsys.es/sis/rest/iniciaPeticionREST",
    insiteJs:       "https://sis.redsys.es/sis/NC/redsysV3.js",
    adminPortal:    "https://sis.redsys.es/sis/adminWeb/",
  },
} as const

// ── Constants ────────────────────────────────────────────────────────────────

/** ISO-4217 numeric code for Euro */
export const CURRENCY_EUR = "978"

/** Signature version used in all requests/responses */
export const SIGNATURE_VERSION: SignatureVersion = "HMAC_SHA256_V1"

/** Ds_Response code ranges */
export const RESPONSE_CODES = {
  /** Authorization/preauth OK: 0000-0099 */
  AUTH_OK_MIN: 0,
  AUTH_OK_MAX: 99,
  /** Refund/confirmation OK: 0900 */
  REFUND_OK: 900,
  /** Cancellation OK: 0400 */
  CANCEL_OK: 400,
  /** Requires SCA authentication */
  REQUIRES_SCA: 195,
  /** Redirect to EMV3DS v2.1 */
  REDIRECT_3DS_V21: 8210,
  /** Redirect to EMV3DS v2.2 */
  REDIRECT_3DS_V22: 8220,
} as const

// ── Test Credentials (sandbox) ───────────────────────────────────────────────

export const TEST_CREDENTIALS = {
  merchantCode: "999008881",
  terminal: "1",
  /** sq7HjrUOBfKmC576ILgskD5srU870gJ7 — common test key */
  secretKey: "sq7HjrUOBfKmC576ILgskD5srU870gJ7",
  /** Test cards for sandbox */
  cards: {
    /** Visa — frictionless 3DS v2.1 */
    visa_frictionless_v21: { pan: "4548810000000003", expiry: "3412", cvv: "123" },
    /** Visa — challenge 3DS v2.1 */
    visa_challenge_v21:    { pan: "4548812049400004", expiry: "3412", cvv: "123" },
    /** Visa — frictionless 3DS v2.2 */
    visa_frictionless_v22: { pan: "4918019199883839", expiry: "3412", cvv: "123" },
    /** Visa — challenge 3DS v2.2 */
    visa_challenge_v22:    { pan: "4918019160034602", expiry: "3412", cvv: "123" },
    /** Force denial: use CVV 999 or amounts ending in specific digits */
    denial_cvv: "999",
  },
} as const

// ── Membership Plans ─────────────────────────────────────────────────────────

export type PlanType = "under25" | "over25" | "family"
export type PaymentInterval = "monthly" | "annual"

export interface MembershipPlan {
  planType: PlanType
  interval: PaymentInterval
  amountCents: number
  name: string
  description: string
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  // Under 25
  { planType: "under25", interval: "monthly", amountCents: 500,   name: "Joven Mensual",    description: "Membresía Joven — Menores de 25" },
  { planType: "under25", interval: "annual",  amountCents: 5000,  name: "Joven Anual",      description: "Membresía Joven — Menores de 25" },
  // Over 25
  { planType: "over25",  interval: "monthly", amountCents: 1000,  name: "Adulto Mensual",   description: "Membresía Adulto — Mayores de 25" },
  { planType: "over25",  interval: "annual",  amountCents: 10000, name: "Adulto Anual",     description: "Membresía Adulto — Mayores de 25" },
  // Family
  { planType: "family",  interval: "monthly", amountCents: 1500,  name: "Familiar Mensual", description: "Membresía Familiar — Un adulto y un menor" },
  { planType: "family",  interval: "annual",  amountCents: 15000, name: "Familiar Anual",   description: "Membresía Familiar — Un adulto y un menor" },
]

export function getMembershipPlan(planType: PlanType, interval: PaymentInterval): MembershipPlan | undefined {
  return MEMBERSHIP_PLANS.find((p) => p.planType === planType && p.interval === interval)
}

// ── Environment Helpers (server-side) ────────────────────────────────────────

export function getRedsysEnv(): "test" | "production" {
  return process.env.REDSYS_ENV === "production" ? "production" : "test"
}

export function getEndpoints() {
  return REDSYS_ENDPOINTS[getRedsysEnv()]
}

export function getMerchantCode(): string {
  const code = process.env.REDSYS_MERCHANT_CODE
  if (!code) throw new Error("Missing env: REDSYS_MERCHANT_CODE")
  return code
}

export function getTerminal(): string {
  return process.env.REDSYS_TERMINAL || "1"
}

export function getSecretKey(): string {
  const key = process.env.REDSYS_SECRET_KEY
  if (!key) throw new Error("Missing env: REDSYS_SECRET_KEY")
  return key
}

export function getNotificationUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.lorenzosanz.com"
  return `${base}/api/payments/redsys/notification`
}

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.lorenzosanz.com"
}
