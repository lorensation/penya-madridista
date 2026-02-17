/**
 * RedSys/Getnet Payment Gateway — TypeScript Type Definitions
 *
 * Based on Getnet Developer Portal documentation:
 *  - InSite (iframe → idOper → REST)
 *  - REST API (trataPeticionREST / iniciaPeticionREST)
 *  - COF / Tokenization / 1-Click
 *  - MIT recurring (Merchant-Initiated Transactions)
 *
 * Signature algorithm: HMAC_SHA256_V1 with 3DES key derivation
 */

// ── Transaction Types ────────────────────────────────────────────────────────

/** DS_MERCHANT_TRANSACTIONTYPE values */
export type TransactionType =
  | "0"  // Authorization (standard payment)
  | "1"  // Pre-authorization
  | "2"  // Pre-authorization confirmation   (Ds_Response OK = 0900)
  | "3"  // Refund                            (Ds_Response OK = 0900)
  | "7"  // Card validation
  | "8"  // Validation confirmation
  | "9"  // Pre-auth cancellation             (Ds_Response OK = 0400)
  | "44" // Delete reference/token
  | "45" // Payment cancellation              (Ds_Response OK = 0400)
  | "46" // Refund cancellation               (Ds_Response OK = 0400)
  | "47" // Cancel auth confirmation          (Ds_Response OK = 0400)
  | "F"  // Paygold (Get Link&Pay)

// ── Request Parameters (DS_MERCHANT_*) ───────────────────────────────────────

/** Merchant parameters sent in DS_MERCHANT_* fields */
export interface RedsysMerchantParams {
  /** Amount in cents — EUR 43.45 → "4345" */
  DS_MERCHANT_AMOUNT: string
  /** ISO-4217 numeric currency code — EUR = "978" */
  DS_MERCHANT_CURRENCY: string
  /**
   * Order number (max 12 chars).
   * First 4 chars MUST be numeric; rest [0-9A-Za-z].
   */
  DS_MERCHANT_ORDER: string
  /** Merchant code (FUC) */
  DS_MERCHANT_MERCHANTCODE: string
  /** Terminal number */
  DS_MERCHANT_TERMINAL: string
  /** Transaction type */
  DS_MERCHANT_TRANSACTIONTYPE: TransactionType

  // ── InSite ──
  /** InSite operation ID (token from the iframe) */
  DS_MERCHANT_IDOPER?: string

  // ── Notification / Redirect URLs ──
  /** Server-to-server notification URL (POST with result) */
  DS_MERCHANT_MERCHANTURL?: string
  /** Return URL on success (redirect mode only) */
  DS_MERCHANT_URLOK?: string
  /** Return URL on failure  (redirect mode only) */
  DS_MERCHANT_URLKO?: string

  // ── Tokenization / 1-Click ──
  /**
   * Card reference / token.
   *  - "REQUIRED" → request new reference generation.
   *  - <stored_value> → pay with previously stored reference.
   */
  DS_MERCHANT_IDENTIFIER?: string

  // ── COF (Credential-On-File) ──
  /**
   * First COF transaction flag.
   *  "S" = first transaction (storing credentials).
   *  Optional when DS_MERCHANT_IDENTIFIER = "REQUIRED".
   */
  DS_MERCHANT_COF_INI?: "S" | "N"
  /**
   * COF type.
   *  "R" = Recurring, "I" = Installments,
   *  "H" = Reauthorization, "E" = Resubmission
   */
  DS_MERCHANT_COF_TYPE?: "R" | "I" | "H" | "E"
  /**
   * COF transaction ID returned in the initial COF transaction.
   * Must be sent in every subsequent COF transaction.
   * "999999999999999" = legacy wildcard (may be deprecated by some brands).
   */
  DS_MERCHANT_COF_TXNID?: string

  // ── PSD2 / SCA ──
  /**
   * PSD2 SCA exemption.
   *  "MIT" = Merchant Initiated Transaction (needs entity activation).
   */
  DS_MERCHANT_EXCEP_SCA?: "MIT" | "LWV" | "TRA" | "COR" | "MOT"
  /**
   * Direct-payment flag.
   *  "true" → skip authentication screens (MIT / 1-Click with valid ref).
   *  "MOTO" → mail / telephone order.
   */
  DS_MERCHANT_DIRECTPAYMENT?: "true" | "moto" | "MOTO"

  // ── 3DS / EMV3DS ──
  /** JSON string with EMV 3DS authentication data */
  DS_MERCHANT_EMV3DS?: string

  // ── DCC ──
  /** DCC flag or JSON object */
  DS_MERCHANT_DCC?: string

  // ── Descriptive ──
  /** Product / order description (shown on receipt) */
  DS_MERCHANT_PRODUCTDESCRIPTION?: string
  /** Cardholder name */
  DS_MERCHANT_TITULAR?: string

