import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
import {
  decodeRedsysCsvBuffer,
  parseRedsysOperationsCsv,
  type PaymentTransactionCandidate,
  type RedsysCsvRow,
  type SubscriptionCandidate,
} from "./redsys-reconcile-csv"
import { repairMembershipPaymentFromTrustedAuthorization } from "../src/lib/membership/onboarding"

export interface PendingMembershipHotfixDecision {
  order: string
  action: "would_update" | "updated" | "skipped"
  reasons: string[]
  amountCents: number
  authorizationCode: string | null
  lastFour: string | null
  transaction: PaymentTransactionCandidate | null
}

interface BuildPendingMembershipHotfixCandidatesInput {
  rows: RedsysCsvRow[]
  transactions: PaymentTransactionCandidate[]
  subscriptions: SubscriptionCandidate[]
}

function loadEnvFile(path = ".env.local") {
  if (!fs.existsSync(path)) {
    return
  }

  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) {
      continue
    }

    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[match[1]] = process.env[match[1]] ?? value
  }
}

function hasPlanMetadata(metadata: unknown): boolean {
  return Boolean(
    metadata &&
      typeof metadata === "object" &&
      typeof (metadata as { planType?: unknown }).planType === "string" &&
      typeof (metadata as { interval?: unknown }).interval === "string",
  )
}

function rowAmountCents(row: RedsysCsvRow): number {
  return row.amountEurosCents || row.amountCents
}

export function buildPendingMembershipHotfixCandidates(
  input: BuildPendingMembershipHotfixCandidatesInput,
): PendingMembershipHotfixDecision[] {
  const transactionByOrder = new Map(input.transactions.map((transaction) => [transaction.redsys_order, transaction]))
  const subscriptionsByMemberId = new Map<string, SubscriptionCandidate[]>()

  for (const subscription of input.subscriptions) {
    const current = subscriptionsByMemberId.get(subscription.member_id) ?? []
    current.push(subscription)
    subscriptionsByMemberId.set(subscription.member_id, current)
  }

  return input.rows
    .filter((row) => row.category === "successful_authorization")
    .map((row) => {
      const transaction = transactionByOrder.get(row.order) ?? null
      const reasons: string[] = []
      const amountCents = rowAmountCents(row)

      if (!transaction) {
        reasons.push("transaction_not_found")
      } else {
        if (transaction.status !== "pending") reasons.push("transaction_not_pending")
        if (transaction.context !== "membership") reasons.push("not_membership_context")
        if (transaction.amount_cents !== amountCents) reasons.push("amount_mismatch")
        if (!transaction.member_id) reasons.push("missing_member_id")
        if (!hasPlanMetadata(transaction.metadata)) reasons.push("missing_plan_metadata")

        const memberSubscriptions = transaction.member_id
          ? subscriptionsByMemberId.get(transaction.member_id) ?? []
          : []
        const existingDifferentOrder = memberSubscriptions.find((subscription) =>
          subscription.redsys_last_order &&
          subscription.redsys_last_order !== row.order &&
          ["active", "pending_profile", "canceled"].includes(subscription.status),
        )
        const existingSameOrder = memberSubscriptions.find((subscription) => subscription.redsys_last_order === row.order)

        if (existingDifferentOrder) reasons.push("member_has_other_subscription")
        if (existingSameOrder && transaction.subscription_id && transaction.subscription_id !== existingSameOrder.id) {
          reasons.push("subscription_link_mismatch")
        }
      }

      if (!row.authorizationCode) {
        reasons.push("missing_authorization_code")
      }

      return {
        order: row.order,
        action: reasons.length === 0 ? "would_update" : "skipped",
        reasons: reasons.length === 0 ? ["matched_csv_authorized_payment"] : reasons,
        amountCents,
        authorizationCode: row.authorizationCode,
        lastFour: row.lastFour,
        transaction,
      }
    })
}

