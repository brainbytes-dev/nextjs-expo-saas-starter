"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  IconFileSpreadsheet,
  IconCheck,
  IconX,
  IconArrowLeft,
  IconDownload,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ParsedRow {
  raw: Record<string, string>
  mapped: {
    name?: string
    number?: string
    manufacturer?: string
    serialNumber?: string
    condition?: string
    notes?: string
  }
  valid: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// CSV Parser (no library needed)
// ---------------------------------------------------------------------------
function parseCsv(text: string): {
  headers: string[]
  rows: Record<string, string>[]
} {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }

  function parseRow(line: string): string[] {
    const result: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        result.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(lines[0]!)
  const rows = lines.slice(1).map((line) => {
    const values = parseRow(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]))
  })
  return { headers, rows }
}

// ---------------------------------------------------------------------------
// Column mapping config
// ---------------------------------------------------------------------------
const TOOL_FIELDS = [
  { key: "name", label: "Name *", required: true },
  { key: "number", label: "Nummer", required: false },
  { key: "manufacturer", label: "Hersteller", required: false },
  { key: "serialNumber", label: "Seriennummer", required: false },
  { key: "condition", label: "Zustand", required: false },
  { key: "notes", label: "Notizen", required: false },
  { key: "_skip", label: "— Ignorieren —", required: false },
]

// Valid condition values accepted by the API
const CONDITION_MAP: Record<string, string> = {
  gut: "good",
  good: "good",
  beschaedigt: "damaged",
  beschädigt: "damaged",
  damaged: "damaged",
  reparatur: "repair",
  repair: "repair",
  ausgemustert: "decommissioned",
  decommissioned: "decommissioned",
}

