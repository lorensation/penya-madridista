import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  decodeMerchantParams,
  getMerchantCode,
  getSecretKey,
  getTerminal,
  isAuthorizationSuccess,
  getCardLastFourExtraction,
  normalizeRedsysBase64,
  SIGNATURE_VERSION,
  verifySignature,
} from "@/lib/redsys"
import type { RedsysResponseParams } from "@/lib/redsys"
import type { Json } from "@/types/supabase"
import { finalizeMembershipPayment } from "@/lib/membership/onboarding"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

type AdminClient = ReturnType<typeof getAdminClient>

interface ShopTxnItem {
  variantId: string
  qty: number
  priceCents: number
  productName: string
}

interface ShopShipping {
  fullName: string
  email: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  shippingCents: number
}

interface PaymentTransactionRow {
  id: string
  status: string
  context: string
  amount_cents: number
  redsys_order: string
  member_id: string | null
  last_four: string | null
  created_at: string
  metadata: Json | null
}

type NotificationEvent =
  | "redsys.notification.received"
  | "redsys.notification.ignored"
  | "redsys.notification.failed"
  | "redsys.notification.completed"

type NotificationReason =
  | "missing_fields"
  | "invalid_signature"
  | "unknown_order"
  | "amount_mismatch"
  | "merchant_mismatch"
  | "terminal_mismatch"
  | "status_transition_failed"
  | "membership_finalization_failed"
  | "success"
  | "already_processed"
  | "unsupported_signature_version"
  | "decode_failed"
  | "missing_order"
  | "denied"
  | "fulfillment_failed"
  | "unhandled_error"

interface NotificationLogFields {
  event: NotificationEvent
  reason: NotificationReason
  redsys_order?: string | null
  transaction_id?: string | null
  member_id?: string | null
  context?: string | null
  status_before?: string | null
  status_after?: string | null
  ds_response?: string | null
  authorization_code?: string | null
  amount?: number | string | null
  created_at?: string | null
  content_type?: string | null
  signature_version?: string | null
  transaction_type?: string | null
  expected_amount?: number | null
  received_amount?: string | null
  expected_merchant_code?: string | null
  received_merchant_code?: string | null
  expected_terminal?: string | null
  received_terminal?: string | null
  has_merchant_parameters?: boolean
  has_signature?: boolean
  error_message?: string | null
}

function logNotificationLastFour(options: {
  event: "redsys.last_four.found" | "redsys.last_four.missing" | "redsys.last_four.invalid" | "redsys.last_four.preserved"
  redsysOrder: string
  transactionId: string
  context: string
  signatureVerified: boolean
  lastFour?: string | null
}) {
  console.info("[redsys.last_four]", {
    event: options.event,
    redsys_order: options.redsysOrder,
    transaction_id: options.transactionId,
    context: options.context,
    signature_verified: options.signatureVerified,
    last_four: options.lastFour ?? null,
  })
}

function logLastFourExtraction(options: {
  responseParams: RedsysResponseParams
  transaction: PaymentTransactionRow
}) {
  const extraction = getCardLastFourExtraction(options.responseParams as unknown as Record<string, unknown>)

  if (extraction.reason === "found") {
    logNotificationLastFour({
      event: "redsys.last_four.found",
      redsysOrder: options.transaction.redsys_order,
      transactionId: options.transaction.id,
      context: options.transaction.context,
      signatureVerified: true,
      lastFour: extraction.lastFour,
    })
  } else if (options.transaction.last_four) {
    logNotificationLastFour({
      event: "redsys.last_four.preserved",
      redsysOrder: options.transaction.redsys_order,
      transactionId: options.transaction.id,
      context: options.transaction.context,
      signatureVerified: true,
      lastFour: options.transaction.last_four,
    })
  } else {
    logNotificationLastFour({
      event:
        extraction.reason === "invalid"
          ? "redsys.last_four.invalid"
          : "redsys.last_four.missing",
      redsysOrder: options.transaction.redsys_order,
      transactionId: options.transaction.id,
      context: options.transaction.context,
      signatureVerified: true,
    })
  }
}

function logNotification(fields: NotificationLogFields) {
  const level = fields.event === "redsys.notification.failed" ? "error" : "info"
  console[level]("[redsys.notification]", fields)
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function getStringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  return typeof value === "string" ? value : undefined
}

