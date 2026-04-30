import test from "node:test"
import assert from "node:assert/strict"
import {
  buildRedsysReconciliationCandidates,
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
