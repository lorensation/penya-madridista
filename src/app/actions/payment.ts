"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { isUpcomingEventDate } from "@/lib/events"
import { hasMembershipAccess } from "@/lib/membership-access"
import {
  authorizeWithIdOper,
  buildSignedRequest,
  decodeMerchantParams,
  getBaseUrl,
  generateOrderNumber,
  getMembershipPlan,
  getRealizarPagoUrl,
  getSecretKey,
  isAnnualOnlyMembershipPlan,
  isAuthorizationSuccess,
  normalizeRedsysBase64,
  resolveMembershipInterval,
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
import {
  completeMembershipOnboarding as completeMembershipOnboardingState,
  finalizeMembershipPayment,
} from "@/lib/membership/onboarding"
import { createReturnPendingReviewAlert } from "@/lib/payments/return-review-alerts"

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
    subscription_status: string
    plan_type: string
    payment_type: string
    last_four: string | null
  }
  error?: string
}

interface ConfirmEventAssistInput {
  eventId: string
  order: string
  name: string
  email: string
  apellido1?: string | null
  apellido2?: string | null
  phone?: string | null
}

interface ConfirmEventAssistResult {
  success: boolean
  error?: string
}

const eventAssistSchema = z.object({
  eventId: z.string().uuid("Evento no valido"),
  order: z.string().min(1, "Pedido no valido"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().email("Introduce un email valido"),
  apellido1: z.string().trim().optional().nullable(),
  apellido2: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
})

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

  if (context === "event") {
    throw new Error("Event redirect URLs require an explicit eventId")
  }

  return {
    ok: `${base}/tienda/checkout/redsys/ok?order=${encodeURIComponent(order)}`,
    ko: `${base}/tienda/checkout/redsys/ko?order=${encodeURIComponent(order)}`,
  }
}

function getEventRedirectReturnUrls(eventId: string, order: string) {
  const base = getBaseUrl().replace(/\/+$/, "")
  const encodedEventId = encodeURIComponent(eventId)
  const encodedOrder = encodeURIComponent(order)

  return {
    ok: `${base}/blog/events/${encodedEventId}/redsys/ok?order=${encodedOrder}`,
    ko: `${base}/blog/events/${encodedEventId}/redsys/ko?order=${encodedOrder}`,
  }
}

function getCardUpdateReturnUrls(order: string) {
  const base = getBaseUrl().replace(/\/+$/, "")
  const encodedOrder = encodeURIComponent(order)

  return {
    ok: `${base}/dashboard/membership/card-update/ok?order=${encodedOrder}`,
    ko: `${base}/dashboard/membership/card-update/ko?order=${encodedOrder}`,
  }
}

function getCardUpdateAmountCents(): number {
  const raw = process.env.REDSYS_CARD_UPDATE_AMOUNT_CENTS
  const parsed = Number.parseInt(raw ?? "0", 10)

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return Math.trunc(parsed)
}

