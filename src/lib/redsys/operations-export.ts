import JSZip from "jszip"

export const REDSYS_OPERATIONS_BUCKET = "redsys-operations"

const HEADERS = [
  "Fecha",
  "Hora",
  "Tipo operación",
  "Cód. pedido",
  "Resultado",
  "Operación",
  "Importe",
  "Moneda",
  " Importe Euros ",
  "Tipo de pago",
  "N.º tarjeta",
  "nombre",
  "apellidos",
  "DNI",
  "email",
] as const

type Header = (typeof HEADERS)[number]

export interface RedsysAuthorizedOperation {
  date: string
  time: string
  type: string
  order: string
  result: "Autorizada"
  operationCode: string
  amount: number
  currency: string
  amountEuros: number
  paymentType: string
  cardNumber: string
}

export interface PaymentTransactionIdentity {
  redsys_order: string
  member_id: string | null
}

export interface MiembroIdentity {
  user_uuid: string
  name: string | null
  apellido1: string | null
  apellido2: string | null
  dni_pasaporte: string | null
  email: string | null
}

export interface UserIdentity {
  id: string
  name: string | null
  email: string | null
}

export interface EnrichedOperationRow extends RedsysAuthorizedOperation {
  nombre: string
  apellidos: string
  dni: string
  email: string
}

export interface BuildExportRowsInput {
  transactions: PaymentTransactionIdentity[]
  miembros: MiembroIdentity[]
  users: UserIdentity[]
}

export interface BuildExportRowsResult {
  rows: EnrichedOperationRow[]
  matchedCount: number
  fallbackUserCount: number
  unmatchedCount: number
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
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

function getColumn(row: Record<string, string>, name: string): string {
  return row[normalizeHeader(name)] ?? ""
}

function parseMoney(value: string): number {
  const trimmed = value.trim()
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function decodeRedsysCsvBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes)

  if (utf8.includes("\uFFFD")) {
    return new TextDecoder("windows-1252").decode(bytes)
  }

  return utf8
}

export function parseRedsysExportCsv(csv: string): RedsysAuthorizedOperation[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const [headerLine, ...dataLines] = lines
  if (!headerLine) {
    return []
  }

  const headers = parseDelimitedLine(headerLine).map(normalizeHeader)

  return dataLines.flatMap((line) => {
    const columns = parseDelimitedLine(line)
    const row = Object.fromEntries(headers.map((header, index) => [header, columns[index] ?? ""]))
    const rawResult = getColumn(row, "Resultado operación y código")
    const resultMatch = rawResult.match(/^Autorizada\s+(.+)$/i)

    if (!resultMatch) {
      return []
    }

    return [
      {
        date: getColumn(row, "Fecha"),
        time: getColumn(row, "Hora"),
        type: getColumn(row, "Tipo operación"),
        order: getColumn(row, "Cód. pedido"),
        result: "Autorizada" as const,
        operationCode: resultMatch[1].trim(),
        amount: parseMoney(getColumn(row, "Importe")),
        currency: getColumn(row, "Moneda"),
        amountEuros: parseMoney(getColumn(row, "Importe Euros")),
        paymentType: getColumn(row, "Tipo de pago"),
        cardNumber: getColumn(row, "N.º tarjeta"),
      },
    ]
  })
}

export function buildExportRows(
  operations: RedsysAuthorizedOperation[],
  identities: BuildExportRowsInput,
): BuildExportRowsResult {
  const transactionByOrder = new Map(identities.transactions.map((transaction) => [transaction.redsys_order, transaction]))
  const miembroByUserId = new Map(identities.miembros.map((miembro) => [miembro.user_uuid, miembro]))
  const userById = new Map(identities.users.map((user) => [user.id, user]))

  let matchedCount = 0
  let fallbackUserCount = 0
  let unmatchedCount = 0

  const rows = operations.map((operation) => {
    const transaction = transactionByOrder.get(operation.order)
    const memberId = transaction?.member_id ?? null
    const miembro = memberId ? miembroByUserId.get(memberId) : undefined
    const user = memberId ? userById.get(memberId) : undefined

    if (miembro) {
      matchedCount += 1
      return {
        ...operation,
        nombre: miembro.name ?? "",
        apellidos: [miembro.apellido1, miembro.apellido2].filter(Boolean).join(" "),
        dni: miembro.dni_pasaporte ?? "",
        email: miembro.email ?? "",
      }
    }

    if (user) {
      matchedCount += 1
      fallbackUserCount += 1
      return {
        ...operation,
        nombre: user.name ?? "",
        apellidos: "",
        dni: "",
        email: user.email ?? "",
      }
    }

    unmatchedCount += 1
    return {
      ...operation,
      nombre: "",
      apellidos: "",
      dni: "",
      email: "",
    }
  })

  return { rows, matchedCount, fallbackUserCount, unmatchedCount }
}