export function formatPendingMembershipHotfixDecision(
  decision: PendingMembershipHotfixDecision,
  dryRun: boolean,
): string {
  if (decision.action === "skipped") {
    return [
      "SKIPPED:",
      `order=${decision.order}`,
      `status=${decision.transaction?.status ?? "missing"}`,
      `context=${decision.transaction?.context ?? "missing"}`,
      `amount=${decision.amountCents}`,
      `reason=${decision.reasons.join(",")}`,
    ].join(" ")
  }

  return [
    dryRun ? "WOULD UPDATE:" : "UPDATED:",
    `order=${decision.order}`,
    `from=${decision.transaction?.status ?? "unknown"}`,
    "to=authorized",
    `amount=${decision.amountCents}`,
    `authorization_code=${decision.authorizationCode ?? "missing"}`,
    `last_four=${decision.lastFour ?? "null"}`,
    `reason=${decision.reasons.join(",")}`,
  ].join(" ")
}

async function main() {
  const args = process.argv.slice(2)
  const csvPath = args.find((arg) => !arg.startsWith("--"))
  const apply = args.includes("--apply")
  const dryRun = !apply

  if (!csvPath) {
    throw new Error("Usage: tsx scripts/redsys-hotfix-pending-memberships.ts <redsys-export.csv> [--dry-run] [--apply]")
  }

  loadEnvFile()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  const decoded = decodeRedsysCsvBuffer(fs.readFileSync(csvPath))
  const rows = parseRedsysOperationsCsv(decoded.text)
  const successfulOrders = Array.from(
    new Set(
      rows
        .filter((row) => row.category === "successful_authorization")
        .map((row) => row.order)
        .filter(Boolean),
    ),
  )

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: transactions, error: transactionsError } = await admin
    .from("payment_transactions")
    .select("id, redsys_order, status, context, transaction_type, amount_cents, member_id, ds_authorization_code, last_four, authorized_at, created_at, updated_at, subscription_id, metadata")
    .in("redsys_order", successfulOrders)

  if (transactionsError) {
    throw new Error(`Failed loading payment transactions: ${transactionsError.message}`)
  }

  const memberIds = Array.from(
    new Set(
      ((transactions ?? []) as PaymentTransactionCandidate[])
        .map((transaction) => transaction.member_id)
        .filter((value): value is string => Boolean(value)),
    ),
  )

  const subscriptionsResult = memberIds.length
    ? await admin
        .from("subscriptions")
        .select("id, member_id, status, plan_type, payment_type, redsys_last_order, last_four")
        .in("member_id", memberIds)
    : { data: [] as SubscriptionCandidate[], error: null }

  if (subscriptionsResult.error) {
    throw new Error(`Failed loading subscriptions: ${subscriptionsResult.error.message}`)
  }

  const decisions = buildPendingMembershipHotfixCandidates({
    rows,
    transactions: (transactions ?? []) as PaymentTransactionCandidate[],
    subscriptions: (subscriptionsResult.data ?? []) as SubscriptionCandidate[],
  })

  let updated = 0
  for (const decision of decisions) {
    if (decision.action === "skipped") {
      console.log(formatPendingMembershipHotfixDecision(decision, dryRun))
      continue
    }

    if (dryRun) {
      console.log(formatPendingMembershipHotfixDecision(decision, true))
      continue
    }

    const result = await repairMembershipPaymentFromTrustedAuthorization({
      order: decision.order,
      amountCents: decision.amountCents,
      authorizationCode: decision.authorizationCode!,
      lastFour: decision.lastFour,
      expectedMemberId: decision.transaction?.member_id ?? null,
      admin,
    })

    if (!result.success || result.status !== "authorized") {
      console.log(`SKIPPED: order=${decision.order} reason=repair_failed status=${result.status ?? "unknown"} error=${result.error ?? "unknown"}`)
      continue
    }

    updated += 1
    console.log(formatPendingMembershipHotfixDecision({ ...decision, action: "updated" }, false))
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dry_run: dryRun,
        considered: decisions.length,
        would_update: decisions.filter((decision) => decision.action === "would_update").length,
        skipped: decisions.filter((decision) => decision.action === "skipped").length,
        updated,
      },
      null,
      2,
    ),
  )
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
