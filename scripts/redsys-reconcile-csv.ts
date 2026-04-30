import fs from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

interface RedsysCsvRow {
  order: string
  authorized: boolean
  authorizationCode: string | null
  amountCents: number
  authorizedAt: string | null
  lastFour: string | null
  rawResult: string
}

interface PaymentTransactionCandidate {
  id: string
  redsys_order: string
  status: string
  context: string
  amount_cents: number
  member_id: string | null
  metadata: unknown
}

interface ReconciliationCandidate {
  order: string
  safe: boolean
  reasons: string[]
  csv: RedsysCsvRow
  transaction: PaymentTransactionCandidate | null
  dryRunUpdate: {
    status: "authorized"
    ds_response: "0000"
    ds_authorization_code: string
    last_four: string | null
    authorized_at: string | null
  } | null
}

function parseMoneyToCents(value: string): number {
  const normalized = value.trim().replace(",", ".")
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

function parseAuthorizedAt(date: string, time: string): string | null {
  const [day, month, year] = date.split("/")
  if (!day || !month || !year || !time) {
    return null
  }

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time}+02:00`
}

function extractLastFour(maskedCard: string): string | null {
  const digits = maskedCard.replace(/\D/g, "")
  return digits.length >= 4 ? digits.slice(-4) : null
}

export function parseRedsysOperationsCsv(csv: string): RedsysCsvRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.slice(1).map((line) => {
    const columns = line.split(";")
    const result = columns[4]?.trim() ?? ""
    const authorizationMatch = result.match(/^Autorizada\s+(.+)$/i)

    return {
      order: columns[3]?.trim() ?? "",
      authorized: Boolean(authorizationMatch),
      authorizationCode: authorizationMatch?.[1]?.trim() ?? null,
      amountCents: parseMoneyToCents(columns[5] ?? "0"),
      authorizedAt: parseAuthorizedAt(columns[0] ?? "", columns[1] ?? ""),
      lastFour: extractLastFour(columns[10] ?? ""),
      rawResult: result,
    }
  })
}

function hasPlanMetadata(metadata: unknown): boolean {
  return Boolean(
    metadata &&
      typeof metadata === "object" &&
      "planType" in metadata &&
      typeof (metadata as { planType?: unknown }).planType === "string",
  )
}

export function buildRedsysReconciliationCandidates(
  csvRows: RedsysCsvRow[],
  transactions: PaymentTransactionCandidate[],
): ReconciliationCandidate[] {
  const transactionByOrder = new Map(transactions.map((transaction) => [transaction.redsys_order, transaction]))

  return csvRows
    .filter((row) => row.authorized && row.authorizationCode)
    .map((row) => {
      const transaction = transactionByOrder.get(row.order) ?? null
      const reasons: string[] = []

      if (!transaction) {
        reasons.push("transaction_not_found")
      } else {
        if (transaction.status !== "pending") reasons.push("transaction_not_pending")
        if (transaction.context !== "membership") reasons.push("not_membership_context")
        if (transaction.amount_cents !== row.amountCents) reasons.push("amount_mismatch")
        if (!transaction.member_id) reasons.push("missing_member_id")
        if (!hasPlanMetadata(transaction.metadata)) reasons.push("missing_plan_metadata")
      }

      const safe = reasons.length === 0

      return {
        order: row.order,
        safe,
        reasons,
        csv: row,
        transaction,
        dryRunUpdate:
          safe && row.authorizationCode
            ? {
                status: "authorized",
                ds_response: "0000",
                ds_authorization_code: row.authorizationCode,
                last_four: row.lastFour,
                authorized_at: row.authorizedAt,
              }
            : null,
      }
    })
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) {
    return
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const index = trimmed.indexOf("=")
    if (index < 0) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "")
    process.env[key] ??= value
  }
}

async function main() {
  const csvPath = process.argv[2]
  const apply = process.argv.includes("--apply")

  if (!csvPath) {
    throw new Error("Usage: tsx scripts/redsys-reconcile-csv.ts <redsys-export.csv> [--apply]")
  }

  loadEnvFile()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  const csvRows = parseRedsysOperationsCsv(fs.readFileSync(csvPath, "utf8"))
  const authorizedOrders = csvRows.filter((row) => row.authorized).map((row) => row.order)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: transactions, error } = await supabase
    .from("payment_transactions")
    .select("id, redsys_order, status, context, amount_cents, member_id, metadata")
    .in("redsys_order", authorizedOrders)

  if (error) {
    throw new Error(`Failed loading payment transactions: ${error.message}`)
  }

  const candidates = buildRedsysReconciliationCandidates(csvRows, transactions ?? [])
  console.log(JSON.stringify({ dryRun: !apply, candidates }, null, 2))

  if (!apply) {
    return
  }

  for (const candidate of candidates.filter((item) => item.safe && item.transaction && item.dryRunUpdate)) {
    const { error: updateError } = await supabase
      .from("payment_transactions")
      .update({
        ...candidate.dryRunUpdate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.transaction!.id)
      .eq("status", "pending")

    if (updateError) {
      throw new Error(`Failed updating ${candidate.order}: ${updateError.message}`)
    }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
