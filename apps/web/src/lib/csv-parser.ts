/**
 * CSV Parser — handles Swiss Excel format (semicolon delimiter, BOM, UTF-8)
 */

/** Detect whether `;` or `,` is the delimiter by counting occurrences in the first line. */
export function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] ?? ""
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  return semicolons >= commas ? ";" : ","
}

/** Strip UTF-8 BOM if present. */
function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1)
  return text
}

/** Parse a single CSV line respecting quoted fields. */
function parseLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === delimiter) {
        fields.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
  }

  fields.push(current.trim())
  return fields
}

export interface ParsedCSV {
  headers: string[]
  rows: string[][]
}

/** Parse CSV text into headers + rows. Auto-detects delimiter, strips BOM. */
export function parseCSV(text: string): ParsedCSV {
  const clean = stripBOM(text)
  const delimiter = detectDelimiter(clean)

  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseLine(lines[0]!, delimiter)
  const rows = lines.slice(1).map((line) => parseLine(line, delimiter))

  return { headers, rows }
}

/** Convert parsed data back to CSV (semicolon, with BOM for Swiss Excel compat). */
export function toCSV(headers: string[], rows: string[][]): string {
  const BOM = "\uFEFF"
  const escape = (val: string) => {
    if (val.includes(";") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }
  const lines = [
    headers.map(escape).join(";"),
    ...rows.map((row) => row.map(escape).join(";")),
  ]
  return BOM + lines.join("\r\n")
}
