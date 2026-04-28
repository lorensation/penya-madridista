import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database, Json } from "@/types/supabase"
import { createAdminSupabaseClient } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { renderPaymentOnboardingReminderEmail } from "@/lib/email/templates/payment-onboarding-reminder"
import { resolveMembershipInterval } from "@/lib/redsys/config"
import { getCardLastFourExtraction } from "@/lib/redsys/card"
import type { RedsysResponseParams } from "@/lib/redsys"

type AdminClient = SupabaseClient<Database>

type PaymentTransactionRow = Database["public"]["Tables"]["payment_transactions"]["Row"]
type UserRow = Database["public"]["Tables"]["users"]["Row"]
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"]
type MemberRow = Database["public"]["Tables"]["miembros"]["Row"]

const GRACE_PERIOD_DAYS = 7
const FIRST_REMINDER_HOURS = 24
const FINAL_REMINDER_DAYS = 5

export type MembershipOnboardingStatus = "not_applicable" | "pending_profile" | "completed"
export type MembershipRefundReviewStatus =
  | "not_applicable"
  | "pending_review"
  | "resolved_completed"
  | "refunded_manually"
  | "dismissed"

export interface MembershipCheckoutSnapshot {
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

export interface FinalizeMembershipPaymentResult {
  success: boolean
  status?: "authorized" | "pending" | "denied" | "error" | "not_found"
  checkoutData?: MembershipCheckoutSnapshot
  transactionId?: string
  subscriptionId?: string | null
  profileCompletedAt?: string | null
  error?: string
}

interface MembershipMetadata {
  planType: string | null
  interval: string | null
  planName: string | null
}

interface FinalizeMembershipPaymentOptions {
  order: string
  expectedMemberId?: string | null
  responseParams?: RedsysResponseParams | null
  admin?: AdminClient
}

export interface CompleteMembershipOnboardingResult {
  success: boolean
  activated?: boolean
  profileWasJustCompleted?: boolean
  checkoutData?: MembershipCheckoutSnapshot
  error?: string
}

interface ProcessIncompletePaidMembershipsOptions {
  dryRun?: boolean
  limit?: number
}

export interface ProcessIncompletePaidMembershipsResult {
  processedAt: string
  considered: number
  firstRemindersSent: number
  finalRemindersSent: number
  flaggedForReview: number
  results: Array<{
    order: string
    memberId: string
    email: string
    actions: string[]
  }>
}

function getAdminClient(admin?: AdminClient) {
  return admin ?? createAdminSupabaseClient()
}

function getPublicBaseUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
    process.env.NEXT_PUBLIC_BASE_URL?.trim(),
    "https://www.lorenzosanz.com",
  ]

  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }

    try {
      const url = new URL(candidate)
      const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      if (!isLocalHost) {
        return url.origin
      }
    } catch {
      continue
    }
  }

  return "https://www.lorenzosanz.com"
}

export function getCompleteProfileUrl(order: string, userId: string): string {
  const url = new URL("/complete-profile", getPublicBaseUrl())
  url.searchParams.set("order", order)
  url.searchParams.set("userId", userId)
  return url.toString()
}

function parseMetadataRecord(metadata: Json | null): Record<string, unknown> {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>
  }

  return {}
}

function parseMembershipMetadata(metadata: Json | null): MembershipMetadata {
  const record = parseMetadataRecord(metadata)

  return {
    planType: typeof record.planType === "string" ? record.planType : null,
    interval: typeof record.interval === "string" ? record.interval : null,
    planName: typeof record.planName === "string" ? record.planName : null,
  }
}

function resolvePaymentType(planType: string | null, interval: string | null): string | null {
  if (!planType) {
    return null
  }

  if (planType === "infinite") {
    if (interval === "decade" || interval === "infinite") {
      return interval
    }

    return "decade"
  }

  return resolveMembershipInterval(planType, interval)
}