// ---------------------------------------------------------------------------
// Template download
// ---------------------------------------------------------------------------
function downloadTemplate() {
  const headers =
    "Name;Nummer;Hersteller;Seriennummer;Zustand;Notizen"
  const example =
    "Bohrmaschine Hilti TE 6;WZ-001;Hilti;SN-12345;gut;Hauptlager"
  const blob = new Blob(["\uFEFF" + headers + "\n" + example], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "werkzeuge-vorlage.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
const STEPS = [
  { key: "upload", label: "Datei" },
  { key: "map", label: "Spalten" },
  { key: "preview", label: "Vorschau" },
  { key: "done", label: "Fertig" },
] as const

type Step = (typeof STEPS)[number]["key"]

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function ToolImportPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("upload")
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{
    success: number
    failed: number
    errors: string[]
  }>({ success: 0, failed: 0, errors: [] })

  // Step 1: Handle file upload
  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers: h, rows } = parseCsv(text)
      setHeaders(h)
      setRawRows(rows)

      // Auto-detect column mapping
      const autoMap: Record<string, string> = {}
      h.forEach((col) => {
        const lower = col.toLowerCase().replace(/[^a-zäöü]/g, "")
        if (lower.includes("name") || lower.includes("bezeichnung"))
          autoMap[col] = "name"
        else if (lower.includes("nummer") || lower.includes("number"))
          autoMap[col] = "number"
        else if (lower.includes("hersteller") || lower.includes("manufacturer"))
          autoMap[col] = "manufacturer"
        else if (lower.includes("seriennummer") || lower.includes("serial"))
          autoMap[col] = "serialNumber"
        else if (lower.includes("zustand") || lower.includes("condition"))
          autoMap[col] = "condition"
        else if (
          lower.includes("notiz") ||
          lower.includes("note") ||
          lower.includes("bemerk")
        )
          autoMap[col] = "notes"
        else autoMap[col] = "_skip"
      })
      setMapping(autoMap)
      setStep("map")
    }
    reader.readAsText(file, "UTF-8")
  }

  // Step 2: Apply mapping and validate
  function applyMapping() {
    const rows: ParsedRow[] = rawRows.map((raw) => {
      const mapped: ParsedRow["mapped"] = {}
      Object.entries(mapping).forEach(([csvHeader, fieldKey]) => {
        if (fieldKey === "_skip") return
        const val = raw[csvHeader]?.trim()
        if (!val) return
        if (fieldKey === "condition") {
          // Normalize condition to API enum values
          const normalized =
            CONDITION_MAP[val.toLowerCase()] ?? val.toLowerCase()
          mapped.condition = normalized
        } else {
          ;(mapped as Record<string, string>)[fieldKey] = val
        }
      })
      const valid = !!mapped.name
      return {
        raw,
        mapped,
        valid,
        error: valid ? undefined : "Name ist Pflichtfeld",
      }
    })
    setParsed(rows)
    setStep("preview")
  }

  // Step 3: Import
  async function handleImport() {
    setImporting(true)
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const row of parsed.filter((r) => r.valid)) {
      try {
        const res = await fetch("/api/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.mapped.name,
            number: row.mapped.number,
            manufacturer: row.mapped.manufacturer,
            serialNumber: row.mapped.serialNumber,
            condition: row.mapped.condition,
            notes: row.mapped.notes,
          }),
        })
        if (res.ok) {
          success++
        } else {
          failed++
          errors.push(`${row.mapped.name}: ${res.status}`)
        }
      } catch {
        failed++
        errors.push(`${row.mapped.name}: Netzwerkfehler`)
      }
    }

    setResults({ success, failed, errors })
    setImporting(false)
    setStep("done")
  }

  const validCount = parsed.filter((r) => r.valid).length
  const invalidCount = parsed.filter((r) => !r.valid).length

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/tools">
          <Button variant="ghost" size="icon" className="size-8">
            <IconArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">
            Werkzeuge
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">CSV Import</h1>
        </div>

        {/* Step indicator */}
        <div className="ml-auto flex items-center gap-3">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`flex items-center gap-1.5 text-xs font-mono ${
                step === s.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  step === s.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border"
                }`}
              >
                {i + 1}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardContent className="pt-6">
            <div
              className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleFile(f)
              }}
            >
              <IconFileSpreadsheet className="size-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium mb-1">
                CSV-Datei hierher ziehen oder klicken
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                UTF-8, Komma- oder Semikolon-getrennt
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={downloadTemplate}
              >
                <IconDownload className="size-3.5" />
                Vorlage herunterladen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === "map" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spalten zuordnen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground font-mono">
              {rawRows.length} Zeilen erkannt &middot; {headers.length} Spalten
            </p>
            <div className="grid gap-3">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <div className="w-48 text-sm font-mono truncate text-muted-foreground border border-border rounded px-2 py-1.5 bg-muted/30">
                    {h}
                  </div>
                  <span className="text-muted-foreground">&rarr;</span>
                  <Select
                    value={mapping[h] ?? "_skip"}
                    onValueChange={(v) =>
                      setMapping((prev) => ({ ...prev, [h]: v }))
                    }
                  >
                    <SelectTrigger className="w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOOL_FIELDS.map((f) => (
                        <SelectItem key={f.key} value={f.key}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={applyMapping}
                disabled={!Object.values(mapping).includes("name")}
              >
                Weiter zur Vorschau
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Zur&uuml;ck
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="text-secondary border-secondary/30 bg-secondary/10"
            >
              <IconCheck className="size-3 mr-1" />
              {validCount} g&uuml;ltig
            </Badge>
            {invalidCount > 0 && (
              <Badge
                variant="outline"
                className="text-destructive border-destructive/30 bg-destructive/10"
              >
                <IconX className="size-3 mr-1" />
                {invalidCount} Fehler (werden &uuml;bersprungen)
              </Badge>
            )}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Hersteller</TableHead>
                  <TableHead>Seriennummer</TableHead>
                  <TableHead>Zustand</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.slice(0, 20).map((row, i) => (
                  <TableRow
                    key={i}
                    className={!row.valid ? "opacity-40" : ""}
                  >
                    <TableCell>
                      {row.valid ? (
                        <IconCheck className="size-3.5 text-secondary" />
                      ) : (
                        <IconX className="size-3.5 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.mapped.name || (
                        <span className="text-destructive text-xs">fehlt</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.mapped.number ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.mapped.manufacturer ?? "\u2014"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.mapped.serialNumber ?? "\u2014"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.mapped.condition ?? "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {parsed.length > 20 && (
            <p className="text-xs text-muted-foreground font-mono text-center">
              &hellip; und {parsed.length - 20} weitere Zeilen
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0}
            >
              {importing
                ? "Importiert\u2026"
                : `${validCount} Werkzeuge importieren`}
            </Button>
            <Button variant="outline" onClick={() => setStep("map")}>
              Zur&uuml;ck
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="size-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
              <IconCheck className="size-8 text-secondary" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {results.success} Werkzeuge importiert
              </p>
              {results.failed > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {results.failed} Fehler &mdash;{" "}
                  {results.errors.slice(0, 3).join(", ")}
                </p>
              )}
            </div>
            <Button onClick={() => router.push("/dashboard/tools")}>
              Zur Werkzeugliste
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
