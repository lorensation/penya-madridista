/**
 * RedSys REST API client.
 *
 * Server-only helpers for trataPeticionREST / iniciaPeticionREST,
 * plus high-level operations for InSite and MIT recurring charges.
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

export function buildSignedRequest(
  params: Partial<RedsysMerchantParams> & {
    DS_MERCHANT_ORDER: string
    DS_MERCHANT_AMOUNT: string
    DS_MERCHANT_TRANSACTIONTYPE: TransactionType
  },
): RedsysSignedRequest {
  const merchantKey = getSecretKey()

  const fullParams: Record<string, string> = {
    DS_MERCHANT_CURRENCY: CURRENCY_EUR,
    DS_MERCHANT_MERCHANTCODE: getMerchantCode(),
    DS_MERCHANT_TERMINAL: getTerminal(),
    DS_MERCHANT_MERCHANTURL: getNotificationUrl(),
    ...(params as Record<string, string | undefined>),
  }

  const cleanParams: Record<string, string> = {}
  for (const [key, value] of Object.entries(fullParams)) {
    if (value !== undefined && value !== null) {
      cleanParams[key] = String(value)
    }
  }

  const base64Params = encodeMerchantParams(cleanParams)
  const signature = createSignature(merchantKey, base64Params, params.DS_MERCHANT_ORDER)

  return {
    Ds_SignatureVersion: SIGNATURE_VERSION,
    Ds_MerchantParameters: base64Params,
    Ds_Signature: signature,
  }
}

export async function trataPeticionREST(
  signedRequest: RedsysSignedRequest,
): Promise<{
  params: RedsysResponseParams
  raw: RedsysRestResponse
  verified: boolean
}> {
  const endpoint = getEndpoints().trataPeticion

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signedRequest),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`RedSys trataPeticion HTTP ${response.status}: ${text}`)
  }

  const raw = (await response.json()) as RedsysRestResponse

  if ("errorCode" in raw) {
    throw new Error(`RedSys error: ${raw.errorCode}`)
  }

  if (!raw.Ds_MerchantParameters || !raw.Ds_Signature) {
    throw new Error("RedSys returned an unexpected unsigned response")
  }

  const merchantKey = getSecretKey()
  const verified = verifySignature(merchantKey, raw.Ds_MerchantParameters, raw.Ds_Signature)
  const params = decodeMerchantParams<RedsysResponseParams>(raw.Ds_MerchantParameters)

  return { params, raw, verified }
}

export async function iniciaPeticionREST(
  signedRequest: RedsysSignedRequest,
): Promise<{
  params: RedsysResponseParams
  raw: RedsysRestResponse
  verified: boolean
}> {
  const endpoint = getEndpoints().iniciaPeticion

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signedRequest),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`RedSys iniciaPeticion HTTP ${response.status}: ${text}`)
  }

  const raw = (await response.json()) as RedsysRestResponse

  if ("errorCode" in raw) {
    throw new Error(`RedSys error: ${raw.errorCode}`)
  }

  if (!raw.Ds_MerchantParameters || !raw.Ds_Signature) {
    throw new Error("RedSys returned an unexpected unsigned response")
  }

  const merchantKey = getSecretKey()
  const verified = verifySignature(merchantKey, raw.Ds_MerchantParameters, raw.Ds_Signature)
  const params = decodeMerchantParams<RedsysResponseParams>(raw.Ds_MerchantParameters)

  return { params, raw, verified }
}

/**
 * Authorize a payment using an InSite idOper.
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

  if (tokenize) {
    params.DS_MERCHANT_IDENTIFIER = "REQUIRED"
    params.DS_MERCHANT_COF_INI = "S"
    params.DS_MERCHANT_COF_TYPE = cofType ?? "R"
  }

  const doAuthorization = async (): Promise<ExecutePaymentResult> => {
    const signedRequest = buildSignedRequest(params)
    const { params: responseParams, verified } = await trataPeticionREST(signedRequest)

    if (!verified) {
      return { success: false, error: "Signature verification failed", errorCode: "SIG_FAIL" }
    }

    const dsResponse = responseParams.Ds_Response ?? ""

    if (isAuthorizationSuccess(dsResponse)) {
      const cardNumber = responseParams.Ds_CardNumber ?? ""

      return {
        success: true,
        dsResponse,
        authorizationCode: responseParams.Ds_AuthorisationCode ?? undefined,
        cardBrand: responseParams.Ds_Card_Brand ?? undefined,
        lastFour: cardNumber.slice(-4) || undefined,
        redsysToken: responseParams.Ds_Merchant_Identifier ?? undefined,
        redsysTokenExpiry: responseParams.Ds_ExpiryDate ?? undefined,
        cofTxnId: responseParams.Ds_Merchant_Cof_Txnid ?? undefined,
      }
    }

    return {
      success: false,
      dsResponse,
      error: `Pago denegado (codigo: ${dsResponse})`,
      errorCode: dsResponse,
    }
  }

  try {
    return await doAuthorization()
  } catch (error) {
    console.error("[redsys/client] authorizeWithIdOper failed", { order, error })
    const message = error instanceof Error ? error.message : "Error de red"
    const sisCode = message.match(/\bSIS\d{4}\b/)?.[0]

    return {
      success: false,
      error: message,
      errorCode: sisCode ?? "NETWORK",
    }
  }
}

/**
 * Charge a stored card token via MIT (merchant-initiated transaction).
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
    DS_MERCHANT_COF_INI: "N",
    DS_MERCHANT_COF_TXNID: cofTxnId,
    DS_MERCHANT_EXCEP_SCA: "MIT",
    DS_MERCHANT_DIRECTPAYMENT: "true",
  }

  if (description) {
    params.DS_MERCHANT_PRODUCTDESCRIPTION = description
  }

  try {
    const signedRequest = buildSignedRequest(params)
    const { params: responseParams, verified } = await trataPeticionREST(signedRequest)

    if (!verified) {
      return { success: false, error: "Signature verification failed", errorCode: "SIG_FAIL" }
    }

    const dsResponse = responseParams.Ds_Response ?? ""

    if (isAuthorizationSuccess(dsResponse)) {
      return {
        success: true,
        dsResponse,
        authorizationCode: responseParams.Ds_AuthorisationCode ?? undefined,
        cofTxnId: responseParams.Ds_Merchant_Cof_Txnid ?? cofTxnId,
      }
    }

    return {
      success: false,
      dsResponse,
      error: `Cobro MIT denegado (codigo: ${dsResponse})`,
      errorCode: dsResponse,
    }
  } catch (error) {
    console.error("[redsys/client] chargeMIT failed", { order, error })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error de red",
      errorCode: "NETWORK",
    }
  }
}

/** Map of known SIS error codes to human-readable messages */
const SIS_ERROR_MESSAGES: Record<string, string> = {
  SIS0034: "Error de acceso a la base de datos de Redsys. Posibles causas: el pedido original no se encuentra, el terminal no tiene habilitadas las devoluciones, o error temporal del sistema. Contacta con Getnet/Redsys para verificar que tu terminal tiene permisos de devolución.",
  SIS0218: "El terminal no tiene habilitadas operaciones seguras vía WebService/REST.",
  SIS0256: "El comercio no permite devoluciones.",
  SIS0057: "El importe de la devolución supera el de la operación original.",
}

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
    DS_MERCHANT_DIRECTPAYMENT: "true",
    // Exclude notification URL for synchronous refund — set to undefined
    // so buildSignedRequest's cleanParams loop will omit it
    DS_MERCHANT_MERCHANTURL: undefined as unknown as string,
  }

  try {
    const signedRequest = buildSignedRequest(params)
    const { params: responseParams, verified } = await trataPeticionREST(signedRequest)

    if (!verified) {
      return { success: false, error: "Signature verification failed", errorCode: "SIG_FAIL" }
    }

    const dsResponse = responseParams.Ds_Response ?? ""

    if (isSuccessResponse(dsResponse)) {
      return {
        success: true,
        dsResponse,
        authorizationCode: responseParams.Ds_AuthorisationCode ?? undefined,
      }
    }

    return {
      success: false,
      dsResponse,
      error: `Devolucion denegada (codigo: ${dsResponse})`,
      errorCode: dsResponse,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de red"
    // Check if the error contains a known SIS code
    const sisMatch = message.match(/SIS(\d{4})/)
    const sisCode = sisMatch ? `SIS${sisMatch[1]}` : null
    const friendlyMsg = sisCode && SIS_ERROR_MESSAGES[sisCode]
      ? `${SIS_ERROR_MESSAGES[sisCode]} (${sisCode})`
      : message

    console.error("[redsys/client] processRefund failed", {
      originalOrder,
      error,
      sisCode,
      friendlyMessage: friendlyMsg,
    })
    return {
      success: false,
      error: friendlyMsg,
      errorCode: sisCode ?? "NETWORK",
    }
  }
}

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
    const signedRequest = buildSignedRequest(params)
    const { params: responseParams, verified } = await trataPeticionREST(signedRequest)

    if (!verified) {
      return { success: false, error: "Signature verification failed" }
    }

    const dsResponse = responseParams.Ds_Response ?? ""
    return {
      success: isSuccessResponse(dsResponse),
      error: isSuccessResponse(dsResponse) ? undefined : `No se pudo borrar el token (${dsResponse})`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}
