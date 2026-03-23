"use client"

import { useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  IconFileSpreadsheet,
  IconCheck,
  IconX,
  IconArrowLeft,
  IconDownload,
  IconLoader2,
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

type MappingConfidence = "ai-high" | "ai-mid" | "ai-low" | "rule" | "manual" | "skip"

// ---------------------------------------------------------------------------
// Valid condition values accepted by the API
// ---------------------------------------------------------------------------
const CONDITION_MAP: Record<string, string> = {
  gut: "good", good: "good",
  beschaedigt: "damaged", beschädigt: "damaged", damaged: "damaged",
  reparatur: "repair", repair: "repair",
  ausgemustert: "decommissioned", decommissioned: "decommissioned",
}

// ---------------------------------------------------------------------------
// Rule-based auto-detect (initial mapping before AI)
// ---------------------------------------------------------------------------
function detectField(header: string): { field: string; confidence: MappingConfidence } {
  const lower = header.toLowerCase().replace(/[^a-zäöü]/g, "")

  if (lower.includes("name") || lower.includes("bezeichnung")) return { field: "name", confidence: "rule" }
  if (lower.includes("nummer") || lower.includes("number"))     return { field: "number", confidence: "rule" }
  if (lower.includes("hersteller") || lower.includes("manufacturer")) return { field: "manufacturer", confidence: "rule" }
  if (lower.includes("seriennummer") || lower.includes("serial"))     return { field: "serialNumber", confidence: "rule" }
  if (lower.includes("zustand") || lower.includes("condition"))       return { field: "condition", confidence: "rule" }
  if (lower.includes("notiz") || lower.includes("note") || lower.includes("bemerk")) return { field: "notes", confidence: "rule" }

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

  function parseRow(line: string): string[] {
    const result: string[] = []
    let current = ""; let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if ((ch === "," || ch === ";") && !inQuotes) {
        result.push(current.trim()); current = ""
      } else { current += ch }
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
// Template download
// ---------------------------------------------------------------------------
function downloadTemplate() {
  const headers = "Name;Nummer;Hersteller;Seriennummer;Zustand;Notizen"
  const example  = "Bohrmaschine Hilti TE 6;WZ-001;Hilti;SN-12345;gut;Hauptlager"
  const blob = new Blob(["\uFEFF" + headers + "\n" + example], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = "werkzeuge-vorlage.csv"; a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// AI Confidence Badge
// ---------------------------------------------------------------------------
function AiConfidenceBadge({
  confidence,
  score,
  t,
}: {
  confidence: MappingConfidence
  score?: number
  t: (key: string) => string
}) {
  const pct = score !== undefined ? Math.round(score * 100) : null

  if (confidence === "ai-high")
    return (
      <span
        title={`${t("aiSuggestion")} (${pct}% ${t("confidence")})`}
        className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 border border-green-500/20"
      >
        <IconSparkles className="size-2.5" />
        {pct}%
      </span>
    )
  if (confidence === "ai-mid")
    return (
      <span
        title={`${t("aiSuggestion")} (${pct}% ${t("confidence")})`}
        className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
      >
        <IconSparkles className="size-2.5" />
        {pct}%
      </span>
    )
  if (confidence === "ai-low")
    return (
      <span
        title={`${t("aiSuggestion")} (${pct}% ${t("confidence")})`}
        className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20"
      >
        <IconSparkles className="size-2.5" />
        {pct}%
      </span>
    )
  if (confidence === "rule")
    return (
      <span
        title={t("autoDetected")}
        className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20"
      >
        auto
      </span>
    )
  if (confidence === "manual")
    return (
      <span
        title={t("manuallyMapped")}
        className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border"
      >
        {t("manuallyMapped")}
      </span>
    )
  return null
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function ToolImportPage() {
  const t = useTranslations("toolImport")
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const TOOL_FIELDS = [
    { key: "name",         label: t("fieldName"),         required: true  },
    { key: "number",       label: t("fieldNumber"),       required: false },
    { key: "manufacturer", label: t("fieldManufacturer"), required: false },
    { key: "serialNumber", label: t("fieldSerialNumber"), required: false },
    { key: "condition",    label: t("fieldCondition"),    required: false },
    { key: "notes",        label: t("fieldNotes"),        required: false },
    { key: "_skip",        label: t("fieldSkip"),         required: false },
  ] as const

  const STEPS = [
    { key: "upload",  label: t("stepFile")    },
    { key: "map",     label: t("stepColumns") },
    { key: "preview", label: t("stepPreview") },
    { key: "done",    label: t("stepDone")    },
  ] as const
  type Step = (typeof STEPS)[number]["key"]

  const [step, setStep]             = useState<Step>("upload")
  const [fileName, setFileName]     = useState("")
  const [headers, setHeaders]       = useState<string[]>([])
  const [rawRows, setRawRows]       = useState<Record<string, string>[]>([])
  const [mapping, setMapping]       = useState<Record<string, string>>({})
  const [confidence, setConfidence] = useState<Record<string, MappingConfidence>>({})
  const [aiScores, setAiScores]     = useState<Record<string, number>>({})
  const [parsed, setParsed]         = useState<ParsedRow[]>([])
  const [importing, setImporting]   = useState(false)
  const [aiLoading, setAiLoading]   = useState(false)
  const [results, setResults]       = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0, failed: 0, errors: [],
  })

  // ---------------------------------------------------------------------------
  // Step 1: Handle file
  // ---------------------------------------------------------------------------
  function handleFile(file: File) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers: h, rows } = parseCsv(text)
      setHeaders(h)
      setRawRows(rows)

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
    reader.readAsText(file, "UTF-8")
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

      const suggestions: ColumnMapping[] = await suggestMappings(headers, sampleRows, [...TOOL_FIELDS])

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
      // Silently ignore
    } finally {
      setAiLoading(false)
    }
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
        if (fieldKey === "condition") {
          mapped.condition = CONDITION_MAP[val.toLowerCase()] ?? val.toLowerCase()
        } else {
          ;(mapped as Record<string, string>)[fieldKey] = val
        }
      })
      const valid = !!mapped.name
      return { raw, mapped, valid, error: valid ? undefined : t("nameIsMandatory") }
    })
    setParsed(rows)
    setStep("preview")
  }

  // ---------------------------------------------------------------------------
  // Step 3: Import
  // ---------------------------------------------------------------------------
  async function handleImport() {
    setImporting(true)
    let success = 0; let failed = 0; const errors: string[] = []

    for (const row of parsed.filter((r) => r.valid)) {
      try {
        const res = await fetch("/api/tools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name:         row.mapped.name,
            number:       row.mapped.number,
            manufacturer: row.mapped.manufacturer,
            serialNumber: row.mapped.serialNumber,
            condition:    row.mapped.condition,
            notes:        row.mapped.notes,
          }),
        })
        if (res.ok) { success++ } else { failed++; errors.push(`${row.mapped.name}: ${res.status}`) }
      } catch {
        failed++; errors.push(`${row.mapped.name}: ${t("networkError")}`)
      }
    }

    setResults({ success, failed, errors })
    setImporting(false)
    setStep("done")
  }

  const validCount     = parsed.filter((r) => r.valid).length
  const invalidCount   = parsed.filter((r) => !r.valid).length
  const hasAiSuggested = Object.values(confidence).some(
    (c) => c === "ai-high" || c === "ai-mid" || c === "ai-low"
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
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
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{t("breadcrumb")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
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
              <p className="text-sm font-medium mb-1">{t("dropzone")}</p>
              <p className="text-xs text-muted-foreground font-mono">{t("dropzoneHint")}</p>
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
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={downloadTemplate}>
                <IconDownload className="size-3.5" />
                {t("downloadTemplate")}
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
              <CardTitle className="text-base">{t("mapColumns")}</CardTitle>
              <div className="flex items-center gap-2">
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
                  {aiLoading ? t("aiAnalyzing") : t("aiMapping")}
                </Button>
                {hasAiSuggested && (
                  <Button size="sm" className="gap-1.5 text-xs" onClick={() => {}}>
                    <IconWand className="size-3.5" />
                    {t("acceptAllAi")}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground font-mono">
              {t("rowsDetected", { rows: String(rawRows.length) })} &middot; {t("columnsDetected", { cols: String(headers.length) })}
            </p>

            {hasAiSuggested && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md border border-border bg-muted/30 px-3 py-2">
                <IconSparkles className="size-3.5 shrink-0 text-primary" />
                <span>
                  {t("aiActive")}
                  <span className="ml-2 inline-flex gap-2">
                    <span className="text-green-600 font-mono">{t("aiConfGreen")}</span>
                    <span className="text-yellow-600 font-mono">{t("aiConfYellow")}</span>
                    <span className="text-red-500 font-mono">{t("aiConfRed")}</span>
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
                    <div className="w-48 flex items-center text-sm font-mono truncate text-muted-foreground border border-border rounded px-2 py-1.5 bg-muted/30">
                      <span className="truncate">{h}</span>
                      <AiConfidenceBadge confidence={conf} score={score} t={t} />
                    </div>
                    <span className="text-muted-foreground">&rarr;</span>
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
                        {TOOL_FIELDS.map((f) => (
                          <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {rawRows[0]?.[h] && (
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[10rem]">
                        {t("example")} {rawRows[0][h]}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={applyMapping} disabled={!Object.values(mapping).includes("name")}>
                {t("continuePreview")}
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")}>{t("back")}</Button>
            </div>

            {!Object.values(mapping).includes("name") && (
              <p className="text-xs text-destructive">
                {t("nameRequired")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/10">
              <IconCheck className="size-3 mr-1" />
              {validCount} {t("valid")}
            </Badge>
            {invalidCount > 0 && (
              <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                <IconX className="size-3 mr-1" />
                {invalidCount} {t("errorsSkipped")}
              </Badge>
            )}
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>{t("thName")}</TableHead>
                  <TableHead>{t("thNumber")}</TableHead>
                  <TableHead>{t("thManufacturer")}</TableHead>
                  <TableHead>{t("thSerialNumber")}</TableHead>
                  <TableHead>{t("thCondition")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.slice(0, 20).map((row, i) => (
                  <TableRow key={i} className={!row.valid ? "opacity-40" : ""}>
                    <TableCell>
                      {row.valid ? (
                        <IconCheck className="size-3.5 text-secondary" />
                      ) : (
                        <IconX className="size-3.5 text-destructive" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.mapped.name || <span className="text-destructive text-xs">{t("missing")}</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.mapped.number ?? "\u2014"}</TableCell>
                    <TableCell className="text-xs">{row.mapped.manufacturer ?? "\u2014"}</TableCell>
                    <TableCell className="font-mono text-xs">{row.mapped.serialNumber ?? "\u2014"}</TableCell>
                    <TableCell className="text-xs">{row.mapped.condition ?? "\u2014"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {parsed.length > 20 && (
            <p className="text-xs text-muted-foreground font-mono text-center">
              &hellip; {t("moreRows", { count: String(parsed.length - 20) })}
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? (
                <>
                  <IconLoader2 className="size-4 animate-spin mr-2" />
                  {t("importing")}
                </>
              ) : (
                t("importButton", { count: String(validCount) })
              )}
            </Button>
            <Button variant="outline" onClick={() => setStep("map")}>{t("back")}</Button>
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
              <p className="text-xl font-bold">{t("toolsImported", { count: String(results.success) })}</p>
              {results.failed > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t("failedCount", { count: String(results.failed) })} &mdash; {results.errors.slice(0, 3).join(", ")}
                </p>
              )}
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={() => router.push("/dashboard/tools")}>{t("toToolList")}</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload"); setFileName(""); setHeaders([]); setRawRows([])
                  setMapping({}); setConfidence({}); setAiScores({}); setParsed([])
                  setResults({ success: 0, failed: 0, errors: [] })
                }}
              >
                {t("importAnother")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