function tryDecodeMerchantParams(value: string | undefined): RedsysResponseParams | null {
  if (!value) {
    return null
  }

  try {
    return decodeMerchantParams<RedsysResponseParams>(value)
  } catch {
    return null
  }
}

function parseMetadataRecord(metadata: Json | null): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>
  }

  return {}
}

function parseInteger(value: string | undefined): number | null {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseContextMetadata(metadata: Json | null): {
  items: ShopTxnItem[]
  shipping: ShopShipping | null
  planType: string | null
  interval: string | null
} {
  const record = parseMetadataRecord(metadata)

  const rawItems = Array.isArray(record.items) ? record.items : []
  const items = rawItems
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      variantId: String(item.variantId ?? ""),
      qty: Number(item.qty ?? 0),
      priceCents: Number(item.priceCents ?? 0),
      productName: String(item.productName ?? "Producto"),
    }))
    .filter((item) => item.variantId && Number.isFinite(item.qty) && item.qty > 0)

  const shippingRecord = record.shipping && typeof record.shipping === "object" && !Array.isArray(record.shipping)
    ? record.shipping as Record<string, unknown>
    : null

  const shipping = shippingRecord
    ? {
        fullName: String(shippingRecord.fullName ?? ""),
        email: String(shippingRecord.email ?? ""),
        address: String(shippingRecord.address ?? ""),
        city: String(shippingRecord.city ?? ""),
        postalCode: String(shippingRecord.postalCode ?? ""),
        country: String(shippingRecord.country ?? ""),
        phone: String(shippingRecord.phone ?? ""),
        shippingCents: Number(shippingRecord.shippingCents ?? 0),
      }
    : null

  return {
    items,
    shipping,
    planType: typeof record.planType === "string" ? record.planType : null,
    interval: typeof record.interval === "string" ? record.interval : null,
  }
}