function parseSpanishDate(value: string): { day: number; month: number; year: number } {
  const [day, month, year] = value.split("/").map((part) => Number.parseInt(part, 10))
  if (!day || !month || !year) {
    throw new Error(`Invalid Redsys date: ${value}`)
  }

  return { day, month, year }
}

function monthName(month: number): string {
  return [
    "",
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ][month]
}

export function deriveOperationsFileName(rows: RedsysAuthorizedOperation[]): string {
  if (rows.length === 0) {
    throw new Error("No authorized Redsys operations found")
  }

  const { month, year } = parseSpanishDate(rows[0].date)
  return `Operaciones_PeñaLorenzoSanz_${String(month).padStart(2, "0")}-${year}.xlsx`
}

export function deriveStoragePath(fileName: string): string {
  return fileName
}

function deriveSheetName(rows: RedsysAuthorizedOperation[]): string {
  const { month } = parseSpanishDate(rows[0].date)
  return `Operaciones_PeñaLorenzoSanz_${String(month).padStart(2, "0")}-`
}

function escapeXml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
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

function excelTimeFraction(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)
  if (!match) {
    return null
  }

  const [, hour, minute, second] = match
  return (Number(hour) * 3600 + Number(minute) * 60 + Number(second)) / 86400
}

class SharedStrings {
  private readonly values = new Map<string, number>()
  private readonly items: string[] = []

  add(value: string): number {
    const existing = this.values.get(value)
    if (existing !== undefined) {
      return existing
    }

    const index = this.items.length
    this.values.set(value, index)
    this.items.push(value)
    return index
  }

  xml(): string {
    const items = this.items
      .map((value) => {
        const preserve = value.trim() !== value ? ' xml:space="preserve"' : ""
        return `<si><t${preserve}>${escapeXml(value)}</t></si>`
      })
      .join("")

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.items.length}" uniqueCount="${this.items.length}">${items}</sst>`
  }
}

function stringCell(ref: string, value: string, sharedStrings: SharedStrings, style = 0): string {
  const styleAttr = style ? ` s="${style}"` : ""
  return `<c r="${ref}"${styleAttr} t="s"><v>${sharedStrings.add(value)}</v></c>`
}

function numberCell(ref: string, value: number, style = 0): string {
  const styleAttr = style ? ` s="${style}"` : ""
  return `<c r="${ref}"${styleAttr}><v>${Number.isInteger(value) ? value : value.toFixed(12).replace(/0+$/, "").replace(/\.$/, "")}</v></c>`
}

function rowXml(rowIndex: number, cells: string[], style?: number): string {
  const styleAttr = style ? ` s="${style}" customFormat="1"` : ""
  return `<row r="${rowIndex}" spans="1:15"${styleAttr}>${cells.join("")}</row>`
}

