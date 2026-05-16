import { loadEnvConfig } from "@next/env"
import { createClient } from "@supabase/supabase-js"
import { renderPaymentOnboardingReminderEmail } from "../src/lib/email/templates/payment-onboarding-reminder"
import { sendEmail } from "../src/lib/email"

const DEFAULT_TARGET_ORDERS = [
  "2604Ma6fyo6a",
  "2605M3c8rDwS",
  "2605Mz3U3zoH",
  "2605MVM3t4Hs",
  "2605M9OC7Ycn",
]

const CONFIRMATION_TOKEN = "pending-profile-onboarding-2026-05-16"

interface PendingProfileEmailInput {
  memberName: string
  planName: string
  completeProfileUrl: string
  deadlineIso: string
}

interface PaymentTransactionRow {
  id: string
  redsys_order: string
  status: string
  context: string
  amount_cents: number
  member_id: string | null
  subscription_id: string | null
  onboarding_status: string | null
  metadata: unknown
}

interface UserRow {
  id: string
  email: string | null
  name: string | null
  profile_completed_at: string | null
}

interface SubscriptionRow {
  id: string
  member_id: string
  status: string
  redsys_last_order: string | null
  plan_type: string | null
  payment_type: string | null
}

interface MemberRow {
  user_uuid: string
}

interface Candidate {
  order: string
  transaction: PaymentTransactionRow
  user: UserRow
  subscription: SubscriptionRow
  subject: string
  html: string
  to: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
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
      const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      if (!isLocalhost) {
        return url.origin
      }
    } catch {
      continue
    }
  }

  return "https://www.lorenzosanz.com"
}

function getCompleteProfileUrl(order: string, userId: string): string {
  const url = new URL("/complete-profile", getPublicBaseUrl())
  url.searchParams.set("order", order)
  url.searchParams.set("userId", userId)
  return url.toString()
}

function formatDeadlineLabel(deadlineIso: string): string {
  const date = new Date(deadlineIso)
  if (Number.isNaN(date.getTime())) {
    return deadlineIso
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function parsePlanName(metadata: unknown): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const planName = (metadata as Record<string, unknown>).planName
    if (typeof planName === "string" && planName.trim()) {
      return planName.trim()
    }
  }

  return "Membresia"
}

function hasDuplicatePaymentReview(metadata: unknown): boolean {
  return Boolean(
    metadata &&
      typeof metadata === "object" &&
      !Array.isArray(metadata) &&
      (metadata as Record<string, unknown>).duplicate_successful_payment_review,
  )
}

export function findMojibake(value: string): boolean {
  return /(?:Ã|Â|â|�)/.test(value)
}

export function buildPendingProfileOnboardingEmail(input: PendingProfileEmailInput): {
  subject: string
  html: string
} {
  const subject = "Completa tu alta en la Pena Lorenzo Sanz"
  const html = renderPaymentOnboardingReminderEmail({
    memberName: escapeHtml(input.memberName || "madridista"),
    planName: escapeHtml(input.planName || "Membresia"),
    completeProfileUrl: escapeHtml(input.completeProfileUrl),
    deadlineLabel: escapeHtml(formatDeadlineLabel(input.deadlineIso)),
    reminderKind: "first",
  })

  return { subject, html }
}

function parseOrders(args: string[]): string[] {
  const ordersArg = args.find((arg) => arg.startsWith("--orders="))
  if (!ordersArg) {
    return DEFAULT_TARGET_ORDERS
  }

  return ordersArg
    .slice("--orders=".length)
    .split(",")
    .map((order) => order.trim())
    .filter(Boolean)
}

