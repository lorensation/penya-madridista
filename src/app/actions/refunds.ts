"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { processRefund } from "@/lib/redsys"
import { buildRedsysRefundMetadata, hasRemainingActiveMembershipAfterRefund } from "@/lib/redsys/refund-recording"
import { sendEmail } from "@/lib/email"
import { generatePreferencesToken } from "@/lib/email/preferences-token"
import { completeMembershipOnboarding as finalizeMembershipOnboarding } from "@/lib/membership/onboarding"
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
      const preferencesToken = generatePreferencesToken(memberData.email)
      const html = renderRefundDeclinedEmail({
        memberName: memberData.name || "Socio",
        adminResponse: responseMessage.trim(),
        preferencesToken,
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
      .select("id, redsys_order, amount_cents, last_four, metadata")
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

    const nowIso = new Date().toISOString()
    const refundMetadata = buildRedsysRefundMetadata({
      existingMetadata: originalTxn.metadata,
      source: "admin_dashboard",
      originalOrder: originalTxn.redsys_order,
      originalTransactionId: originalTxn.id,
      refundRequestId: requestId,
      amountCents: request.amount_cents,
      authorizationCode: refundResult.authorizationCode || null,
      dsResponse: refundResult.dsResponse || null,
      lastFour: originalTxn.last_four,
      processedAt: nowIso,
    })

    // Redsys refunds reuse the original order, so the original payment row remains canonical.
    const { error: originalTxnUpdateError } = await admin
      .from("payment_transactions")
      .update({
        status: "refunded",
        metadata: refundMetadata,
        updated_at: nowIso,
      })
      .eq("id", request.original_transaction_id)

    if (originalTxnUpdateError) {
      console.error("[refunds] original txn refund update failed", originalTxnUpdateError)
      return { success: false, error: "El reembolso se proceso en Redsys, pero no se pudo registrar en la base de datos" }
    }

    // Update the refund request
    const { error: refundRequestUpdateError } = await admin
      .from("refund_requests")
      .update({
        status: "approved",
        admin_notes: adminNotes?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: nowIso,
        refund_transaction_id: request.original_transaction_id,
        updated_at: nowIso,
      })
      .eq("id", requestId)

    if (refundRequestUpdateError) {
      console.error("[refunds] refund request update failed", refundRequestUpdateError)
      return { success: false, error: "El reembolso se registro parcialmente; revisa la solicitud manualmente" }
    }

    // Cancel the subscription
    const { error: subscriptionUpdateError } = await admin
      .from("subscriptions")
      .update({
        status: "canceled",
        canceled_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", request.subscription_id)

    if (subscriptionUpdateError) {
      console.error("[refunds] subscription cancellation failed", subscriptionUpdateError)
      return { success: false, error: "El reembolso se registro, pero no se pudo cancelar la suscripcion" }
    }

    const { data: remainingSubscriptions, error: remainingSubscriptionsError } = await admin
      .from("subscriptions")
      .select("id, status")
      .eq("member_id", request.member_id)

    if (remainingSubscriptionsError) {
      console.error("[refunds] remaining subscriptions check failed", remainingSubscriptionsError)
      return { success: false, error: "El reembolso se registro, pero no se pudo recalcular el estado de socio" }
    }

    const keepMembership = hasRemainingActiveMembershipAfterRefund(remainingSubscriptions ?? [])
    const { error: userMembershipUpdateError } = await admin
      .from("users")
      .update({ is_member: keepMembership, updated_at: nowIso })
      .eq("id", request.member_id)

    if (userMembershipUpdateError) {
      console.error("[refunds] user membership update failed", userMembershipUpdateError)
      return { success: false, error: "El reembolso se registro, pero no se pudo actualizar el estado de socio" }
    }

    // Send approval email to member
    const { data: memberData } = await admin
      .from("users")
      .select("name, email")
      .eq("id", request.member_id)
      .single()

    if (memberData?.email) {
      const preferencesToken = generatePreferencesToken(memberData.email)
      const html = renderRefundApprovedEmail({
        memberName: memberData.name || "Socio",
        amountCents: request.amount_cents,
        last4: originalTxn.last_four,
        preferencesToken,
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

export interface IncompleteOnboardingReviewRow {
  id: string
  member_id: string
  subscription_id: string | null
  redsys_order: string
  amount_cents: number
  status: string
  onboarding_status: string
  refund_review_status: string
  authorized_at: string | null
  grace_expires_at: string | null
  first_reminder_sent_at: string | null
  final_reminder_sent_at: string | null
  refund_review_flagged_at: string | null
  onboarding_completed_at: string | null
  created_at: string
  updated_at: string
  member_name: string | null
  member_email: string | null
  profile_completed_at: string | null
  plan_type: string | null
  payment_type: string | null
  subscription_status: string | null
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
}

function parseReviewMetadata(metadata: unknown): {
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
} {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
    }
  }

  const metadataRecord = metadata as Record<string, unknown>
  const onboardingReviewCandidate = metadataRecord.onboarding_review
  const onboardingReview =
    onboardingReviewCandidate &&
    typeof onboardingReviewCandidate === "object" &&
    !Array.isArray(onboardingReviewCandidate)
      ? (onboardingReviewCandidate as Record<string, unknown>)
      : null

  if (!onboardingReview) {
    return {
      admin_notes: null,
      reviewed_by: null,
      reviewed_at: null,
    }
  }

  return {
    admin_notes:
      typeof onboardingReview.admin_notes === "string" ? onboardingReview.admin_notes : null,
    reviewed_by:
      typeof onboardingReview.reviewed_by === "string" ? onboardingReview.reviewed_by : null,
    reviewed_at:
      typeof onboardingReview.reviewed_at === "string" ? onboardingReview.reviewed_at : null,
  }
}

function buildOnboardingReviewMetadata(
  metadata: unknown,
  input: {
    action: "resolved_completed" | "refunded_manually" | "dismissed"
    adminNotes?: string
    reviewedBy: string
    reviewedAt: string
  },
) {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...metadata }
      : {}

  return {
    ...base,
    onboarding_review: {
      action: input.action,
      admin_notes: input.adminNotes?.trim() || null,
      reviewed_by: input.reviewedBy,
      reviewed_at: input.reviewedAt,
    },
  }
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

export async function getIncompleteOnboardingReviews(statusFilter = "pending_review"): Promise<{
  success: boolean
  data?: IncompleteOnboardingReviewRow[]
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
    const { data: memberRow } = await admin
      .from("miembros")
      .select("role")
      .eq("user_uuid", user.id)
      .single()

    if (memberRow?.role !== "admin") {
      return { success: false, error: "No autorizado" }
    }

    let query = admin
      .from("payment_transactions")
      .select(`
        id,
        member_id,
        subscription_id,
        redsys_order,
        amount_cents,
        status,
        onboarding_status,
        refund_review_status,
        authorized_at,
        grace_expires_at,
        first_reminder_sent_at,
        final_reminder_sent_at,
        refund_review_flagged_at,
        onboarding_completed_at,
        metadata,
        created_at,
        updated_at
      `)
      .eq("context", "membership")
      .in("refund_review_status", [
        "pending_review",
        "resolved_completed",
        "refunded_manually",
        "dismissed",
      ])
      .order("refund_review_flagged_at", { ascending: false })
      .order("authorized_at", { ascending: false })

    if (statusFilter !== "all") {
      query = query.eq("refund_review_status", statusFilter)
    }

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      console.error("[refunds] getIncompleteOnboardingReviews query failed", transactionsError)
      return { success: false, error: "Error al cargar la cola de onboarding" }
    }

    if (!transactions || transactions.length === 0) {
      return { success: true, data: [] }
    }

    const memberIds = [
      ...new Set(
        transactions
          .map((transaction) => transaction.member_id)
          .filter((value): value is string => typeof value === "string"),
      ),
    ]
    const subscriptionIds = [
      ...new Set(
        transactions
          .map((transaction) => transaction.subscription_id)
          .filter((value): value is string => typeof value === "string"),
      ),
    ]

    const [usersResult, subscriptionsResult] = await Promise.all([
      admin.from("users").select("id, name, email, profile_completed_at").in("id", memberIds),
      subscriptionIds.length > 0
        ? admin
            .from("subscriptions")
            .select("id, plan_type, payment_type, status")
            .in("id", subscriptionIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const usersMap = new Map(
      (usersResult.data || []).map((row) => [
        row.id,
        {
          name: row.name,
          email: row.email,
          profile_completed_at: row.profile_completed_at,
        },
      ]),
    )

    const subscriptionsMap = new Map(
      ((subscriptionsResult.data as Array<{
        id: string
        plan_type: string | null
        payment_type: string | null
        status: string | null
      }> | null) || []).map((row) => [
        row.id,
        {
          plan_type: row.plan_type,
          payment_type: row.payment_type,
          subscription_status: row.status,
        },
      ]),
    )

    const enriched: IncompleteOnboardingReviewRow[] = transactions.map((transaction) => {
      const userInfo = transaction.member_id ? usersMap.get(transaction.member_id) : null
      const subscriptionInfo = transaction.subscription_id
        ? subscriptionsMap.get(transaction.subscription_id)
        : null
      const reviewMetadata = parseReviewMetadata(transaction.metadata)

      return {
        id: transaction.id,
        member_id: transaction.member_id || "",
        subscription_id: transaction.subscription_id,
        redsys_order: transaction.redsys_order,
        amount_cents: transaction.amount_cents,
        status: transaction.status,
        onboarding_status: transaction.onboarding_status,
        refund_review_status: transaction.refund_review_status,
        authorized_at: transaction.authorized_at,
        grace_expires_at: transaction.grace_expires_at,
        first_reminder_sent_at: transaction.first_reminder_sent_at,
        final_reminder_sent_at: transaction.final_reminder_sent_at,
        refund_review_flagged_at: transaction.refund_review_flagged_at,
        onboarding_completed_at: transaction.onboarding_completed_at,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        member_name: userInfo?.name ?? null,
        member_email: userInfo?.email ?? null,
        profile_completed_at: userInfo?.profile_completed_at ?? null,
        plan_type: subscriptionInfo?.plan_type ?? null,
        payment_type: subscriptionInfo?.payment_type ?? null,
        subscription_status: subscriptionInfo?.subscription_status ?? null,
        admin_notes: reviewMetadata.admin_notes,
        reviewed_by: reviewMetadata.reviewed_by,
        reviewed_at: reviewMetadata.reviewed_at,
      }
    })

    return { success: true, data: enriched }
  } catch (error) {
    console.error("[refunds] getIncompleteOnboardingReviews failed", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado",
    }
  }
}

export async function resolveIncompleteOnboardingReview(input: {
  transactionId: string
  action: "resolved_completed" | "refunded_manually" | "dismissed"
  adminNotes?: string
}): Promise<{ success: boolean; error?: string }> {
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
    const { data: memberRow } = await admin
      .from("miembros")
      .select("role")
      .eq("user_uuid", user.id)
      .single()

    if (memberRow?.role !== "admin") {
      return { success: false, error: "No autorizado" }
    }

    const { data: transaction, error: transactionError } = await admin
      .from("payment_transactions")
      .select("*")
      .eq("id", input.transactionId)
      .eq("context", "membership")
      .single()

    if (transactionError || !transaction) {
      return { success: false, error: "Transaccion no encontrada" }
    }

    const nowIso = new Date().toISOString()
    const metadata = buildOnboardingReviewMetadata(transaction.metadata, {
      action: input.action,
      adminNotes: input.adminNotes,
      reviewedBy: user.id,
      reviewedAt: nowIso,
    })

    if (input.action === "resolved_completed") {
      if (!transaction.member_id) {
        return { success: false, error: "La transaccion no tiene socio asociado" }
      }

      const onboardingResult = await finalizeMembershipOnboarding(
        transaction.member_id,
        transaction.redsys_order,
      )

      if (!onboardingResult.success) {
        return {
          success: false,
          error: "No se pudo finalizar el onboarding antes de cerrar la revision",
        }
      }

      const { error: updateError } = await admin
        .from("payment_transactions")
        .update({
          refund_review_status: "resolved_completed",
          onboarding_status: "completed",
          onboarding_completed_at: transaction.onboarding_completed_at ?? nowIso,
          metadata,
          updated_at: nowIso,
        })
        .eq("id", transaction.id)

      if (updateError) {
        return { success: false, error: "No se pudo cerrar la revision" }
      }
    } else if (input.action === "dismissed") {
      const { error: updateError } = await admin
        .from("payment_transactions")
        .update({
          refund_review_status: "dismissed",
          metadata,
          updated_at: nowIso,
        })
        .eq("id", transaction.id)

      if (updateError) {
        return { success: false, error: "No se pudo actualizar la revision" }
      }
    } else {
      const { error: updateError } = await admin
        .from("payment_transactions")
        .update({
          status: "refunded",
          onboarding_status: "not_applicable",
          refund_review_status: "refunded_manually",
          metadata,
          updated_at: nowIso,
        })
        .eq("id", transaction.id)

      if (updateError) {
        return { success: false, error: "No se pudo registrar el reembolso manual" }
      }

      if (transaction.subscription_id) {
        await admin
          .from("subscriptions")
          .update({
            status: "canceled",
            canceled_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", transaction.subscription_id)
      }

      if (transaction.member_id) {
        const { data: remainingSubscriptions } = await admin
          .from("subscriptions")
          .select("id, status")
          .eq("member_id", transaction.member_id)

        await admin
          .from("users")
          .update({
            is_member: hasRemainingActiveMembershipAfterRefund(remainingSubscriptions ?? []),
            updated_at: nowIso,
          })
          .eq("id", transaction.member_id)
      }
    }

    revalidatePath("/admin/refunds")
    revalidatePath("/dashboard/membership")

    return { success: true }
  } catch (error) {
    console.error("[refunds] resolveIncompleteOnboardingReview failed", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado",
    }
  }
}

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
