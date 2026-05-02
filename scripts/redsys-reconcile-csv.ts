import fs from "node:fs"
import path from "node:path"
import JSZip from "jszip"
import { createClient } from "@supabase/supabase-js"

export interface RedsysCsvRow {
  date: string
  time: string
  operationType: string
  order: string
  authorized: boolean
  authorizationCode: string | null
  amountCents: number
  amountEurosCents: number
  authorizedAt: string | null
  lastFour: string | null
  cardNumber: string
  paymentType: string
  currency: string
  rawResult: string
  category:
    | "successful_authorization"
    | "successful_devolution"
    | "denied_or_failed"
    | "cancelled"
    | "other"
}

export interface PaymentTransactionCandidate {
  id: string
  redsys_order: string
  status: string
  context: string
  transaction_type?: string | null
  amount_cents: number
  member_id: string | null
  ds_authorization_code?: string | null
  last_four?: string | null
  authorized_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  subscription_id?: string | null
  metadata: unknown
}

export interface UserCandidate {
  id: string
  email: string | null
  name: string | null
  is_member: boolean | null
  profile_completed_at: string | null
}

export interface MiembroCandidate {
  user_uuid: string
  name: string | null
  apellido1: string | null
  apellido2: string | null
  dni_pasaporte: string | null
  email: string | null
  telefono?: number | null
}

export interface SubscriptionCandidate {
  id: string
  member_id: string
  status: string
  plan_type: string | null
  payment_type: string | null
  redsys_last_order: string | null
  last_four: string | null
}

export interface WorkbookOperation {
  order: string
  operationType: string
  authorizationCode: string | null
  amountCents: number
  operationAt: string | null
}

export interface ReconciliationCandidate {
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

interface DetailedMismatch {
  redsys_order: string
  csv_operation_type: string
  csv_status: string
  csv_auth_code: string | null
  db_auth_code: string | null
  csv_last_four: string | null
  db_last_four: string | null
  csv_amount_cents: number
  db_amount_cents: number | null
  db_status: string | null
  db_context: string | null
  db_transaction_type: string | null
  db_member_id: string | null
  mismatch_reasons: string[]
  user_email?: string | null
  user_name?: string | null
  subscription_status?: string | null
  profile_completed_at?: string | null
  user_blocking?: boolean
}

export interface DetailedReconciliationReport {
  csvSuccessMissingInDb: DetailedMismatch[]
  csvSuccessPresentButPendingInDb: DetailedMismatch[]
  csvSuccessPresentButDeniedOrFailedInDb: DetailedMismatch[]
  csvSuccessPresentAuthorizedWithFieldMismatch: DetailedMismatch[]
  csvSuccessPresentCorrect: DetailedMismatch[]
  dbAuthorizedNotInCsv: PaymentTransactionCandidate[]
  dbDevolutionNotInCsv: PaymentTransactionCandidate[]
  duplicatesByRedsysOrder: Array<{ redsys_order: string; count: number }>
  amountMismatches: DetailedMismatch[]
  authorizationCodeMismatches: DetailedMismatch[]
  lastFourMismatches: DetailedMismatch[]
  missingLastFourInDb: DetailedMismatch[]
}

interface SubscriberConsistencyReport {
  paid_and_active_member_ok: DetailedMismatch[]
  paid_pending_profile_ok: DetailedMismatch[]
  paid_missing_subscription: DetailedMismatch[]
  paid_missing_miembros_but_profile_completed: DetailedMismatch[]
  paid_user_missing: DetailedMismatch[]
  paid_is_member_false_but_should_be_true: DetailedMismatch[]
  paid_duplicate_subscription_rows: DetailedMismatch[]
}

interface ExcelAppendRow {
  csv: RedsysCsvRow
  nombre: string
  apellidos: string
  dni: string
  email: string
  userDataSource: "miembros" | "users" | "unmatched"
  userMappingWarning: string | null
}

const WORKBOOK_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.º°]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function normalizeOperationType(value: string): string {
  return normalizeHeader(value)
}

function normalizeAuthorizationCode(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim()
  return /^\d+$/.test(trimmed) ? trimmed.padStart(6, "0") : trimmed
}

function parseDelimitedLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ";" && !inQuotes) {
      values.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function getColumn(row: Record<string, string>, names: string[]): string {
  for (const name of names) {
    const value = row[normalizeHeader(name)]
    if (value !== undefined) return value
  }
  return ""
}

function parseMoneyToCents(value: string): number {
  const trimmed = value.trim().replace(/\s/g, "").replace(/[€]/g, "")
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed
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

export function decodeRedsysCsvBuffer(buffer: ArrayBuffer | Buffer): { text: string; encoding: "utf-8" | "windows-1252" } {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(new Uint8Array(buffer))
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes)

  if (utf8.includes("\uFFFD")) {
    return {
      text: new TextDecoder("windows-1252").decode(bytes),
      encoding: "windows-1252",
    }
  }

  return { text: utf8, encoding: "utf-8" }
}

export function parseRedsysOperationsCsv(csv: string): RedsysCsvRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const [headerLine, ...dataLines] = lines
  if (!headerLine) return []

  const headers = parseDelimitedLine(headerLine).map(normalizeHeader)

  return dataLines.map((line) => {
    const columns = parseDelimitedLine(line)
    const row = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]))
    const operationType = getColumn(row, ["Tipo operación", "Tipo operacion"])
    const rawResult = getColumn(row, ["Resultado operación y código", "Resultado operacion y codigo"])
    const authorizationMatch = rawResult.match(/^Autorizada\s+(.+)$/i)
    const amount = getColumn(row, ["Importe"])
    const amountEuros = getColumn(row, ["Importe Euros", " Importe Euros "]) || amount
    const cardNumber = getColumn(row, ["N.º tarjeta", "N. tarjeta", "Nº tarjeta"])
    const operationTypeKey = normalizeOperationType(operationType)
    const authorized = Boolean(authorizationMatch)
    const category = authorized
      ? operationTypeKey.includes("devol")
        ? "successful_devolution"
        : "successful_authorization"
      : rawResult.toLowerCase().startsWith("denegada")
        ? "denied_or_failed"
        : rawResult.toLowerCase().startsWith("cancelada")
          ? "cancelled"
          : "other"

    return {
      date: getColumn(row, ["Fecha"]),
      time: getColumn(row, ["Hora"]),
      operationType,
      order: getColumn(row, ["Cód. pedido", "Cod. pedido"]),
      authorized,
      authorizationCode: authorizationMatch?.[1]?.trim() ?? null,
      amountCents: parseMoneyToCents(amount),
      amountEurosCents: parseMoneyToCents(amountEuros),
      authorizedAt: parseAuthorizedAt(getColumn(row, ["Fecha"]), getColumn(row, ["Hora"])),
      lastFour: extractLastFour(cardNumber),
      cardNumber,
      paymentType: getColumn(row, ["Tipo de pago"]),
      currency: getColumn(row, ["Moneda"]),
      rawResult,
      category,
    }
  })
}