async function main() {
  loadEnvConfig(process.cwd())

  const args = process.argv.slice(2)
  const send = args.includes("--send")
  const dryRun = !send
  const confirmSendIndex = args.indexOf("--confirm-send")
  const confirmSend = confirmSendIndex >= 0 ? args[confirmSendIndex + 1] : undefined
  const orders = parseOrders(args)

  if (send && confirmSend !== CONFIRMATION_TOKEN) {
    throw new Error(`Real send requires --confirm-send ${CONFIRMATION_TOKEN}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: transactions, error: transactionsError } = await admin
    .from("payment_transactions")
    .select("id, redsys_order, status, context, amount_cents, member_id, subscription_id, onboarding_status, metadata")
    .in("redsys_order", orders)

  if (transactionsError) {
    throw new Error(`Failed loading payment_transactions: ${transactionsError.message}`)
  }

  const transactionRows = (transactions ?? []) as PaymentTransactionRow[]
  const memberIds = Array.from(new Set(transactionRows.map((row) => row.member_id).filter(Boolean))) as string[]

  const [usersResult, subscriptionsResult, membersResult] = await Promise.all([
    memberIds.length
      ? admin.from("users").select("id, email, name, profile_completed_at").in("id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    memberIds.length
      ? admin.from("subscriptions").select("id, member_id, status, redsys_last_order, plan_type, payment_type").in("member_id", memberIds)
      : Promise.resolve({ data: [], error: null }),
    memberIds.length
      ? admin.from("miembros").select("user_uuid").in("user_uuid", memberIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (usersResult.error) {
    throw new Error(`Failed loading users: ${usersResult.error.message}`)
  }
  if (subscriptionsResult.error) {
    throw new Error(`Failed loading subscriptions: ${subscriptionsResult.error.message}`)
  }
  if (membersResult.error) {
    throw new Error(`Failed loading miembros: ${membersResult.error.message}`)
  }

  const transactionsByOrder = new Map(transactionRows.map((row) => [row.redsys_order, row]))
  const usersById = new Map(((usersResult.data ?? []) as UserRow[]).map((row) => [row.id, row]))
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionRow[]
  const memberRows = new Set(((membersResult.data ?? []) as MemberRow[]).map((row) => row.user_uuid))
  const candidates: Candidate[] = []
  const skipped: Array<{ order: string; reasons: string[] }> = []

  for (const order of orders) {
    const reasons: string[] = []
    const transaction = transactionsByOrder.get(order)

    if (!transaction) {
      skipped.push({ order, reasons: ["missing_payment_transaction"] })
      continue
    }

    if (transaction.status !== "authorized") reasons.push(`status_${transaction.status}`)
    if (transaction.context !== "membership") reasons.push(`context_${transaction.context}`)
    if (!transaction.member_id) reasons.push("missing_member_id")
    if (hasDuplicatePaymentReview(transaction.metadata)) reasons.push("duplicate_successful_payment_review")
    if (transaction.onboarding_status && transaction.onboarding_status !== "pending_profile") {
      reasons.push(`onboarding_status_${transaction.onboarding_status}`)
    }

    const user = transaction.member_id ? usersById.get(transaction.member_id) : undefined
    if (!user) reasons.push("missing_user")
    if (user && !user.email) reasons.push("missing_user_email")
    if (user?.profile_completed_at) reasons.push("profile_already_completed")
    if (transaction.member_id && memberRows.has(transaction.member_id)) reasons.push("miembro_already_exists")

    const subscription = subscriptions.find(
      (row) =>
        row.member_id === transaction.member_id &&
        (row.id === transaction.subscription_id || row.redsys_last_order === transaction.redsys_order),
    )

    if (!subscription) {
      reasons.push("missing_subscription")
    } else {
      if (subscription.status !== "pending_profile") reasons.push(`subscription_status_${subscription.status}`)
      if (subscription.redsys_last_order !== transaction.redsys_order) reasons.push("subscription_order_mismatch")
    }

    if (reasons.length > 0 || !user?.email || !subscription) {
      skipped.push({ order, reasons })
      continue
    }

    const deadlineIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const completeProfileUrl = getCompleteProfileUrl(order, user.id)
    const email = buildPendingProfileOnboardingEmail({
      memberName: user.name?.trim() || "madridista",
      planName: parsePlanName(transaction.metadata),
      completeProfileUrl,
      deadlineIso,
    })

    if (findMojibake(email.subject) || findMojibake(email.html)) {
      skipped.push({ order, reasons: ["mojibake_detected"] })
      continue
    }

    candidates.push({
      order,
      transaction,
      user,
      subscription,
      subject: email.subject,
      html: email.html,
      to: user.email,
    })
  }

  for (const candidate of candidates) {
    if (dryRun) {
      console.log(`WOULD SEND: order=${candidate.order} to=${candidate.to} transaction=${candidate.transaction.id} subscription=${candidate.subscription.id}`)
      continue
    }

    const result = await sendEmail({
      to: candidate.to,
      subject: candidate.subject,
      html: candidate.html,
    })

    if (!result.success) {
      console.log(`FAILED: order=${candidate.order} to=${candidate.to}`)
      skipped.push({ order: candidate.order, reasons: ["email_send_failed"] })
    } else {
      console.log(`SENT: order=${candidate.order} to=${candidate.to} message_id=${result.messageId}`)
    }
  }

  for (const item of skipped) {
    console.log(`SKIPPED: order=${item.order} reasons=${item.reasons.join(",")}`)
  }

  console.log(JSON.stringify({
    ok: skipped.every((item) => !item.reasons.includes("email_send_failed")),
    dry_run: dryRun,
    requested_orders: orders.length,
    sendable: candidates.length,
    skipped: skipped.length,
  }, null, 2))
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
