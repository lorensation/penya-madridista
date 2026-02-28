"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  authorizeWithIdOper,
  buildSignedRequest,
  decodeMerchantParams,
  generateOrderNumber,
  getBaseUrl,
  getMembershipPlan,
  getRealizarPagoUrl,
  getSecretKey,
  isAuthorizationSuccess,
  verifySignature,
} from "@/lib/redsys"
import type {
  ExecutePaymentResult,
  PaymentContext,
  PaymentInterval,
  PlanType,
  RedsysResponseParams,
  RedsysSignedRequest,
} from "@/lib/redsys"

interface PrepareRedirectPaymentResult {
  success: boolean
  order?: string
  amountCents?: number
  transactionId?: string
  actionUrl?: string
  signed?: RedsysSignedRequest
  error?: string
}

interface ShopRedirectItemInput {
  variantId: string
  qty: number
  priceCents: number
  productName: string
}

interface ShopRedirectShippingInput {
  fullName: string
  email: string
  address: string
  city: string
  postalCode: string
  country: string
  phone: string
  shippingCents: number
}

interface ResolveMembershipRedirectPaymentResult {
  success: boolean
  status?: "authorized" | "pending" | "denied" | "error" | "not_found"
  checkoutData?: {
    id: string
    redsys_token: string | null
    redsys_token_expiry: string | null
    cof_txn_id: string | null
    payment_status: "paid"
    subscription_status: "active"
    plan_type: string
    payment_type: string
    last_four: string | null
  }
  error?: string
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

function getRedirectReturnUrls(context: PaymentContext, order: string, userId?: string) {
  const base = getBaseUrl().replace(/\/+$/, "")

  if (context === "membership") {
    const okUrl = new URL(`${base}/complete-profile`)
    okUrl.searchParams.set("order", order)
    if (userId) {
      okUrl.searchParams.set("userId", userId)
    }

    return {
      ok: okUrl.toString(),
      ko: `${base}/membership/redsys/ko?order=${encodeURIComponent(order)}`,
    }
  }

  return {
    ok: `${base}/tienda/checkout/redsys/ok?order=${encodeURIComponent(order)}`,
    ko: `${base}/tienda/checkout/redsys/ko?order=${encodeURIComponent(order)}`,
  }
}

function normalizeBase64Payload(value: string): string {
  return value.replace(/ /g, "+").replace(/-/g, "+").replace(/_/g, "/")
}

function mapMembershipCheckoutData(
  transaction: {
    redsys_order: string
    redsys_token: string | null
    redsys_token_expiry: string | null
    cof_txn_id: string | null
    last_four: string | null
    metadata: unknown
  },
): ResolveMembershipRedirectPaymentResult["checkoutData"] {
  const metadata =
    transaction.metadata && typeof transaction.metadata === "object" && !Array.isArray(transaction.metadata)
      ? (transaction.metadata as Record<string, unknown>)
      : null

  return {
    id: transaction.redsys_order,
    redsys_token: transaction.redsys_token,
    redsys_token_expiry: transaction.redsys_token_expiry,
    cof_txn_id: transaction.cof_txn_id,
    payment_status: "paid",
    subscription_status: "active",
    plan_type: typeof metadata?.planType === "string" ? metadata.planType : "over25",
    payment_type: typeof metadata?.interval === "string" ? metadata.interval : "monthly",
    last_four: transaction.last_four,
  }
}

export async function resolveMembershipRedirectPayment(
  order: string,
  dsMerchantParameters?: string | null,
  dsSignature?: string | null,
): Promise<ResolveMembershipRedirectPaymentResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, status: "error", error: "AUTH_REQUIRED" }
    }

    const admin = getAdminClient()
    const { data: transaction, error: transactionError } = await admin
      .from("payment_transactions")
      .select("id, redsys_order, member_id, context, amount_cents, status, ds_response, redsys_token, redsys_token_expiry, cof_txn_id, last_four, metadata")
      .eq("redsys_order", order)
      .eq("context", "membership")
      .eq("member_id", user.id)
      .maybeSingle()

    if (transactionError) {
      console.error("[payment] resolveMembershipRedirectPayment failed loading transaction", {
        order,
        memberId: user.id,
        error: transactionError,
      })
      return { success: false, status: "error", error: "TXN_LOOKUP_FAILED" }
    }

    if (!transaction) {
      return { success: true, status: "not_found" }
    }

    if (transaction.status === "authorized") {
      return {
        success: true,
        status: "authorized",
        checkoutData: mapMembershipCheckoutData(transaction),
      }
    }

    if (transaction.status === "denied" || transaction.status === "error") {
      return { success: true, status: "denied" }
    }

    if (transaction.status !== "pending") {
      return { success: true, status: "pending" }
    }

    if (!dsMerchantParameters || !dsSignature) {
      return { success: true, status: "pending" }
    }

    const normalizedParams = normalizeBase64Payload(dsMerchantParameters)
    const normalizedSignature = normalizeBase64Payload(dsSignature)
    const hasValidSignature = verifySignature(getSecretKey(), normalizedParams, normalizedSignature)
    if (!hasValidSignature) {
      return { success: true, status: "pending" }
    }

    const decoded = decodeMerchantParams<RedsysResponseParams>(normalizedParams)
    if (decoded.Ds_Order !== order) {
      return { success: true, status: "pending" }
    }

    if (!isAuthorizationSuccess(decoded.Ds_Response ?? "")) {
      await admin
        .from("payment_transactions")
        .update({
          status: "denied",
          ds_response: decoded.Ds_Response ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id)
        .eq("status", "pending")

      return { success: true, status: "denied" }
    }

    const amountFromReturn = Number.parseInt(decoded.Ds_Amount ?? "", 10)
    if (Number.isNaN(amountFromReturn) || amountFromReturn !== transaction.amount_cents) {
      return { success: true, status: "pending" }
    }

    const { data: claimedTransaction, error: claimError } = await admin
      .from("payment_transactions")
      .update({
        status: "authorized",
        ds_response: decoded.Ds_Response ?? null,
        ds_authorization_code: decoded.Ds_AuthorisationCode ?? null,
        ds_card_brand: decoded.Ds_Card_Brand ?? null,
        ds_card_country: decoded.Ds_Card_Country ?? null,
        last_four: decoded.Ds_CardNumber ? decoded.Ds_CardNumber.slice(-4) : transaction.last_four,
        redsys_token: decoded.Ds_Merchant_Identifier ?? transaction.redsys_token,
        redsys_token_expiry: decoded.Ds_ExpiryDate ?? transaction.redsys_token_expiry,
        cof_txn_id: decoded.Ds_Merchant_Cof_Txnid ?? transaction.cof_txn_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)
      .eq("status", "pending")
      .select("redsys_order, redsys_token, redsys_token_expiry, cof_txn_id, last_four, metadata")
      .maybeSingle()

    if (claimError) {
      console.error("[payment] resolveMembershipRedirectPayment failed updating pending transaction", {
        order,
        memberId: user.id,
        error: claimError,
      })
      return { success: true, status: "pending" }
    }

    const resolvedTransaction = claimedTransaction ?? {
      redsys_order: transaction.redsys_order,
      redsys_token: decoded.Ds_Merchant_Identifier ?? transaction.redsys_token,
      redsys_token_expiry: decoded.Ds_ExpiryDate ?? transaction.redsys_token_expiry,
      cof_txn_id: decoded.Ds_Merchant_Cof_Txnid ?? transaction.cof_txn_id,
      last_four: decoded.Ds_CardNumber ? decoded.Ds_CardNumber.slice(-4) : transaction.last_four,
      metadata: transaction.metadata,
    }

    return {
      success: true,
      status: "authorized",
      checkoutData: mapMembershipCheckoutData(resolvedTransaction),
    }
  } catch (error) {
    console.error("[payment] resolveMembershipRedirectPayment unexpected error", { order, error })
    return { success: false, status: "error", error: "UNEXPECTED_ERROR" }
  }
}