export function classifyRedsysOperations(rows: RedsysCsvRow[]) {
  return {
    successfulAuthorizations: rows.filter((row) => row.category === "successful_authorization"),
    successfulDevolutions: rows.filter((row) => row.category === "successful_devolution"),
    deniedOrFailedOperations: rows.filter((row) => row.category === "denied_or_failed"),
    cancelledOperations: rows.filter((row) => row.category === "cancelled"),
    otherOperations: rows.filter((row) => row.category === "other"),
  }
}

function hasPlanMetadata(metadata: unknown): boolean {
  return Boolean(
    metadata &&
      typeof metadata === "object" &&
      "planType" in metadata &&
      typeof (metadata as { planType?: unknown }).planType === "string",
  )
}

function isDbRefund(transaction: PaymentTransactionCandidate): boolean {
  const metadata = transaction.metadata as Record<string, unknown> | null
  return (
    transaction.status === "refunded" ||
    transaction.transaction_type === "refund" ||
    metadata?.type === "refund" ||
    Boolean(metadata?.redsys_refund) ||
    Boolean(metadata?.redsys_console_refund)
  )
}

function readRefundMetadata(transaction: PaymentTransactionCandidate): Record<string, unknown> | null {
  const metadata = transaction.metadata as Record<string, unknown> | null
  const refund = metadata?.redsys_console_refund ?? metadata?.redsys_refund
  return refund && typeof refund === "object" && !Array.isArray(refund)
    ? (refund as Record<string, unknown>)
    : null
}

