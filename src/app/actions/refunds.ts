"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { processRefund, generateOrderNumber } from "@/lib/redsys"
import { sendEmail } from "@/lib/email"
import {
  renderRefundRequestNotificationEmail,
  renderRefundApprovedEmail,
  renderRefundDeclinedEmail,
} from "@/lib/email/templates/refund"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

const ADMIN_EMAIL = "info@lorenzosanz.com"
const REFUND_DEADLINE_DAY = 10 // Requests allowed until the 10th of the month

// ─── requestRefund (member action) ──────────────────────────────────────────

export async function requestRefund(input: {
  reason: string
  details: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { reason, details } = input

    // Validate reason
    const validReasons = ["economic", "not_satisfied", "personal", "other"]
    if (!validReasons.includes(reason)) {
      return { success: false, error: "Motivo no válido" }
    }

    // Validate details
    if (!details || details.trim().length < 20) {
      return { success: false, error: "Los detalles deben tener al menos 20 caracteres" }
    }

    // Check date: only allowed until the 10th of the month
    const now = new Date()
    if (now.getDate() > REFUND_DEADLINE_DAY) {
      return {
        success: false,
        error: `Las solicitudes de reembolso solo se pueden realizar hasta el día ${REFUND_DEADLINE_DAY} del mes`,
      }
    }

    // Authenticate
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const admin = getAdminClient()

    // Get active subscription
    const { data: subscription, error: subError } = await admin
      .from("subscriptions")
      .select("id, plan_type, payment_type, last_four")
      .eq("member_id", user.id)
      .eq("status", "active")
      .single()

    if (subError || !subscription) {
      return { success: false, error: "No se encontró una suscripción activa" }
    }

    // Check for existing pending request
    const { data: existingRequest } = await admin
      .from("refund_requests")
      .select("id")
      .eq("member_id", user.id)
      .eq("status", "pending")
      .maybeSingle()

    if (existingRequest) {
      return { success: false, error: "Ya tienes una solicitud de reembolso pendiente" }
    }

    // Find the most recent authorized membership payment
    const { data: transaction, error: txnError } = await admin
      .from("payment_transactions")
      .select("id, redsys_order, amount_cents")
      .eq("member_id", user.id)
      .eq("context", "membership")
      .eq("status", "authorized")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (txnError || !transaction) {
      return {
        success: false,
        error: "No se encontró un pago reciente que pueda ser reembolsado",
      }
    }

    // Insert the refund request
    const { error: insertError } = await admin.from("refund_requests").insert({
      member_id: user.id,
      subscription_id: subscription.id,
      original_transaction_id: transaction.id,
      amount_cents: transaction.amount_cents,
      reason,
      details: details.trim(),
      status: "pending",
    })

    if (insertError) {
      console.error("[refunds] insert failed", insertError)
      return { success: false, error: "Error al crear la solicitud" }
    }

    // Get member name for email
    const { data: userData } = await admin
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single()

    // Notify admin by email
    const html = renderRefundRequestNotificationEmail({
      memberName: userData?.name || user.email || "Socio",
      memberEmail: userData?.email || user.email || "",
      planType: subscription.plan_type || "",
      paymentType: subscription.payment_type || "",
      amountCents: transaction.amount_cents,
      reason,
      details: details.trim(),
      requestDate: new Date().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    })

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Solicitud de reembolso — ${userData?.name || user.email}`,
      html,
    })

    revalidatePath("/dashboard/membership")

    return { success: true }
  } catch (error) {
    console.error("[refunds] requestRefund failed", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado",
    }
  }
}

// ─── declineRefund (admin action) ───────────────────────────────────────────

export async function declineRefund(input: {
  requestId: string
  responseMessage: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { requestId, responseMessage } = input

    if (!responseMessage || responseMessage.trim().length < 10) {
      return { success: false, error: "La respuesta debe tener al menos 10 caracteres" }
    }

    // Verify admin
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const admin = getAdminClient()

    // Verify role
    const { data: member } = await admin
      .from("miembros")
      .select("role")
      .eq("user_uuid", user.id)
      .single()

    if (member?.role !== "admin") {
      return { success: false, error: "No autorizado" }
    }

    // Get the refund request
    const { data: request, error: reqError } = await admin
      .from("refund_requests")
      .select("id, member_id, status")
      .eq("id", requestId)
      .single()

    if (reqError || !request) {
      return { success: false, error: "Solicitud no encontrada" }
    }

    if (request.status !== "pending") {
      return { success: false, error: "Esta solicitud ya ha sido procesada" }
    }

    // Update request
    await admin
      .from("refund_requests")
      .update({
        status: "declined",
        admin_response: responseMessage.trim(),
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    // Get member info for the email
    const { data: memberData } = await admin
      .from("users")
      .select("name, email")
      .eq("id", request.member_id)
      .single()

    if (memberData?.email) {
      const html = renderRefundDeclinedEmail({
        memberName: memberData.name || "Socio",
        adminResponse: responseMessage.trim(),
      })

      await sendEmail({
        to: memberData.email,
        subject: "Actualización sobre tu solicitud de reembolso — Peña Lorenzo Sanz",
        html,
      })
    }

    revalidatePath("/admin/refunds")

    return { success: true }
  } catch (error) {
    console.error("[refunds] declineRefund failed", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado",
    }
  }
}

// ─── approveRefund (admin action) ───────────────────────────────────────────

export async function approveRefund(input: {
  requestId: string
  adminNotes?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { requestId, adminNotes } = input

    // Verify admin
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const admin = getAdminClient()

    // Verify role
    const { data: member } = await admin
      .from("miembros")
      .select("role")
      .eq("user_uuid", user.id)
      .single()

    if (member?.role !== "admin") {
      return { success: false, error: "No autorizado" }
    }

    // Get the full refund request with related data
    const { data: request, error: reqError } = await admin
      .from("refund_requests")
      .select("id, member_id, subscription_id, original_transaction_id, amount_cents, status")
      .eq("id", requestId)
      .single()

    if (reqError || !request) {
      return { success: false, error: "Solicitud no encontrada" }
    }

    if (request.status !== "pending") {
      return { success: false, error: "Esta solicitud ya ha sido procesada" }
    }

    // Get the original transaction to get the Redsys order number
    const { data: originalTxn, error: txnError } = await admin
      .from("payment_transactions")
      .select("redsys_order, amount_cents, last_four")
      .eq("id", request.original_transaction_id)
      .single()

    if (txnError || !originalTxn) {
      return { success: false, error: "No se encontró la transacción original" }
    }

    // Process the refund through Redsys
    const refundResult = await processRefund({
      originalOrder: originalTxn.redsys_order,
      amountCents: request.amount_cents,
    })

    if (!refundResult.success) {
      console.error("[refunds] Redsys refund failed", {
        requestId,
        order: originalTxn.redsys_order,
        error: refundResult.error,
        errorCode: refundResult.errorCode,
      })
      return {
        success: false,
        error: `Error al procesar el reembolso en Redsys: ${refundResult.error || "Error desconocido"}`,
      }
    }

    // Create refund transaction record
    const refundOrder = generateOrderNumber("D")
    const { data: refundTxn, error: refundTxnError } = await admin
      .from("payment_transactions")
      .insert({
        redsys_order: refundOrder,
        transaction_type: "3",
        amount_cents: request.amount_cents,
        currency: "978",
        status: "refunded",
        context: "membership",
        member_id: request.member_id,
        subscription_id: request.subscription_id,
        ds_response: refundResult.dsResponse || null,
        ds_authorization_code: refundResult.authorizationCode || null,
        metadata: {
          type: "refund",
          original_order: originalTxn.redsys_order,
          original_transaction_id: request.original_transaction_id,
          refund_request_id: requestId,
        },
      })
      .select("id")
      .single()

    if (refundTxnError) {
      console.error("[refunds] refund txn insert failed", refundTxnError)
      // The Redsys refund succeeded but we failed to record it — log but continue
    }

    // Update the original transaction status
    await admin
      .from("payment_transactions")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", request.original_transaction_id)

    // Update the refund request
    await admin
      .from("refund_requests")
      .update({
        status: "approved",
        admin_notes: adminNotes?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        refund_transaction_id: refundTxn?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)

    // Cancel the subscription
    await admin
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.subscription_id)

    // Revoke membership
    await admin
      .from("users")
      .update({ is_member: false, updated_at: new Date().toISOString() })
      .eq("id", request.member_id)

    // Send approval email to member
    const { data: memberData } = await admin
      .from("users")
      .select("name, email")
      .eq("id", request.member_id)
      .single()

    if (memberData?.email) {
      const html = renderRefundApprovedEmail({
        memberName: memberData.name || "Socio",
        amountCents: request.amount_cents,
        last4: originalTxn.last_four,
      })

      await sendEmail({
        to: memberData.email,
        subject: "Tu reembolso ha sido aprobado — Peña Lorenzo Sanz",
        html,
      })
    }

    revalidatePath("/admin/refunds")
    revalidatePath("/dashboard/membership")

    return { success: true }
  } catch (error) {
    console.error("[refunds] approveRefund failed", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado",
    }
  }
}

// ─── getRefundRequests (admin) ──────────────────────────────────────────────

export interface RefundRequestRow {
  id: string
  member_id: string
  subscription_id: string
  original_transaction_id: string
  amount_cents: number
  reason: string
  details: string
  status: string
  admin_notes: string | null
  admin_response: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  refund_transaction_id: string | null
  created_at: string
  updated_at: string
  // Joined data
  member_name: string | null
  member_email: string | null
  plan_type: string | null
  payment_type: string | null
  redsys_order: string | null
  last_four: string | null
}

export async function getRefundRequests(statusFilter?: string): Promise<{
  success: boolean
  data?: RefundRequestRow[]
  error?: string
}> {
  try {
    // Verify admin
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: "No autenticado" }
    }

    const admin = getAdminClient()

    // Verify role
    const { data: memberRow } = await admin
      .from("miembros")
      .select("role")
      .eq("user_uuid", user.id)
      .single()

    if (memberRow?.role !== "admin") {
      return { success: false, error: "No autorizado" }
    }

    // Build query
    let query = admin
      .from("refund_requests")
      .select(`
        id,
        member_id,
        subscription_id,
        original_transaction_id,
        amount_cents,
        reason,
        details,
        status,
        admin_notes,
        admin_response,
        reviewed_by,
        reviewed_at,
        refund_transaction_id,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false })

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter)
    }

    const { data: requests, error: queryError } = await query

    if (queryError) {
      console.error("[refunds] query failed", queryError)
      return { success: false, error: "Error al obtener las solicitudes" }
    }

    if (!requests || requests.length === 0) {
      return { success: true, data: [] }
    }

    // Collect unique member_ids & transaction_ids to batch-fetch related data
    const memberIds = [...new Set(requests.map((r) => r.member_id))]
    const txnIds = [...new Set(requests.map((r) => r.original_transaction_id))]
    const subIds = [...new Set(requests.map((r) => r.subscription_id))]

    const [usersResult, txnResult, subResult] = await Promise.all([
      admin.from("users").select("id, name, email").in("id", memberIds),
      admin.from("payment_transactions").select("id, redsys_order, last_four").in("id", txnIds),
      admin.from("subscriptions").select("id, plan_type, payment_type").in("id", subIds),
    ])

    const usersMap = new Map(
      (usersResult.data || []).map((u) => [u.id, { name: u.name, email: u.email }]),
    )
    const txnMap = new Map(
      (txnResult.data || []).map((t) => [t.id, { redsys_order: t.redsys_order, last_four: t.last_four }]),
    )
    const subMap = new Map(
      (subResult.data || []).map((s) => [s.id, { plan_type: s.plan_type, payment_type: s.payment_type }]),
    )

    const enriched: RefundRequestRow[] = requests.map((r) => {
      const userInfo = usersMap.get(r.member_id)
      const txnInfo = txnMap.get(r.original_transaction_id)
      const subInfo = subMap.get(r.subscription_id)
      return {
        ...r,
        member_name: userInfo?.name ?? null,
        member_email: userInfo?.email ?? null,
        plan_type: subInfo?.plan_type ?? null,
        payment_type: subInfo?.payment_type ?? null,
        redsys_order: txnInfo?.redsys_order ?? null,
        last_four: txnInfo?.last_four ?? null,
      }
    })

    return { success: true, data: enriched }
  } catch (error) {
    console.error("[refunds] getRefundRequests failed", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado",
    }
  }
}