function buildSheetXml(rows: EnrichedOperationRow[], sharedStrings: SharedStrings): string {
  const dataLastRow = rows.length + 1
  const blankRow = dataLastRow + 1
  const totalRow = dataLastRow + 2
  const noteRow = dataLastRow + 3
  const { month, year } = parseSpanishDate(rows[0]?.date ?? "01/01/2000")
  const netTotal = rows.reduce((sum, row) => {
    const sign = normalizeHeader(row.type) === "devolucion" ? -1 : 1
    return sum + sign * row.amountEuros
  }, 0)

  const headerCells = HEADERS.map((header, index) => stringCell(`${columnName(index + 1)}1`, header, sharedStrings, 1))
  const dataRows = rows.map((row, rowOffset) => {
    const rowIndex = rowOffset + 2
    const time = excelTimeFraction(row.time)
    const values: Record<Header, string | number> = {
      Fecha: row.date,
      Hora: row.time,
      "Tipo operación": row.type,
      "Cód. pedido": row.order,
      Resultado: row.result,
      Operación: row.operationCode,
      Importe: row.amount,
      Moneda: row.currency,
      " Importe Euros ": row.amountEuros,
      "Tipo de pago": row.paymentType,
      "N.º tarjeta": row.cardNumber,
      nombre: row.nombre,
      apellidos: row.apellidos,
      DNI: row.dni,
      email: row.email,
    }

    const cells = HEADERS.map((header, index) => {
      const ref = `${columnName(index + 1)}${rowIndex}`
      if (header === "Hora" && time !== null) {
        return numberCell(ref, time, 2)
      }
      if (header === "Importe" || header === " Importe Euros ") {
        return numberCell(ref, Number(values[header]), 3)
      }
      return stringCell(ref, String(values[header] ?? ""), sharedStrings)
    })

    return rowXml(rowIndex, cells)
  })

  const totalCells = [
    stringCell(`G${totalRow}`, `Total ${monthName(month)} ${year}`, sharedStrings, 5),
    stringCell(`H${totalRow}`, "", sharedStrings, 6),
    numberCell(`I${totalRow}`, netTotal, 7),
  ]
  const noteCells = [
    stringCell(`G${noteRow}`, "(Autorizadas - Devoluciones)", sharedStrings, 8),
    stringCell(`H${noteRow}`, "", sharedStrings, 9),
    stringCell(`I${noteRow}`, "", sharedStrings, 10),
  ]

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:O${noteRow}"/>
  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
  <sheetFormatPr baseColWidth="10" defaultRowHeight="14.4"/>
  <cols>
    <col min="1" max="2" width="11.5546875" style="4"/>
    <col min="3" max="3" width="14.6640625" style="4" customWidth="1"/>
    <col min="4" max="4" width="15" style="4" customWidth="1"/>
    <col min="5" max="5" width="11.5546875" style="4"/>
    <col min="6" max="6" width="12.44140625" style="4" customWidth="1"/>
    <col min="7" max="8" width="11.5546875" style="4"/>
    <col min="9" max="9" width="14.6640625" style="4" customWidth="1"/>
    <col min="10" max="10" width="18.88671875" style="4" customWidth="1"/>
    <col min="11" max="11" width="17.109375" style="4" customWidth="1"/>
    <col min="12" max="12" width="16" style="4" customWidth="1"/>
    <col min="13" max="13" width="24" style="4" customWidth="1"/>
    <col min="14" max="14" width="15" style="4" customWidth="1"/>
    <col min="15" max="15" width="30" style="4" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowXml(1, headerCells, 11)}
    ${dataRows.join("\n")}
    <row r="${blankRow}" spans="1:15"></row>
    ${rowXml(totalRow, totalCells)}
    ${rowXml(noteRow, noteCells)}
  </sheetData>
  <tableParts count="1"><tablePart r:id="rId1"/></tableParts>
</worksheet>`
}

function buildTableXml(rows: EnrichedOperationRow[]): string {
  const dataLastRow = rows.length + 1
  const columns = HEADERS.map((header, index) => `<tableColumn id="${index + 1}" name="${escapeXml(header)}"/>`).join("")

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="Tabla1" displayName="Tabla1" ref="A1:O${dataLastRow}" totalsRowShown="0">
  <autoFilter ref="A1:O${dataLastRow}"/>
  <tableColumns count="${HEADERS.length}">${columns}</tableColumns>
  <tableStyleInfo name="TableStyleLight9" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>`
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="h:mm:ss"/></numFmts>
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
    <font><i/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF5B9BD5"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left/><right/><top style="thin"><color rgb="FF808080"/></top><bottom style="thin"><color rgb="FF808080"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="2" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`
}

export async function buildOperationsWorkbook(rows: EnrichedOperationRow[]): Promise<Buffer> {
  if (rows.length === 0) {
    throw new Error("No authorized Redsys operations found")
  }

  const zip = new JSZip()
  const sharedStrings = new SharedStrings()
  const sheetXml = buildSheetXml(rows, sharedStrings)
  const tableXml = buildTableXml(rows)
  const sheetName = deriveSheetName(rows)

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/tables/table1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`)
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`)
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`)
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`)
  zip.file("xl/worksheets/sheet1.xml", sheetXml)
  zip.file("xl/worksheets/_rels/sheet1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>
</Relationships>`)
  zip.file("xl/tables/table1.xml", tableXml)
  zip.file("xl/styles.xml", buildStylesXml())
  zip.file("xl/sharedStrings.xml", sharedStrings.xml())
  zip.file("docProps/core.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Peña Lorenzo Sanz</dc:creator>
  <cp:lastModifiedBy>Peña Lorenzo Sanz</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`)
  zip.file("docProps/app.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Excel</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>${escapeXml(sheetName)}</vt:lpstr></vt:vector></TitlesOfParts>
  <Company>Peña Lorenzo Sanz</Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0300</AppVersion>
</Properties>`)

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
}
