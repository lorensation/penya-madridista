/**
 * RedSys REST API Client
 *
 * SERVER-ONLY — calls trataPeticionREST / iniciaPeticionREST.
 * Uses the signature module for HMAC_SHA256_V1 signing and verification.
 */

import {
  getEndpoints,
  getMerchantCode,
  getTerminal,
  getSecretKey,
  getNotificationUrl,
  CURRENCY_EUR,
  SIGNATURE_VERSION,
} from "./config"

import {
  createSignature,
  encodeMerchantParams,
  decodeMerchantParams,
  verifySignature,
} from "./signature"

import type {
  RedsysMerchantParams,
  RedsysResponseParams,
  RedsysSignedRequest,
  RedsysRestResponse,
  TransactionType,
  ExecutePaymentResult,
} from "./types"

import { isAuthorizationSuccess, isSuccessResponse } from "./types"

// ── Request Building ─────────────────────────────────────────────────────────

/**
 * Build a fully signed RedSys request ready to POST.
 * Merges caller-supplied params with defaults (FUC, terminal, currency, notification URL).
 */
export function buildSignedRequest(
  params: Partial<RedsysMerchantParams> & {
    DS_MERCHANT_ORDER: string
    DS_MERCHANT_AMOUNT: string
    DS_MERCHANT_TRANSACTIONTYPE: TransactionType
  },
): RedsysSignedRequest {
  const merchantKey = getSecretKey()

  // Merge with defaults
  const fullParams: Record<string, string> = {
    DS_MERCHANT_CURRENCY: CURRENCY_EUR,
    DS_MERCHANT_MERCHANTCODE: getMerchantCode(),
    DS_MERCHANT_TERMINAL: getTerminal(),
    DS_MERCHANT_MERCHANTURL: getNotificationUrl(),
    ...(params as Record<string, string | undefined>),
  }

  // Strip undefined values
  const cleanParams: Record<string, string> = {}
  for (const [k, v] of Object.entries(fullParams)) {
    if (v !== undefined && v !== null) cleanParams[k] = String(v)
  }

  const base64Params = encodeMerchantParams(cleanParams)
  const signature = createSignature(merchantKey, base64Params, params.DS_MERCHANT_ORDER)

  return {
    Ds_SignatureVersion: SIGNATURE_VERSION,
    Ds_MerchantParameters: base64Params,
    Ds_Signature: signature,
  }
}

// ── REST Calls ───────────────────────────────────────────────────────────────

/**
 * Call `trataPeticionREST` — execute an operation (authorize, refund, etc.).
 */
export async function trataPeticionREST(
  signedRequest: RedsysSignedRequest,
): Promise<{
  params: RedsysResponseParams
  raw: RedsysRestResponse
  verified: boolean
}> {
  const endpoint = getEndpoints().trataPeticion

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signedRequest),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`RedSys trataPeticion HTTP ${res.status}: ${text}`)
  }

  const raw: RedsysRestResponse = await res.json()
  const merchantKey = getSecretKey()
  const verified = verifySignature(merchantKey, raw.Ds_MerchantParameters, raw.Ds_Signature)
  const params = decodeMerchantParams<RedsysResponseParams>(raw.Ds_MerchantParameters)

  return { params, raw, verified }
}

/**
 * Call `iniciaPeticionREST` — pre-authentication for EMV3DS or DCC.
 */
export async function iniciaPeticionREST(
  signedRequest: RedsysSignedRequest,
): Promise<{
  params: RedsysResponseParams
  raw: RedsysRestResponse
  verified: boolean
}> {
  const endpoint = getEndpoints().iniciaPeticion

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signedRequest),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`RedSys iniciaPeticion HTTP ${res.status}: ${text}`)
  }

  const raw: RedsysRestResponse = await res.json()
  const merchantKey = getSecretKey()
  const verified = verifySignature(merchantKey, raw.Ds_MerchantParameters, raw.Ds_Signature)
  const params = decodeMerchantParams<RedsysResponseParams>(raw.Ds_MerchantParameters)

  return { params, raw, verified }
}

