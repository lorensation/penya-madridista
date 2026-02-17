/**
 * RedSys HMAC_SHA256_V1 Signature Module
 *
 * Algorithm (from Getnet Developer Portal — NOT the offline PDF's SHA-512):
 *   1. Base64-decode the merchant secret key  →  24-byte raw key
 *   2. 3DES-CBC encrypt DS_MERCHANT_ORDER (UTF-8) with that key + zero IV
 *   3. HMAC-SHA256(derived_key, Base64-encoded Ds_MerchantParameters)
 *   4. Base64-encode the HMAC result  →  Ds_Signature
 *
 * SERVER-ONLY — uses Node.js `crypto` module.
 */

import crypto from "crypto"

/** 8-byte zero initialization vector for 3DES-CBC */
const ZERO_IV = Buffer.alloc(8, 0)

// ── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Diversify the merchant key for a specific order.
 * 3DES-CBC(merchantKey, orderNumber) with zero IV → derived key.
 */
function diversifyKey(merchantKeyBase64: string, orderNumber: string): Buffer {
  // 1. Decode Base64 merchant key
  const rawKey = Buffer.from(merchantKeyBase64, "base64")

  // 2. Ensure key is 24 bytes for des-ede3-cbc
  //    Standard Getnet keys decode to exactly 24 bytes (32 Base64 chars).
  //    Handle edge cases defensively.
  let key24: Buffer
  if (rawKey.length === 24) {
    key24 = rawKey
  } else if (rawKey.length === 16) {
    // Double-length DES key: K1|K2|K1
    key24 = Buffer.concat([rawKey, rawKey.subarray(0, 8)])
  } else if (rawKey.length < 24) {
    key24 = Buffer.concat([rawKey, Buffer.alloc(24 - rawKey.length, 0)])
  } else {
    key24 = rawKey.subarray(0, 24)
  }

  // 3. 3DES-CBC encrypt order number (auto PKCS7 padding)
  const cipher = crypto.createCipheriv("des-ede3-cbc", key24, ZERO_IV)
  cipher.setAutoPadding(true)
  return Buffer.concat([cipher.update(orderNumber, "utf8"), cipher.final()])
}

/**
 * Normalize a Base64 string: convert URL-safe variant (- _) to standard (+ /).
 * RedSys responses sometimes use URL-safe encoding.
 */
function normalizeBase64(b64: string): string {
  return b64.replace(/-/g, "+").replace(/_/g, "/")
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Create HMAC_SHA256_V1 signature for a RedSys request.
 *
 * @param merchantKeyBase64   Base64-encoded merchant secret key
 * @param merchantParamsBase64 Base64-encoded JSON of DS_MERCHANT_* parameters
 * @param orderNumber          DS_MERCHANT_ORDER value
 * @returns Base64-encoded signature
 */
export function createSignature(
  merchantKeyBase64: string,
  merchantParamsBase64: string,
  orderNumber: string,
): string {
  const derivedKey = diversifyKey(merchantKeyBase64, orderNumber)
  const hmac = crypto.createHmac("sha256", derivedKey)
  hmac.update(merchantParamsBase64)
  return hmac.digest("base64")
}

/**
 * Verify a RedSys response signature.
 *
 * @param merchantKeyBase64   Base64-encoded merchant secret key
 * @param responseParamsBase64 Ds_MerchantParameters from the response
 * @param receivedSignature    Ds_Signature from the response
 * @returns `true` if signature is valid
 */
export function verifySignature(
  merchantKeyBase64: string,
  responseParamsBase64: string,
  receivedSignature: string,
): boolean {
  // 1. Decode to extract Ds_Order
  const params = decodeMerchantParams(responseParamsBase64)
  const orderNumber = params.Ds_Order ?? params.DS_ORDER ?? params.DS_MERCHANT_ORDER
  if (!orderNumber) {
    console.error("[redsys/signature] No order number found in response params")
    return false
  }

  // 2. Compute expected signature
  const expected = createSignature(merchantKeyBase64, responseParamsBase64, orderNumber)

  // 3. Timing-safe comparison (normalize both for URL-safe Base64)
  const bufExpected = Buffer.from(normalizeBase64(expected), "base64")
  const bufReceived = Buffer.from(normalizeBase64(receivedSignature), "base64")

  if (bufExpected.length !== bufReceived.length) return false

  try {
    return crypto.timingSafeEqual(bufExpected, bufReceived)
  } catch {
    return false
  }
}

/**
 * Encode a params object to Base64 JSON (Ds_MerchantParameters).
 */
export function encodeMerchantParams(params: Record<string, string>): string {
  return Buffer.from(JSON.stringify(params)).toString("base64")
}

/**
 * Decode Base64-encoded Ds_MerchantParameters back to an object.
 */
export function decodeMerchantParams<T = Record<string, string>>(base64: string): T {
  const json = Buffer.from(base64, "base64").toString("utf8")
  return JSON.parse(json) as T
}
