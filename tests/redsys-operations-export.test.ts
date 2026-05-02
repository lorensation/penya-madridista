import test from "node:test"
import assert from "node:assert/strict"
import JSZip from "jszip"
import {
  buildExportRows,
  buildOperationsWorkbook,
  deriveOperationsFileName,
  parseRedsysExportCsv,
} from "../src/lib/redsys/operations-export"

const csv = `Fecha;Hora;Tipo operación;Cód. pedido;Resultado operación y código;Importe;Moneda;Importe Euros;Tipo de pago;Tipo pago original;N.º tarjeta;Titular;
23/04/2026;14:18:59;Autorización;2604MLbhyfNg;Autorizada 741936;60.00;EUR;60.00;Challenge Visa;;415006******2715;;
23/04/2026;14:41:38;Autorización;2604MF6hmXBN;Autorizada KD7NA5;30.00;EUR;30.00;Challenge MasterCard;;516794******3324;;
23/04/2026;15:48:30;Autorización;2604MhtJMfk2;Denegada 9590;60.00;EUR;60.00;Challenge Visa;;492163******5340;;
23/04/2026;16:28:37;Devolución;2604MLbhyfNg;Autorizada 252927;60.00;EUR;60.00;Challenge Visa;;415006******2715;;
23/04/2026;17:19:24;Autorización;2604MZtnsqeq;Sin Finalizar 9998;60.00;EUR;60.00;;;;;
`

test("parses only authorized Redsys rows and splits result code", () => {
  const rows = parseRedsysExportCsv(csv)

  assert.equal(rows.length, 3)
  assert.equal(rows[0].order, "2604MLbhyfNg")
  assert.equal(rows[0].result, "Autorizada")
  assert.equal(rows[0].operationCode, "741936")
  assert.equal(rows[0].amount, 60)
  assert.equal(rows[1].operationCode, "KD7NA5")
  assert.equal(rows[2].type, "Devolución")
})

test("parses real accented Spanish Redsys headers", () => {
  const rows = parseRedsysExportCsv(csv)

  assert.equal(rows[0].type, "Autorización")
  assert.equal(rows[2].type, "Devolución")
  assert.equal(rows[2].operationCode, "252927")
})

test("parses comma decimal amounts from Redsys exports", () => {
  const commaCsv = csv.replaceAll("60.00", "60,00").replaceAll("30.00", "30,00")
  const rows = parseRedsysExportCsv(commaCsv)

  assert.equal(rows[0].amount, 60)
  assert.equal(rows[1].amountEuros, 30)
})

test("derives monthly operations filename from CSV dates", () => {
  const rows = parseRedsysExportCsv(csv)

  assert.equal(deriveOperationsFileName(rows), "Operaciones_PeñaLorenzoSanz_04-2026.xlsx")
})

test("builds export rows with member data before users fallback", () => {
  const rows = parseRedsysExportCsv(csv)
  const exportRows = buildExportRows(rows, {
    transactions: [
      { redsys_order: "2604MLbhyfNg", member_id: "member-1" },
      { redsys_order: "2604MF6hmXBN", member_id: "member-2" },
    ],
    miembros: [
      {
        user_uuid: "member-1",
        name: "Socio",
        apellido1: "Uno",
        apellido2: "Dos",
        dni_pasaporte: "12345678Z",
        email: "socio@example.com",
      },
    ],
    users: [
      { id: "member-1", name: "Fallback Ignored", email: "ignored@example.com" },
      { id: "member-2", name: "Solo Usuario", email: "usuario@example.com" },
    ],
  })

  assert.equal(exportRows.rows[0].nombre, "Socio")
  assert.equal(exportRows.rows[0].apellidos, "Uno Dos")
  assert.equal(exportRows.rows[0].dni, "12345678Z")
  assert.equal(exportRows.rows[0].email, "socio@example.com")
  assert.equal(exportRows.rows[1].nombre, "Solo Usuario")
  assert.equal(exportRows.rows[1].apellidos, "")
  assert.equal(exportRows.rows[1].dni, "")
  assert.equal(exportRows.rows[1].email, "usuario@example.com")
  assert.equal(exportRows.matchedCount, 3)
  assert.equal(exportRows.fallbackUserCount, 1)
  assert.equal(exportRows.unmatchedCount, 0)
})

test("generates an XLSX workbook with matching table shape and totals block", async () => {
  const rows = buildExportRows(parseRedsysExportCsv(csv), {
    transactions: [{ redsys_order: "2604MLbhyfNg", member_id: "member-1" }],
    miembros: [],
    users: [{ id: "member-1", name: "Loren", email: "loren@example.com" }],
  })

  const workbook = await buildOperationsWorkbook(rows.rows)
  const zip = await JSZip.loadAsync(workbook)
  const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string")
  const tableXml = await zip.file("xl/tables/table1.xml")!.async("string")
  const sharedStrings = await zip.file("xl/sharedStrings.xml")!.async("string")

  assert.match(sheetXml, /<dimension ref="A1:O7"/)
  assert.match(tableXml, /ref="A1:O4"/)
  assert.match(sharedStrings, /nombre/)
  assert.match(sharedStrings, /apellidos/)
  assert.match(sharedStrings, /DNI/)
  assert.match(sharedStrings, /email/)
  assert.match(sharedStrings, /Total Abril 2026/)
  assert.match(sharedStrings, /Loren/)
})
