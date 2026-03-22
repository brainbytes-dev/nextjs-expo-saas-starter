"use client"

import { useTranslations } from "next-intl"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconUpload,
  IconFileSpreadsheet,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconSparkles,
  IconArrowLeft,
  IconArrowRight,
  IconDownload,
  IconPackage,
  IconTool,
  IconTruck,
  IconMapPin,
  IconLoader2,
} from "@tabler/icons-react"
import { parseCSV, type ParsedCSV } from "@/lib/csv-parser"
import {
  getTargetFields,
  autoMapColumns,
  getEntityLabel,
  type EntityType,
  type TargetField,
} from "@/lib/migration/templates"

// ─── Types ──────────────────────────────────────────────────────────────────

interface ValidationRow {
  rowIndex: number
  data: Record<string, string>
  status: "ok" | "warning" | "error"
  message?: string
}

interface ImportResult {
  imported: number
  skipped: number
  errors: { row: number; error: string }[]
}

const ENTITY_OPTIONS = [
  { value: "materials" as EntityType, label: t("materials"), icon: IconPackage },
  { value: "tools" as EntityType, label: t("tools"), icon: IconTool },
  { value: "suppliers" as EntityType, label: t("suppliers"), icon: IconTruck },
  { value: "locations" as EntityType, label: t("locations"), icon: IconMapPin },
]

// ─── Component ──────────────────────────────────────────────────────────────