export async function prepareMembershipRedirectPayment(
  planType: PlanType,
  interval: PaymentInterval,
): Promise<PrepareRedirectPaymentResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Debes iniciar sesion para contratar una membresia" }
    }

    const admin = getAdminClient()

    const { data: existingActiveSubscription, error: activeSubError } = await admin
      .from("subscriptions")
      .select("id")
      .eq("member_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    if (activeSubError) {
      console.error("[payment] Failed checking existing membership", {
        memberId: user.id,
        error: activeSubError,
      })
      return { success: false, error: "No se pudo validar la suscripcion actual" }
    }

    if (existingActiveSubscription) {
      return { success: false, error: "Ya tienes una suscripcion activa" }
    }

    const plan = getMembershipPlan(planType, interval)
    if (!plan) {
      return { success: false, error: "Plan de membresia no valido" }
    }

    const order = generateOrderNumber("M")

    const { data: transaction, error: insertError } = await admin
      .from("payment_transactions")
      .insert({
        redsys_order: order,
        transaction_type: "0",
        amount_cents: plan.amountCents,
        currency: "978",
        status: "pending",
        context: "membership",
        member_id: user.id,
        is_mit: false,
        metadata: {
          planType,
          interval,
          planName: plan.name,
        },
      })
      .select("id")
      .single()

    if (insertError || !transaction) {
      console.error("[payment] Failed creating membership transaction", {
        order,
        error: insertError,
      })
      return { success: false, error: "Error al preparar el pago de membresia" }
    }

    const returnUrls = getRedirectReturnUrls("membership", order, user.id)

    const signed = buildSignedRequest({
      DS_MERCHANT_TRANSACTIONTYPE: "0",
      DS_MERCHANT_ORDER: order,
      DS_MERCHANT_AMOUNT: String(plan.amountCents),
      DS_MERCHANT_URLOK: returnUrls.ok,
      DS_MERCHANT_URLKO: returnUrls.ko,
      DS_MERCHANT_PRODUCTDESCRIPTION: `Membresia Pena Lorenzo Sanz - ${plan.name}`,
      DS_MERCHANT_IDENTIFIER: "REQUIRED",
      DS_MERCHANT_COF_INI: "S",
      DS_MERCHANT_COF_TYPE: "R",
    })

    return {
      success: true,
      order,
      amountCents: plan.amountCents,
      transactionId: transaction.id,
      actionUrl: getRealizarPagoUrl(),
      signed,
    }
  } catch (error) {
    console.error("[payment] prepareMembershipRedirectPayment failed", { error })
    return { success: false, error: "Error interno al preparar el pago" }
  }
}