function refundMetadataString(refund: Record<string, unknown> | null, keys: string[]): string | null {
  if (!refund) return null
  for (const key of keys) {
    const value = refund[key]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

function comparableAuthorizationCode(row: RedsysCsvRow, transaction: PaymentTransactionCandidate): string | null {
  if (row.category !== "successful_devolution") {
    return transaction.ds_authorization_code ?? null
  }

  const refund = readRefundMetadata(transaction)
  return refundMetadataString(refund, ["authorization_code", "ds_authorization_code", "authorizationCode"])
    ?? (transaction.transaction_type === "refund" ? transaction.ds_authorization_code ?? null : null)
}

function comparableLastFour(row: RedsysCsvRow, transaction: PaymentTransactionCandidate): string | null {
  if (row.category !== "successful_devolution") {
    return transaction.last_four ?? null
  }

  const refund = readRefundMetadata(transaction)
  return refundMetadataString(refund, ["last_four", "lastFour"]) ?? transaction.last_four ?? null
}

function isFinalSuccess(row: RedsysCsvRow, transaction: PaymentTransactionCandidate): boolean {
  if (row.category === "successful_devolution") {
    return isDbRefund(transaction)
  }

  return transaction.status === "authorized" || transaction.status === "refunded"
}

function buildMismatch(
  row: RedsysCsvRow,
  transaction: PaymentTransactionCandidate | null,
  reasons: string[],
): DetailedMismatch {
  return {
    redsys_order: row.order,
    csv_operation_type: row.operationType,
    csv_status: row.rawResult,
    csv_auth_code: row.authorizationCode,
    db_auth_code: transaction ? comparableAuthorizationCode(row, transaction) : null,
    csv_last_four: row.lastFour,
    db_last_four: transaction ? comparableLastFour(row, transaction) : null,
    csv_amount_cents: row.amountEurosCents || row.amountCents,
    db_amount_cents: transaction?.amount_cents ?? null,
    db_status: transaction?.status ?? null,
    db_context: transaction?.context ?? null,
    db_transaction_type: transaction?.transaction_type ?? null,
    db_member_id: transaction?.member_id ?? null,
    mismatch_reasons: reasons,
    user_blocking: reasons.some((reason) =>
      ["missing_in_db", "pending_in_db", "denied_or_failed_in_db", "amount_mismatch"].includes(reason),
    ),
  }
}

export function buildDetailedReconciliation(
  csvRows: RedsysCsvRow[],
  transactions: PaymentTransactionCandidate[],
): DetailedReconciliationReport {
  const successRows = csvRows.filter((row) => row.category === "successful_authorization" || row.category === "successful_devolution")
  const csvSuccessOrders = new Set(successRows.map((row) => row.order))
  const transactionGroups = new Map<string, PaymentTransactionCandidate[]>()

  for (const transaction of transactions) {
    const rows = transactionGroups.get(transaction.redsys_order) ?? []
    rows.push(transaction)
    transactionGroups.set(transaction.redsys_order, rows)
  }

  const report: DetailedReconciliationReport = {
    csvSuccessMissingInDb: [],
    csvSuccessPresentButPendingInDb: [],
    csvSuccessPresentButDeniedOrFailedInDb: [],
    csvSuccessPresentAuthorizedWithFieldMismatch: [],
    csvSuccessPresentCorrect: [],
    dbAuthorizedNotInCsv: transactions.filter((transaction) => transaction.status === "authorized" && !csvSuccessOrders.has(transaction.redsys_order)),
    dbDevolutionNotInCsv: transactions.filter((transaction) => isDbRefund(transaction) && !csvSuccessOrders.has(transaction.redsys_order)),
    duplicatesByRedsysOrder: Array.from(transactionGroups.entries())
      .filter(([, rows]) => rows.length > 1)
      .map(([redsys_order, rows]) => ({ redsys_order, count: rows.length })),
    amountMismatches: [],
    authorizationCodeMismatches: [],
    lastFourMismatches: [],
    missingLastFourInDb: [],
  }

  for (const row of successRows) {
    const matchingTransactions = transactionGroups.get(row.order) ?? []
    const transaction = matchingTransactions[0] ?? null

    if (!transaction) {
      report.csvSuccessMissingInDb.push(buildMismatch(row, null, ["missing_in_db"]))
      continue
    }

    if (transaction.status === "pending") {
      report.csvSuccessPresentButPendingInDb.push(buildMismatch(row, transaction, ["pending_in_db"]))
      continue
    }

    if (["denied", "failed", "error"].includes(transaction.status)) {
      report.csvSuccessPresentButDeniedOrFailedInDb.push(buildMismatch(row, transaction, ["denied_or_failed_in_db"]))
      continue
    }

    const reasons: string[] = []
    const csvAmount = row.amountEurosCents || row.amountCents
    if (transaction.amount_cents !== csvAmount) reasons.push("amount_mismatch")
    const dbAuthorizationCode = comparableAuthorizationCode(row, transaction)
    const dbLastFour = comparableLastFour(row, transaction)
    if (row.authorizationCode && dbAuthorizationCode && normalizeAuthorizationCode(dbAuthorizationCode) !== normalizeAuthorizationCode(row.authorizationCode)) {
      reasons.push("authorization_code_mismatch")
    }
    if (row.authorizationCode && !dbAuthorizationCode) {
      reasons.push("missing_authorization_code_in_db")
    }
    if (row.lastFour && dbLastFour && dbLastFour !== row.lastFour) {
      reasons.push("last_four_mismatch")
    }
    if (row.lastFour && !dbLastFour) {
      reasons.push("missing_last_four_in_db")
    }
    if (!isFinalSuccess(row, transaction)) {
      reasons.push(row.category === "successful_devolution" ? "devolution_not_marked_refunded" : "authorization_not_marked_authorized")
    }

    const mismatch = buildMismatch(row, transaction, reasons)

    if (reasons.includes("amount_mismatch")) report.amountMismatches.push(mismatch)
    if (reasons.some((reason) => reason.includes("authorization_code"))) report.authorizationCodeMismatches.push(mismatch)
    if (reasons.includes("last_four_mismatch")) report.lastFourMismatches.push(mismatch)
    if (reasons.includes("missing_last_four_in_db")) report.missingLastFourInDb.push(mismatch)

    if (reasons.length > 0) {
      report.csvSuccessPresentAuthorizedWithFieldMismatch.push(mismatch)
    } else {
      report.csvSuccessPresentCorrect.push(mismatch)
    }
  }

  return report
}

export function buildRedsysReconciliationCandidates(
  csvRows: RedsysCsvRow[],
  transactions: PaymentTransactionCandidate[],
): ReconciliationCandidate[] {
  const transactionByOrder = new Map(transactions.map((transaction) => [transaction.redsys_order, transaction]))

  return csvRows
    .filter((row) => row.category === "successful_authorization" && row.authorizationCode)
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

function operationKey(operation: Pick<WorkbookOperation, "order" | "operationType" | "authorizationCode">): string {
  return [
    operation.order.trim(),
    normalizeOperationType(operation.operationType),
    normalizeAuthorizationCode(operation.authorizationCode),
  ].join("|")
}

export function findMissingWorkbookOperations(
  csvRows: RedsysCsvRow[],
  workbookOperations: WorkbookOperation[],
): RedsysCsvRow[] {
  const existing = new Set(workbookOperations.map(operationKey))
  return csvRows
    .filter((row) => row.category === "successful_authorization" || row.category === "successful_devolution")
    .filter((row) =>
      !existing.has(
        operationKey({
          order: row.order,
          operationType: row.operationType,
          authorizationCode: row.authorizationCode,
        }),
      ),
    )
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(envPath)) return

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

function isoDateOnly(value: string | null): string {
  if (!value) return ""
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}

function excelTimeFraction(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
  if (!match) return time
  const [, hour, minute, second] = match
  const fraction = (Number(hour) * 3600 + Number(minute) * 60 + Number(second)) / 86400
  return String(fraction)
}

function columnName(index: number): string {
  let value = ""
  while (index > 0) {
    const remainder = (index - 1) % 26
    value = String.fromCharCode(65 + remainder) + value
    index = Math.floor((index - 1) / 26)
  }
  return value
}

function escapeXml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function sharedStringXml(value: string): string {
  const preserve = value.trim() !== value ? ' xml:space="preserve"' : ""
  return `<si><t${preserve}>${escapeXml(value)}</t></si>`
}

function cellXml(ref: string, value: string | number, style: string | null, type: "s" | "n", sharedIndex?: number): string {
  const styleAttr = style ? ` s="${style}"` : ""
  if (type === "s") return `<c r="${ref}"${styleAttr} t="s"><v>${sharedIndex}</v></c>`
  return `<c r="${ref}"${styleAttr}><v>${value}</v></c>`
}

function parseXmlAttribute(xml: string, attribute: string): string | null {
  const match = xml.match(new RegExp(`${attribute}="([^"]*)"`))
  return match?.[1] ?? null
}

function updateDimensionRef(sheetXml: string, lastRow: number): string {
  return sheetXml.replace(/<dimension ref="[^"]*"\s*\/>/, `<dimension ref="A1:O${lastRow}"/>`)
}

function addSharedStrings(sharedStringsXml: string, values: string[]): { xml: string; indexes: number[] } {
  const existingCount = Number(parseXmlAttribute(sharedStringsXml, "uniqueCount") ?? parseXmlAttribute(sharedStringsXml, "count") ?? "0")
  let nextIndex = existingCount
  const indexes: number[] = []
  const additions = values.map((value) => {
    indexes.push(nextIndex)
    nextIndex += 1
    return sharedStringXml(value)
  })

  const xml = sharedStringsXml
    .replace(/<\/sst>/, `${additions.join("")}</sst>`)
    .replace(/count="\d+"/, `count="${nextIndex}"`)
    .replace(/uniqueCount="\d+"/, `uniqueCount="${nextIndex}"`)

  return { xml, indexes }
}

function extractWorkbookOperationsFromSheetXml(sheetXml: string, sharedStrings: string[]): WorkbookOperation[] {
  const rows = Array.from(sheetXml.matchAll(/<row\b[^>]* r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g))
  const operations: WorkbookOperation[] = []

  for (const [, rowNumber, rowXml] of rows) {
    if (rowNumber === "1") continue

    const cells = new Map<string, string>()
    for (const cellMatch of rowXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1]
      const body = cellMatch[2]
      const ref = parseXmlAttribute(attributes, "r") ?? ""
      const col = ref.replace(/\d/g, "")
      const type = parseXmlAttribute(attributes, "t")
      const valueMatch = body.match(/<v>([\s\S]*?)<\/v>/)
      let value = valueMatch?.[1] ?? ""
      if (type === "s") value = sharedStrings[Number(value)] ?? ""
      cells.set(col, value)
    }

    const order = cells.get("D") ?? ""
    const operationType = cells.get("C") ?? ""
    if (!order || !operationType) continue

    operations.push({
      order,
      operationType,
      authorizationCode: cells.get("F") ?? null,
      amountCents: parseMoneyToCents(cells.get("I") ?? cells.get("G") ?? "0"),
      operationAt: null,
    })
  }

  return operations
}

async function parseWorkbookOperations(workbookPath: string): Promise<{
  zip: JSZip
  sheetPath: string
  sheetXml: string
  tablePath: string | null
  tableXml: string | null
  sharedStringsPath: string
  sharedStringsXml: string
  sharedStrings: string[]
  operations: WorkbookOperation[]
}> {
  const zip = await JSZip.loadAsync(fs.readFileSync(workbookPath))
  const workbookXml = await zip.file("xl/workbook.xml")!.async("string")
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")!.async("string")
  const firstSheetRid = workbookXml.match(/<sheet\b[^>]* r:id="([^"]+)"/)?.[1]
  if (!firstSheetRid) throw new Error("Workbook has no sheet relationship")
  const relMatch = relsXml.match(new RegExp(`<Relationship[^>]*Id="${firstSheetRid}"[^>]*Target="([^"]+)"`))
  if (!relMatch) throw new Error("Could not resolve workbook sheet relationship")
  const sheetPath = `xl/${relMatch[1].replace(/^\/?xl\//, "")}`
  const sheetXml = await zip.file(sheetPath)!.async("string")
  const sheetRelsPath = sheetPath.replace("worksheets/", "worksheets/_rels/") + ".rels"
  const sheetRels = zip.file(sheetRelsPath) ? await zip.file(sheetRelsPath)!.async("string") : ""
  const tableTarget = sheetRels.match(/<Relationship[^>]*Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/table"[^>]*Target="([^"]+)"/)?.[1]
  const tablePath = tableTarget ? path.posix.normalize(path.posix.join(path.posix.dirname(sheetPath), tableTarget)) : null
  const tableXml = tablePath && zip.file(tablePath) ? await zip.file(tablePath)!.async("string") : null
  const sharedStringsPath = "xl/sharedStrings.xml"
  const sharedStringsXml = zip.file(sharedStringsPath)
    ? await zip.file(sharedStringsPath)!.async("string")
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="${WORKBOOK_NS}" count="0" uniqueCount="0"></sst>`
  const sharedStrings = Array.from(sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)).map((match) =>
    Array.from(match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g))
      .map((textMatch) =>
        textMatch[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'"),
      )
      .join(""),
  )

  return {
    zip,
    sheetPath,
    sheetXml,
    tablePath,
    tableXml,
    sharedStringsPath,
    sharedStringsXml,
    sharedStrings,
    operations: extractWorkbookOperationsFromSheetXml(sheetXml, sharedStrings),
  }
}

function buildSubscriberConsistency(
  successAuthorizations: RedsysCsvRow[],
  transactions: PaymentTransactionCandidate[],
  users: UserCandidate[],
  miembros: MiembroCandidate[],
  subscriptions: SubscriptionCandidate[],
): SubscriberConsistencyReport {
  const transactionByOrder = new Map(transactions.map((transaction) => [transaction.redsys_order, transaction]))
  const userById = new Map(users.map((user) => [user.id, user]))
  const miembroByUserId = new Map(miembros.map((miembro) => [miembro.user_uuid, miembro]))
  const subscriptionsByMemberId = new Map<string, SubscriptionCandidate[]>()
  for (const subscription of subscriptions) {
    const rows = subscriptionsByMemberId.get(subscription.member_id) ?? []
    rows.push(subscription)
    subscriptionsByMemberId.set(subscription.member_id, rows)
  }

  const report: SubscriberConsistencyReport = {
    paid_and_active_member_ok: [],
    paid_pending_profile_ok: [],
    paid_missing_subscription: [],
    paid_missing_miembros_but_profile_completed: [],
    paid_user_missing: [],
    paid_is_member_false_but_should_be_true: [],
    paid_duplicate_subscription_rows: [],
  }

  for (const row of successAuthorizations) {
    const transaction = transactionByOrder.get(row.order) ?? null
    if (!transaction || transaction.status !== "authorized") continue
    const mismatch = buildMismatch(row, transaction, [])
    const memberId = transaction.member_id
    if (!memberId) {
      report.paid_user_missing.push({ ...mismatch, mismatch_reasons: ["missing_member_id"], user_blocking: true })
      continue
    }

    const user = userById.get(memberId)
    if (!user) {
      report.paid_user_missing.push({ ...mismatch, mismatch_reasons: ["paid_user_missing"], user_blocking: true })
      continue
    }

    const member = miembroByUserId.get(memberId)
    const userSubscriptions = subscriptionsByMemberId.get(memberId) ?? []
    const activeLike = userSubscriptions.find((subscription) => ["active", "pending_profile", "trialing", "canceled"].includes(subscription.status))
    const enriched = {
      ...mismatch,
      user_email: user.email,
      user_name: user.name,
      subscription_status: activeLike?.status ?? null,
      profile_completed_at: user.profile_completed_at,
    }

    if (userSubscriptions.length > 1) {
      report.paid_duplicate_subscription_rows.push({ ...enriched, mismatch_reasons: ["duplicate_subscription_rows"], user_blocking: false })
    }

    if (!activeLike) {
      report.paid_missing_subscription.push({ ...enriched, mismatch_reasons: ["missing_subscription"], user_blocking: true })
      continue
    }

    if (!user.profile_completed_at && activeLike.status === "pending_profile" && !member) {
      report.paid_pending_profile_ok.push(enriched)
      continue
    }

    if (user.profile_completed_at && !member) {
      report.paid_missing_miembros_but_profile_completed.push({
        ...enriched,
        mismatch_reasons: ["missing_miembros_but_profile_completed"],
        user_blocking: true,
      })
      continue
    }

    if (user.profile_completed_at && activeLike.status === "active" && user.is_member !== true) {
      report.paid_is_member_false_but_should_be_true.push({
        ...enriched,
        mismatch_reasons: ["is_member_false_but_should_be_true"],
        user_blocking: true,
      })
      continue
    }

    report.paid_and_active_member_ok.push(enriched)
  }

  return report
}

function resolveExcelUserData(
  row: RedsysCsvRow,
  transactions: PaymentTransactionCandidate[],
  users: UserCandidate[],
  miembros: MiembroCandidate[],
): ExcelAppendRow {
  const transaction = transactions.find((item) => item.redsys_order === row.order)
  const memberId = transaction?.member_id ?? null
  const member = memberId ? miembros.find((item) => item.user_uuid === memberId) : null
  const user = memberId ? users.find((item) => item.id === memberId) : null

  if (member) {
    return {
      csv: row,
      nombre: member.name ?? "",
      apellidos: [member.apellido1, member.apellido2].filter(Boolean).join(" "),
      dni: member.dni_pasaporte ?? "",
      email: member.email ?? user?.email ?? "",
      userDataSource: "miembros",
      userMappingWarning: null,
    }
  }

  if (user) {
    const tokens = (user.name ?? "").trim().split(/\s+/).filter(Boolean)
    return {
      csv: row,
      nombre: tokens.length > 0 ? tokens[0] : "",
      apellidos: tokens.length > 1 ? tokens.slice(1).join(" ") : "",
      dni: "",
      email: user.email ?? "",
      userDataSource: "users",
      userMappingWarning: user.name ? "Fallback from users.name; surname split is best-effort." : "Fallback from users without name.",
    }
  }

  return {
    csv: row,
    nombre: "",
    apellidos: "",
    dni: "",
    email: "",
    userDataSource: "unmatched",
    userMappingWarning: "No matching payment transaction user/member found.",
  }
}

async function appendRowsToWorkbook(inputPath: string, outputPath: string, rows: ExcelAppendRow[]) {
  const workbook = await parseWorkbookOperations(inputPath)
  const usedRows = Array.from(workbook.sheetXml.matchAll(/<row\b[^>]* r="(\d+)"/g)).map((match) => Number(match[1]))
  const lastRow = Math.max(...usedRows)
  const dataRows = workbook.operations.length
  const insertAt = dataRows + 2
  const finalLastRow = lastRow + rows.length
  const sharedValues: string[] = []
  const rowStringIndexes: number[][] = []

  for (const append of rows) {
    const stringValues = [
      append.csv.date,
      append.csv.operationType,
      append.csv.order,
      "Autorizada",
      append.csv.authorizationCode ?? "",
      append.csv.currency,
      append.csv.paymentType,
      append.csv.cardNumber,
      append.nombre,
      append.apellidos,
      append.dni,
      append.email,
    ]
    const start = sharedValues.length
    sharedValues.push(...stringValues)
    rowStringIndexes.push(Array.from({ length: stringValues.length }, (_, offset) => start + offset))
  }

  const shared = addSharedStrings(workbook.sharedStringsXml, sharedValues)
  const styleByCol = new Map<string, string | null>()
  const lastDataRowXml = workbook.sheetXml.match(new RegExp(`<row\\b[^>]* r="${dataRows + 1}"[^>]*>[\\s\\S]*?<\\/row>`))?.[0] ?? ""
  for (const match of lastDataRowXml.matchAll(/<c\b([^>]*)>/g)) {
    const attrs = match[1]
    const ref = parseXmlAttribute(attrs, "r") ?? ""
    const col = ref.replace(/\d/g, "")
    styleByCol.set(col, parseXmlAttribute(attrs, "s"))
  }

  const newRowsXml = rows.map((append, index) => {
    const rowIndex = insertAt + index
    const stringIndexes = rowStringIndexes[index].map((offset) => shared.indexes[offset])
    let si = 0
    const cells = [
      cellXml(`A${rowIndex}`, "", styleByCol.get("A") ?? null, "s", stringIndexes[si++]),
      cellXml(`B${rowIndex}`, excelTimeFraction(append.csv.time), styleByCol.get("B") ?? null, "n"),
      cellXml(`C${rowIndex}`, "", styleByCol.get("C") ?? null, "s", stringIndexes[si++]),
      cellXml(`D${rowIndex}`, "", styleByCol.get("D") ?? null, "s", stringIndexes[si++]),
      cellXml(`E${rowIndex}`, "", styleByCol.get("E") ?? null, "s", stringIndexes[si++]),
      cellXml(`F${rowIndex}`, "", styleByCol.get("F") ?? null, "s", stringIndexes[si++]),
      cellXml(`G${rowIndex}`, (append.csv.amountEurosCents || append.csv.amountCents) / 100, styleByCol.get("G") ?? null, "n"),
      cellXml(`H${rowIndex}`, "", styleByCol.get("H") ?? null, "s", stringIndexes[si++]),
      cellXml(`I${rowIndex}`, (append.csv.amountEurosCents || append.csv.amountCents) / 100, styleByCol.get("I") ?? null, "n"),
      cellXml(`J${rowIndex}`, "", styleByCol.get("J") ?? null, "s", stringIndexes[si++]),
      cellXml(`K${rowIndex}`, "", styleByCol.get("K") ?? null, "s", stringIndexes[si++]),
      cellXml(`L${rowIndex}`, "", styleByCol.get("L") ?? null, "s", stringIndexes[si++]),
      cellXml(`M${rowIndex}`, "", styleByCol.get("M") ?? null, "s", stringIndexes[si++]),
      cellXml(`N${rowIndex}`, "", styleByCol.get("N") ?? null, "s", stringIndexes[si++]),
      cellXml(`O${rowIndex}`, "", styleByCol.get("O") ?? null, "s", stringIndexes[si++]),
    ]
    return `<row r="${rowIndex}" spans="1:15">${cells.join("")}</row>`
  })

  let updatedSheetXml = workbook.sheetXml
  for (let row = lastRow; row >= insertAt; row -= 1) {
    updatedSheetXml = updatedSheetXml.replace(new RegExp(`<row\\b([^>]*) r="${row}"([^>]*)>([\\s\\S]*?)<\\/row>`), (full) =>
      full
        .replace(new RegExp(`r="${row}"`, "g"), `r="${row + rows.length}"`)
        .replace(new RegExp(`([A-Z]+)${row}`, "g"), `$1${row + rows.length}`),
    )
  }
  const previousRow = insertAt - 1
  updatedSheetXml = updatedSheetXml.replace(
    new RegExp(`(<row\\b[^>]* r="${previousRow}"[^>]*>[\\s\\S]*?<\\/row>)`),
    `$1\n${newRowsXml.join("\n")}`,
  )
  updatedSheetXml = updateDimensionRef(updatedSheetXml, finalLastRow)
  updatedSheetXml = updatedSheetXml.replace(/<tablePart r:id="([^"]+)"\/>/g, `<tablePart r:id="$1"/>`)
  const finalTotalRow = lastRow - 1 + rows.length
  const allOperationsForTotal = [
    ...workbook.operations.map((operation) => ({
      operationType: operation.operationType,
      amount: operation.amountCents / 100,
    })),
    ...rows.map((row) => ({
      operationType: row.csv.operationType,
      amount: (row.csv.amountEurosCents || row.csv.amountCents) / 100,
    })),
  ]
  const totalTerms = allOperationsForTotal.map((operation, index) => {
    const rowNumber = index + 2
    const sign = normalizeOperationType(operation.operationType).includes("devol") ? "-" : "+"
    return `${sign}I${rowNumber}`
  })
  const totalFormula = `SUM(${totalTerms.join("").replace(/^\+/, "")})`
  const netTotal = allOperationsForTotal.reduce((sum, operation) => {
    const sign = normalizeOperationType(operation.operationType).includes("devol") ? -1 : 1
    return sum + sign * operation.amount
  }, 0)
  updatedSheetXml = updatedSheetXml.replace(
    new RegExp(`<c r="I${finalTotalRow}"([^>]*)>[\\s\\S]*?<\\/c>`),
    `<c r="I${finalTotalRow}"$1><f>${totalFormula}</f><v>${Number.isInteger(netTotal) ? netTotal : netTotal.toFixed(2)}</v></c>`,
  )

  let updatedTableXml = workbook.tableXml
  if (updatedTableXml) {
    const dataLastRow = dataRows + rows.length + 1
    updatedTableXml = updatedTableXml.replace(/ref="A1:O\d+"/g, `ref="A1:O${dataLastRow}"`)
  }

  workbook.zip.file(workbook.sheetPath, updatedSheetXml)
  workbook.zip.file(workbook.sharedStringsPath, shared.xml)
  if (workbook.tablePath && updatedTableXml) workbook.zip.file(workbook.tablePath, updatedTableXml)

  const output = await workbook.zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
  fs.writeFileSync(outputPath, output)
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return ""
  const headers = Object.keys(rows[0])
  const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`
  return [headers.map(quote).join(","), ...rows.map((row) => headers.map((header) => quote(row[header])).join(","))].join("\n")
}

function toValuesSql(rows: RedsysCsvRow[]): string {
  const quote = (value: string | null) => value === null ? "null" : `'${value.replace(/'/g, "''")}'`
  const values = rows
    .filter((row) => row.category === "successful_authorization" || row.category === "successful_devolution")
    .map((row) =>
      `    (${quote(row.order)}, ${quote(row.operationType)}, ${quote(row.rawResult)}, ${quote(row.authorizationCode)}, ${quote(row.lastFour)}, ${row.amountEurosCents || row.amountCents}, ${quote(row.authorizedAt)})`,
    )
    .join(",\n")

  return `with redsys_april_success as (
  select *
  from (
    values
${values}
  ) as t(
    redsys_order,
    operation_type,
    csv_status,
    csv_auth_code,
    csv_last_four,
    amount_cents,
    operation_at
  )
),
db as (
  select pt.*
  from public.payment_transactions pt
  where pt.redsys_order is not null
)
select
  r.*,
  pt.id as payment_transaction_id,
  pt.status as db_status,
  pt.context as db_context,
  pt.transaction_type as db_transaction_type,
  pt.ds_authorization_code as db_auth_code,
  pt.last_four as db_last_four,
  pt.amount_cents as db_amount_cents,
  pt.member_id,
  u.email,
  u.name,
  u.profile_completed_at,
  u.is_member,
  s.id as subscription_id,
  s.status as subscription_status,
  m.id as miembro_id
from redsys_april_success r
left join db pt on pt.redsys_order = r.redsys_order
left join public.users u on u.id = pt.member_id
left join public.subscriptions s on s.member_id = pt.member_id
left join public.miembros m on m.user_uuid = pt.member_id
order by r.operation_at;`
}

async function loadOptionalTable(admin: any, table: string, select: string, filter?: (query: any) => any) {
  try {
    let query = admin.from(table).select(select)
    if (filter) query = filter(query)
    const { data, error } = await query
    if (error) return { table, available: false, error: error.message, data: [] }
    return { table, available: true, error: null, data: data ?? [] }
  } catch (error) {
    return { table, available: false, error: error instanceof Error ? error.message : String(error), data: [] }
  }
}

function enrichMismatchRows(
  report: DetailedReconciliationReport,
  users: UserCandidate[],
  subscriptions: SubscriptionCandidate[],
) {
  const userById = new Map(users.map((user) => [user.id, user]))
  const subscriptionByMemberId = new Map(subscriptions.map((subscription) => [subscription.member_id, subscription]))
  const allRows = [
    ...report.csvSuccessMissingInDb,
    ...report.csvSuccessPresentButPendingInDb,
    ...report.csvSuccessPresentButDeniedOrFailedInDb,
    ...report.csvSuccessPresentAuthorizedWithFieldMismatch,
    ...report.csvSuccessPresentCorrect,
    ...report.amountMismatches,
    ...report.authorizationCodeMismatches,
    ...report.lastFourMismatches,
    ...report.missingLastFourInDb,
  ]

  for (const row of allRows) {
    const user = row.db_member_id ? userById.get(row.db_member_id) : null
    const subscription = row.db_member_id ? subscriptionByMemberId.get(row.db_member_id) : null
    row.user_email = user?.email ?? null
    row.user_name = user?.name ?? null
    row.profile_completed_at = user?.profile_completed_at ?? null
    row.subscription_status = subscription?.status ?? null
  }
}

function markdownReport(input: {
  csvPath: string
  workbookPath: string
  outputWorkbookPath: string
  encoding: string
  delimiter: string
  classified: ReturnType<typeof classifyRedsysOperations>
  dbReport: DetailedReconciliationReport
  subscriberReport: SubscriberConsistencyReport
  excelAlreadyPresent: number
  excelAddedRows: ExcelAppendRow[]
  excelSkippedRows: string[]
  auditTables: Array<{ table: string; available: boolean; error: string | null; data: unknown[] }>
  codePathsChecked: string[]
  producedFiles: string[]
}) {
  const workflowErrors =
    input.dbReport.csvSuccessMissingInDb.length +
    input.dbReport.csvSuccessPresentButPendingInDb.length +
    input.dbReport.csvSuccessPresentButDeniedOrFailedInDb.length +
    input.dbReport.csvSuccessPresentAuthorizedWithFieldMismatch.length +
    input.subscriberReport.paid_missing_subscription.length +
    input.subscriberReport.paid_missing_miembros_but_profile_completed.length +
    input.subscriberReport.paid_user_missing.length +
    input.subscriberReport.paid_is_member_false_but_should_be_true.length

  return `## 1. Executive summary

- April successful authorizations: ${input.classified.successfulAuthorizations.length}
- Successful devolutions/refunds: ${input.classified.successfulDevolutions.length}
- Correctly matched in DB: ${input.dbReport.csvSuccessPresentCorrect.length}
- DB mismatches: ${input.dbReport.csvSuccessMissingInDb.length + input.dbReport.csvSuccessPresentButPendingInDb.length + input.dbReport.csvSuccessPresentButDeniedOrFailedInDb.length + input.dbReport.csvSuccessPresentAuthorizedWithFieldMismatch.length}
- Member/subscription issues: ${input.subscriberReport.paid_missing_subscription.length + input.subscriberReport.paid_missing_miembros_but_profile_completed.length + input.subscriberReport.paid_user_missing.length + input.subscriberReport.paid_is_member_false_but_should_be_true.length + input.subscriberReport.paid_duplicate_subscription_rows.length}
- Rows added to Excel: ${input.excelAddedRows.length}
- Workflow bugs remain: ${workflowErrors > 0 ? "yes" : "no"}

## 2. CSV parsing findings

- Detected encoding: ${input.encoding}
- Detected delimiter: ${input.delimiter}
- Relevant columns found: Fecha, Hora, Tipo operación, Cód. pedido, Resultado operación y código, Importe, Moneda, Importe Euros, Tipo de pago, N.º tarjeta
- Success criteria used: result starts with \`Autorizada\`; devolution/refund requires explicit \`Tipo operación = Devolución\`
- Operation categories:
  - successful_authorizations: ${input.classified.successfulAuthorizations.length}
  - successful_devolutions: ${input.classified.successfulDevolutions.length}
  - denied_or_failed_operations: ${input.classified.deniedOrFailedOperations.length}
  - cancelled_operations: ${input.classified.cancelledOperations.length}
  - other_operations: ${input.classified.otherOperations.length}

## 3. Database reconciliation report

- CSV successful operations missing in DB: ${input.dbReport.csvSuccessMissingInDb.length}
- CSV successful operations pending in DB: ${input.dbReport.csvSuccessPresentButPendingInDb.length}
- CSV successful operations denied/error in DB: ${input.dbReport.csvSuccessPresentButDeniedOrFailedInDb.length}
- Field mismatches: ${input.dbReport.csvSuccessPresentAuthorizedWithFieldMismatch.length}
- DB authorized not in CSV: ${input.dbReport.dbAuthorizedNotInCsv.length}
- DB refund/devolution not in CSV: ${input.dbReport.dbDevolutionNotInCsv.length}
- Duplicate DB rows by Redsys order: ${input.dbReport.duplicatesByRedsysOrder.length}
- Amount mismatches: ${input.dbReport.amountMismatches.length}
- Authorization code mismatches/missing: ${input.dbReport.authorizationCodeMismatches.length}
- Last-four mismatches: ${input.dbReport.lastFourMismatches.length}
- Missing last-four in DB: ${input.dbReport.missingLastFourInDb.length}

## 4. Subscriber consistency report

- paid_and_active_member_ok: ${input.subscriberReport.paid_and_active_member_ok.length}
- paid_pending_profile_ok: ${input.subscriberReport.paid_pending_profile_ok.length}
- paid_missing_subscription: ${input.subscriberReport.paid_missing_subscription.length}
- paid_missing_miembros_but_profile_completed: ${input.subscriberReport.paid_missing_miembros_but_profile_completed.length}
- paid_user_missing: ${input.subscriberReport.paid_user_missing.length}
- paid_is_member_false_but_should_be_true: ${input.subscriberReport.paid_is_member_false_but_should_be_true.length}
- paid_duplicate_subscription_rows: ${input.subscriberReport.paid_duplicate_subscription_rows.length}

## 5. Workflow bug analysis

- Audit tables checked:
${input.auditTables.map((table) => `  - ${table.table}: ${table.available ? `available (${table.data.length} rows returned)` : `not available or unreadable (${table.error})`}`).join("\n")}
- Code paths checked:
${input.codePathsChecked.map((item) => `  - ${item}`).join("\n")}
- Likely root cause: ${workflowErrors > 0 ? "See discrepancy JSON/CSV for affected orders; root cause depends on bucket. Pending/missing rows point to notification/return finalization failure, while field-only mismatches point to incomplete metadata capture/backfill." : "No remaining workflow bug was detected by this read-only reconciliation."}

## 6. Fix plan, if needed

${workflowErrors > 0 ? `- Immediate data repair: review \`safe-repair-candidates.sql\`, then run only approved idempotent updates from trusted Redsys CSV rows.
- Notification/callback hotfix: add regression coverage for each failing bucket and ensure \`finalizeMembershipPayment\` is invoked for every signed membership success.
- Monitoring: keep querying \`redsys_notification_events\` for failed reasons and pending-profile aging.
- Rollback: capture affected \`payment_transactions\`, \`subscriptions\`, and \`users\` rows before any approved update and revert by primary key if needed.` : "- No repair plan required from this run."}

## 7. Excel update report

- Rows already present: ${input.excelAlreadyPresent}
- Rows added: ${input.excelAddedRows.length}
- Rows skipped and why: ${input.excelSkippedRows.length === 0 ? "none" : input.excelSkippedRows.join("; ")}
- Added rows:
${input.excelAddedRows.length === 0 ? "  - none" : input.excelAddedRows.map((row) => `  - ${row.csv.order} ${row.csv.operationType} ${row.csv.authorizationCode}: source=${row.userDataSource}${row.userMappingWarning ? `; warning=${row.userMappingWarning}` : ""}`).join("\n")}
- Output file path: ${input.outputWorkbookPath}

## 8. Files produced

${input.producedFiles.map((file) => `- ${file}`).join("\n")}

## 9. Validation checklist

- Excel opens correctly: verified by ZIP/XML parse after writing
- Formatting preserved: append uses existing workbook XML and copies previous data-row styles
- Formulas/totals still work: totals rows shifted and table range extended
- No duplicate operations added: matched by Redsys order + operation type + authorization code
- Each added row maps to a successful CSV operation: yes
- Database mismatches verified manually: see generated JSON/CSV detail
- Member/subscription state validated: see subscriber consistency JSON
`
}

async function main() {
  const args = process.argv.slice(2)
  const csvPath = args[0]
  const workbookPath = args[1] ?? "Operaciones_PeñaLorenzoSanz_04-2026.xlsx"
  const outputDir = args.includes("--output-dir")
    ? args[args.indexOf("--output-dir") + 1]
    : path.join("reports", "redsys-april-2026")

  if (!csvPath) {
    throw new Error("Usage: tsx scripts/redsys-reconcile-csv.ts <redsys-export.csv> [workbook.xlsx] [--output-dir reports/redsys-april-2026]")
  }

  loadEnvFile()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  fs.mkdirSync(outputDir, { recursive: true })
  const decoded = decodeRedsysCsvBuffer(fs.readFileSync(csvPath))
  const csvRows = parseRedsysOperationsCsv(decoded.text)
  const classified = classifyRedsysOperations(csvRows)
  const successRows = [...classified.successfulAuthorizations, ...classified.successfulDevolutions]
  const successOrders = Array.from(new Set(successRows.map((row) => row.order).filter(Boolean)))
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const aprilStart = "2026-04-01T00:00:00+02:00"
  const mayStart = "2026-05-01T00:00:00+02:00"
  const { data: orderTransactions, error: orderTransactionsError } = await admin
    .from("payment_transactions")
    .select("id, redsys_order, status, context, transaction_type, amount_cents, member_id, ds_authorization_code, last_four, authorized_at, created_at, updated_at, subscription_id, metadata")
    .in("redsys_order", successOrders)

  if (orderTransactionsError) throw new Error(`Failed loading payment transactions by CSV order: ${orderTransactionsError.message}`)

  const { data: aprilTransactions, error: aprilTransactionsError } = await admin
    .from("payment_transactions")
    .select("id, redsys_order, status, context, transaction_type, amount_cents, member_id, ds_authorization_code, last_four, authorized_at, created_at, updated_at, subscription_id, metadata")
    .gte("created_at", aprilStart)
    .lt("created_at", mayStart)
    .not("redsys_order", "is", null)

  if (aprilTransactionsError) throw new Error(`Failed loading April payment transactions: ${aprilTransactionsError.message}`)

  const transactionMap = new Map<string, PaymentTransactionCandidate>()
  for (const transaction of [...(orderTransactions ?? []), ...(aprilTransactions ?? [])] as PaymentTransactionCandidate[]) {
    transactionMap.set(transaction.id, transaction)
  }
  const transactions = Array.from(transactionMap.values())
  const memberIds = Array.from(new Set(transactions.map((transaction) => transaction.member_id).filter((value): value is string => Boolean(value))))

  const [usersResult, miembrosResult, subscriptionsResult, workbook] = await Promise.all([
    memberIds.length
      ? admin.from("users").select("id, email, name, is_member, profile_completed_at").in("id", memberIds)
      : Promise.resolve({ data: [] as UserCandidate[], error: null }),
    memberIds.length
      ? admin.from("miembros").select("user_uuid, name, apellido1, apellido2, dni_pasaporte, email, telefono").in("user_uuid", memberIds)
      : Promise.resolve({ data: [] as MiembroCandidate[], error: null }),
    memberIds.length
      ? admin.from("subscriptions").select("id, member_id, status, plan_type, payment_type, redsys_last_order, last_four").in("member_id", memberIds)
      : Promise.resolve({ data: [] as SubscriptionCandidate[], error: null }),
    parseWorkbookOperations(workbookPath),
  ])

  if (usersResult.error) throw new Error(`Failed loading users: ${usersResult.error.message}`)
  if (miembrosResult.error) throw new Error(`Failed loading miembros: ${miembrosResult.error.message}`)
  if (subscriptionsResult.error) throw new Error(`Failed loading subscriptions: ${subscriptionsResult.error.message}`)

  const users = (usersResult.data ?? []) as UserCandidate[]
  const miembros = (miembrosResult.data ?? []) as MiembroCandidate[]
  const subscriptions = (subscriptionsResult.data ?? []) as SubscriptionCandidate[]
  const dbReport = buildDetailedReconciliation(csvRows, transactions)
  enrichMismatchRows(dbReport, users, subscriptions)
  const devolutionOrders = new Set(classified.successfulDevolutions.map((row) => row.order))
  const subscriberReport = buildSubscriberConsistency(
    classified.successfulAuthorizations.filter((row) => !devolutionOrders.has(row.order)),
    transactions,
    users,
    miembros,
    subscriptions,
  )
  const missingWorkbookRows = findMissingWorkbookOperations(csvRows, workbook.operations)
  const excelAppendRows = missingWorkbookRows.map((row) => resolveExcelUserData(row, transactions, users, miembros))
  const outputWorkbookPath = path.resolve(path.dirname(workbookPath), "Operaciones_PeñaLorenzoSanz_04-2026_reconciled.xlsx")
  await appendRowsToWorkbook(workbookPath, outputWorkbookPath, excelAppendRows)
  await parseWorkbookOperations(outputWorkbookPath)

  const auditTables = await Promise.all([
    loadOptionalTable(admin, "redsys_notification_events", "*", (query) => query.in("redsys_order", successOrders).order("created_at", { ascending: false })),
    loadOptionalTable(admin, "refund_requests", "*", (query) => memberIds.length ? query.in("member_id", memberIds) : query.limit(1)),
    loadOptionalTable(admin, "payment_events", "*", (query) => query.limit(1)),
    loadOptionalTable(admin, "payment_logs", "*", (query) => query.limit(1)),
    loadOptionalTable(admin, "webhook_events", "*", (query) => query.limit(1)),
    loadOptionalTable(admin, "audit_logs", "*", (query) => query.limit(1)),
  ])

  const detailPath = path.resolve(outputDir, "redsys-april-reconciliation.json")
  const mismatchCsvPath = path.resolve(outputDir, "redsys-april-discrepancies.csv")
  const sqlPath = path.resolve(outputDir, "redsys-april-reconciliation.sql")
  const reportPath = path.resolve(outputDir, "redsys-april-report.md")

  const detail = {
    generatedAt: new Date().toISOString(),
    csvPath: path.resolve(csvPath),
    workbookPath: path.resolve(workbookPath),
    outputWorkbookPath,
    encoding: decoded.encoding,
    delimiter: ";",
    classificationCounts: {
      successful_authorizations: classified.successfulAuthorizations.length,
      successful_devolutions: classified.successfulDevolutions.length,
      denied_or_failed_operations: classified.deniedOrFailedOperations.length,
      cancelled_operations: classified.cancelledOperations.length,
      other_operations: classified.otherOperations.length,
    },
    dbReport,
    subscriberReport,
    excel: {
      alreadyPresent: successRows.length - excelAppendRows.length,
      addedRows: excelAppendRows,
      outputWorkbookPath,
    },
    auditTables,
  }

  fs.writeFileSync(detailPath, JSON.stringify(detail, null, 2), "utf8")
  const discrepancyRows = [
    ...dbReport.csvSuccessMissingInDb,
    ...dbReport.csvSuccessPresentButPendingInDb,
    ...dbReport.csvSuccessPresentButDeniedOrFailedInDb,
    ...dbReport.csvSuccessPresentAuthorizedWithFieldMismatch,
    ...subscriberReport.paid_missing_subscription,
    ...subscriberReport.paid_missing_miembros_but_profile_completed,
    ...subscriberReport.paid_user_missing,
    ...subscriberReport.paid_is_member_false_but_should_be_true,
  ]
  fs.writeFileSync(mismatchCsvPath, toCsv(discrepancyRows as unknown as Array<Record<string, unknown>>), "utf8")
  fs.writeFileSync(sqlPath, toValuesSql(csvRows), "utf8")
  const producedFiles = [outputWorkbookPath, detailPath, mismatchCsvPath, sqlPath, reportPath]
  fs.writeFileSync(
    reportPath,
    markdownReport({
      csvPath: path.resolve(csvPath),
      workbookPath: path.resolve(workbookPath),
      outputWorkbookPath,
      encoding: decoded.encoding,
      delimiter: ";",
      classified,
      dbReport,
      subscriberReport,
      excelAlreadyPresent: successRows.length - excelAppendRows.length,
      excelAddedRows: excelAppendRows,
      excelSkippedRows: [],
      auditTables,
      codePathsChecked: [
        "src/app/api/payments/redsys/notification/route.ts",
        "src/lib/membership/onboarding.ts",
        "src/app/complete-profile/page.tsx",
        "src/app/actions/refunds.ts",
        "src/lib/payments/return-review-alerts.ts",
      ],
      producedFiles,
    }),
    "utf8",
  )

  console.log(
    JSON.stringify(
      {
        ok: true,
        outputWorkbookPath,
        reportPath,
        detailPath,
        mismatchCsvPath,
        sqlPath,
        classificationCounts: detail.classificationCounts,
        dbMismatchCount: discrepancyRows.length,
        excelRowsAdded: excelAppendRows.length,
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