export async function resolveMembershipRedirectPayment(
  order: string,
  dsMerchantParameters?: string | null,
  dsSignature?: string | null,
  createReviewAlertOnPending = false,
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

    let decoded: RedsysResponseParams | null = null
    const hasSignedReturnParams = Boolean(dsMerchantParameters && dsSignature)

    if (dsMerchantParameters && dsSignature) {
      const normalizedParams = normalizeRedsysBase64(dsMerchantParameters)
      const normalizedSignature = normalizeRedsysBase64(dsSignature)
      const hasValidSignature = verifySignature(getSecretKey(), normalizedParams, normalizedSignature)

      if (hasValidSignature) {
        const parsed = decodeMerchantParams<RedsysResponseParams>(normalizedParams)
        if (parsed.Ds_Order === order && isAuthorizationSuccess(parsed.Ds_Response ?? "")) {
          decoded = parsed
        }
      }
    }

    const admin = getAdminClient()
    const finalized = await finalizeMembershipPayment({
      order,
      expectedMemberId: user.id,
      responseParams: decoded,
      admin,
    })

    if (
      finalized.success &&
      finalized.status === "pending" &&
      createReviewAlertOnPending &&
      !hasSignedReturnParams
    ) {
      await createReturnPendingReviewAlert(admin, {
        order,
        memberId: user.id,
        status: "pending",
        hasSignedReturnParams,
      })
    }

    return {
      success: finalized.success,
      status: finalized.status,
      checkoutData: finalized.checkoutData,
      error: finalized.error,
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
      return { success: false, error: "Debes iniciar sesion para contratar una suscripción" }
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

    // ── Age verification for under-25 plan ──
    if (planType === "under25") {
      const dob = user.user_metadata?.fecha_nacimiento as string | undefined
      if (!dob) {
        return {
          success: false,
          error: "Necesitamos tu fecha de nacimiento para verificar tu edad. Por favor, actualiza tu perfil.",
        }
      }

      const birthDate = new Date(dob)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      if (age >= 25) {
        return {
          success: false,
          error: "La suscripción Joven está disponible solo para menores de 25 años. Por favor, selecciona la suscripción Adulto.",
        }
      }
    }

    if (isAnnualOnlyMembershipPlan(planType) && interval !== "annual") {
      return {
        success: false,
        error: "Las suscripciones Joven y Adulto solo permiten pago anual.",
      }
    }

    const resolvedInterval = resolveMembershipInterval(planType, interval)
    if (!resolvedInterval) {
      return { success: false, error: "Plan de suscripción no valido" }
    }

    const plan = getMembershipPlan(planType, resolvedInterval)
    if (!plan) {
      return { success: false, error: "Plan de suscripción no valido" }
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
        authorized_at: null,
        context: "membership",
        member_id: user.id,
        is_mit: false,
        metadata: {
          planType,
          interval: resolvedInterval,
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
      return { success: false, error: "Error al preparar el pago de suscripción" }
    }

    const returnUrls = getRedirectReturnUrls("membership", order, user.id)

    const signed = buildSignedRequest({
      DS_MERCHANT_TRANSACTIONTYPE: "0",
      DS_MERCHANT_ORDER: order,
      DS_MERCHANT_AMOUNT: String(plan.amountCents),
      DS_MERCHANT_URLOK: returnUrls.ok,
      DS_MERCHANT_URLKO: returnUrls.ko,
      DS_MERCHANT_PRODUCTDESCRIPTION: `Suscripción Pena Lorenzo Sanz - ${plan.name}`,
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

export async function prepareEventRedirectPayment(
  eventId: string,
): Promise<PrepareRedirectPaymentResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("[payment] Failed loading auth user for event payment", { error: authError })
      return { success: false, error: "No se pudo validar la sesion" }
    }

    if (!user) {
      return { success: false, error: "Debes iniciar sesion para comprar una entrada" }
    }

    const admin = getAdminClient()

    const { data: event, error: eventError } = await admin
      .from("events")
      .select("id, title, date, is_hidden, one_time_price_cents")
      .eq("id", eventId)
      .maybeSingle()

    if (eventError || !event) {
      console.error("[payment] Failed loading event for payment", {
        eventId,
        error: eventError,
      })
      return { success: false, error: "Evento no encontrado" }
    }

    if (event.is_hidden || !isUpcomingEventDate(event.date)) {
      return { success: false, error: "Este evento ya no esta disponible para compra" }
    }

    const priceCents = event.one_time_price_cents
    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      return { success: false, error: "Este evento no tiene una entrada de pago disponible" }
    }

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("status, end_date")
      .eq("member_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const hasCurrentMembership = hasMembershipAccess({
      status: subscription?.status ?? null,
      endDate: subscription?.end_date ?? null,
    })

    if (hasCurrentMembership) {
      return { success: false, error: "Los socios deben reservar este evento por WhatsApp" }
    }

    const order = generateOrderNumber("E")

    const { data: transaction, error: insertError } = await admin
      .from("payment_transactions")
      .insert({
        redsys_order: order,
        transaction_type: "0",
        amount_cents: priceCents,
        currency: "978",
        status: "pending",
        authorized_at: null,
        context: "event",
        member_id: user.id,
        event_id: event.id,
        is_mit: false,
        metadata: {
          eventTitle: event.title,
          priceCents,
        },
      })
      .select("id")
      .single()

    if (insertError || !transaction) {
      console.error("[payment] Failed creating event transaction", {
        eventId,
        order,
        error: insertError,
      })
      return { success: false, error: "Error al preparar el pago del evento" }
    }

    const returnUrls = getEventRedirectReturnUrls(event.id, order)
    const signed = buildSignedRequest({
      DS_MERCHANT_TRANSACTIONTYPE: "0",
      DS_MERCHANT_ORDER: order,
      DS_MERCHANT_AMOUNT: String(priceCents),
      DS_MERCHANT_URLOK: returnUrls.ok,
      DS_MERCHANT_URLKO: returnUrls.ko,
      DS_MERCHANT_PRODUCTDESCRIPTION: `Evento Pena Lorenzo Sanz - ${event.title}`,
    })

    return {
      success: true,
      order,
      amountCents: priceCents,
      transactionId: transaction.id,
      actionUrl: getRealizarPagoUrl(),
      signed,
    }
  } catch (error) {
    console.error("[payment] prepareEventRedirectPayment failed", { eventId, error })
    return { success: false, error: "Error interno al preparar el pago" }
  }
}