// ─── getPendingRefundCount (for admin badge) ────────────────────────────────

export async function getPendingRefundCount(): Promise<number> {
  try {
    const admin = getAdminClient()
    const { count, error } = await admin
      .from("refund_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")

    if (error) {
      console.error("[refunds] getPendingRefundCount failed", error)
      return 0
    }

    return count ?? 0
  } catch {
    return 0
  }
}

// ─── getMemberRefundStatus (for dashboard button visibility) ────────────────

export async function getMemberRefundStatus(): Promise<{
  canRequest: boolean
  pendingRequest: boolean
  reason?: string
}> {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { canRequest: false, pendingRequest: false, reason: "No autenticado" }
    }

    const admin = getAdminClient()

    // Check active subscription
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("member_id", user.id)
      .eq("status", "active")
      .maybeSingle()

    if (!subscription) {
      return { canRequest: false, pendingRequest: false, reason: "Sin suscripción activa" }
    }

    // Check pending request
    const { data: pending } = await admin
      .from("refund_requests")
      .select("id")
      .eq("member_id", user.id)
      .eq("status", "pending")
      .maybeSingle()

    if (pending) {
      return { canRequest: false, pendingRequest: true, reason: "Solicitud pendiente" }
    }

    // Check date
    const now = new Date()
    if (now.getDate() > REFUND_DEADLINE_DAY) {
      return {
        canRequest: false,
        pendingRequest: false,
        reason: `Solo hasta el día ${REFUND_DEADLINE_DAY} del mes`,
      }
    }

    // Check there's a refundable transaction
    const { data: txn } = await admin
      .from("payment_transactions")
      .select("id")
      .eq("member_id", user.id)
      .eq("context", "membership")
      .eq("status", "authorized")
      .limit(1)
      .maybeSingle()

    if (!txn) {
      return { canRequest: false, pendingRequest: false, reason: "Sin pago reembolsable" }
    }

    return { canRequest: true, pendingRequest: false }
  } catch {
    return { canRequest: false, pendingRequest: false, reason: "Error" }
  }
}
