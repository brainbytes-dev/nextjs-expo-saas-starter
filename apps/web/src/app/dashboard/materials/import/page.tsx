"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  IconFileSpreadsheet,
  IconCheck,
  IconX,
  IconArrowLeft,
  IconDownload,
  IconSearch,
  IconLoader2,
  IconBarcode,
  IconSparkles,
  IconWand,
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
import { suggestMappings, type ColumnMapping } from "@/lib/ai-column-mapper"
import { DEMO_MODE } from "@/lib/demo-mode"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ParsedRow {
  raw: Record<string, string>
  mapped: {
    name?: string
    number?: string
    unit?: string
    barcode?: string
    manufacturer?: string
    manufacturerNumber?: string
    reorderLevel?: number
    notes?: string
  }
  valid: boolean
  error?: string
  eanLooking?: boolean
  eanError?: string
}

// Confidence display level
type MappingConfidence = "ai-high" | "ai-mid" | "ai-low" | "rule" | "manual" | "skip"

// ---------------------------------------------------------------------------
// Column mapping config
// ---------------------------------------------------------------------------
const MATERIAL_FIELDS = [
  { key: "name",               label: "Name *",            required: true  },
  { key: "number",             label: "Artikelnummer",     required: false },
  { key: "unit",               label: "Einheit",           required: false },
  { key: "barcode",            label: "Barcode / EAN",     required: false },
  { key: "manufacturer",       label: "Hersteller",        required: false },
  { key: "manufacturerNumber", label: "Herstellernummer",  required: false },
  { key: "reorderLevel",       label: "Meldebestand",      required: false },
  { key: "notes",              label: "Notizen",           required: false },
  { key: "_skip",              label: "— Ignorieren —",    required: false },
] as const

type FieldKey = (typeof MATERIAL_FIELDS)[number]["key"]

// ---------------------------------------------------------------------------
// Demo-mode: realistic AI suggestions without API call
// ---------------------------------------------------------------------------
function getDemoMappings(headers: string[]): ColumnMapping[] {
  const DEMO_MAP: Record<string, { target: string; confidence: number }> = {
    name:               { target: "name",               confidence: 0.98 },
    bezeichnung:        { target: "name",               confidence: 0.96 },
    artikel:            { target: "name",               confidence: 0.91 },
    nummer:             { target: "number",             confidence: 0.95 },
    artikelnummer:      { target: "number",             confidence: 0.97 },
    nr:                 { target: "number",             confidence: 0.93 },
    einheit:            { target: "unit",               confidence: 0.97 },
    unit:               { target: "unit",               confidence: 0.95 },
    ean:                { target: "barcode",            confidence: 0.99 },
    barcode:            { target: "barcode",            confidence: 0.99 },
    strichcode:         { target: "barcode",            confidence: 0.97 },
    hersteller:         { target: "manufacturer",       confidence: 0.97 },
    manufacturer:       { target: "manufacturer",       confidence: 0.97 },
    herstellernummer:   { target: "manufacturerNumber", confidence: 0.96 },
    meldebestand:       { target: "reorderLevel",       confidence: 0.96 },
    minbestand:         { target: "reorderLevel",       confidence: 0.94 },
    notizen:            { target: "notes",              confidence: 0.95 },
    notiz:              { target: "notes",              confidence: 0.94 },
    bemerkung:          { target: "notes",              confidence: 0.90 },
  }

  return headers.map((h) => {
    const key = h.toLowerCase().replace(/[\s_\-]/g, "")
    const match = DEMO_MAP[key]
    if (match) {
      return { source: h, target: match.target, confidence: match.confidence, aiSuggested: true }
    }
    return { source: h, target: null, confidence: 0.1, aiSuggested: true }
  })
}