function buildEndDate(startDateIso: string, paymentType: string): string | null {
  const endDate = new Date(startDateIso)

  if (paymentType === "monthly") {
    endDate.setMonth(endDate.getMonth() + 1)
    return endDate.toISOString()
  }

  if (paymentType === "annual") {
    endDate.setFullYear(endDate.getFullYear() + 1)
    return endDate.toISOString()
  }

  if (paymentType === "decade") {
    endDate.setFullYear(endDate.getFullYear() + 10)
    return endDate.toISOString()
  }

  return null
}

function isCompletedMemberProfile(member: MemberRow | null): boolean {
  if (!member) {
    return false
  }

  return Boolean(
    member.name &&
      member.apellido1 &&
      member.dni_pasaporte &&
      member.telefono > 0 &&
      member.fecha_nacimiento &&
      member.fecha_nacimiento !== "1990-01-01" &&
      member.direccion &&
      member.poblacion &&
      member.cp &&
      member.provincia &&
      member.pais,
  )
}

async function loadMemberProfile(
  admin: AdminClient,
  userId: string,
): Promise<MemberRow | null> {
  const { data: member, error: memberError } = await admin
    .from("miembros")
    .select("*")
    .eq("user_uuid", userId)
    .maybeSingle()

  if (memberError) {
    throw new Error(`Failed loading member profile: ${memberError.message}`)
  }

  return member
}