export default function ImportPage() {
  const t = useTranslations("importPage")
  const router = useRouter()

  // Wizard state
  const [step, setStep] = useState(1)
  const [entityType, setEntityType] = useState<EntityType>("materials")

  // Step 1: Upload
  const [parsed, setParsed] = useState<ParsedCSV | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [dragOver, setDragOver] = useState(false)

  // Step 2: Mapping
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Step 3: Validation
  const [validationRows, setValidationRows] = useState<ValidationRow[]>([])
  const [duplicateAction, setDuplicateAction] = useState<"skip" | "update">("skip")

  // Step 4: Import
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const targetFields = useMemo(() => getTargetFields(entityType), [entityType])

  // ── File handling ─────────────────────────────────────────────────────────

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const result = parseCSV(text)
        setParsed(result)

        // Auto-map columns
        if (result.headers.length > 0) {
          const autoMap = autoMapColumns(result.headers, entityType)
          setMapping(autoMap)
        }
      }
      reader.readAsText(file, "utf-8")
    },
    [entityType]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".txt"))) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  // ── AI Mapping ────────────────────────────────────────────────────────────

  const requestAiMapping = async () => {
    if (!parsed) return
    setAiLoading(true)
    setAiError(null)

    try {
      const res = await fetch("/api/import/ai-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columns: parsed.headers,
          sampleRows: parsed.rows.slice(0, 3),
          entityType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setAiError(data.error || t("aiMappingFailed"))
        return
      }

      const data = await res.json()
      if (data.mapping) {
        setMapping(data.mapping)
      }
    } catch {
      setAiError(t("networkError"))
    } finally {
      setAiLoading(false)
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────

  const runValidation = useCallback(() => {
    if (!parsed) return

    const rows: ValidationRow[] = parsed.rows.map((row, i) => {
      const data: Record<string, string> = {}
      parsed.headers.forEach((h, j) => {
        data[h] = row[j] ?? ""
      })

      // Check if name is mapped and present
      const nameCol = Object.entries(mapping).find(([, target]) => target === "name")?.[0]
      const nameVal = nameCol ? data[nameCol] : undefined

      if (!nameVal?.trim()) {
        return { rowIndex: i, data, status: "error" as const, message: t("nameMissing") }
      }

      // Check for numeric fields
      const minStockCol = Object.entries(mapping).find(([, target]) => target === "mindestbestand")?.[0]
      if (minStockCol && data[minStockCol] && isNaN(Number(data[minStockCol]))) {
        return { rowIndex: i, data, status: "error" as const, message: t("minStockNotNumber") }
      }

      return { rowIndex: i, data, status: "ok" as const }
    })

    setValidationRows(rows)
  }, [parsed, mapping])

  // ── Import ────────────────────────────────────────────────────────────────

  const runImport = async () => {
    if (!parsed) return
    setImporting(true)
    setImportProgress(0)

    // Build row objects from mapping
    const rows = parsed.rows.map((row) => {
      const obj: Record<string, string> = {}
      parsed.headers.forEach((h, j) => {
        obj[h] = row[j] ?? ""
      })
      return obj
    })

    // Filter out error rows
    const validRows = rows.filter((_, i) => {
      const vr = validationRows[i]
      return !vr || vr.status !== "error"
    })

    // Simulate progress while importing
    const progressInterval = setInterval(() => {
      setImportProgress((p) => Math.min(p + 5, 90))
    }, 200)

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          rows: validRows,
          mapping,
          duplicateAction,
        }),
      })

      clearInterval(progressInterval)
      setImportProgress(100)

      if (!res.ok) {
        const data = await res.json()
        setImportResult({
          imported: 0,
          skipped: 0,
          errors: [{ row: 0, error: data.error || t("importFailed") }],
        })
        return
      }

      const result = await res.json()
      setImportResult(result)
    } catch {
      clearInterval(progressInterval)
      setImportResult({
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, error: t("networkError") }],
      })
    } finally {
      setImporting(false)
    }
  }

  // ── Import log download ───────────────────────────────────────────────────

  const downloadLog = () => {
    if (!importResult) return
    const lines = [
      `Import-Log — ${new Date().toLocaleString("de-CH")}`,
      `Typ: ${getEntityLabel(entityType)}`,
      `Datei: ${fileName}`,
      ``,
      `Importiert: ${importResult.imported}`,
      `Übersprungen: ${importResult.skipped}`,
      `Fehler: ${importResult.errors.length}`,
      ``,
    ]

    if (importResult.errors.length > 0) {
      lines.push("Fehlerliste:")
      for (const err of importResult.errors) {
        lines.push(`  Zeile ${err.row}: ${err.error}`)
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `import-log_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Step navigation ───────────────────────────────────────────────────────

  const canProceed = () => {
    switch (step) {
      case 1:
        return parsed && parsed.headers.length > 0
      case 2:
        return Object.values(mapping).includes("name")
      case 3:
        return validationRows.some((r) => r.status !== "error")
      default:
        return false
    }
  }

  const goNext = () => {
    if (step === 2) {
      runValidation()
    }
    if (step === 3) {
      runImport()
    }
    setStep((s) => Math.min(s + 1, 4))
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const ok = validationRows.filter((r) => r.status === "ok").length
    const warnings = validationRows.filter((r) => r.status === "warning").length
    const errors = validationRows.filter((r) => r.status === "error").length
    return { ok, warnings, errors }
  }, [validationRows])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("description")}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
          <IconArrowLeft className="size-4 mr-2" />
          Zurück
        </Button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[
          { num: 1, label: t("stepUpload") },
          { num: 2, label: t("stepMapping") },
          { num: 3, label: t("stepValidation") },
          { num: 4, label: t("stepImport") },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-border" />}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                step === s.num
                  ? "bg-primary text-primary-foreground"
                  : step > s.num
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s.num ? (
                <IconCheck className="size-3.5" />
              ) : (
                <span>{s.num}</span>
              )}
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("uploadFile")}</CardTitle>
              <CardDescription>
                {t("uploadDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Entity type selection */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">
                  {t("whatToImport")}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ENTITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setEntityType(opt.value)
                        if (parsed) {
                          const autoMap = autoMapColumns(parsed.headers, opt.value)
                          setMapping(autoMap)
                        }
                      }}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                        entityType === opt.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <opt.icon className="size-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : parsed
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/30"
                }`}
              >
                {parsed ? (
                  <>
                    <IconFileSpreadsheet className="size-10 text-primary mb-3" />
                    <p className="text-sm font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {parsed.headers.length} Spalten, {parsed.rows.length} Zeilen erkannt
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setParsed(null)
                        setFileName("")
                        setMapping({})
                      }}
                    >
                      Andere Datei
                    </Button>
                  </>
                ) : (
                  <>
                    <IconUpload className="size-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">
                      {t("dropFile")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      {t("dropFormats")}
                    </p>
                    <label>
                      <Button variant="outline" size="sm" asChild>
                        <span>{t("selectFile")}</span>
                      </Button>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".csv,.txt,.xls,.xlsx"
                        onChange={handleFileInput}
                      />
                    </label>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {parsed && parsed.rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("previewTitle")}</CardTitle>
                <CardDescription>
                  Erste {Math.min(5, parsed.rows.length)} Zeilen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto max-h-80">
                  <table className="text-xs w-full">
                    <thead>
                      <tr>
                        {parsed.headers.map((h) => (
                          <th
                            key={h}
                            className="text-left px-2 py-1.5 font-medium text-muted-foreground whitespace-nowrap border-b"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className="px-2 py-1.5 whitespace-nowrap max-w-32 truncate"
                            >
                              {cell || <span className="text-muted-foreground">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && parsed && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("columnMapping")}</CardTitle>
                <CardDescription>
                  {t("columnMappingDesc")}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={requestAiMapping}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <IconLoader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <IconSparkles className="size-4 mr-2" />
                )}
                KI-Mapping vorschlagen
              </Button>
            </div>
            {aiError && (
              <p className="text-sm text-destructive mt-2">{aiError}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {parsed.headers.map((header) => (
                <div
                  key={header}
                  className="flex items-center gap-4 rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{header}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      z.B. {parsed.rows[0]?.[parsed.headers.indexOf(header)] || "—"}
                    </p>
                  </div>
                  <IconArrowRight className="size-4 text-muted-foreground shrink-0" />
                  <div className="w-52">
                    <Select
                      value={mapping[header] || "__none__"}
                      onValueChange={(val) => {
                        setMapping((prev) => {
                          const next = { ...prev }
                          if (val === "__none__") {
                            delete next[header]
                          } else {
                            next[header] = val
                          }
                          return next
                        })
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={t("doNotMap")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground">{t("doNotMap")}</span>
                        </SelectItem>
                        {targetFields.map((field: TargetField) => (
                          <SelectItem key={field.key} value={field.key}>
                            {field.label}
                            {field.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            {/* Mapping summary */}
            <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                {Object.keys(mapping).length} von {parsed.headers.length} Spalten
                zugeordnet
              </span>
              {!Object.values(mapping).includes("name") && (
                <Badge variant="destructive" className="text-xs">
                  Pflichtfeld &quot;Name&quot; nicht zugeordnet
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Validation */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-500/10 p-2">
                    <IconCheck className="size-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.ok}</p>
                    <p className="text-xs text-muted-foreground">{t("newEntries")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-yellow-500/10 p-2">
                    <IconAlertTriangle className="size-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.warnings}</p>
                    <p className="text-xs text-muted-foreground">{t("duplicates")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-red-500/10 p-2">
                    <IconX className="size-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.errors}</p>
                    <p className="text-xs text-muted-foreground">{t("errors")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Duplicate handling */}
          {stats.warnings > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <p className="text-sm font-medium">{t("handleDuplicates")}</p>
                  <div className="flex gap-2">
                    <Button
                      variant={duplicateAction === "skip" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDuplicateAction("skip")}
                    >
                      Überspringen
                    </Button>
                    <Button
                      variant={duplicateAction === "update" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDuplicateAction("update")}
                    >
                      Aktualisieren
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("validationResult")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-12">#</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-20">Status</th>
                      {parsed?.headers
                        .filter((h) => mapping[h])
                        .map((h) => (
                          <th
                            key={h}
                            className="text-left px-3 py-2 text-xs font-medium text-muted-foreground"
                          >
                            {h}
                          </th>
                        ))}
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Hinweis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationRows.slice(0, 100).map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={`border-b border-border/50 ${
                          row.status === "error"
                            ? "bg-red-50 dark:bg-red-950/20"
                            : row.status === "warning"
                              ? "bg-yellow-50 dark:bg-yellow-950/20"
                              : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {row.rowIndex + 1}
                        </td>
                        <td className="px-3 py-2">
                          {row.status === "ok" && (
                            <IconCheck className="size-4 text-green-600" />
                          )}
                          {row.status === "warning" && (
                            <IconAlertTriangle className="size-4 text-yellow-600" />
                          )}
                          {row.status === "error" && (
                            <IconX className="size-4 text-red-600" />
                          )}
                        </td>
                        {parsed?.headers
                          .filter((h) => mapping[h])
                          .map((h) => (
                            <td
                              key={h}
                              className="px-3 py-2 text-xs max-w-32 truncate"
                            >
                              {row.data[h] || "—"}
                            </td>
                          ))}
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {row.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validationRows.length > 100 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    ... und {validationRows.length - 100} weitere Zeilen
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Import */}
      {step === 4 && (
        <Card>
          <CardContent className="pt-6">
            {importing && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <IconLoader2 className="size-5 animate-spin text-primary" />
                  <p className="text-sm font-medium">
                    Importiere {getEntityLabel(entityType)}...
                  </p>
                </div>
                <Progress value={importProgress} />
                <p className="text-xs text-muted-foreground">
                  {importProgress}% abgeschlossen
                </p>
              </div>
            )}

            {!importing && importResult && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  {importResult.errors.length === 0 ? (
                    <>
                      <div className="rounded-full bg-green-500/10 p-3">
                        <IconCheck className="size-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{t("importDone")}</p>
                        <p className="text-sm text-muted-foreground">
                          {importResult.imported} importiert, {importResult.skipped} übersprungen
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full bg-yellow-500/10 p-3">
                        <IconAlertTriangle className="size-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{t("importWithNotes")}</p>
                        <p className="text-sm text-muted-foreground">
                          {importResult.imported} importiert, {importResult.skipped} übersprungen,{" "}
                          {importResult.errors.length} Fehler
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Error list */}
                {importResult.errors.length > 0 && (
                  <div className="rounded-lg border border-destructive/20 p-4">
                    <p className="text-sm font-medium text-destructive mb-2">
                      Fehler ({importResult.errors.length})
                    </p>
                    <ul className="space-y-1">
                      {importResult.errors.slice(0, 20).map((err, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          Zeile {err.row}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={downloadLog}>
                    <IconDownload className="size-4 mr-2" />
                    Importlog herunterladen
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      router.push(
                        `/dashboard/${entityType === "materials" ? "materials" : entityType}`
                      )
                    }
                  >
                    Zu {getEntityLabel(entityType)}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep(1)
                      setParsed(null)
                      setFileName("")
                      setMapping({})
                      setValidationRows([])
                      setImportResult(null)
                      setImportProgress(0)
                    }}
                  >
                    Neuen Import starten
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      {step < 4 && (
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
          >
            <IconArrowLeft className="size-4 mr-2" />
            Zurück
          </Button>
          <Button disabled={!canProceed()} onClick={goNext}>
            {step === 3 ? t("stepImport") : t("next")}
            <IconArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