// ── High-Level Operations ────────────────────────────────────────────────────

/**
 * Authorize a payment using an InSite idOper.
 * Used for both shop (one-time) and membership (first payment + tokenization).
 *
 * @param options.tokenize  If true, sends IDENTIFIER="REQUIRED" + COF_INI="S"
 * @param options.cofType   COF type (default "R" for Recurring when tokenizing)
 */
export async function authorizeWithIdOper(options: {
  idOper: string
  order: string
  amountCents: number
  description?: string
  tokenize?: boolean
  cofType?: "R" | "I"
}): Promise<ExecutePaymentResult> {
  const { idOper, order, amountCents, description, tokenize, cofType } = options

  const params: Partial<RedsysMerchantParams> & {
    DS_MERCHANT_ORDER: string
    DS_MERCHANT_AMOUNT: string
    DS_MERCHANT_TRANSACTIONTYPE: TransactionType
  } = {
    DS_MERCHANT_TRANSACTIONTYPE: "0",
    DS_MERCHANT_ORDER: order,
    DS_MERCHANT_AMOUNT: String(amountCents),
    DS_MERCHANT_IDOPER: idOper,
  }

  if (description) {
    params.DS_MERCHANT_PRODUCTDESCRIPTION = description
  }

  // Request tokenization for subscriptions
  if (tokenize) {
    params.DS_MERCHANT_IDENTIFIER = "REQUIRED"
    params.DS_MERCHANT_COF_INI = "S"
    params.DS_MERCHANT_COF_TYPE = cofType ?? "R"
  }

  try {
    const signedReq = buildSignedRequest(params)
    const { params: resp, verified } = await trataPeticionREST(signedReq)

    if (!verified) {
      console.error("[redsys/client] Response signature verification failed")
      return { success: false, error: "Signature verification failed", errorCode: "SIG_FAIL" }
    }

    const dsResponse = resp.Ds_Response ?? ""

    if (isAuthorizationSuccess(dsResponse)) {
      const cardNumber = resp.Ds_CardNumber ?? ""
      return {
        success: true,
        dsResponse,
        authorizationCode: resp.Ds_AuthorisationCode ?? undefined,
        cardBrand: resp.Ds_Card_Brand ?? undefined,
        lastFour: cardNumber.slice(-4) || undefined,
        redsysToken: resp.Ds_Merchant_Identifier ?? undefined,
        redsysTokenExpiry: resp.Ds_ExpiryDate ?? undefined,
        cofTxnId: resp.Ds_Merchant_Cof_Txnid ?? undefined,
      }
    }

    return {
      success: false,
      dsResponse,
      error: `Pago denegado (código: ${dsResponse})`,
      errorCode: dsResponse,
    }
  } catch (err) {
    console.error("[redsys/client] authorizeWithIdOper error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red",
      errorCode: "NETWORK",
    }
  }
}

/**
 * Charge a stored card token via MIT (Merchant-Initiated Transaction).
 * No cardholder interaction — SCA-exempt under PSD2.
 */