export async function confirmEventAssist(
  input: ConfirmEventAssistInput,
): Promise<ConfirmEventAssistResult> {
  try {
    const parsed = eventAssistSchema.safeParse(input)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Datos no validos",
      }
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "Debes iniciar sesion para confirmar la asistencia" }
    }

    const admin = getAdminClient()
    const { data: transaction, error: transactionError } = await admin
      .from("payment_transactions")
      .select("id, redsys_order, status, context, event_id, member_id, amount_cents, currency, authorized_at, ds_authorization_code, last_four")
      .eq("redsys_order", parsed.data.order)
      .maybeSingle()

    if (transactionError || !transaction) {
      return { success: false, error: "No encontramos el pago del evento" }
    }

    if (transaction.context !== "event" || transaction.event_id !== parsed.data.eventId) {
      return { success: false, error: "El pago no corresponde con este evento" }
    }

    if (transaction.member_id !== user.id) {
      return { success: false, error: "No tienes permiso para confirmar este pago" }
    }

    if (transaction.status !== "authorized") {
      return { success: false, error: "El pago aun no esta confirmado" }
    }

    const nowIso = new Date().toISOString()
    const { error: assistError } = await admin
      .from("event_assists")
      .upsert(
        {
          event_id: parsed.data.eventId,
          payment_transaction_id: transaction.id,
          redsys_order: transaction.redsys_order,
          user_id: transaction.member_id,
          name: parsed.data.name,
          email: parsed.data.email,
          apellido1: parsed.data.apellido1 || null,
          apellido2: parsed.data.apellido2 || null,
          phone: parsed.data.phone || null,
          amount_cents: transaction.amount_cents,
          currency: transaction.currency,
          payment_status: transaction.status,
          payment_authorized_at: transaction.authorized_at,
          ds_authorization_code: transaction.ds_authorization_code,
          last_four: transaction.last_four,
          data_confirmed_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "payment_transaction_id" },
      )

    if (assistError) {
      console.error("[payment] Failed confirming event assist", {
        order: parsed.data.order,
        eventId: parsed.data.eventId,
        error: assistError,
      })
      return { success: false, error: "No se pudo guardar la asistencia" }
    }

    revalidatePath(`/blog/events/${parsed.data.eventId}/redsys/ok`)

    return { success: true }
  } catch (error) {
    console.error("[payment] confirmEventAssist failed", { input, error })
    return { success: false, error: "Error interno al guardar la asistencia" }
  }
}

/**
 * @deprecated Use confirmEventAssist. Kept during the event-refactor transition.
 */
export const saveEventExternalAssist = confirmEventAssist

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

    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("id")
      .eq("member_id", user.id)
      .in("status", ["active", "canceled"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) {
      console.error("[payment] Failed loading subscription for card update", {
        memberId: user.id,
        error: subscriptionError,
      })
      return { success: false, error: "No se pudo cargar la suscripcion actual" }
    }

    if (!subscription) {
      return { success: false, error: "No se encontro una suscripcion" }
    }

    const order = generateOrderNumber("M")
    const amountCents = getCardUpdateAmountCents()

    const { data: transaction, error: insertError } = await admin
      .from("payment_transactions")
      .insert({
        redsys_order: order,
        transaction_type: "7",
        amount_cents: amountCents,
        currency: "978",
        status: "pending",
        authorized_at: null,
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

    const returnUrls = getCardUpdateReturnUrls(order)
    const signed = buildSignedRequest({
      DS_MERCHANT_TRANSACTIONTYPE: "7",
      DS_MERCHANT_ORDER: order,
      DS_MERCHANT_AMOUNT: String(amountCents),
      DS_MERCHANT_URLOK: returnUrls.ok,
      DS_MERCHANT_URLKO: returnUrls.ko,
      DS_MERCHANT_PRODUCTDESCRIPTION: "Actualizacion de tarjeta - Pena Lorenzo Sanz",
      DS_MERCHANT_IDENTIFIER: "REQUIRED",
      DS_MERCHANT_COF_INI: "S",
      DS_MERCHANT_COF_TYPE: "R",
    })

    return {
      success: true,
      order,
      amountCents,
      transactionId: transaction.id,
      actionUrl: getRealizarPagoUrl(),
      signed,
    }
  } catch (error) {
    console.error("[payment] prepareCardUpdate failed", { error })
    return { success: false, error: "Error interno" }
  }
}

export async function completeMembershipOnboarding(order?: string | null) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    return await completeMembershipOnboardingState(user.id, order)
  } catch (error) {
    console.error("[payment] completeMembershipOnboarding failed", { order, error })
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado",
    }
  }
}

/**
 * @deprecated Kept only for backward compatibility. Use redirect flow via prepareCardUpdate.
 */
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
        last_four: result.lastFour ?? transaction.last_four,
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
      const subscriptionUpdates: {
        redsys_token: string
        redsys_token_expiry: string | null
        redsys_cof_txn_id: string | null
        updated_at: string
        last_four?: string
      } = {
        redsys_token: result.redsysToken,
        redsys_token_expiry: result.redsysTokenExpiry ?? null,
        redsys_cof_txn_id: result.cofTxnId ?? null,
        updated_at: new Date().toISOString(),
      }

      if (result.lastFour) {
        subscriptionUpdates.last_four = result.lastFour
      }

      await admin
        .from("subscriptions")
        .update(subscriptionUpdates)
        .eq("member_id", memberId)
        .eq("status", "active")

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
