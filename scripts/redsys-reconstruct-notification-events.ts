import fs from "node:fs"
import { createClient } from "@supabase/supabase-js"
import {
  decodeRedsysCsvBuffer,
  parseRedsysOperationsCsv,
  type PaymentTransactionCandidate,
  type RedsysCsvRow,
} from "./redsys-reconcile-csv"
import { recordRedsysNotificationEvent, type RedsysNotificationEventInput } from "../src/lib/redsys/notification-events"

export interface ExistingRedsysNotificationEvent {
  redsys_order: string | null
  reason: string | null
}

interface BuildReconstructedNotificationEventsInput {
  rows: RedsysCsvRow[]
  transactions: PaymentTransactionCandidate[]
  existingEvents: ExistingRedsysNotificationEvent[]
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

function rowAmountCents(row: RedsysCsvRow): number {
  return row.amountEurosCents || row.amountCents
}

function reconstructedReason(row: RedsysCsvRow): string {
  return row.category === "successful_devolution"
    ? "reconstructed_successful_devolution_from_redsys_csv"
    : "reconstructed_successful_authorization_from_redsys_csv"
}

function reconstructedStatusAfter(row: RedsysCsvRow, transaction: PaymentTransactionCandidate): string {
  if (row.category === "successful_devolution") {
    return "refunded"
  }

  return transaction.status === "refunded" ? "authorized" : transaction.status
}

export function buildReconstructedNotificationEvents(
  input: BuildReconstructedNotificationEventsInput,
): RedsysNotificationEventInput[] {
  const transactionByOrder = new Map(input.transactions.map((transaction) => [transaction.redsys_order, transaction]))
  const reconstructedOrders = new Set(
    input.existingEvents
      .filter((event) => event.reason?.startsWith("reconstructed_successful_") && event.redsys_order)
      .map((event) => `${event.redsys_order}:${event.reason}`),
  )

  return input.rows
    .filter((row) => row.authorized)
    .flatMap((row) => {
      const reason = reconstructedReason(row)
      if (!row.order || reconstructedOrders.has(`${row.order}:${reason}`)) {
        return []
      }

      const transaction = transactionByOrder.get(row.order)
      if (!transaction) {
        return []
      }

      const amountCents = rowAmountCents(row)
      return [
        {
          event: "redsys.notification.reconstructed",
          reason,
          redsys_order: row.order,
          transaction_id: transaction.id,
          member_id: transaction.member_id,
          context: transaction.context,
          status_before: null,
          status_after: reconstructedStatusAfter(row, transaction),
          ds_response: null,
          authorization_code: row.authorizationCode,
          amount: String(amountCents),
          content_type: null,
          signature_version: null,
          transaction_type: transaction.transaction_type ?? null,
          expected_amount: transaction.amount_cents,
          received_amount: String(amountCents),
          expected_merchant_code: null,
          received_merchant_code: null,
          expected_terminal: null,
          received_terminal: null,
          has_merchant_parameters: false,
          has_signature: false,
          error_message: null,
          raw: {
            source: "redsys_console_csv",
            synthetic: true,
            csv_date: row.date,
            csv_time: row.time,
            csv_operation_type: row.operationType,
            csv_category: row.category,
            csv_result: row.rawResult,
            csv_authorization_code: row.authorizationCode,
            csv_amount_cents: amountCents,
            csv_last_four: row.lastFour,
          },
        },
      ]
    })
}

async function main() {
  const args = process.argv.slice(2)
  const csvPath = args.find((arg) => !arg.startsWith("--"))
  const apply = args.includes("--apply")
  const dryRun = !apply

  if (!csvPath) {
    throw new Error("Usage: tsx scripts/redsys-reconstruct-notification-events.ts <redsys-export.csv> [--dry-run] [--apply]")
  }

  loadEnvFile()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  const decoded = decodeRedsysCsvBuffer(fs.readFileSync(csvPath))
  const rows = parseRedsysOperationsCsv(decoded.text)
  const authorizedRows = rows.filter((row) => row.authorized && row.order)
  const orders = Array.from(new Set(authorizedRows.map((row) => row.order)))
  const reconstructedReasons = [
    "reconstructed_successful_authorization_from_redsys_csv",
    "reconstructed_successful_devolution_from_redsys_csv",
  ]

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: transactions, error: transactionsError } = await admin
    .from("payment_transactions")
    .select("id, redsys_order, status, context, transaction_type, amount_cents, member_id, ds_authorization_code, last_four, authorized_at, created_at, updated_at, subscription_id, metadata")
    .in("redsys_order", orders)

  if (transactionsError) {
    throw new Error(`Failed loading payment transactions: ${transactionsError.message}`)
  }

  const { data: existingEvents, error: existingEventsError } = await admin
    .from("redsys_notification_events")
    .select("redsys_order, reason")
    .in("redsys_order", orders)
    .in("reason", reconstructedReasons)

  if (existingEventsError) {
    throw new Error(`Failed loading existing reconstructed events: ${existingEventsError.message}`)
  }

  const events = buildReconstructedNotificationEvents({
    rows,
    transactions: (transactions ?? []) as PaymentTransactionCandidate[],
    existingEvents: (existingEvents ?? []) as ExistingRedsysNotificationEvent[],
  })

  for (const event of events) {
    if (dryRun) {
      console.log(`WOULD INSERT: order=${event.redsys_order} event=${event.event} reason=${event.reason} status_after=${event.status_after} amount=${event.amount}`)
    } else {
      await recordRedsysNotificationEvent(admin, event)
      console.log(`INSERTED: order=${event.redsys_order} event=${event.event} reason=${event.reason}`)
    }
  }

  console.log(JSON.stringify({
    ok: true,
    dry_run: dryRun,
    csv_authorized_rows: authorizedRows.length,
    matched_transactions: transactions?.length ?? 0,
    reconstructed_events: events.length,
  }, null, 2))
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
