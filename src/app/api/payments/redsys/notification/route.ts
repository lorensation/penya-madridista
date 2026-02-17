/**
 * RedSys Notification Handler (server-to-server callback)
 *
 * RedSys sends a POST to this URL after processing a payment.
 * The body contains: Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature
 * (form-urlencoded or JSON).
 *
 * This handler:
 *   1. Verifies the signature (HMAC_SHA256_V1)
 *   2. Parses the response parameters
 *   3. Updates the payment_transactions table
 *   4. Returns HTTP 200 (MUST — otherwise RedSys retries)
 *
 * Route: POST /api/payments/redsys/notification
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  verifySignature,
  decodeMerchantParams,
  getSecretKey,
  isAuthorizationSuccess,
  isSuccessResponse,
} from "@/lib/redsys"
import type { RedsysResponseParams, PaymentStatus } from "@/lib/redsys"

// Admin client — bypasses RLS
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

export async function POST(request: NextRequest) {
  try {
    // ── 1. Parse body (handle both form-urlencoded and JSON) ────────────

    let dsMerchantParameters: string | undefined
    let dsSignature: string | undefined

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData()
      dsMerchantParameters = formData.get("Ds_MerchantParameters")?.toString()
      dsSignature = formData.get("Ds_Signature")?.toString()
    } else {
      // Try JSON
      const body = await request.json().catch(() => null)
      if (body) {
        dsMerchantParameters = body.Ds_MerchantParameters
        dsSignature = body.Ds_Signature
      }
    }

    if (!dsMerchantParameters || !dsSignature) {
      console.error("[redsys/notification] Missing required parameters")
      // Still return 200 to avoid retries
      return NextResponse.json({ status: "error", message: "Missing parameters" }, { status: 200 })
    }

    // ── 2. Verify signature ────────────────────────────────────────────────

    const merchantKey = getSecretKey()
    const isValid = verifySignature(merchantKey, dsMerchantParameters, dsSignature)

    if (!isValid) {
      console.error("[redsys/notification] INVALID SIGNATURE — possible tamper attempt")
      return NextResponse.json({ status: "error", message: "Invalid signature" }, { status: 200 })
    }

    // ── 3. Parse response parameters ───────────────────────────────────────

    const params = decodeMerchantParams<RedsysResponseParams>(dsMerchantParameters)
    const dsOrder = params.Ds_Order
    const dsResponse = params.Ds_Response ?? ""
    const dsAmount = params.Ds_Amount
    const dsAuthCode = params.Ds_AuthorisationCode

    console.log(`[redsys/notification] Order=${dsOrder} Response=${dsResponse} Amount=${dsAmount} AuthCode=${dsAuthCode}`)

    if (!dsOrder) {
      console.error("[redsys/notification] No Ds_Order in response")
      return NextResponse.json({ status: "ok" }, { status: 200 })
    }

    // ── 4. Deduplicate — only process if transaction is still pending ──────

    const { data: txn, error: txnErr } = await admin
      .from("payment_transactions")
      .select("id, status, context, redsys_order")
      .eq("redsys_order", dsOrder)
      .single()

    if (txnErr || !txn) {
      console.warn(`[redsys/notification] Transaction not found for order ${dsOrder}`)
      return NextResponse.json({ status: "ok" }, { status: 200 })
    }

    // Skip if already processed (idempotency guard)
    if (txn.status !== "pending") {
      console.log(`[redsys/notification] Order ${dsOrder} already processed (status: ${txn.status})`)
      return NextResponse.json({ status: "ok", message: "Already processed" }, { status: 200 })
    }

    // ── 5. Determine result and update transaction ─────────────────────────

    let newStatus: PaymentStatus = "error"
    if (isAuthorizationSuccess(dsResponse)) {
      newStatus = "authorized"
    } else if (isSuccessResponse(dsResponse)) {
      newStatus = "authorized" // Refund/confirmation OK
    } else {
      newStatus = "denied"
    }

    const cardNumber = params.Ds_CardNumber ?? ""

    await admin
      .from("payment_transactions")
      .update({
        status: newStatus,
        ds_response: dsResponse,
        ds_authorization_code: dsAuthCode ?? null,
        ds_card_brand: params.Ds_Card_Brand ?? null,
        ds_card_country: params.Ds_Card_Country ?? null,
        last_four: cardNumber.slice(-4) || null,
        redsys_token: params.Ds_Merchant_Identifier ?? null,
        cof_txn_id: params.Ds_Merchant_Cof_Txnid ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", txn.id)

    // ── 6. Context-specific post-processing ────────────────────────────────

    if (newStatus === "authorized" && txn.context === "shop") {
      console.log(`[redsys/notification] Shop payment confirmed: ${dsOrder}`)
      // Shop order creation is handled synchronously in executePayment.
      // The notification is a secondary confirmation — update order status if exists.
      await admin
        .from("orders")
        .update({ status: "paid" })
        .eq("redsys_order", dsOrder)
    }

    if (newStatus === "authorized" && txn.context === "membership") {
      console.log(`[redsys/notification] Membership payment confirmed: ${dsOrder}`)
      // Subscription activation is handled synchronously in executePayment.
      // The notification confirms the payment was settled.
    }

    if (newStatus === "denied") {
      console.warn(`[redsys/notification] Payment DENIED for order ${dsOrder}: ${dsResponse}`)
    }

    // ── 7. Always return 200 ───────────────────────────────────────────────

    return NextResponse.json({ status: "ok" }, { status: 200 })
  } catch (err) {
    console.error("[redsys/notification] Unhandled error:", err)
    // Return 200 even on errors to prevent RedSys retry storms
    return NextResponse.json({ status: "error", message: "Internal error" }, { status: 200 })
  }
}
