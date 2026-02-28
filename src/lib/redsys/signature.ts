/**
 * RedSys HMAC_SHA256_V1 Signature Module
 */

import crypto from "crypto"

const ZERO_IV = Buffer.alloc(8, 0)

function diversifyKey(merchantKeyBase64: string, orderNumber: string): Buffer {
  const rawKey = Buffer.from(merchantKeyBase64, "base64")

  let key24: Buffer
  if (rawKey.length === 24) {
    key24 = rawKey
  } else if (rawKey.length === 16) {
    key24 = Buffer.concat([rawKey, rawKey.subarray(0, 8)])
  } else if (rawKey.length < 24) {
    key24 = Buffer.concat([rawKey, Buffer.alloc(24 - rawKey.length, 0)])
  } else {
    key24 = rawKey.subarray(0, 24)
  }

  const orderBytes = Buffer.from(orderNumber, "utf8")
  const paddedLength = Math.ceil(orderBytes.length / 8) * 8
  const orderPadded = Buffer.alloc(paddedLength, 0)
  orderBytes.copy(orderPadded)

  const cipher = crypto.createCipheriv("des-ede3-cbc", key24, ZERO_IV)
  cipher.setAutoPadding(false)

  return Buffer.concat([cipher.update(orderPadded), cipher.final()])
}

function normalizeBase64(b64: string): string {
  return b64.replace(/-/g, "+").replace(/_/g, "/")
}

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

export function verifySignature(
  merchantKeyBase64: string,
  responseParamsBase64: string,
  receivedSignature: string,
): boolean {
  const params = decodeMerchantParams(responseParamsBase64)
  const orderNumber = params.Ds_Order ?? params.DS_ORDER ?? params.DS_MERCHANT_ORDER
  if (!orderNumber) {
    console.error("[redsys/signature] Missing order in merchant parameters")
    return false
  }

  const expected = createSignature(merchantKeyBase64, responseParamsBase64, orderNumber)
  const expectedBuf = Buffer.from(normalizeBase64(expected), "base64")
  const receivedBuf = Buffer.from(normalizeBase64(receivedSignature), "base64")

  if (expectedBuf.length !== receivedBuf.length) {
    return false
  }

  try {
    return crypto.timingSafeEqual(expectedBuf, receivedBuf)
  } catch {
    return false
  }
}

export function encodeMerchantParams(params: Record<string, string>): string {
  return Buffer.from(JSON.stringify(params)).toString("base64")
}

export function decodeMerchantParams<T = Record<string, string>>(base64: string): T {
  const json = Buffer.from(base64, "base64").toString("utf8")
  return JSON.parse(json) as T
}
