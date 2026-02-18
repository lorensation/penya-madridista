"use server"

/**
 * Payment Server Actions — RedSys/Getnet
 *
 * Replaces `actions/stripe.ts` and `actions/shop-checkout.ts`.
 * Handles:
 *   1. Shop payments — one-time (TransactionType 0, no tokenization)
 *   2. Membership payments — first payment + tokenization (IDENTIFIER=REQUIRED)
 *   3. Payment execution — authorize via REST using InSite idOper
 */

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import {
  generateOrderNumber,
  authorizeWithIdOper,
  getMembershipPlan,
} from "@/lib/redsys"
import type {
  PlanType,
  PaymentInterval,
  PreparePaymentResult,
  ExecutePaymentResult,
  PaymentContext,
} from "@/lib/redsys"
import { revalidatePath } from "next/cache"

// Admin Supabase client (bypasses RLS)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// ── 1. Prepare Shop Payment ──────────────────────────────────────────────────

/**
 * Validate cart items, calculate total, create a pending transaction, and
 * return an order number for InSite initialization.
 */
export async function prepareShopPayment(
  items: Array<{
    variantId: string
    qty: number
    priceCents: number
    productName: string
  }>,
): Promise<PreparePaymentResult> {
  if (!items.length) {
    return { success: false, error: "El carrito está vacío" }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Calculate total from DB prices (don't trust client-side prices)
    const admin = getAdminClient()
    const variantIds = items.map((i) => i.variantId)

    const { data: variants, error: varErr } = await admin
      .from("product_variants")
      .select("id, price_cents, inventory, active")
      .in("id", variantIds)

    if (varErr || !variants) {
      console.error("[payment] Error fetching variants:", varErr)
      return { success: false, error: "No se pudieron verificar los productos" }
    }

    // Validate availability and compute server-side total
    let totalCents = 0
    for (const item of items) {
      const variant = variants.find((v) => v.id === item.variantId)
      if (!variant) {
        return { success: false, error: `Producto no encontrado: ${item.productName}` }
      }
      if (!variant.active) {
        return { success: false, error: `Producto no disponible: ${item.productName}` }
      }
      if (variant.inventory < item.qty) {
        return { success: false, error: `Stock insuficiente para: ${item.productName}` }
      }
      totalCents += variant.price_cents * item.qty
    }

    if (totalCents <= 0) {
      return { success: false, error: "El importe total debe ser mayor que cero" }
    }

    // Generate unique order number
    const order = generateOrderNumber("S")

    // Create pending transaction record
    const { data: txn, error: txnErr } = await admin
      .from("payment_transactions")
      .insert({
        redsys_order: order,
        transaction_type: "0",
        amount_cents: totalCents,
        currency: "978",
        status: "pending",
        context: "shop" as PaymentContext,
        member_id: user?.id ?? null,
        is_mit: false,
        metadata: {
          items: items.map((i) => ({
            variantId: i.variantId,
            qty: i.qty,
            priceCents: i.priceCents,
            productName: i.productName,
          })),
        },
      })
      .select("id")
      .single()

    if (txnErr) {
      console.error("[payment] Error creating transaction:", txnErr)
      return { success: false, error: "Error al preparar el pago" }
    }

    return {
      success: true,
      order,
      amountCents: totalCents,
      transactionId: txn.id,
    }
  } catch (err) {
    console.error("[payment] prepareShopPayment error:", err)
    return { success: false, error: "Error interno al preparar el pago" }
  }
}

// ── 2. Prepare Membership Payment ────────────────────────────────────────────

/**
 * Validate plan selection, create a pending transaction, and return
 * an order number for InSite initialization (with tokenization).
 */
export async function prepareMembershipPayment(
  planType: PlanType,
  interval: PaymentInterval,
): Promise<PreparePaymentResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return { success: false, error: "Debes iniciar sesión para contratar una membresía" }
    }

    // Check if user already has an active subscription
    const admin = getAdminClient()
    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("id, status")
      .eq("member_id", user.id)
      .eq("status", "active")
      .limit(1)
      .single()

    if (existingSub) {
      return { success: false, error: "Ya tienes una suscripción activa" }
    }

    // Look up the plan
    const plan = getMembershipPlan(planType, interval)
    if (!plan) {
      return { success: false, error: "Plan de membresía no válido" }
    }

    // Generate order number
    const order = generateOrderNumber("M")

    // Create pending transaction
    const { data: txn, error: txnErr } = await admin
      .from("payment_transactions")
      .insert({
        redsys_order: order,
        transaction_type: "0",
        amount_cents: plan.amountCents,
        currency: "978",
        status: "pending",
        context: "membership" as PaymentContext,
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

    if (txnErr) {
      console.error("[payment] Error creating membership transaction:", txnErr)
      return { success: false, error: "Error al preparar el pago de membresía" }
    }

    return {
      success: true,
      order,
      amountCents: plan.amountCents,
      transactionId: txn.id,
    }
  } catch (err) {
    console.error("[payment] prepareMembershipPayment error:", err)
    return { success: false, error: "Error interno" }
  }
}