export async function prepareShopRedirectPayment(
  items: ShopRedirectItemInput[],
  shipping: ShopRedirectShippingInput,
): Promise<PrepareRedirectPaymentResult> {
  if (!items.length) {
    return { success: false, error: "El carrito esta vacio" }
  }

  if (
    !shipping.fullName ||
    !shipping.email ||
    !shipping.address ||
    !shipping.city ||
    !shipping.postalCode ||
    !shipping.country ||
    !shipping.phone
  ) {
    return { success: false, error: "Faltan datos de envio obligatorios" }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const admin = getAdminClient()
    const variantIds = [...new Set(items.map((item) => item.variantId))]

    const { data: variants, error: variantsError } = await admin
      .from("product_variants")
      .select("id, price_cents, inventory, active, product_id")
      .in("id", variantIds)

    if (variantsError || !variants) {
      console.error("[payment] Failed loading variants", { error: variantsError })
      return { success: false, error: "No se pudieron validar los productos" }
    }

    const productIds = [
      ...new Set(
        variants
          .map((variant) => variant.product_id)
          .filter((value): value is string => typeof value === "string"),
      ),
    ]

    const productNameById = new Map<string, string>()
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await admin
        .from("products")
        .select("id, name")
        .in("id", productIds)

      if (productsError) {
        console.error("[payment] Failed loading product names", { error: productsError })
      }

      for (const product of products ?? []) {
        productNameById.set(product.id, product.name)
      }
    }

    let itemsTotalCents = 0
    const validatedItems: Array<{
      variantId: string
      qty: number
      priceCents: number
      productName: string
    }> = []

    for (const item of items) {
      if (!Number.isInteger(item.qty) || item.qty <= 0) {
        return { success: false, error: `Cantidad invalida para ${item.productName}` }
      }

      const variant = variants.find((candidate) => candidate.id === item.variantId)
      if (!variant) {
        return { success: false, error: `Producto no encontrado: ${item.productName}` }
      }
      if (!variant.active) {
        return { success: false, error: `Producto no disponible: ${item.productName}` }
      }
      if ((variant.inventory ?? 0) < item.qty) {
        return { success: false, error: `Stock insuficiente para: ${item.productName}` }
      }

      const variantPrice = variant.price_cents
      const computedName =
        (variant.product_id ? productNameById.get(variant.product_id) : undefined) ?? item.productName

      itemsTotalCents += variantPrice * item.qty
      validatedItems.push({
        variantId: item.variantId,
        qty: item.qty,
        priceCents: variantPrice,
        productName: computedName,
      })
    }

    const shippingCents = Number.isFinite(shipping.shippingCents)
      ? Math.max(0, Math.trunc(shipping.shippingCents))
      : 0

    const totalCents = itemsTotalCents + shippingCents
    if (totalCents <= 0) {
      return { success: false, error: "El importe total debe ser mayor que cero" }
    }

    const order = generateOrderNumber("S")

    const { data: transaction, error: insertError } = await admin
      .from("payment_transactions")
      .insert({
        redsys_order: order,
        transaction_type: "0",
        amount_cents: totalCents,
        currency: "978",
        status: "pending",
        context: "shop",
        member_id: user?.id ?? null,
        is_mit: false,
        metadata: {
          items: validatedItems,
          shipping: {
            fullName: shipping.fullName,
            email: shipping.email,
            address: shipping.address,
            city: shipping.city,
            postalCode: shipping.postalCode,
            country: shipping.country,
            phone: shipping.phone,
            shippingCents,
          },
          itemsTotalCents,
          shippingCents,
        },
      })
      .select("id")
      .single()

    if (insertError || !transaction) {
      console.error("[payment] Failed creating shop transaction", {
        order,
        error: insertError,
      })
      return { success: false, error: "Error al preparar el pago" }
    }

    const returnUrls = getRedirectReturnUrls("shop", order)

    const signed = buildSignedRequest({
      DS_MERCHANT_TRANSACTIONTYPE: "0",
      DS_MERCHANT_ORDER: order,
      DS_MERCHANT_AMOUNT: String(totalCents),
      DS_MERCHANT_URLOK: returnUrls.ok,
      DS_MERCHANT_URLKO: returnUrls.ko,
      DS_MERCHANT_PRODUCTDESCRIPTION: "Tienda Pena Lorenzo Sanz",
    })

    return {
      success: true,
      order,
      amountCents: totalCents,
      transactionId: transaction.id,
      actionUrl: getRealizarPagoUrl(),
      signed,
    }
  } catch (error) {
    console.error("[payment] prepareShopRedirectPayment failed", { error })
    return { success: false, error: "Error interno al preparar el pago" }
  }
}