async function resolveProfileCompletedAt(
  admin: AdminClient,
  user: Pick<UserRow, "id" | "profile_completed_at" | "updated_at" | "created_at">,
): Promise<string | null> {
  if (user.profile_completed_at) {
    return user.profile_completed_at
  }

  const member = await loadMemberProfile(admin, user.id)

  if (!isCompletedMemberProfile(member)) {
    return null
  }

  const completedAt = user.updated_at ?? user.created_at ?? new Date().toISOString()
  const { error: updateError } = await admin
    .from("users")
    .update({
      profile_completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (updateError) {
    throw new Error(`Failed backfilling profile_completed_at: ${updateError.message}`)
  }

  return completedAt
}

function buildMembershipCheckoutSnapshot(
  transaction: Pick<
    PaymentTransactionRow,
    "redsys_order" | "redsys_token" | "redsys_token_expiry" | "cof_txn_id" | "last_four" | "metadata"
  >,
  subscriptionStatus: string,
): MembershipCheckoutSnapshot {
  const metadata = parseMembershipMetadata(transaction.metadata)
  const paymentType = resolvePaymentType(metadata.planType, metadata.interval)

  if (!metadata.planType || !paymentType) {
    throw new Error("Membership transaction metadata is incomplete")
  }

  return {
    id: transaction.redsys_order,
    redsys_token: transaction.redsys_token,
    redsys_token_expiry: transaction.redsys_token_expiry,
    cof_txn_id: transaction.cof_txn_id,
    payment_status: "paid",
    subscription_status: subscriptionStatus,
    plan_type: metadata.planType,
    payment_type: paymentType,
    last_four: transaction.last_four,
  }
}

function logMembershipLastFour(options: {
  event: "redsys.last_four.found" | "redsys.last_four.missing" | "redsys.last_four.invalid" | "redsys.last_four.preserved"
  order: string
  transactionId: string
  context: string
  signatureVerified: boolean
  lastFour?: string | null
}) {
  console.info("[redsys.last_four]", {
    event: options.event,
    redsys_order: options.order,
    transaction_id: options.transactionId,
    context: options.context,
    signature_verified: options.signatureVerified,
    last_four: options.lastFour ?? null,
  })
}

async function loadMembershipTransaction(
  admin: AdminClient,
  order: string,
  expectedMemberId?: string | null,
) {
  let query = admin
    .from("payment_transactions")
    .select("*")
    .eq("redsys_order", order)
    .eq("context", "membership")

  if (expectedMemberId) {
    query = query.eq("member_id", expectedMemberId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw new Error(`Failed loading membership transaction: ${error.message}`)
  }

  return data
}

async function markTransactionAuthorized(
  admin: AdminClient,
  transaction: PaymentTransactionRow,
  responseParams: RedsysResponseParams | null | undefined,
): Promise<PaymentTransactionRow> {
  if (!responseParams) {
    return transaction
  }

  const dsResponse = responseParams.Ds_Response ?? ""
  const parsedAmount = Number.parseInt(responseParams.Ds_Amount ?? "", 10)
  const nowIso = new Date().toISOString()

  if (Number.isNaN(parsedAmount) || parsedAmount !== transaction.amount_cents) {
    throw new Error("Payment amount mismatch while finalizing membership payment")
  }

  const extractedLastFour = getCardLastFourExtraction(responseParams as unknown as Record<string, unknown>)
  const nextLastFour = extractedLastFour.lastFour ?? transaction.last_four

  if (extractedLastFour.reason === "found") {
    logMembershipLastFour({
      event: "redsys.last_four.found",
      order: transaction.redsys_order,
      transactionId: transaction.id,
      context: transaction.context,
      signatureVerified: true,
      lastFour: extractedLastFour.lastFour,
    })
  } else if (transaction.last_four) {
    logMembershipLastFour({
      event: "redsys.last_four.preserved",
      order: transaction.redsys_order,
      transactionId: transaction.id,
      context: transaction.context,
      signatureVerified: true,
      lastFour: transaction.last_four,
    })
  } else {
    logMembershipLastFour({
      event:
        extractedLastFour.reason === "invalid"
          ? "redsys.last_four.invalid"
          : "redsys.last_four.missing",
      order: transaction.redsys_order,
      transactionId: transaction.id,
      context: transaction.context,
      signatureVerified: true,
    })
  }

  const authFields = {
    status: "authorized",
    ds_response: dsResponse || null,
    ds_authorization_code: responseParams.Ds_AuthorisationCode ?? null,
    ds_card_brand: responseParams.Ds_Card_Brand ?? null,
    ds_card_country: responseParams.Ds_Card_Country ?? null,
    last_four: nextLastFour,
    redsys_token: responseParams.Ds_Merchant_Identifier ?? transaction.redsys_token,
    redsys_token_expiry: responseParams.Ds_ExpiryDate ?? transaction.redsys_token_expiry,
    cof_txn_id: responseParams.Ds_Merchant_Cof_Txnid ?? transaction.cof_txn_id,
    authorized_at: transaction.authorized_at ?? nowIso,
    updated_at: nowIso,
  }

  const { data, error } = await admin
    .from("payment_transactions")
    .update(authFields)
    .eq("id", transaction.id)
    .eq("status", transaction.status)
    .select("*")
    .maybeSingle()

  if (error) {
    throw new Error(`Failed claiming membership transaction authorization: ${error.message}`)
  }

  if (data) {
    return data
  }

  const refreshed = await loadMembershipTransaction(admin, transaction.redsys_order, transaction.member_id)
  if (!refreshed) {
    throw new Error("Membership transaction disappeared while being authorized")
  }

  return refreshed
}

async function upsertMembershipSubscriptionFromTransaction(
  admin: AdminClient,
  transaction: PaymentTransactionRow,
  profileCompletedAt: string | null,
): Promise<{ subscription: SubscriptionRow; checkoutData: MembershipCheckoutSnapshot }> {
  const memberId = transaction.member_id
  if (!memberId) {
    throw new Error("Membership transaction has no member_id")
  }

  const metadata = parseMembershipMetadata(transaction.metadata)
  const paymentType = resolvePaymentType(metadata.planType, metadata.interval)
  if (!metadata.planType || !paymentType) {
    throw new Error("Membership transaction metadata is missing plan information")
  }

  const subscriptionStatus = profileCompletedAt ? "active" : "pending_profile"
  const authorizedAt = transaction.authorized_at ?? transaction.updated_at ?? transaction.created_at

  const { data: existingSubscription, error: existingSubscriptionError } = await admin
    .from("subscriptions")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingSubscriptionError) {
    throw new Error(`Failed loading current subscription: ${existingSubscriptionError.message}`)
  }

  const isSameOrder = existingSubscription?.redsys_last_order === transaction.redsys_order
  const startDate = isSameOrder && existingSubscription?.start_date ? existingSubscription.start_date : authorizedAt
  const endDate = isSameOrder && existingSubscription
    ? existingSubscription.end_date
    : buildEndDate(startDate, paymentType)

  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .upsert(
      {
        member_id: memberId,
        plan_type: metadata.planType,
        payment_type: paymentType,
        status: subscriptionStatus,
        start_date: startDate,
        end_date: endDate,
        last_four: transaction.last_four,
        redsys_token: transaction.redsys_token,
        redsys_token_expiry: transaction.redsys_token_expiry,
        redsys_cof_txn_id: transaction.cof_txn_id,
        redsys_last_order: transaction.redsys_order,
        cancel_at_period_end: false,
        canceled_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" },
    )
    .select("*")
    .single()

  if (subscriptionError || !subscription) {
    throw new Error(`Failed upserting membership subscription: ${subscriptionError?.message ?? "unknown error"}`)
  }

  const refundReviewStatus: MembershipRefundReviewStatus = profileCompletedAt
    ? transaction.refund_review_status === "pending_review"
      ? "resolved_completed"
      : "not_applicable"
    : (transaction.refund_review_status as MembershipRefundReviewStatus) === "resolved_completed"
      ? "not_applicable"
      : ((transaction.refund_review_status as MembershipRefundReviewStatus) || "not_applicable")

  const onboardingStatus: MembershipOnboardingStatus = profileCompletedAt ? "completed" : "pending_profile"
  const { error: transactionUpdateError } = await admin
    .from("payment_transactions")
    .update({
      subscription_id: subscription.id,
      onboarding_status: onboardingStatus,
      grace_expires_at: profileCompletedAt
        ? null
        : transaction.grace_expires_at ?? new Date(new Date(authorizedAt).getTime() + GRACE_PERIOD_DAYS * 86400000).toISOString(),
      onboarding_completed_at: profileCompletedAt
        ? transaction.onboarding_completed_at ?? profileCompletedAt
        : null,
      refund_review_status: refundReviewStatus,
      refund_review_flagged_at: profileCompletedAt ? null : transaction.refund_review_flagged_at,
      authorized_at: transaction.authorized_at ?? authorizedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transaction.id)

  if (transactionUpdateError) {
    throw new Error(`Failed updating membership transaction linkage: ${transactionUpdateError.message}`)
  }

  if (profileCompletedAt) {
    const { error: userUpdateError } = await admin
      .from("users")
      .update({
        is_member: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId)

    if (userUpdateError) {
      throw new Error(`Failed activating membership user state: ${userUpdateError.message}`)
    }
  }

  const snapshot = buildMembershipCheckoutSnapshot(transaction, subscription.status)
  return {
    subscription,
    checkoutData: {
      ...snapshot,
      subscription_status: subscription.status,
    },
  }
}

export async function finalizeMembershipPayment(
  options: FinalizeMembershipPaymentOptions,
): Promise<FinalizeMembershipPaymentResult> {
  try {
    const admin = getAdminClient(options.admin)
    const transaction = await loadMembershipTransaction(admin, options.order, options.expectedMemberId)

    if (!transaction) {
      return { success: true, status: "not_found" }
    }

    if (transaction.context !== "membership") {
      return { success: false, status: "error", error: "INVALID_CONTEXT" }
    }

    if (!transaction.member_id) {
      return { success: false, status: "error", error: "MEMBER_REQUIRED" }
    }

    let currentTransaction = transaction

    if (currentTransaction.status === "denied") {
      return { success: true, status: "denied" }
    }

    if (currentTransaction.status === "pending" || currentTransaction.status === "error") {
      if (!options.responseParams) {
        return { success: true, status: "pending" }
      }

      currentTransaction = await markTransactionAuthorized(admin, currentTransaction, options.responseParams)
    }

    if (currentTransaction.status !== "authorized") {
      return { success: true, status: "pending" }
    }

    const memberId = currentTransaction.member_id
    if (!memberId) {
      return { success: false, status: "error", error: "MEMBER_REQUIRED" }
    }
    const { data: user, error: userError } = await admin
      .from("users")
      .select("id, profile_completed_at, updated_at, created_at")
      .eq("id", memberId)
      .single()

    if (userError || !user) {
      return { success: false, status: "error", error: "USER_LOOKUP_FAILED" }
    }

    const profileCompletedAt = await resolveProfileCompletedAt(admin, user)
    const { subscription, checkoutData } = await upsertMembershipSubscriptionFromTransaction(
      admin,
      currentTransaction,
      profileCompletedAt,
    )

    return {
      success: true,
      status: "authorized",
      transactionId: currentTransaction.id,
      subscriptionId: subscription.id,
      profileCompletedAt,
      checkoutData,
    }
  } catch (error) {
    console.error("[membership/onboarding] finalizeMembershipPayment failed", {
      order: options.order,
      error,
    })
    return {
      success: false,
      status: "error",
      error: error instanceof Error ? error.message : "UNEXPECTED_ERROR",
    }
  }
}

export async function completeMembershipOnboarding(
  userId: string,
  order?: string | null,
): Promise<CompleteMembershipOnboardingResult> {
  try {
    const admin = createAdminSupabaseClient()
    const nowIso = new Date().toISOString()
    const member = await loadMemberProfile(admin, userId)

    if (!isCompletedMemberProfile(member)) {
      return { success: false, error: "MEMBER_PROFILE_INCOMPLETE" }
    }

    const { data: user, error: userError } = await admin
      .from("users")
      .select("id, profile_completed_at")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return { success: false, error: "USER_NOT_FOUND" }
    }

    const profileWasJustCompleted = !user.profile_completed_at

    const { error: updateUserError } = await admin
      .from("users")
      .update({
        profile_completed_at: user.profile_completed_at ?? nowIso,
        is_member: true,
        updated_at: nowIso,
      })
      .eq("id", userId)

    if (updateUserError) {
      return { success: false, error: "USER_UPDATE_FAILED" }
    }

    if (!order) {
      return {
        success: true,
        activated: true,
        profileWasJustCompleted,
      }
    }

    const finalized = await finalizeMembershipPayment({
      order,
      expectedMemberId: userId,
      admin,
    })

    if (!finalized.success || finalized.status !== "authorized" || !finalized.checkoutData) {
      return {
        success: false,
        error: finalized.error || finalized.status || "FINALIZATION_FAILED",
      }
    }

    return {
      success: true,
      activated: finalized.checkoutData.subscription_status === "active",
      profileWasJustCompleted,
      checkoutData: finalized.checkoutData,
    }
  } catch (error) {
    console.error("[membership/onboarding] completeMembershipOnboarding failed", {
      userId,
      order,
      error,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : "UNEXPECTED_ERROR",
    }
  }
}

function formatMembershipPlanName(transaction: PaymentTransactionRow): string {
  const metadata = parseMembershipMetadata(transaction.metadata)
  if (metadata.planName) {
    return metadata.planName
  }

  const paymentType = resolvePaymentType(metadata.planType, metadata.interval)
  if (!metadata.planType || !paymentType) {
    return "Membresía"
  }

  return `${metadata.planType} ${paymentType}`
}

async function sendReminderEmail(
  transaction: PaymentTransactionRow,
  user: Pick<UserRow, "id" | "email" | "name">,
  reminderKind: "first" | "final",
) {
  const deadline = transaction.grace_expires_at ?? new Date(
    new Date(transaction.authorized_at ?? transaction.updated_at).getTime() + GRACE_PERIOD_DAYS * 86400000,
  ).toISOString()

  const html = renderPaymentOnboardingReminderEmail({
    memberName: user.name || "madridista",
    planName: formatMembershipPlanName(transaction),
    completeProfileUrl: getCompleteProfileUrl(transaction.redsys_order, user.id),
    deadlineLabel: new Date(deadline).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    reminderKind,
  })

  await sendEmail({
    to: user.email,
    subject:
      reminderKind === "final"
        ? "Último paso para activar tu membresía en la Peña Lorenzo Sanz"
        : "Completa tu perfil para activar tu membresía en la Peña Lorenzo Sanz",
    html,
  })
}

export async function processIncompletePaidMemberships(
  options: ProcessIncompletePaidMembershipsOptions = {},
): Promise<ProcessIncompletePaidMembershipsResult> {
  const admin = createAdminSupabaseClient()
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500))
  const processedAt = new Date().toISOString()

  const { data: transactions, error } = await admin
    .from("payment_transactions")
    .select("*")
    .eq("context", "membership")
    .eq("status", "authorized")
    .eq("onboarding_status", "pending_profile")
    .not("member_id", "is", null)
    .order("authorized_at", { ascending: true, nullsFirst: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed loading pending membership onboarding transactions: ${error.message}`)
  }

  let firstRemindersSent = 0
  let finalRemindersSent = 0
  let flaggedForReview = 0
  const results: ProcessIncompletePaidMembershipsResult["results"] = []
  const now = Date.now()

  for (const transaction of transactions ?? []) {
    if (!transaction.member_id) {
      continue
    }

    if (transaction.refund_review_status && transaction.refund_review_status !== "not_applicable") {
      continue
    }

    const { data: user, error: userError } = await admin
      .from("users")
      .select("id, email, name, profile_completed_at")
      .eq("id", transaction.member_id)
      .single()

    if (userError || !user || user.profile_completed_at) {
      continue
    }

    const actions: string[] = []
    const baseTime = Date.parse(transaction.authorized_at ?? transaction.updated_at ?? transaction.created_at)
    if (Number.isNaN(baseTime)) {
      continue
    }

    if (!transaction.first_reminder_sent_at && now - baseTime >= FIRST_REMINDER_HOURS * 3600000) {
      if (!options.dryRun) {
        await sendReminderEmail(transaction, user, "first")
        await admin
          .from("payment_transactions")
          .update({
            first_reminder_sent_at: processedAt,
            updated_at: processedAt,
          })
          .eq("id", transaction.id)
      }
      firstRemindersSent++
      actions.push("first_reminder")
    }

    if (!transaction.final_reminder_sent_at && now - baseTime >= FINAL_REMINDER_DAYS * 86400000) {
      if (!options.dryRun) {
        await sendReminderEmail(transaction, user, "final")
        await admin
          .from("payment_transactions")
          .update({
            final_reminder_sent_at: processedAt,
            updated_at: processedAt,
          })
          .eq("id", transaction.id)
      }
      finalRemindersSent++
      actions.push("final_reminder")
    }

    if (
      transaction.refund_review_status !== "pending_review" &&
      transaction.refund_review_status !== "refunded_manually" &&
      transaction.refund_review_status !== "dismissed" &&
      now - baseTime >= GRACE_PERIOD_DAYS * 86400000
    ) {
      if (!options.dryRun) {
        await admin
          .from("payment_transactions")
          .update({
            refund_review_status: "pending_review",
            refund_review_flagged_at: processedAt,
            updated_at: processedAt,
          })
          .eq("id", transaction.id)
      }
      flaggedForReview++
      actions.push("flagged_for_review")
    }

    if (actions.length > 0) {
      results.push({
        order: transaction.redsys_order,
        memberId: transaction.member_id,
        email: user.email,
        actions,
      })
    }
  }

  return {
    processedAt,
    considered: transactions?.length ?? 0,
    firstRemindersSent,
    finalRemindersSent,
    flaggedForReview,
    results,
  }
}