// ── 3. Execute Payment ───────────────────────────────────────────────────────

/**
 * Execute a previously prepared payment using the InSite idOper.
 * For shop: one-time authorization (no tokenization).
 * For membership: authorization + tokenization (IDENTIFIER=REQUIRED).
 */
export async function executePayment(
  idOper: string,
  order: string,
  context: PaymentContext,
): Promise<ExecutePaymentResult> {
  try {
    const admin = getAdminClient()

    // Look up the pending transaction
    const { data: txn, error: txnErr } = await admin
      .from("payment_transactions")
      .select("*")
      .eq("redsys_order", order)
      .eq("status", "pending")
      .single()

    if (txnErr || !txn) {
      return { success: false, error: "Transacción no encontrada o ya procesada", errorCode: "TXN_NOT_FOUND" }
    }

    // Determine if we should tokenize (membership only)
    const tokenize = context === "membership"
    const description = context === "membership"
      ? `Membresía Peña Lorenzo Sanz — ${txn.metadata?.planName ?? ""}`
      : "Tienda Peña Lorenzo Sanz"

    // Call RedSys REST authorization
    const result = await authorizeWithIdOper({
      idOper,
      order,
      amountCents: txn.amount_cents,
      description,
      tokenize,
      cofType: tokenize ? "R" : undefined, // R = Recurring
    })

    // Update transaction record
    await admin
      .from("payment_transactions")
      .update({
        status: result.success ? "authorized" : "denied",
        ds_response: result.dsResponse ?? null,
        ds_authorization_code: result.authorizationCode ?? null,
        ds_card_brand: result.cardBrand ?? null,
        last_four: result.lastFour ?? null,
        redsys_token: result.redsysToken ?? null,
        cof_txn_id: result.cofTxnId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", txn.id)

    if (!result.success) {
      return result
    }

    // ── Post-authorization processing ──
    if (context === "shop") {
      await handleShopSuccess(admin, txn)
    } else if (context === "membership") {
      await handleMembershipSuccess(admin, txn, result)
    }

    return result
  } catch (err) {
    console.error("[payment] executePayment error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al ejecutar el pago",
      errorCode: "EXEC_ERROR",
    }
  }
}

// ── Post-Authorization Handlers ──────────────────────────────────────────────

/**
 * After a successful shop payment:
 *   - Create order + order_items in DB
 *   - Decrement inventory
 */
async function handleShopSuccess(
  admin: ReturnType<typeof getAdminClient>,
  txn: Record<string, unknown>,
) {
  try {
    const items = (txn.metadata as Record<string, unknown>)?.items as Array<{
      variantId: string
      qty: number
      priceCents: number
      productName: string
    }> | undefined

    if (!items?.length) {
      console.error("[payment] No items in shop transaction metadata")
      return
    }

    // Create order
    const { data: orderRecord, error: orderErr } = await admin
      .from("orders")
      .insert({
        user_id: (txn.member_id as string) ?? null,
        status: "paid",
        amount_cents: txn.amount_cents as number,
        redsys_order: txn.redsys_order as string,
        payment_method: "redsys",
      })
      .select("id")
      .single()

    if (orderErr || !orderRecord) {
      console.error("[payment] Error creating order:", orderErr)
      return
    }

    // Update transaction with order_id
    await admin
      .from("payment_transactions")
      .update({ order_id: orderRecord.id })
      .eq("id", txn.id as string)

    // Create order items
    const orderItems = items.map((item) => ({
      order_id: orderRecord.id,
      variant_id: item.variantId,
      qty: item.qty,
      price_cents: item.priceCents,
      product_name: item.productName,
    }))

    await admin.from("order_items").insert(orderItems)

    // Decrement inventory
    for (const item of items) {
      await admin.rpc("decrement_inventory", {
        variant_id: item.variantId,
        qty: item.qty,
      })
    }
  } catch (err) {
    console.error("[payment] handleShopSuccess error:", err)
  }
}

/**
 * After a successful membership payment:
 *   - Create/update subscription record
 *   - Store tokenization data (redsys_token, cof_txn_id)
 *   - Update miembros table
 */
async function handleMembershipSuccess(
  admin: ReturnType<typeof getAdminClient>,
  txn: Record<string, unknown>,
  result: ExecutePaymentResult,
) {
  try {
    const memberId = txn.member_id as string
    const meta = txn.metadata as Record<string, unknown>
    const planType = (meta?.planType as string) ?? "over25"
    const interval = (meta?.interval as string) ?? "monthly"

    if (!memberId) {
      console.error("[payment] No member_id in membership transaction")
      return
    }

    // Calculate period dates
    const startDate = new Date()
    const endDate = new Date()
    if (interval === "annual") {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    // Upsert subscription
    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .upsert(
        {
          member_id: memberId,
          plan_type: planType,
          payment_type: interval,
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          redsys_token: result.redsysToken ?? null,
          redsys_token_expiry: result.redsysTokenExpiry ?? null,
          redsys_cof_txn_id: result.cofTxnId ?? null,
          redsys_last_order: txn.redsys_order as string,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "member_id" },
      )
      .select("id")
      .single()

    if (subErr) {
      console.error("[payment] Error upserting subscription:", subErr)
    }

    // Update transaction with subscription reference
    if (sub) {
      await admin
        .from("payment_transactions")
        .update({ subscription_id: sub.id })
        .eq("id", txn.id as string)
    }

    // Update miembros table
    await admin
      .from("miembros")
      .update({
        subscription_status: "active",
        subscription_plan: `${planType}_${interval}`,
        subscription_updated_at: new Date().toISOString(),
        last_four: result.lastFour ?? null,
        redsys_token: result.redsysToken ?? null,
        redsys_token_expiry: result.redsysTokenExpiry ?? null,
      })
      .eq("user_uuid", memberId)

    // Also update users.is_member
    await admin
      .from("users")
      .update({ is_member: true })
      .eq("id", memberId)

    revalidatePath("/dashboard/membership")
    revalidatePath("/membership")
  } catch (err) {
    console.error("[payment] handleMembershipSuccess error:", err)
  }
}

// ── 4. Cancel Subscription ───────────────────────────────────────────────────

/**
 * Cancel a membership subscription.
 * Sets status to "canceled" — subscription remains active until period end.
 */
export async function cancelMembershipSubscription(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return { success: false, error: "No autenticado" }
    }

    const admin = getAdminClient()

    // Find active subscription
    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .select("id, end_date")
      .eq("member_id", user.id)
      .eq("status", "active")
      .single()

    if (subErr || !sub) {
      return { success: false, error: "No se encontró una suscripción activa" }
    }

    // Mark as canceled (will expire at end_date)
    await admin
      .from("subscriptions")
      .update({
        status: "canceled",
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id)

    // Update miembros
    await admin
      .from("miembros")
      .update({
        subscription_status: "canceled",
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("user_uuid", user.id)

    revalidatePath("/dashboard/membership")

    return { success: true }
  } catch (err) {
    console.error("[payment] cancelMembershipSubscription error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al cancelar",
    }
  }
}

// ── 5. Update Card (Re-tokenization) ────────────────────────────────────────

/**
 * Prepare a card-update payment (€0 validation + tokenization).
 * The user enters new card details in InSite, we validate and store the new token.
 */
export async function prepareCardUpdate(): Promise<PreparePaymentResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return { success: false, error: "No autenticado" }
    }

    const admin = getAdminClient()

    // Check active subscription exists
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id")
      .eq("member_id", user.id)
      .in("status", ["active", "canceled"])
      .single()

    if (!sub) {
      return { success: false, error: "No se encontró una suscripción" }
    }

    const order = generateOrderNumber("M")

    // Use €0 amount for card validation (TransactionType 7 could also work,
    // but some acquirers prefer a small preauth. Using validation type 0
    // with minimum amount and then refunding is another option.
    // For now, we use a €0.01 preauth which we'll void afterward.)
    // NOTE: Some configurations support type 7 (validation) — use that if available.
    const { data: txn, error: txnErr } = await admin
      .from("payment_transactions")
      .insert({
        redsys_order: order,
        transaction_type: "0",
        amount_cents: 0, // Card validation — €0
        currency: "978",
        status: "pending",
        context: "membership" as PaymentContext,
        member_id: user.id,
        subscription_id: sub.id,
        is_mit: false,
        metadata: { type: "card_update" },
      })
      .select("id")
      .single()

    if (txnErr) {
      return { success: false, error: "Error al preparar la actualización" }
    }

    return {
      success: true,
      order,
      amountCents: 0,
      transactionId: txn.id,
    }
  } catch (err) {
    console.error("[payment] prepareCardUpdate error:", err)
    return { success: false, error: "Error interno" }
  }
}

/**
 * Execute a card update (re-tokenization with new card).
 * Stores the new token and updates subscription + miembros.
 */
export async function executeCardUpdate(
  idOper: string,
  order: string,
): Promise<ExecutePaymentResult> {
  try {
    const admin = getAdminClient()

    const { data: txn, error: txnErr } = await admin
      .from("payment_transactions")
      .select("*")
      .eq("redsys_order", order)
      .eq("status", "pending")
      .single()

    if (txnErr || !txn) {
      return { success: false, error: "Transacción no encontrada", errorCode: "TXN_NOT_FOUND" }
    }

    // Authorize with tokenization
    const result = await authorizeWithIdOper({
      idOper,
      order,
      amountCents: txn.amount_cents,
      description: "Actualización de tarjeta — Peña Lorenzo Sanz",
      tokenize: true,
      cofType: "R",
    })

    // Update transaction
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
      .eq("id", txn.id)

    if (result.success && result.redsysToken) {
      const memberId = txn.member_id as string

      // Update subscription with new token
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

      // Update miembros
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
  } catch (err) {
    console.error("[payment] executeCardUpdate error:", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al actualizar tarjeta",
      errorCode: "EXEC_ERROR",
    }
  }
}