export async function cancelMembershipSubscription(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const admin = getAdminClient()

    const { data: subscription, error: subError } = await admin
      .from("subscriptions")
      .select("id")
      .eq("member_id", user.id)
      .eq("status", "active")
      .single()

    if (subError || !subscription) {
      return { success: false, error: "No se encontro una suscripcion activa" }
    }

    await admin
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id)

    await admin
      .from("miembros")
      .update({
        subscription_status: "canceled",
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("user_uuid", user.id)

    revalidatePath("/dashboard/membership")

    return { success: true }
  } catch (error) {
    console.error("[payment] cancelMembershipSubscription failed", { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cancelar",
    }
  }
}

export async function prepareCardUpdate(): Promise<PrepareRedirectPaymentResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const admin = getAdminClient()

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("member_id", user.id)
      .in("status", ["active", "canceled"])
      .single()

    if (!subscription) {
      return { success: false, error: "No se encontro una suscripcion" }
    }

    const order = generateOrderNumber("M")

    const { data: transaction, error: insertError } = await admin
      .from("payment_transactions")
      .insert({
        redsys_order: order,
        transaction_type: "0",
        amount_cents: 0,
        currency: "978",
        status: "pending",
        context: "membership",
        member_id: user.id,
        subscription_id: subscription.id,
        is_mit: false,
        metadata: { type: "card_update" },
      })
      .select("id")
      .single()

    if (insertError || !transaction) {
      return { success: false, error: "Error al preparar la actualizacion" }
    }

    return {
      success: true,
      order,
      amountCents: 0,
      transactionId: transaction.id,
    }
  } catch (error) {
    console.error("[payment] prepareCardUpdate failed", { error })
    return { success: false, error: "Error interno" }
  }
}