export async function chargeMIT(options: {
  order: string
  amountCents: number
  redsysToken: string
  cofTxnId: string
  description?: string
}): Promise<ExecutePaymentResult> {
  const { order, amountCents, redsysToken, cofTxnId, description } = options

  const params: Partial<RedsysMerchantParams> & {
    DS_MERCHANT_ORDER: string
    DS_MERCHANT_AMOUNT: string
    DS_MERCHANT_TRANSACTIONTYPE: TransactionType
  } = {
    DS_MERCHANT_TRANSACTIONTYPE: "0",
    DS_MERCHANT_ORDER: order,
    DS_MERCHANT_AMOUNT: String(amountCents),
    DS_MERCHANT_IDENTIFIER: redsysToken,
    DS_MERCHANT_COF_TXNID: cofTxnId,
    DS_MERCHANT_EXCEP_SCA: "MIT",
    DS_MERCHANT_DIRECTPAYMENT: "true",
  }

  if (description) {
    params.DS_MERCHANT_PRODUCTDESCRIPTION = description
  }

  try {
    const signedReq = buildSignedRequest(params)
    const { params: resp, verified } = await trataPeticionREST(signedReq)

    if (!verified) {
      return { success: false, error: "Signature verification failed", errorCode: "SIG_FAIL" }
    }

    const dsResponse = resp.Ds_Response ?? ""

    if (isAuthorizationSuccess(dsResponse)) {
      return {
        success: true,
        dsResponse,
        authorizationCode: resp.Ds_AuthorisationCode ?? undefined,
        // If RedSys returns a new COF TxnID, use it; otherwise keep the one we sent
        cofTxnId: resp.Ds_Merchant_Cof_Txnid ?? cofTxnId,
      }
    }

    return {
      success: false,
      dsResponse,
      error: `Cobro MIT denegado (código: ${dsResponse})`,
      errorCode: dsResponse,
    }
  } catch (err) {
    console.error("[redsys/client] chargeMIT error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red",
      errorCode: "NETWORK",
    }
  }
}

/**
 * Process a refund (TransactionType = "3").
 * Uses the SAME order number as the original transaction.
 *
 * @param options.originalOrder  DS_MERCHANT_ORDER of the payment to refund
 * @param options.amountCents    Refund amount (can be partial)
 */
export async function processRefund(options: {
  originalOrder: string
  amountCents: number
}): Promise<ExecutePaymentResult> {
  const { originalOrder, amountCents } = options

  const params: Partial<RedsysMerchantParams> & {
    DS_MERCHANT_ORDER: string
    DS_MERCHANT_AMOUNT: string
    DS_MERCHANT_TRANSACTIONTYPE: TransactionType
  } = {
    DS_MERCHANT_TRANSACTIONTYPE: "3",
    DS_MERCHANT_ORDER: originalOrder,
    DS_MERCHANT_AMOUNT: String(amountCents),
  }

  try {
    const signedReq = buildSignedRequest(params)
    const { params: resp, verified } = await trataPeticionREST(signedReq)

    if (!verified) {
      return { success: false, error: "Signature verification failed", errorCode: "SIG_FAIL" }
    }

    const dsResponse = resp.Ds_Response ?? ""

    if (isSuccessResponse(dsResponse)) {
      return {
        success: true,
        dsResponse,
        authorizationCode: resp.Ds_AuthorisationCode ?? undefined,
      }
    }

    return {
      success: false,
      dsResponse,
      error: `Devolución denegada (código: ${dsResponse})`,
      errorCode: dsResponse,
    }
  } catch (err) {
    console.error("[redsys/client] processRefund error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red",
      errorCode: "NETWORK",
    }
  }
}

/**
 * Delete a stored card reference / token (TransactionType = "44").
 */
export async function deleteToken(options: {
  order: string
  redsysToken: string
}): Promise<{ success: boolean; error?: string }> {
  const { order, redsysToken } = options

  const params: Partial<RedsysMerchantParams> & {
    DS_MERCHANT_ORDER: string
    DS_MERCHANT_AMOUNT: string
    DS_MERCHANT_TRANSACTIONTYPE: TransactionType
  } = {
    DS_MERCHANT_TRANSACTIONTYPE: "44",
    DS_MERCHANT_ORDER: order,
    DS_MERCHANT_AMOUNT: "0",
    DS_MERCHANT_IDENTIFIER: redsysToken,
  }

  try {
    const signedReq = buildSignedRequest(params)
    const { params: resp, verified } = await trataPeticionREST(signedReq)

    if (!verified) {
      return { success: false, error: "Signature verification failed" }
    }

    const dsResponse = resp.Ds_Response ?? ""
    return {
      success: isSuccessResponse(dsResponse),
      error: isSuccessResponse(dsResponse) ? undefined : `No se pudo borrar el token (${dsResponse})`,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error desconocido",
    }
  }
}