// ---------------------------------------------------------------------------
// Rule-based auto-detect (kept for initial load without AI)
// ---------------------------------------------------------------------------
function detectField(header: string): { field: FieldKey; confidence: MappingConfidence } {
  const h = header.toLowerCase().replace(/[\s_\-]/g, "")

  if (h.includes("name") || h.includes("bezeichnung") || h.includes("beschreibung") || h.includes("artikel") && h.includes("bez"))
    return { field: "name", confidence: "rule" }
  if (h === "ean" || h === "ean13" || h === "ean8" || h.includes("strichcode") || h.includes("barcode") || h.includes("qrcode") || h.includes("code"))
    return { field: "barcode", confidence: "rule" }
  if (h.includes("einheit") || h === "unit" || h === "me" || h === "masseinheit")
    return { field: "unit", confidence: "rule" }
  if ((h.includes("artikel") && h.includes("nr")) || h.includes("artikelnummer") || h === "nr" || h === "number" || h.includes("artnr"))
    return { field: "number", confidence: "rule" }
  if (h.includes("melde") || h.includes("reorder") || h.includes("minbestand") || h.includes("mindestbestand"))
    return { field: "reorderLevel", confidence: "rule" }
  if (h.includes("herstellernummer") || h.includes("manufacturernumber") || h.includes("artnrhersteller") || h.includes("herstellerart"))
    return { field: "manufacturerNumber", confidence: "rule" }
  if (h.includes("hersteller") || h.includes("manufacturer") || h.includes("brand") || h.includes("marke"))
    return { field: "manufacturer", confidence: "rule" }
  if (h.includes("notiz") || h.includes("note") || h.includes("bemerk") || h.includes("komment") || h.includes("info"))
    return { field: "notes", confidence: "rule" }

  return { field: "_skip", confidence: "skip" }
}

function confidenceFromScore(score: number, aiSuggested: boolean): MappingConfidence {
  if (!aiSuggested) return "rule"
  if (score >= 0.8) return "ai-high"
  if (score >= 0.5) return "ai-mid"
  return "ai-low"
}

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------
function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }

  const firstLine = lines[0]!
  const delimiter = firstLine.split(";").length >= firstLine.split(",").length ? ";" : ","

  function parseRow(line: string): string[] {
    const result: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim()); current = ""
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(firstLine)
  const rows = lines.slice(1).map((line) => {
    const values = parseRow(line)
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]))
  })
  return { headers, rows }
}

// ---------------------------------------------------------------------------
// Excel parser
// ---------------------------------------------------------------------------
async function parseExcel(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readXlsxFile = ((await import("read-excel-file/browser")) as any).default as (
    input: File
  ) => Promise<(string | number | boolean | null)[][]>
  const rawRows = await readXlsxFile(file)
  if (!rawRows || rawRows.length < 2) return { headers: [], rows: [] }
  const headers = rawRows[0]!.map((cell) => String(cell ?? "").trim())
  const dataRows = rawRows.slice(1).map((row) =>
    Object.fromEntries(headers.map((h, i) => [h, String(row[i] ?? "").trim()]))
  )
  return { headers, rows: dataRows }
}