  // ── Paygold ──
  DS_MERCHANT_CUSTOMER_MOBILE?: string
  DS_MERCHANT_CUSTOMER_MAIL?: string
  DS_MERCHANT_P2F_EXPIRYDATE?: string
  DS_MERCHANT_CUSTOMER_SMS_TEXT?: string
  DS_MERCHANT_P2F_XMLDATA?: string

  // ── General ──
  /** Merchant data (free-form, echoed back in response) */
  DS_MERCHANT_MERCHANTDATA?: string
}

// ── Response Parameters (Ds_*) ───────────────────────────────────────────────

/** Parameters decoded from Ds_MerchantParameters in the response */
export interface RedsysResponseParams {
  Ds_Date?: string
  Ds_Hour?: string
  Ds_Amount?: string
  Ds_Currency?: string
  Ds_Order?: string
  Ds_MerchantCode?: string
  Ds_Terminal?: string
  /** Result code — THE critical field. See helper functions below. */
  Ds_Response?: string
  Ds_AuthorisationCode?: string
  Ds_TransactionType?: string
  Ds_SecurePayment?: string
  Ds_Language?: string
  /** Masked card number (e.g. "454881******0004") */
  Ds_CardNumber?: string
  Ds_Card_Brand?: string
  Ds_Card_Country?: string
  Ds_MerchantData?: string
  /** Card expiry returned when a reference is generated (YYMM) */
  Ds_ExpiryDate?: string
  /** Card reference/token — returned when IDENTIFIER = "REQUIRED" */
  Ds_Merchant_Identifier?: string
  /** COF transaction ID — store for subsequent transactions */
  Ds_Merchant_Cof_Txnid?: string
  /** Error code (if any) */
  Ds_ErrorCode?: string
  Ds_ProcessedPayMethod?: string
}

// ── Signature / Signed Messages ──────────────────────────────────────────────

export type SignatureVersion = "HMAC_SHA256_V1"

export interface RedsysSignedRequest {
  Ds_SignatureVersion: SignatureVersion
  Ds_MerchantParameters: string // Base64-encoded JSON of merchant params
  Ds_Signature: string          // HMAC_SHA256_V1 signature
}

export interface RedsysSignedResponse {
  Ds_SignatureVersion: SignatureVersion
  Ds_MerchantParameters: string
  Ds_Signature: string
}

// ── REST API Response ────────────────────────────────────────────────────────

export type RedsysRestResponse = RedsysSignedResponse

// ── Ds_Response Helpers ──────────────────────────────────────────────────────

/** Is any successful response (auth-OK, refund-OK, cancel-OK) */
export function isSuccessResponse(dsResponse: string): boolean {
  const code = parseInt(dsResponse, 10)
  return (code >= 0 && code <= 99) || code === 900 || code === 400
}

/** Is a successful authorization (0000-0099) */
export function isAuthorizationSuccess(dsResponse: string): boolean {
  const code = parseInt(dsResponse, 10)
  return code >= 0 && code <= 99
}

/** Is a successful refund / confirmation (0900) */
export function isRefundSuccess(dsResponse: string): boolean {
  return parseInt(dsResponse, 10) === 900
}

/** Is a successful cancellation (0400) */
export function isCancellationSuccess(dsResponse: string): boolean {
  return parseInt(dsResponse, 10) === 400
}

// ── Payment Status (internal DB) ─────────────────────────────────────────────

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "denied"
  | "error"
  | "refunded"
  | "cancelled"

export type PaymentContext = "shop" | "membership"

// ── Action Results ───────────────────────────────────────────────────────────

export interface PreparePaymentResult {
  success: boolean
  order?: string
  amountCents?: number
  error?: string
  transactionId?: string
}

export interface ExecutePaymentResult {
  success: boolean
  dsResponse?: string
  authorizationCode?: string
  cardBrand?: string
  lastFour?: string
  /** Card token generated (only when IDENTIFIER = "REQUIRED") */
  redsysToken?: string
  /** Card expiry for the token (YYMM) */
  redsysTokenExpiry?: string
  /** COF transaction ID (store for MIT renewals) */
  cofTxnId?: string
  error?: string
  errorCode?: string
}

// ── InSite Client Config ─────────────────────────────────────────────────────

export interface InSiteConfig {
  id: string
  fuc: string
  terminal: string
  order: string
  styleButton?: string
  styleBody?: string
  styleBox?: string
  styleBoxText?: string
  buttonValue?: string
  idiomaInsite?: string
  mostrarLogoInsite?: boolean
  estiloReducidoInsite?: boolean
  estiloInsite?: "inline" | "twoRows"
}

// ── DB Record: payment_transactions ──────────────────────────────────────────

export interface PaymentTransaction {
  id: string
  redsys_order: string
  transaction_type: TransactionType
  amount_cents: number
  currency: string
  status: PaymentStatus
  ds_response: string | null
  ds_authorization_code: string | null
  ds_card_brand: string | null
  ds_card_country: string | null
  last_four: string | null
  member_id: string | null
  subscription_id: string | null
  order_id: string | null
  redsys_token: string | null
  cof_txn_id: string | null
  is_mit: boolean
  context: PaymentContext
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}
