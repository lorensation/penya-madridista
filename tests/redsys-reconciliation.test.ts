import test from "node:test"
import assert from "node:assert/strict"
import {
  buildRedsysReconciliationCandidates,
  buildDetailedReconciliation,
  classifyRedsysOperations,
  decodeRedsysCsvBuffer,
  findMissingWorkbookOperations,
  parseRedsysOperationsCsv,
} from "../scripts/redsys-reconcile-csv"

const csv = `Fecha;Hora;Tipo operacion;Cod. pedido;Resultado operacion y codigo;Importe;Moneda;Importe Euros;Tipo de pago;Tipo pago original;N. tarjeta;Titular;
27/04/2026;11:07:31;Autorizacion;2604MB3de22V;Autorizada 739293;60.00;EUR;60.00;Challenge Visa;;459985******5091;;
27/04/2026;13:10:38;Autorizacion;2604MwPo7Nrd;Sin Finalizar 9998;60.00;EUR;60.00;;;;;
`

test("parses authorized Redsys CSV rows", () => {
  const rows = parseRedsysOperationsCsv(csv)

  assert.equal(rows.length, 2)
  assert.equal(rows[0].order, "2604MB3de22V")
  assert.equal(rows[0].authorized, true)
  assert.equal(rows[0].authorizationCode, "739293")
  assert.equal(rows[0].amountCents, 6000)
  assert.equal(rows[0].lastFour, "5091")
  assert.equal(rows[1].authorized, false)
})

test("decodes Windows-1252 Redsys exports with accented Spanish headers", () => {
  const cp1252Csv = Buffer.from(
    "Fecha;Hora;Tipo operaci\xf3n;C\xf3d. pedido;Resultado operaci\xf3n y c\xf3digo;Importe;Moneda;Importe Euros;Tipo de pago;Tipo pago original;N.\xba tarjeta;Titular;\n" +
      "23/04/2026;16:29:01;Devoluci\xf3n;2604MLbhyfNg;Autorizada 252927;60.00;EUR;60.00;Challenge Visa;;415006******2715;;\n",
    "latin1",
  )

  const decoded = decodeRedsysCsvBuffer(cp1252Csv)
  const rows = parseRedsysOperationsCsv(decoded.text)

  assert.equal(decoded.encoding, "windows-1252")
  assert.equal(rows[0].operationType, "Devolución")
  assert.equal(rows[0].order, "2604MLbhyfNg")
  assert.equal(rows[0].authorizationCode, "252927")
  assert.equal(rows[0].lastFour, "2715")
})

test("classifies authorizations, devolutions, denied, cancelled, and other operations", () => {
  const rows = parseRedsysOperationsCsv(`Fecha;Hora;Tipo operación;Cód. pedido;Resultado operación y código;Importe;Moneda;Importe Euros;Tipo de pago;Tipo pago original;N.º tarjeta;Titular;
23/04/2026;14:18:59;Autorización;2604AUTHOK1;Autorizada 741936;60.00;EUR;60.00;Challenge Visa;;415006******2715;;
23/04/2026;16:29:01;Devolución;2604REFUND1;Autorizada 252927;60.00;EUR;60.00;Challenge Visa;;415006******2715;;
23/04/2026;14:14:30;Autorización;2604DENIED1;Denegada 9590;60.00;EUR;60.00;Challenge MasterCard;;549928******9138;;
23/04/2026;14:15:30;Autorización;2604CANCEL1;Cancelada;60.00;EUR;60.00;;;;;
23/04/2026;14:16:30;Autorización;2604OTHER1;Sin Finalizar 9998;60.00;EUR;60.00;;;;;
`)

  const classified = classifyRedsysOperations(rows)

  assert.equal(classified.successfulAuthorizations.length, 1)
  assert.equal(classified.successfulDevolutions.length, 1)
  assert.equal(classified.deniedOrFailedOperations.length, 1)
  assert.equal(classified.cancelledOperations.length, 1)
  assert.equal(classified.otherOperations.length, 1)
})

test("builds dry-run reconciliation candidates only for safe pending membership matches", () => {
  const [authorized] = parseRedsysOperationsCsv(csv)
  const candidates = buildRedsysReconciliationCandidates([authorized], [
    {
      id: "txn_123",
      redsys_order: "2604MB3de22V",
      status: "pending",
      context: "membership",
      amount_cents: 6000,
      member_id: "member_123",
      metadata: { planType: "over25", interval: "annual" },
    },
  ])

  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].safe, true)
  assert.ok(candidates[0].dryRunUpdate)
  assert.equal(candidates[0].dryRunUpdate.status, "authorized")
  assert.equal(candidates[0].dryRunUpdate.ds_response, "0000")
  assert.equal(candidates[0].dryRunUpdate.ds_authorization_code, "739293")
})

