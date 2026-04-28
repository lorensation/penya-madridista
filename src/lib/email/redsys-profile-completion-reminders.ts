import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { getCompleteProfileUrl } from "@/lib/membership/onboarding"
import {
  REDSYS_PROFILE_COMPLETION_NOTICE_SUBJECT,
  renderRedsysProfileCompletionNoticeEmail,
  renderRedsysProfileCompletionNoticeText,
} from "@/lib/email/templates/redsys-profile-completion-notice"

export const REDSYS_PROFILE_REMINDER_CONFIRMATION_TOKEN =
  "redsys-profile-reminders-2026-04-26"

export const REDSYS_PROFILE_REMINDER_COPY_RECIPIENT =
  "elchinimaster16@gmail.com"

export const REDSYS_PROFILE_REMINDER_RECIPIENTS = [
  { redsysOrder: "2604MLbhyfNg", email: "jose@wagman.de" },
  { redsysOrder: "2604MhtJMfk2", email: "jigomezcalleja@gmail.com" },
  { redsysOrder: "2604MuISOIcx", email: "luishm72@gmail.com" },
  { redsysOrder: "2604Mu4HdrzJ", email: "tetegoval14@gmail.com" },
  { redsysOrder: "2604MHdIghq4", email: "francisco@trajesguzman.com" },
  { redsysOrder: "2604MHnelsUC", email: "rwhyteguerra@gmail.com" },
  { redsysOrder: "2604M1c2xqkq", email: "rvillauriz@gmail.com" },
  { redsysOrder: "2604M1bn36P3", email: "enprados@gmail.com" },
] as const

type AffectedRecipient = (typeof REDSYS_PROFILE_REMINDER_RECIPIENTS)[number]

interface PaymentTransactionSummary {
  id: string
  redsys_order: string
  member_id: string | null
  context: string
  status: string
  onboarding_status: string | null
  subscription_id: string | null
}

interface UserSummary {
  id: string
  email: string
  name: string | null
  profile_completed_at: string | null
}

export interface SendRedsysProfileCompletionReminderOptions {
  dryRun?: boolean
  sendCopy?: boolean
  copyRecipient?: string
  confirmSend?: string
}

export interface RedsysProfileCompletionReminderResult {
  dryRun: boolean
  intendedUserRecipients: number
  intendedCopyRecipients: number
  sent: number
  failed: number
  skipped: number
  results: Array<{
    recipient: string
    redsysOrder: string
    kind: "user" | "copy"
    status: "dry_run" | "sent" | "failed" | "skipped"
    completeProfileUrl?: string
    reason?: string
    messageId?: string
  }>
}

function assertUniqueRecipients() {
  const orders = new Set<string>()
  const emails = new Set<string>()

  for (const recipient of REDSYS_PROFILE_REMINDER_RECIPIENTS) {
    if (orders.has(recipient.redsysOrder)) {
      throw new Error(`Duplicate Redsys order in one-off recipient list: ${recipient.redsysOrder}`)
    }
    if (emails.has(recipient.email.toLowerCase())) {
      throw new Error(`Duplicate email in one-off recipient list: ${recipient.email}`)
    }

    orders.add(recipient.redsysOrder)
    emails.add(recipient.email.toLowerCase())
  }
}

function getPublicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` ||
    "https://www.lorenzosanz.com"
  )
}

function buildDashboardUrl(): string {
  return new URL("/dashboard", getPublicBaseUrl()).toString()
}

function logProfileReminder(fields: Record<string, unknown>) {
  console.info("[redsys.profile_completion_reminder]", fields)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function loadTransactionsAndUsers() {
  const admin = createAdminSupabaseClient()
  const orders = REDSYS_PROFILE_REMINDER_RECIPIENTS.map((recipient) => recipient.redsysOrder)

  const { data: transactions, error: transactionsError } = await admin
    .from("payment_transactions")
    .select("id, redsys_order, member_id, context, status, onboarding_status, subscription_id")
    .in("redsys_order", orders)

  if (transactionsError) {
    throw new Error(`Failed loading payment transactions: ${transactionsError.message}`)
  }

  const transactionMap = new Map(
    ((transactions ?? []) as PaymentTransactionSummary[]).map((transaction) => [
      transaction.redsys_order,
      transaction,
    ]),
  )

  const memberIds = [
    ...new Set(
      [...transactionMap.values()]
        .map((transaction) => transaction.member_id)
        .filter((memberId): memberId is string => Boolean(memberId)),
    ),
  ]

  const { data: users, error: usersError } = memberIds.length
    ? await admin
        .from("users")
        .select("id, email, name, profile_completed_at")
        .in("id", memberIds)
    : { data: [], error: null }

  if (usersError) {
    throw new Error(`Failed loading users: ${usersError.message}`)
  }

  const userMap = new Map(((users ?? []) as UserSummary[]).map((user) => [user.id, user]))

  return { transactionMap, userMap }
}

async function sendOne(options: {
  to: string
  subject: string
  html: string
  text: string
  dryRun: boolean
  redsysOrder: string
  kind: "user" | "copy"
  completeProfileUrl: string
}) {
  if (options.dryRun) {
    logProfileReminder({
      event: "redsys.profile_completion_reminder.dry_run",
      recipient: options.to,
      redsys_order: options.redsysOrder,
      kind: options.kind,
      subject: options.subject,
      complete_profile_url: options.completeProfileUrl,
    })
    return { success: true, dryRun: true as const }
  }

  const result = await sendEmail({
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })

  logProfileReminder({
    event: result.success
      ? "redsys.profile_completion_reminder.sent"
      : "redsys.profile_completion_reminder.failed",
    recipient: options.to,
    redsys_order: options.redsysOrder,
    kind: options.kind,
    subject: options.subject,
    message_id: result.success ? result.messageId : null,
    error: result.success ? null : result.error,
  })

  return result
}

function buildEmailForRecipient(options: {
  recipient: AffectedRecipient
  user: UserSummary
  transaction: PaymentTransactionSummary
}) {
  const completeProfileUrl = getCompleteProfileUrl(
    options.transaction.redsys_order,
    options.user.id,
  )
  const dashboardUrl = buildDashboardUrl()
  const memberName = options.user.name || "madridista"

  return {
    completeProfileUrl,
    html: renderRedsysProfileCompletionNoticeEmail({
      memberName,
      completeProfileUrl,
      dashboardUrl,
    }),
    text: renderRedsysProfileCompletionNoticeText({
      memberName,
      completeProfileUrl,
      dashboardUrl,
    }),
  }
}

export async function sendRedsysProfileCompletionReminders(
  options: SendRedsysProfileCompletionReminderOptions = {},
): Promise<RedsysProfileCompletionReminderResult> {
  assertUniqueRecipients()

  const dryRun = options.dryRun ?? true
  const sendCopy = options.sendCopy ?? true
  const copyRecipient = options.copyRecipient ?? REDSYS_PROFILE_REMINDER_COPY_RECIPIENT

  if (!dryRun && options.confirmSend !== REDSYS_PROFILE_REMINDER_CONFIRMATION_TOKEN) {
    throw new Error(
      `Refusing to send real emails without CONFIRM_SEND=${REDSYS_PROFILE_REMINDER_CONFIRMATION_TOKEN}`,
    )
  }

  const { transactionMap, userMap } = await loadTransactionsAndUsers()
  const result: RedsysProfileCompletionReminderResult = {
    dryRun,
    intendedUserRecipients: REDSYS_PROFILE_REMINDER_RECIPIENTS.length,
    intendedCopyRecipients: sendCopy ? REDSYS_PROFILE_REMINDER_RECIPIENTS.length : 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    results: [],
  }

  for (const recipient of REDSYS_PROFILE_REMINDER_RECIPIENTS) {
    const transaction = transactionMap.get(recipient.redsysOrder)
    if (!transaction) {
      result.skipped++
      result.results.push({
        recipient: recipient.email,
        redsysOrder: recipient.redsysOrder,
        kind: "user",
        status: "skipped",
        reason: "transaction_not_found",
      })
      logProfileReminder({
        event: "redsys.profile_completion_reminder.skipped",
        reason: "transaction_not_found",
        recipient: recipient.email,
        redsys_order: recipient.redsysOrder,
      })
      continue
    }

    if (transaction.context !== "membership" || !transaction.member_id) {
      result.skipped++
      result.results.push({
        recipient: recipient.email,
        redsysOrder: recipient.redsysOrder,
        kind: "user",
        status: "skipped",
        reason: "not_membership_or_missing_member",
      })
      logProfileReminder({
        event: "redsys.profile_completion_reminder.skipped",
        reason: "not_membership_or_missing_member",
        recipient: recipient.email,
        redsys_order: recipient.redsysOrder,
        transaction_id: transaction.id,
        context: transaction.context,
      })
      continue
    }

    const user = userMap.get(transaction.member_id)
    if (!user) {
      result.skipped++
      result.results.push({
        recipient: recipient.email,
        redsysOrder: recipient.redsysOrder,
        kind: "user",
        status: "skipped",
        reason: "user_not_found",
      })
      logProfileReminder({
        event: "redsys.profile_completion_reminder.skipped",
        reason: "user_not_found",
        recipient: recipient.email,
        redsys_order: recipient.redsysOrder,
        transaction_id: transaction.id,
        member_id: transaction.member_id,
      })
      continue
    }

    if (normalizeEmail(user.email) !== normalizeEmail(recipient.email)) {
      logProfileReminder({
        event: "redsys.profile_completion_reminder.email_mismatch",
        configured_recipient: recipient.email,
        db_email: user.email,
        redsys_order: recipient.redsysOrder,
        transaction_id: transaction.id,
        member_id: transaction.member_id,
      })
    }

    const rendered = buildEmailForRecipient({ recipient, transaction, user })
    const userSend = await sendOne({
      to: recipient.email,
      subject: REDSYS_PROFILE_COMPLETION_NOTICE_SUBJECT,
      html: rendered.html,
      text: rendered.text,
      dryRun,
      redsysOrder: recipient.redsysOrder,
      kind: "user",
      completeProfileUrl: rendered.completeProfileUrl,
    })

    if ("dryRun" in userSend) {
      result.results.push({
        recipient: recipient.email,
        redsysOrder: recipient.redsysOrder,
        kind: "user",
        status: "dry_run",
        completeProfileUrl: rendered.completeProfileUrl,
      })
    } else if (userSend.success) {
      result.sent++
      result.results.push({
        recipient: recipient.email,
        redsysOrder: recipient.redsysOrder,
        kind: "user",
        status: "sent",
        messageId: userSend.messageId,
        completeProfileUrl: rendered.completeProfileUrl,
      })
    } else {
      result.failed++
      result.results.push({
        recipient: recipient.email,
        redsysOrder: recipient.redsysOrder,
        kind: "user",
        status: "failed",
        reason: userSend.error instanceof Error ? userSend.error.message : String(userSend.error),
        completeProfileUrl: rendered.completeProfileUrl,
      })
    }

    if (sendCopy) {
      const copySend = await sendOne({
        to: copyRecipient,
        subject: `[COPIA] ${REDSYS_PROFILE_COMPLETION_NOTICE_SUBJECT}`,
        html: rendered.html,
        text: rendered.text,
        dryRun,
        redsysOrder: recipient.redsysOrder,
        kind: "copy",
        completeProfileUrl: rendered.completeProfileUrl,
      })

      if ("dryRun" in copySend) {
        result.results.push({
          recipient: copyRecipient,
          redsysOrder: recipient.redsysOrder,
          kind: "copy",
          status: "dry_run",
          completeProfileUrl: rendered.completeProfileUrl,
        })
      } else if (copySend.success) {
        result.sent++
        result.results.push({
          recipient: copyRecipient,
          redsysOrder: recipient.redsysOrder,
          kind: "copy",
          status: "sent",
          messageId: copySend.messageId,
          completeProfileUrl: rendered.completeProfileUrl,
        })
      } else {
        result.failed++
        result.results.push({
          recipient: copyRecipient,
          redsysOrder: recipient.redsysOrder,
          kind: "copy",
          status: "failed",
          reason: copySend.error instanceof Error ? copySend.error.message : String(copySend.error),
          completeProfileUrl: rendered.completeProfileUrl,
        })
      }
    }
  }

  logProfileReminder({
    event: "redsys.profile_completion_reminder.completed",
    dry_run: dryRun,
    intended_user_recipients: result.intendedUserRecipients,
    intended_copy_recipients: result.intendedCopyRecipients,
    sent: result.sent,
    failed: result.failed,
    skipped: result.skipped,
  })

  return result
}
