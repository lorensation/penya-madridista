/**
 * RedSys/Getnet Payment Gateway — barrel export
 */

// Types
export type {
  TransactionType,
  RedsysMerchantParams,
  RedsysResponseParams,
  RedsysSignedRequest,
  RedsysSignedResponse,
  RedsysRestResponse,
  SignatureVersion,
  PaymentStatus,
  PaymentContext,
  PreparePaymentResult,
  ExecutePaymentResult,
  InSiteConfig,
  PaymentTransaction,
} from "./types"

export {
  isSuccessResponse,
  isAuthorizationSuccess,
  isRefundSuccess,
  isCancellationSuccess,
} from "./types"

// Configuration
export type { PlanType, PaymentInterval, MembershipPlan } from "./config"
export {
  REDSYS_ENDPOINTS,
  CURRENCY_EUR,
  SIGNATURE_VERSION,
  RESPONSE_CODES,
  TEST_CREDENTIALS,
  MEMBERSHIP_PLANS,
  getMembershipPlan,
  getRedsysEnv,
  getEndpoints,
  getMerchantCode,
  getTerminal,
  getSecretKey,
  getNotificationUrl,
  getBaseUrl,
} from "./config"

// Signature
export {
  createSignature,
  verifySignature,
  encodeMerchantParams,
  decodeMerchantParams,
} from "./signature"

// Client (server-only REST calls)
export {
  buildSignedRequest,
  trataPeticionREST,
  iniciaPeticionREST,
  authorizeWithIdOper,
  chargeMIT,
  processRefund,
  deleteToken,
} from "./client"

// Order number
export type { OrderPrefix } from "./order-number"
export {
  generateOrderNumber,
  getOrderPrefix,
  isValidOrderNumber,
} from "./order-number"

// Recurring billing (server-only)
export type { RenewalResult, RecurringRunResult } from "./recurring"
export {
  processRenewals,
  expireCanceledSubscriptions,
} from "./recurring"