test("builds detailed reconciliation buckets for DB status and field mismatches", () => {
  const rows = parseRedsysOperationsCsv(`Fecha;Hora;Tipo operación;Cód. pedido;Resultado operación y código;Importe;Moneda;Importe Euros;Tipo de pago;Tipo pago original;N.º tarjeta;Titular;
27/04/2026;11:07:31;Autorización;2604OK;Autorizada 739293;60.00;EUR;60.00;Challenge Visa;;459985******5091;;
27/04/2026;11:08:31;Autorización;2604PENDING;Autorizada 123456;60.00;EUR;60.00;Challenge Visa;;459985******1111;;
27/04/2026;11:09:31;Autorización;2604MISMATCH;Autorizada 654321;60.00;EUR;60.00;Challenge Visa;;459985******2222;;
27/04/2026;11:10:31;Devolución;2604REFUND;Autorizada 252927;60.00;EUR;60.00;Challenge Visa;;459985******3333;;
27/04/2026;11:11:31;Autorización;2604MISSING;Autorizada 888888;60.00;EUR;60.00;Challenge Visa;;459985******4444;;
`)

  const report = buildDetailedReconciliation(rows, [
    {
      id: "txn-ok",
      redsys_order: "2604OK",
      status: "authorized",
      context: "membership",
      transaction_type: "authorization",
      amount_cents: 6000,
      member_id: "member-ok",
      ds_authorization_code: "739293",
      last_four: "5091",
      metadata: { planType: "over25", interval: "annual" },
    },
    {
      id: "txn-pending",
      redsys_order: "2604PENDING",
      status: "pending",
      context: "membership",
      transaction_type: "authorization",
      amount_cents: 6000,
      member_id: "member-pending",
      ds_authorization_code: null,
      last_four: null,
      metadata: { planType: "over25", interval: "annual" },
    },
    {
      id: "txn-mismatch",
      redsys_order: "2604MISMATCH",
      status: "authorized",
      context: "membership",
      transaction_type: "authorization",
      amount_cents: 3000,
      member_id: "member-mismatch",
      ds_authorization_code: "000000",
      last_four: "9999",
      metadata: { planType: "over25", interval: "annual" },
    },
    {
      id: "txn-refund",
      redsys_order: "2604REFUND",
      status: "refunded",
      context: "membership",
      transaction_type: "refund",
      amount_cents: 6000,
      member_id: "member-refund",
      ds_authorization_code: "252927",
      last_four: "3333",
      metadata: { type: "refund" },
    },
    {
      id: "txn-db-only",
      redsys_order: "2604DBONLY",
      status: "authorized",
      context: "membership",
      transaction_type: "authorization",
      amount_cents: 6000,
      member_id: "member-db-only",
      ds_authorization_code: "777777",
      last_four: "7777",
      metadata: { planType: "over25", interval: "annual" },
    },
  ])

  assert.equal(report.csvSuccessPresentCorrect.length, 2)
  assert.equal(report.csvSuccessPresentButPendingInDb.length, 1)
  assert.equal(report.csvSuccessPresentAuthorizedWithFieldMismatch.length, 1)
  assert.equal(report.csvSuccessMissingInDb.length, 1)
  assert.equal(report.dbAuthorizedNotInCsv.length, 1)
  assert.equal(report.amountMismatches.length, 1)
  assert.equal(report.authorizationCodeMismatches.length, 1)
  assert.equal(report.lastFourMismatches.length, 1)
})

test("matches same-order Redsys devolution against refund metadata on the original payment row", () => {
  const rows = parseRedsysOperationsCsv(`Fecha;Hora;Tipo operacion;Cod. pedido;Resultado operacion y codigo;Importe;Moneda;Importe Euros;Tipo de pago;Tipo pago original;N. tarjeta;Titular;
23/04/2026;14:18:59;Autorizacion;2604SAMEORDER;Autorizada 741936;60.00;EUR;60.00;Challenge Visa;;415006******2715;;
23/04/2026;16:29:01;Devolucion;2604SAMEORDER;Autorizada 252927;60.00;EUR;60.00;Challenge Visa;;415006******2715;;
`)

  const report = buildDetailedReconciliation(rows, [
    {
      id: "txn-refunded-original",
      redsys_order: "2604SAMEORDER",
      status: "refunded",
      context: "membership",
      transaction_type: "authorization",
      amount_cents: 6000,
      member_id: "member-refund",
      ds_authorization_code: "741936",
      last_four: "2715",
      metadata: {
        planType: "over25",
        redsys_console_refund: {
          authorization_code: "252927",
          amount_cents: 6000,
          last_four: "2715",
          operation_at: "2026-04-23T16:29:01+02:00",
          source: "redsys_console_csv_20260501",
        },
      },
    },
  ])

  assert.equal(report.csvSuccessPresentCorrect.length, 2)
  assert.equal(report.csvSuccessPresentAuthorizedWithFieldMismatch.length, 0)
  assert.equal(report.authorizationCodeMismatches.length, 0)
})

test("finds successful CSV operations missing from an existing workbook without duplicating rows", () => {
  const rows = parseRedsysOperationsCsv(`Fecha;Hora;Tipo operación;Cód. pedido;Resultado operación y código;Importe;Moneda;Importe Euros;Tipo de pago;Tipo pago original;N.º tarjeta;Titular;
27/04/2026;11:07:31;Autorización;2604PRESENT;Autorizada 739293;60.00;EUR;60.00;Challenge Visa;;459985******5091;;
27/04/2026;11:08:31;Autorización;2604MISSING;Autorizada 123456;60.00;EUR;60.00;Challenge Visa;;459985******1111;;
`)

  const missing = findMissingWorkbookOperations(rows, [
    {
      order: "2604PRESENT",
      operationType: "Autorización",
      authorizationCode: "739293",
      amountCents: 6000,
      operationAt: "2026-04-27T11:07:31+02:00",
    },
  ])

  assert.deepEqual(
    missing.map((row) => row.order),
    ["2604MISSING"],
  )
})