export async function executeCardUpdate(
  idOper: string,
  order: string,
): Promise<ExecutePaymentResult> {
  try {
    const admin = getAdminClient()

    const { data: transaction, error: transactionError } = await admin
      .from("payment_transactions")
      .select("*")
      .eq("redsys_order", order)
      .eq("status", "pending")
      .single()

    if (transactionError || !transaction) {
      return {
        success: false,
        error: "Transaccion no encontrada",
        errorCode: "TXN_NOT_FOUND",
      }
    }

    const result = await authorizeWithIdOper({
      idOper,
      order,
      amountCents: transaction.amount_cents,
      description: "Actualizacion de tarjeta - Pena Lorenzo Sanz",
      tokenize: true,
      cofType: "R",
    })

    await admin
      .from("payment_transactions")
      .update({
        status: result.success ? "authorized" : "denied",
        ds_response: result.dsResponse ?? null,
        ds_authorization_code: result.authorizationCode ?? null,
        last_four: result.lastFour ?? null,
        redsys_token: result.redsysToken ?? null,
        cof_txn_id: result.cofTxnId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id)

    if (!result.success) {
      if (result.errorCode === "SIS0218") {
        return {
          ...result,
          error:
            "El TPV ha rechazado la operacion como no segura (Host-to-Host). Revisa la configuracion del terminal en Redsys/Getnet.",
        }
      }

      if (result.errorCode === "SIS0508") {
        return {
          ...result,
          error:
            "El idOper no es valido, ha caducado o no coincide con el pedido enviado. Genera un nuevo formulario y vuelve a intentarlo.",
        }
      }

      return result
    }

    if (result.redsysToken) {
      const memberId = transaction.member_id as string

      await admin
        .from("subscriptions")
        .update({
          redsys_token: result.redsysToken,
          redsys_token_expiry: result.redsysTokenExpiry ?? null,
          redsys_cof_txn_id: result.cofTxnId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("member_id", memberId)
        .eq("status", "active")

      await admin
        .from("miembros")
        .update({
          last_four: result.lastFour ?? null,
          redsys_token: result.redsysToken,
          redsys_token_expiry: result.redsysTokenExpiry ?? null,
        })
        .eq("user_uuid", memberId)

      revalidatePath("/dashboard/membership")
    }

    return result
  } catch (error) {
    console.error("[payment] executeCardUpdate failed", { order, error })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar la tarjeta",
      errorCode: "EXEC_ERROR",
    }
  }
}
