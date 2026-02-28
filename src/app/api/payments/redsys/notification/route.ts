import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  decodeMerchantParams,
  getMerchantCode,
  getSecretKey,
  getTerminal,
  isAuthorizationSuccess,
  verifySignature,
} from "@/lib/redsys"
import type { RedsysResponseParams } from "@/lib/redsys"
import type { Json } from "@/types/supabase"

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

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
  metadata: Json | null
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
  const record = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : {}

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

async function handleAuthorizedShopPayment(transaction: PaymentTransactionRow) {
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

async function handleAuthorizedMembershipPayment(
  transaction: PaymentTransactionRow,
  responseParams: RedsysResponseParams,
) {
  const memberId = transaction.member_id
  if (!memberId) {
    throw new Error("Membership transaction has no member_id")
  }

  const metadata = parseContextMetadata(transaction.metadata)
  const interval = metadata.interval === "annual" ? "annual" : "monthly"
  const planType = metadata.planType ?? "over25"

  const startDate = new Date()
  const endDate = new Date(startDate)

  if (interval === "annual") {
    endDate.setFullYear(endDate.getFullYear() + 1)
  } else {
    endDate.setMonth(endDate.getMonth() + 1)
  }

  const { data: subscription, error: subError } = await admin
    .from("subscriptions")
    .upsert(
      {
        member_id: memberId,
        plan_type: planType,
        payment_type: interval,
        status: "active",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        redsys_token: responseParams.Ds_Merchant_Identifier ?? null,
        redsys_token_expiry: responseParams.Ds_ExpiryDate ?? null,
        redsys_cof_txn_id: responseParams.Ds_Merchant_Cof_Txnid ?? null,
        redsys_last_order: transaction.redsys_order,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" },
    )
    .select("id")
    .single()

  if (subError || !subscription) {
    throw new Error(`Failed upserting subscription: ${subError?.message ?? "unknown"}`)
  }

  await admin
    .from("payment_transactions")
    .update({
      subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transaction.id)

  await admin
    .from("miembros")
    .update({
      subscription_status: "active",
      subscription_plan: `${planType}_${interval}`,
      subscription_updated_at: new Date().toISOString(),
      last_four: responseParams.Ds_CardNumber ? responseParams.Ds_CardNumber.slice(-4) : null,
      redsys_token: responseParams.Ds_Merchant_Identifier ?? null,
      redsys_token_expiry: responseParams.Ds_ExpiryDate ?? null,
    })
    .eq("user_uuid", memberId)

  await admin
    .from("users")
    .update({ is_member: true })
    .eq("id", memberId)
}

export async function POST(request: NextRequest) {
  try {
    let dsMerchantParameters: string | undefined
    let dsSignature: string | undefined

    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData()
      dsMerchantParameters = formData.get("Ds_MerchantParameters")?.toString()
      dsSignature = formData.get("Ds_Signature")?.toString()
    } else {
      const body = await request.json().catch(() => null)
      if (body && typeof body === "object") {
        dsMerchantParameters = body.Ds_MerchantParameters
        dsSignature = body.Ds_Signature
      }
    }

    if (!dsMerchantParameters || !dsSignature) {
      console.error("[redsys/notification] Missing required fields")
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const isValidSignature = verifySignature(getSecretKey(), dsMerchantParameters, dsSignature)

    if (!isValidSignature) {
      console.error("[redsys/notification] Invalid signature")
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const responseParams = decodeMerchantParams<RedsysResponseParams>(dsMerchantParameters)
    const order = responseParams.Ds_Order

    if (!order) {
      console.error("[redsys/notification] Missing Ds_Order")
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const { data: transaction, error: txnError } = await admin
      .from("payment_transactions")
      .select("id, status, context, amount_cents, redsys_order, member_id, metadata")
      .eq("redsys_order", order)
      .maybeSingle()

    if (txnError || !transaction) {
      console.warn("[redsys/notification] Unknown order", { order, error: txnError })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (transaction.status !== "pending") {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const notifiedAmount = parseInteger(responseParams.Ds_Amount)
    if (notifiedAmount === null || notifiedAmount !== transaction.amount_cents) {
      console.error("[redsys/notification] Amount mismatch", {
        order,
        expected: transaction.amount_cents,
        received: responseParams.Ds_Amount,
      })

      await admin
        .from("payment_transactions")
        .update({
          status: "error",
          ds_response: responseParams.Ds_Response ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .eq("status", "pending")

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const expectedMerchantCode = getMerchantCode()
    const expectedTerminal = getTerminal()

    if (
      (responseParams.Ds_MerchantCode && responseParams.Ds_MerchantCode !== expectedMerchantCode) ||
      (responseParams.Ds_Terminal && responseParams.Ds_Terminal !== expectedTerminal)
    ) {
      console.error("[redsys/notification] Merchant/terminal mismatch", {
        order,
        expectedMerchantCode,
        receivedMerchantCode: responseParams.Ds_MerchantCode,
        expectedTerminal,
        receivedTerminal: responseParams.Ds_Terminal,
      })

      await admin
        .from("payment_transactions")
        .update({
          status: "error",
          ds_response: responseParams.Ds_Response ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .eq("status", "pending")

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const dsResponse = responseParams.Ds_Response ?? ""
    const nextStatus = isAuthorizationSuccess(dsResponse) ? "authorized" : "denied"

    const claimed = await admin
      .from("payment_transactions")
      .update({
        status: nextStatus,
        ds_response: dsResponse || null,
        ds_authorization_code: responseParams.Ds_AuthorisationCode ?? null,
        ds_card_brand: responseParams.Ds_Card_Brand ?? null,
        ds_card_country: responseParams.Ds_Card_Country ?? null,
        last_four: responseParams.Ds_CardNumber ? responseParams.Ds_CardNumber.slice(-4) : null,
        redsys_token: responseParams.Ds_Merchant_Identifier ?? null,
        redsys_token_expiry: responseParams.Ds_ExpiryDate ?? null,
        cof_txn_id: responseParams.Ds_Merchant_Cof_Txnid ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)
      .eq("status", "pending")
      .select("id, status, context, amount_cents, redsys_order, member_id, metadata")
      .maybeSingle()

    if (claimed.error || !claimed.data) {
      if (claimed.error) {
        console.error("[redsys/notification] Failed claiming transaction", { order, error: claimed.error })
      }
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    if (nextStatus !== "authorized") {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    try {
      if (claimed.data.context === "shop") {
        await handleAuthorizedShopPayment(claimed.data as PaymentTransactionRow)
      } else if (claimed.data.context === "membership") {
        await handleAuthorizedMembershipPayment(claimed.data as PaymentTransactionRow, responseParams)
      }
    } catch (fulfillmentError) {
      console.error("[redsys/notification] Fulfillment failed", {
        order,
        context: claimed.data.context,
        error: fulfillmentError,
      })

      await admin
        .from("payment_transactions")
        .update({
          status: "error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimed.data.id)

      return NextResponse.json({ ok: true }, { status: 200 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error("[redsys/notification] Unhandled error", { error })
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}