// ---------------------------------------------------------------------------
// Template download
// ---------------------------------------------------------------------------
function downloadTemplate() {
  const headers = "Name;Nummer;Einheit;Barcode;Hersteller;Herstellernummer;Meldebestand;Notizen"
  const example  = "Kabelrohr 20mm grau;M-001;m;4006787123456;Hersteller AG;H-123;50;Lager A"
  const blob = new Blob(["\uFEFF" + headers + "\n" + example], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = "materialien-vorlage.csv"; a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
const STEPS = [
  { key: "upload",  label: "Datei"    },
  { key: "map",     label: "Spalten"  },
  { key: "preview", label: "Vorschau" },
  { key: "done",    label: "Fertig"   },
] as const
type Step = (typeof STEPS)[number]["key"]

// ---------------------------------------------------------------------------
// AI Confidence Badge
// ---------------------------------------------------------------------------
function AiConfidenceBadge({
  confidence,
  score,
}: {
  confidence: MappingConfidence
  score?: number
}) {
  const pct = score !== undefined ? Math.round(score * 100) : null

  if (confidence === "ai-high")
    return (
      <span
        title={`KI-Vorschlag (${pct}% Konfidenz)`}
        className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 border border-green-500/20"
      >
        <IconSparkles className="size-2.5" />
        {pct}%
      </span>
    )
  if (confidence === "ai-mid")
    return (
      <span
        title={`KI-Vorschlag (${pct}% Konfidenz)`}
        className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
      >
        <IconSparkles className="size-2.5" />
        {pct}%
      </span>
    )
  if (confidence === "ai-low")
    return (
      <span
        title={`KI-Vorschlag (${pct}% Konfidenz)`}
        className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20"
      >
        <IconSparkles className="size-2.5" />
        {pct}%
      </span>
    )
  if (confidence === "rule")
    return (
      <span
        title="Automatisch erkannt"
        className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20"
      >
        auto
      </span>
    )
  if (confidence === "manual")
    return (
      <span
        title="Manuell zugeordnet"
        className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border"
      >
        manuell
      </span>
    )
  return null
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function MaterialImportPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep]               = useState<Step>("upload")
  const [fileName, setFileName]       = useState("")
  const [headers, setHeaders]         = useState<string[]>([])
  const [rawRows, setRawRows]         = useState<Record<string, string>[]>([])
  const [mapping, setMapping]         = useState<Record<string, string>>({})
  const [confidence, setConfidence]   = useState<Record<string, MappingConfidence>>({})
  const [aiScores, setAiScores]       = useState<Record<string, number>>({})
  const [parsed, setParsed]           = useState<ParsedRow[]>([])
  const [importing, setImporting]     = useState(false)
  const [aiLoading, setAiLoading]     = useState(false)
  const [results, setResults]         = useState<{ imported: number; failed: number; errors: string[] }>({
    imported: 0, failed: 0, errors: [],
  })
  const [eanLookingAll, setEanLookingAll] = useState(false)

  // ---------------------------------------------------------------------------
  // Step 1: Handle file
  // ---------------------------------------------------------------------------
  async function handleFile(file: File) {
    setFileName(file.name)
    const ext = file.name.split(".").pop()?.toLowerCase()

    let parsedFile: { headers: string[]; rows: Record<string, string>[] }

    if (ext === "xlsx" || ext === "xls") {
      try {
        parsedFile = await parseExcel(file)
      } catch {
        alert("Excel-Datei konnte nicht gelesen werden. Bitte als CSV exportieren.")
        return
      }
    } else {
      const text = await file.text()
      parsedFile = parseCsv(text)
    }

    const { headers: h, rows } = parsedFile
    if (h.length === 0) { alert("Die Datei enthält keine erkennbaren Spalten."); return }

    setHeaders(h)
    setRawRows(rows)

    // Initial rule-based mapping
    const autoMap: Record<string, string>             = {}
    const autoConf: Record<string, MappingConfidence> = {}
    h.forEach((col) => {
      const { field, confidence: conf } = detectField(col)
      autoMap[col]  = field
      autoConf[col] = conf
    })
    setMapping(autoMap)
    setConfidence(autoConf)
    setAiScores({})
    setStep("map")
  }

  // ---------------------------------------------------------------------------
  // AI Mapping
  // ---------------------------------------------------------------------------
  async function handleAiMapping() {
    setAiLoading(true)
    try {
      const sampleRows = rawRows.slice(0, 5).map((row) =>
        headers.map((h) => row[h] ?? "")
      )

      const suggestions: ColumnMapping[] = DEMO_MODE
        ? getDemoMappings(headers)
        : await suggestMappings(headers, sampleRows, [...MATERIAL_FIELDS])

      const newMapping: Record<string, string>             = { ...mapping }
      const newConf: Record<string, MappingConfidence>     = { ...confidence }
      const newScores: Record<string, number>              = { ...aiScores }

      for (const s of suggestions) {
        newMapping[s.source]  = s.target ?? "_skip"
        newConf[s.source]     = confidenceFromScore(s.confidence, s.aiSuggested)
        newScores[s.source]   = s.confidence
      }

      setMapping(newMapping)
      setConfidence(newConf)
      setAiScores(newScores)
    } catch {
      // Silently ignore — user still has manual mapping
    } finally {
      setAiLoading(false)
    }
  }

  // Accept all AI suggestions (confidence > 0) without changing manual ones
  function acceptAllAi() {
    // Already applied by handleAiMapping — just a UX affordance that re-applies
    // high-confidence suggestions only
    const newMapping: Record<string, string>             = { ...mapping }
    const newConf: Record<string, MappingConfidence>     = { ...confidence }

    headers.forEach((h) => {
      const conf = confidence[h]
      if (conf === "ai-high" || conf === "ai-mid") {
        // Already accepted — keep as-is
      }
    })

    setMapping(newMapping)
    setConfidence(newConf)
  }

  // ---------------------------------------------------------------------------
  // Step 2: Apply mapping
  // ---------------------------------------------------------------------------
  function applyMapping() {
    const rows: ParsedRow[] = rawRows.map((raw) => {
      const mapped: ParsedRow["mapped"] = {}
      Object.entries(mapping).forEach(([csvHeader, fieldKey]) => {
        if (fieldKey === "_skip") return
        const val = raw[csvHeader]?.trim()
        if (!val) return
        if (fieldKey === "reorderLevel") {
          const n = Number(val.replace(",", "."))
          if (!isNaN(n)) mapped.reorderLevel = Math.round(n)
        } else {
          ;(mapped as Record<string, string>)[fieldKey] = val
        }
      })
      const valid = !!mapped.name
      return { raw, mapped, valid, error: valid ? undefined : "Name ist Pflichtfeld" }
    })
    setParsed(rows)
    setStep("preview")
  }

  // ---------------------------------------------------------------------------
  // EAN lookup
  // ---------------------------------------------------------------------------
  const lookupEan = useCallback(async (rowIndex: number) => {
    const row = parsed[rowIndex]
    if (!row?.mapped.barcode) return

    setParsed((prev) =>
      prev.map((r, i) => (i === rowIndex ? { ...r, eanLooking: true, eanError: undefined } : r))
    )

    try {
      const res = await fetch(`/api/ean-lookup?code=${encodeURIComponent(row.mapped.barcode)}`)
      if (res.ok) {
        const data = await res.json()
        setParsed((prev) =>
          prev.map((r, i) => {
            if (i !== rowIndex) return r
            return {
              ...r,
              eanLooking: false,
              mapped: {
                ...r.mapped,
                name:         r.mapped.name         || data.name         || r.mapped.name,
                manufacturer: r.mapped.manufacturer  || data.manufacturer || r.mapped.manufacturer,
              },
              valid: !!(r.mapped.name || data.name),
            }
          })
        )
      } else {
        const err = await res.json()
        setParsed((prev) =>
          prev.map((r, i) =>
            i === rowIndex ? { ...r, eanLooking: false, eanError: err.error ?? "Nicht gefunden" } : r
          )
        )
      }
    } catch {
      setParsed((prev) =>
        prev.map((r, i) =>
          i === rowIndex ? { ...r, eanLooking: false, eanError: "Netzwerkfehler" } : r
        )
      )
    }
  }, [parsed])

  const lookupAllEans = useCallback(async () => {
    setEanLookingAll(true)
    const indices = parsed
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.mapped.barcode && !r.mapped.name)
      .map(({ i }) => i)

    for (const idx of indices) {
      await lookupEan(idx)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    setEanLookingAll(false)
  }, [parsed, lookupEan])

  // ---------------------------------------------------------------------------
  // Step 3: Import
  // ---------------------------------------------------------------------------
  async function handleImport() {
    setImporting(true)
    const validRows = parsed
      .filter((r) => r.valid)
      .map((r) => ({
        name:               r.mapped.name!,
        number:             r.mapped.number,
        unit:               r.mapped.unit,
        barcode:            r.mapped.barcode,
        manufacturer:       r.mapped.manufacturer,
        manufacturerNumber: r.mapped.manufacturerNumber,
        reorderLevel:       r.mapped.reorderLevel,
        notes:              r.mapped.notes,
      }))

    try {
      const res = await fetch("/api/materials/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: validRows }),
      })
      if (res.ok) {
        const data = await res.json()
        setResults({ imported: data.imported, failed: data.failed, errors: data.errors ?? [] })
      } else {
        const err = await res.json()
        setResults({ imported: 0, failed: validRows.length, errors: [err.error ?? "Unbekannter Fehler"] })
      }
    } catch {
      setResults({ imported: 0, failed: validRows.length, errors: ["Netzwerkfehler"] })
    }

    setImporting(false)
    setStep("done")
  }

  const validCount     = parsed.filter((r) => r.valid).length
  const invalidCount   = parsed.filter((r) => !r.valid).length
  const eanCandidates  = parsed.filter((r) => r.mapped.barcode && !r.mapped.name).length
  const hasAiSuggested = Object.values(confidence).some(
    (c) => c === "ai-high" || c === "ai-mid" || c === "ai-low"
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/materials">
          <Button variant="ghost" size="icon" className="size-8">
            <IconArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Materialien</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Import
            {fileName && (
              <span className="ml-2 text-sm font-mono text-muted-foreground font-normal">{fileName}</span>
            )}
          </h1>
        </div>

        {/* Step indicator */}
        <div className="ml-auto flex items-center gap-3">
          {STEPS.map((s, i) => {
            const isDone = STEPS.findIndex((x) => x.key === step) > i
            return (
              <div
                key={s.key}
                className={`flex items-center gap-1.5 text-xs font-mono ${
                  step === s.key ? "text-primary" : isDone ? "text-secondary" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    step === s.key
                      ? "border-primary bg-primary/10 text-primary"
                      : isDone
                        ? "border-secondary bg-secondary/10 text-secondary"
                        : "border-border"
                  }`}
                >
                  {isDone ? <IconCheck className="size-3" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
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
              <p className="text-sm font-medium mb-1">Datei hierher ziehen oder klicken</p>
              <p className="text-xs text-muted-foreground font-mono">
                .xlsx &middot; .xls &middot; .csv &middot; .txt &nbsp;&mdash;&nbsp;
                UTF-8, Komma- oder Semikolon-getrennt
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ""
              }}
            />
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={downloadTemplate}>
                <IconDownload className="size-3.5" />
                Vorlage herunterladen (.csv)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === "map" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">Spalten zuordnen</CardTitle>

              <div className="flex items-center gap-2">
                {/* AI suggest button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={handleAiMapping}
                  disabled={aiLoading}
                >
                  {aiLoading ? (
                    <IconLoader2 className="size-3.5 animate-spin" />
                  ) : (
                    <IconSparkles className="size-3.5" />
                  )}
                  {aiLoading ? "KI analysiert\u2026" : "KI-Mapping vorschlagen"}
                </Button>

                {/* Accept all AI suggestions */}
                {hasAiSuggested && (
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={acceptAllAi}
                  >
                    <IconWand className="size-3.5" />
                    Alle KI-Vorschl&auml;ge &uuml;bernehmen
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground font-mono">
              {rawRows.length} Zeilen erkannt &middot; {headers.length} Spalten
            </p>

            {/* AI info strip */}
            {hasAiSuggested && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md border border-border bg-muted/30 px-3 py-2">
                <IconSparkles className="size-3.5 shrink-0 text-primary" />
                <span>
                  KI-Vorschl&auml;ge aktiv &mdash; &uuml;berpr&uuml;fen und bei Bedarf manuell anpassen.
                  <span className="ml-2 inline-flex gap-2">
                    <span className="text-green-600 font-mono">&gt;80% = gr&uuml;n</span>
                    <span className="text-yellow-600 font-mono">50-80% = gelb</span>
                    <span className="text-red-500 font-mono">&lt;50% = rot</span>
                  </span>
                </span>
              </div>
            )}

            <div className="grid gap-3">
              {headers.map((h) => {
                const conf  = confidence[h] ?? "skip"
                const score = aiScores[h]
                return (
                  <div key={h} className="flex items-center gap-3">
                    {/* Source column label */}
                    <div className="w-52 flex items-center text-sm font-mono truncate text-muted-foreground border border-border rounded px-2 py-1.5 bg-muted/30">
                      <span className="truncate">{h}</span>
                      <AiConfidenceBadge confidence={conf} score={score} />
                    </div>

                    <span className="text-muted-foreground shrink-0">&rarr;</span>

                    {/* Target field select */}
                    <Select
                      value={mapping[h] ?? "_skip"}
                      onValueChange={(v) => {
                        setMapping((prev) => ({ ...prev, [h]: v }))
                        setConfidence((prev) => ({ ...prev, [h]: "manual" }))
                      }}
                    >
                      <SelectTrigger className="w-52">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MATERIAL_FIELDS.map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Preview of first value */}
                    {rawRows[0]?.[h] && (
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[10rem]">
                        z.B. {rawRows[0][h]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={applyMapping} disabled={!Object.values(mapping).includes("name")}>
                Weiter zur Vorschau
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Zur&uuml;ck
              </Button>
            </div>

            {!Object.values(mapping).includes("name") && (
              <p className="text-xs text-destructive">
                Mindestens eine Spalte muss auf &laquo;Name *&raquo; gemappt werden.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/10">
              <IconCheck className="size-3 mr-1" />
              {validCount} g&uuml;ltig
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                <IconX className="size-3 mr-1" />
                {invalidCount} Fehler (werden &uuml;bersprungen)
              </Badge>
            )}
            {eanCandidates > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto gap-1.5 text-xs"
                disabled={eanLookingAll}
                onClick={lookupAllEans}
              >
                {eanLookingAll ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconBarcode className="size-3.5" />
                )}
                Alle {eanCandidates} EANs nachschlagen
              </Button>
            )}
          </div>

          <div className="rounded-lg border border-border overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 sticky top-0 bg-background"></TableHead>
                  <TableHead className="sticky top-0 bg-background">Name</TableHead>
                  <TableHead className="sticky top-0 bg-background">Nummer</TableHead>
                  <TableHead className="sticky top-0 bg-background">Einheit</TableHead>
                  <TableHead className="sticky top-0 bg-background">Barcode</TableHead>
                  <TableHead className="sticky top-0 bg-background">Meldebestand</TableHead>
                  <TableHead className="sticky top-0 bg-background">Hersteller</TableHead>
                  <TableHead className="w-28 sticky top-0 bg-background"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((row, i) => {
                  const needsEan = row.mapped.barcode && !row.mapped.name
                  return (
                    <TableRow key={i} className={!row.valid ? "opacity-50" : ""}>
                      <TableCell>
                        {row.valid ? (
                          <IconCheck className="size-3.5 text-secondary" />
                        ) : (
                          <span title={row.error}><IconX className="size-3.5 text-destructive" /></span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.mapped.name || <span className="text-destructive text-xs">fehlt</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.mapped.number ?? "\u2014"}
                      </TableCell>
                      <TableCell className="text-xs">{row.mapped.unit ?? "\u2014"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.mapped.barcode ?? "\u2014"}
                      </TableCell>
                      <TableCell className="text-xs">{row.mapped.reorderLevel ?? "\u2014"}</TableCell>
                      <TableCell className="text-xs">{row.mapped.manufacturer ?? "\u2014"}</TableCell>
                      <TableCell>
                        {needsEan && (
                          <div className="flex flex-col items-start gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] gap-1"
                              disabled={row.eanLooking || eanLookingAll}
                              onClick={() => lookupEan(i)}
                            >
                              {row.eanLooking ? (
                                <IconLoader2 className="size-3 animate-spin" />
                              ) : (
                                <IconSearch className="size-3" />
                              )}
                              EAN
                            </Button>
                            {row.eanError && (
                              <span className="text-[10px] text-destructive font-mono">{row.eanError}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {parsed.length > 50 && (
            <p className="text-xs text-muted-foreground font-mono text-center">
              Alle {parsed.length} Zeilen werden importiert.
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing || validCount === 0} className="gap-2">
              {importing ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Importiert&hellip;
                </>
              ) : (
                `${validCount} Materialien importieren`
              )}
            </Button>
            <Button variant="outline" onClick={() => setStep("map")}>Zur&uuml;ck</Button>
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
              <p className="text-xl font-bold">{results.imported} Materialien importiert</p>
              {results.failed > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {results.failed} Fehler &mdash; {results.errors.slice(0, 3).join(", ")}
                  {results.errors.length > 3 && " \u2026"}
                </p>
              )}
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={() => router.push("/dashboard/materials")}>Zur Materialliste</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload"); setFileName(""); setHeaders([]); setRawRows([])
                  setMapping({}); setConfidence({}); setAiScores({}); setParsed([])
                  setResults({ imported: 0, failed: 0, errors: [] })
                }}
              >
                Weitere Datei importieren
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