async function handleAuthorizedShopPayment(admin: AdminClient, transaction: PaymentTransactionRow) {
  const { items, shipping } = parseContextMetadata(transaction.metadata)

  if (items.length === 0) {
    throw new Error("Shop transaction metadata is missing items")
  }

  const { data: existingOrder, error: existingOrderError } = await admin
    .from("orders")
    .select("id")
    .eq("redsys_order", transaction.redsys_order)
    .maybeSingle()

  if (existingOrderError) {
    throw new Error(`Failed checking existing order: ${existingOrderError.message}`)
  }

  let orderId = existingOrder?.id

  if (!orderId) {
    const { data: createdOrder, error: createOrderError } = await admin
      .from("orders")
      .insert({
        user_id: transaction.member_id,
        status: "paid",
        amount_cents: transaction.amount_cents,
        currency: "EUR",
        redsys_order: transaction.redsys_order,
        payment_method: "redsys",
        shipping: (shipping as unknown as Json) ?? null,
        metadata: { source: "redsys_redirect" },
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (createOrderError || !createdOrder) {
      throw new Error(`Failed creating order: ${createOrderError?.message ?? "unknown"}`)
    }

    orderId = createdOrder.id

    const { error: orderItemsError } = await admin
      .from("order_items")
      .insert(
        items.map((item) => ({
          order_id: orderId,
          variant_id: item.variantId,
          qty: item.qty,
          price_cents: item.priceCents,
          product_name: item.productName,
        })),
      )

    if (orderItemsError) {
      throw new Error(`Failed creating order items: ${orderItemsError.message}`)
    }

    for (const item of items) {
      const { error: inventoryError } = await admin.rpc("decrement_inventory", {
        variant_id: item.variantId,
        qty: item.qty,
      })

      if (inventoryError) {
        throw new Error(`Failed decrementing inventory: ${inventoryError.message}`)
      }
    }
  }

  await admin
    .from("payment_transactions")
    .update({
      order_id: orderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transaction.id)
}

async function handleAuthorizedCardUpdate(
  admin: AdminClient,
  transaction: PaymentTransactionRow,
  responseParams: RedsysResponseParams,
) {
  const memberId = transaction.member_id
  if (!memberId) {
    throw new Error("Card update transaction has no member_id")
  }

  const { data: latestSubscription, error: latestSubscriptionError } = await admin
    .from("subscriptions")
    .select("id, last_four")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestSubscriptionError) {
    throw new Error(`Failed loading subscription for card update: ${latestSubscriptionError.message}`)
  }

  if (latestSubscription) {
    const extractedLastFour = getCardLastFourExtraction(responseParams as unknown as Record<string, unknown>)
    const nextLastFour = extractedLastFour.lastFour ?? latestSubscription.last_four

    if (extractedLastFour.reason === "found") {
      logNotificationLastFour({
        event: "redsys.last_four.found",
        redsysOrder: transaction.redsys_order,
        transactionId: transaction.id,
        context: transaction.context,
        signatureVerified: true,
        lastFour: extractedLastFour.lastFour,
      })
    } else if (latestSubscription.last_four) {
      logNotificationLastFour({
        event: "redsys.last_four.preserved",
        redsysOrder: transaction.redsys_order,
        transactionId: transaction.id,
        context: transaction.context,
        signatureVerified: true,
        lastFour: latestSubscription.last_four,
      })
    } else {
      logNotificationLastFour({
        event:
          extractedLastFour.reason === "invalid"
            ? "redsys.last_four.invalid"
            : "redsys.last_four.missing",
        redsysOrder: transaction.redsys_order,
        transactionId: transaction.id,
        context: transaction.context,
        signatureVerified: true,
      })
    }

    const { error: updateSubscriptionError } = await admin
      .from("subscriptions")
      .update({
        last_four: nextLastFour,
        redsys_token: responseParams.Ds_Merchant_Identifier ?? null,
        redsys_token_expiry: responseParams.Ds_ExpiryDate ?? null,
        redsys_cof_txn_id: responseParams.Ds_Merchant_Cof_Txnid ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", latestSubscription.id)

    if (updateSubscriptionError) {
      throw new Error(`Failed updating subscription token fields: ${updateSubscriptionError.message}`)
    }
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || ""
  let decodedForLogs: RedsysResponseParams | null = null

  try {
    let dsMerchantParameters: string | undefined
    let dsSignature: string | undefined
    let dsSignatureVersion: string | undefined

    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData()
      dsMerchantParameters = formData.get("Ds_MerchantParameters")?.toString()
      dsSignature = formData.get("Ds_Signature")?.toString()
      dsSignatureVersion = formData.get("Ds_SignatureVersion")?.toString()
    } else {
      const body = await request.json().catch(() => null)
      if (body && typeof body === "object") {
        const record = body as Record<string, unknown>
        dsMerchantParameters = getStringField(record, "Ds_MerchantParameters")
        dsSignature = getStringField(record, "Ds_Signature")
        dsSignatureVersion = getStringField(record, "Ds_SignatureVersion")
      }
    }

    logNotification({
      event: "redsys.notification.received",
      reason: "success",
      content_type: contentType,
      signature_version: dsSignatureVersion ?? null,
      has_merchant_parameters: Boolean(dsMerchantParameters),
      has_signature: Boolean(dsSignature),
    })

    if (!dsMerchantParameters || !dsSignature || !dsSignatureVersion) {
      logNotification({
        event: "redsys.notification.failed",
        reason: "missing_fields",
        content_type: contentType,
        signature_version: dsSignatureVersion ?? null,
        has_merchant_parameters: Boolean(dsMerchantParameters),
        has_signature: Boolean(dsSignature),
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const normalizedParams = normalizeRedsysBase64(dsMerchantParameters)
    const normalizedSignature = normalizeRedsysBase64(dsSignature)
    decodedForLogs = tryDecodeMerchantParams(normalizedParams)

    if (dsSignatureVersion !== SIGNATURE_VERSION) {
      logNotification({
        event: "redsys.notification.failed",
        reason: "unsupported_signature_version",
        redsys_order: decodedForLogs?.Ds_Order ?? null,
        ds_response: decodedForLogs?.Ds_Response ?? null,
        authorization_code: decodedForLogs?.Ds_AuthorisationCode ?? null,
        amount: decodedForLogs?.Ds_Amount ?? null,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        transaction_type: decodedForLogs?.Ds_TransactionType ?? null,
        has_merchant_parameters: true,
        has_signature: true,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const isValidSignature = verifySignature(getSecretKey(), normalizedParams, normalizedSignature)

    if (!isValidSignature) {
      logNotification({
        event: "redsys.notification.failed",
        reason: "invalid_signature",
        redsys_order: decodedForLogs?.Ds_Order ?? null,
        ds_response: decodedForLogs?.Ds_Response ?? null,
        authorization_code: decodedForLogs?.Ds_AuthorisationCode ?? null,
        amount: decodedForLogs?.Ds_Amount ?? null,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        transaction_type: decodedForLogs?.Ds_TransactionType ?? null,
        has_merchant_parameters: true,
        has_signature: true,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    let responseParams: RedsysResponseParams
    try {
      responseParams = decodeMerchantParams<RedsysResponseParams>(normalizedParams)
    } catch (error) {
      logNotification({
        event: "redsys.notification.failed",
        reason: "decode_failed",
        redsys_order: decodedForLogs?.Ds_Order ?? null,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        error_message: getErrorMessage(error),
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const order = responseParams.Ds_Order

    if (!order) {
      logNotification({
        event: "redsys.notification.failed",
        reason: "missing_order",
        ds_response: responseParams.Ds_Response ?? null,
        authorization_code: responseParams.Ds_AuthorisationCode ?? null,
        amount: responseParams.Ds_Amount ?? null,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        transaction_type: responseParams.Ds_TransactionType ?? null,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const admin = getAdminClient()

    const { data: transaction, error: txnError } = await admin
      .from("payment_transactions")
      .select("id, status, context, amount_cents, redsys_order, member_id, last_four, created_at, metadata")
      .eq("redsys_order", order)
      .maybeSingle()

    if (txnError || !transaction) {
      logNotification({
        event: "redsys.notification.failed",
        reason: "unknown_order",
        redsys_order: order,
        ds_response: responseParams.Ds_Response ?? null,
        authorization_code: responseParams.Ds_AuthorisationCode ?? null,
        amount: responseParams.Ds_Amount ?? null,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        transaction_type: responseParams.Ds_TransactionType ?? null,
        error_message: txnError?.message ?? null,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (transaction.status !== "pending") {
      logNotification({
        event: "redsys.notification.ignored",
        reason: "already_processed",
        redsys_order: order,
        transaction_id: transaction.id,
        member_id: transaction.member_id,
        context: transaction.context,
        status_before: transaction.status,
        status_after: transaction.status,
        ds_response: responseParams.Ds_Response ?? null,
        authorization_code: responseParams.Ds_AuthorisationCode ?? null,
        amount: transaction.amount_cents,
        created_at: transaction.created_at,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        transaction_type: responseParams.Ds_TransactionType ?? null,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const transactionMetadata = parseMetadataRecord(transaction.metadata)
    const transactionMetadataType =
      typeof transactionMetadata.type === "string" ? transactionMetadata.type : null
    const isMembershipCheckout = transaction.context === "membership" && transactionMetadataType !== "card_update"
    const notifiedAmount = parseInteger(responseParams.Ds_Amount)
    const isCardUpdateZeroAmount = transactionMetadataType === "card_update" && transaction.amount_cents === 0

    if ((notifiedAmount === null && !isCardUpdateZeroAmount) || (notifiedAmount !== null && notifiedAmount !== transaction.amount_cents)) {
      await admin
        .from("payment_transactions")
        .update({
          status: "error",
          ds_response: responseParams.Ds_Response ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .eq("status", "pending")

      logNotification({
        event: "redsys.notification.failed",
        reason: "amount_mismatch",
        redsys_order: order,
        transaction_id: transaction.id,
        member_id: transaction.member_id,
        context: transaction.context,
        status_before: transaction.status,
        status_after: "error",
        ds_response: responseParams.Ds_Response ?? null,
        authorization_code: responseParams.Ds_AuthorisationCode ?? null,
        amount: transaction.amount_cents,
        created_at: transaction.created_at,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        transaction_type: responseParams.Ds_TransactionType ?? null,
        expected_amount: transaction.amount_cents,
        received_amount: responseParams.Ds_Amount ?? null,
      })

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const expectedMerchantCode = getMerchantCode()
    const expectedTerminal = getTerminal()

    if (
      (responseParams.Ds_MerchantCode && responseParams.Ds_MerchantCode !== expectedMerchantCode) ||
      (responseParams.Ds_Terminal && responseParams.Ds_Terminal !== expectedTerminal)
    ) {
      await admin
        .from("payment_transactions")
        .update({
          status: "error",
          ds_response: responseParams.Ds_Response ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .eq("status", "pending")

      logNotification({
        event: "redsys.notification.failed",
        reason:
          responseParams.Ds_MerchantCode && responseParams.Ds_MerchantCode !== expectedMerchantCode
            ? "merchant_mismatch"
            : "terminal_mismatch",
        redsys_order: order,
        transaction_id: transaction.id,
        member_id: transaction.member_id,
        context: transaction.context,
        status_before: transaction.status,
        status_after: "error",
        ds_response: responseParams.Ds_Response ?? null,
        authorization_code: responseParams.Ds_AuthorisationCode ?? null,
        amount: transaction.amount_cents,
        created_at: transaction.created_at,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        transaction_type: responseParams.Ds_TransactionType ?? null,
        expected_merchant_code: expectedMerchantCode,
        received_merchant_code: responseParams.Ds_MerchantCode ?? null,
        expected_terminal: expectedTerminal,
        received_terminal: responseParams.Ds_Terminal ?? null,
      })

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const dsResponse = responseParams.Ds_Response ?? ""
    const nextStatus = isAuthorizationSuccess(dsResponse) ? "authorized" : "denied"

    if (isMembershipCheckout) {
      if (nextStatus !== "authorized") {
        await admin
          .from("payment_transactions")
          .update({
            status: "denied",
            ds_response: dsResponse || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transaction.id)
          .eq("status", "pending")

        logNotification({
          event: "redsys.notification.completed",
          reason: "denied",
          redsys_order: order,
          transaction_id: transaction.id,
          member_id: transaction.member_id,
          context: transaction.context,
          status_before: transaction.status,
          status_after: "denied",
          ds_response: dsResponse || null,
          authorization_code: responseParams.Ds_AuthorisationCode ?? null,
          amount: transaction.amount_cents,
          created_at: transaction.created_at,
          content_type: contentType,
          signature_version: dsSignatureVersion,
          transaction_type: responseParams.Ds_TransactionType ?? null,
        })

        return NextResponse.json({ ok: true }, { status: 200 })
      }

      const finalized = await finalizeMembershipPayment({
        order,
        expectedMemberId: transaction.member_id,
        responseParams,
        admin,
      })

      if (!finalized.success) {
        logNotification({
          event: "redsys.notification.failed",
          reason: "membership_finalization_failed",
          redsys_order: order,
          transaction_id: transaction.id,
          member_id: transaction.member_id,
          context: transaction.context,
          status_before: transaction.status,
          status_after: finalized.status ?? "error",
          ds_response: dsResponse || null,
          authorization_code: responseParams.Ds_AuthorisationCode ?? null,
          amount: transaction.amount_cents,
          created_at: transaction.created_at,
          content_type: contentType,
          signature_version: dsSignatureVersion,
          transaction_type: responseParams.Ds_TransactionType ?? null,
          error_message: finalized.error ?? null,
        })
      } else {
        logNotification({
          event: "redsys.notification.completed",
          reason: "success",
          redsys_order: order,
          transaction_id: finalized.transactionId ?? transaction.id,
          member_id: transaction.member_id,
          context: transaction.context,
          status_before: transaction.status,
          status_after: finalized.status ?? "authorized",
          ds_response: dsResponse || null,
          authorization_code: responseParams.Ds_AuthorisationCode ?? null,
          amount: transaction.amount_cents,
          created_at: transaction.created_at,
          content_type: contentType,
          signature_version: dsSignatureVersion,
          transaction_type: responseParams.Ds_TransactionType ?? null,
        })
      }

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const extractedLastFour = getCardLastFourExtraction(responseParams as unknown as Record<string, unknown>)
    const nextLastFour = extractedLastFour.lastFour ?? transaction.last_four

    if (nextStatus === "authorized") {
      logLastFourExtraction({
        responseParams,
        transaction: transaction as PaymentTransactionRow,
      })
    }

    const claimed = await admin
      .from("payment_transactions")
      .update({
        status: nextStatus,
        ds_response: dsResponse || null,
        ds_authorization_code: responseParams.Ds_AuthorisationCode ?? null,
        ds_card_brand: responseParams.Ds_Card_Brand ?? null,
        ds_card_country: responseParams.Ds_Card_Country ?? null,
        last_four: nextStatus === "authorized" ? nextLastFour : transaction.last_four,
        redsys_token: responseParams.Ds_Merchant_Identifier ?? null,
        redsys_token_expiry: responseParams.Ds_ExpiryDate ?? null,
        cof_txn_id: responseParams.Ds_Merchant_Cof_Txnid ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)
      .eq("status", "pending")
      .select("id, status, context, amount_cents, redsys_order, member_id, last_four, created_at, metadata")
      .maybeSingle()

    if (claimed.error || !claimed.data) {
      logNotification({
        event: "redsys.notification.failed",
        reason: "status_transition_failed",
        redsys_order: order,
        transaction_id: transaction.id,
        member_id: transaction.member_id,
        context: transaction.context,
        status_before: transaction.status,
        status_after: nextStatus,
        ds_response: dsResponse || null,
        authorization_code: responseParams.Ds_AuthorisationCode ?? null,
        amount: transaction.amount_cents,
        created_at: transaction.created_at,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        transaction_type: responseParams.Ds_TransactionType ?? null,
        error_message: claimed.error?.message ?? null,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (nextStatus !== "authorized") {
      logNotification({
        event: "redsys.notification.completed",
        reason: "denied",
        redsys_order: order,
        transaction_id: claimed.data.id,
        member_id: claimed.data.member_id,
        context: claimed.data.context,
        status_before: transaction.status,
        status_after: claimed.data.status,
        ds_response: dsResponse || null,
        authorization_code: responseParams.Ds_AuthorisationCode ?? null,
        amount: claimed.data.amount_cents,
        created_at: claimed.data.created_at,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        transaction_type: responseParams.Ds_TransactionType ?? null,
      })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    try {
      if (claimed.data.context === "shop") {
        await handleAuthorizedShopPayment(admin, claimed.data as PaymentTransactionRow)
      } else if (claimed.data.context === "membership") {
        const metadata = parseMetadataRecord(claimed.data.metadata)
        const metadataType = typeof metadata.type === "string" ? metadata.type : null

        if (metadataType === "card_update") {
          await handleAuthorizedCardUpdate(admin, claimed.data as PaymentTransactionRow, responseParams)
        }
      }
    } catch (fulfillmentError) {
      if (claimed.data.context !== "membership") {
        await admin
          .from("payment_transactions")
          .update({
            status: "error",
            updated_at: new Date().toISOString(),
          })
          .eq("id", claimed.data.id)
      }

      logNotification({
        event: "redsys.notification.failed",
        reason: "fulfillment_failed",
        redsys_order: order,
        transaction_id: claimed.data.id,
        member_id: claimed.data.member_id,
        context: claimed.data.context,
        status_before: transaction.status,
        status_after: claimed.data.context === "membership" ? claimed.data.status : "error",
        ds_response: dsResponse || null,
        authorization_code: responseParams.Ds_AuthorisationCode ?? null,
        amount: claimed.data.amount_cents,
        created_at: claimed.data.created_at,
        content_type: contentType,
        signature_version: dsSignatureVersion,
        transaction_type: responseParams.Ds_TransactionType ?? null,
        error_message: getErrorMessage(fulfillmentError),
      })

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    logNotification({
      event: "redsys.notification.completed",
      reason: "success",
      redsys_order: order,
      transaction_id: claimed.data.id,
      member_id: claimed.data.member_id,
      context: claimed.data.context,
      status_before: transaction.status,
      status_after: claimed.data.status,
      ds_response: dsResponse || null,
      authorization_code: responseParams.Ds_AuthorisationCode ?? null,
      amount: claimed.data.amount_cents,
      created_at: claimed.data.created_at,
      content_type: contentType,
      signature_version: dsSignatureVersion,
      transaction_type: responseParams.Ds_TransactionType ?? null,
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    logNotification({
      event: "redsys.notification.failed",
      reason: "unhandled_error",
      redsys_order: decodedForLogs?.Ds_Order ?? null,
      ds_response: decodedForLogs?.Ds_Response ?? null,
      authorization_code: decodedForLogs?.Ds_AuthorisationCode ?? null,
      amount: decodedForLogs?.Ds_Amount ?? null,
      content_type: contentType,
      transaction_type: decodedForLogs?.Ds_TransactionType ?? null,
      error_message: getErrorMessage(error),
    })
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}
