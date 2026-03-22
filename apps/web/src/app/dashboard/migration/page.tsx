"use client"

import { useTranslations } from "next-intl"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  IconArrowLeft,
  IconArrowRight,
  IconFileSpreadsheet,
  IconCheck,
  IconDownload,
  IconLoader2,
  IconPackage,
  IconTruck,
  IconAlertTriangle,
  IconExternalLink,
} from "@tabler/icons-react"
import { BrandLogo } from "@/components/integrations/brand-logo"
import { generateTemplate, type EntityType, getEntityLabel } from "@/lib/migration/templates"

// ─── Types ──────────────────────────────────────────────────────────────────

type SourceSystem = "excel" | "bexio" | "proffix" | "sap" | "other"

interface BexioPreview {
  articles?: Array<{ name: string; number: string | null }>
  contacts?: Array<{ name: string; email: string | null }>
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MigrationPage() {
  const t = useTranslations("migrationPage")
  const router = useRouter()
  const [selectedSource, setSelectedSource] = useState<SourceSystem | null>(null)

  // bexio state
  const [bexioToken, setBexioToken] = useState("")
  const [bexioLoading, setBexioLoading] = useState(false)
  const [bexioError, setBexioError] = useState<string | null>(null)
  const [bexioPreview, setBexioPreview] = useState<BexioPreview | null>(null)
  const [bexioImporting, setBexioImporting] = useState(false)
  const [bexioResult, setBexioResult] = useState<Record<string, { imported: number; skipped: number }> | null>(null)
  const [bexioImportTypes, setBexioImportTypes] = useState<("articles" | "contacts")[]>(["articles", "contacts"])

  const SOURCE_SYSTEMS: {
    id: SourceSystem
    name: string
    short: string
    color: string
    desc: string
    status: "live" | "csv" | "soon"
  }[] = [
    {
      id: "excel",
      name: t("systemExcel"),
      short: "XLS",
      color: "#217346",
      desc: t("systemExcelDesc"),
      status: "live",
    },
    {
      id: "bexio",
      name: t("systemBexio"),
      short: "BX",
      color: "#0073E6",
      desc: t("systemBexioDesc"),
      status: "live",
    },
    {
      id: "proffix",
      name: t("systemProffix"),
      short: "PF",
      color: "#E30613",
      desc: t("systemProffixDesc"),
      status: "csv",
    },
    {
      id: "sap",
      name: t("systemSap"),
      short: "SAP",
      color: "#0FAAFF",
      desc: t("systemSapDesc"),
      status: "csv",
    },
    {
      id: "other",
      name: t("systemOther"),
      short: "?",
      color: "#666666",
      desc: t("systemOtherDesc"),
      status: "csv",
    },
  ]

  // ── CSV export instructions per system
  const EXPORT_INSTRUCTIONS: Record<string, { steps: string[]; tip: string }> = {
    proffix: {
      steps: [
        'Öffnen Sie PROFFIX Px5 und navigieren Sie zu "Stammdaten > Artikel"',
        'Wählen Sie "Datei > Exportieren > CSV-Export"',
        "Exportieren Sie Artikel, Adressen und Lagerorte als separate CSV-Dateien",
        "Laden Sie die CSV-Dateien in unseren Import-Assistenten hoch",
      ],
      tip: "PROFFIX exportiert standardmässig mit Semikolon als Trennzeichen — perfekt für unseren Import.",
    },
    sap: {
      steps: [
        'Öffnen Sie SAP Business One und gehen Sie zu "Lagerverwaltung > Artikelstammdaten"',
        'Nutzen Sie "Werkzeuge > Exportieren > Microsoft Excel"',
        "Speichern Sie die Excel-Datei als CSV (UTF-8)",
        "Wiederholen Sie den Vorgang für Geschäftspartner und Lagerorte",
        "Laden Sie die CSV-Dateien in unseren Import-Assistenten hoch",
      ],
      tip: "Achten Sie darauf, UTF-8 als Zeichensatz zu wählen, damit Umlaute korrekt importiert werden.",
    },
    other: {
      steps: [
        "Exportieren Sie Ihre Daten als CSV- oder Excel-Datei aus Ihrem aktuellen System",
        "Stellen Sie sicher, dass mindestens eine Spalte den Artikelnamen enthält",
        "Laden Sie die Datei in unseren Import-Assistenten hoch",
        "Unser KI-gestütztes Mapping erkennt die Spalten automatisch",
      ],
      tip: "Die meisten Systeme bieten unter 'Export' oder 'Berichte' eine CSV-Export-Option.",
    },
  }

  // ── bexio connection ──────────────────────────────────────────────────────

  const connectBexio = async () => {
    if (!bexioToken.trim()) return
    setBexioLoading(true)
    setBexioError(null)

    try {
      const res = await fetch("/api/migration/bexio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: bexioToken,
          importTypes: bexioImportTypes,
          action: "preview",
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setBexioError(data.error || t("connectionFailed"))
        return
      }

      const data = await res.json()
      setBexioPreview(data.preview)
    } catch {
      setBexioError(t("networkError"))
    } finally {
      setBexioLoading(false)
    }
  }

  const importBexio = async () => {
    setBexioImporting(true)
    setBexioError(null)

    try {
      const res = await fetch("/api/migration/bexio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: bexioToken,
          importTypes: bexioImportTypes,
          action: "import",
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setBexioError(data.error || t("importFailed"))
        return
      }

      const data = await res.json()
      setBexioResult(data.result)
    } catch {
      setBexioError(t("networkError"))
    } finally {
      setBexioImporting(false)
    }
  }

  // ── Template download ─────────────────────────────────────────────────────

  const downloadTemplate = (entityType: EntityType) => {
    const csv = generateTemplate(entityType)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `vorlage_${entityType}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (selectedSource) {
              setSelectedSource(null)
              setBexioPreview(null)
              setBexioResult(null)
              setBexioError(null)
            } else {
              router.push("/dashboard")
            }
          }}
        >
          <IconArrowLeft className="size-4 mr-2" />
          {selectedSource ? t("backToSelection") : t("back")}
        </Button>
      </div>

      {/* Step 1: Source selection */}
      {!selectedSource && (
        <>
          <div>
            <h2 className="text-lg font-semibold mb-1">
              {t("sourceQuestion")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("sourceDescription")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SOURCE_SYSTEMS.map((system) => (
              <Card
                key={system.id}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
                onClick={() => {
                  if (system.id === "excel") {
                    router.push("/dashboard/import")
                    return
                  }
                  setSelectedSource(system.id)
                }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <BrandLogo
                      name={system.name}
                      fallbackColor={system.color}
                      fallbackShort={system.short}
                      size={40}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{system.name}</h3>
                        {system.status === "live" && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            {t("direct")}
                          </Badge>
                        )}
                        {system.status === "csv" && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t("viaCsv")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {system.desc}
                      </p>
                    </div>
                    <IconArrowRight className="size-4 text-muted-foreground mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Template downloads */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("csvTemplates")}</CardTitle>
              <CardDescription>
                {t("csvTemplatesDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(["materials", "tools", "suppliers", "locations"] as EntityType[]).map(
                  (entity) => (
                    <Button
                      key={entity}
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate(entity)}
                    >
                      <IconDownload className="size-4 mr-2" />
                      {getEntityLabel(entity)}
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 2: bexio */}
      {selectedSource === "bexio" && (
        <div className="space-y-6">
          {!bexioPreview && !bexioResult && (
            <Card>
              <CardHeader>
                <CardTitle>{t("connectBexio")}</CardTitle>
                <CardDescription>
                  {t("bexioApiDesc")}{" "}
                  <a
                    href="https://office.bexio.com/index.php/admin/apiTokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {t("bexioSettings")}
                    <IconExternalLink className="size-3" />
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("apiToken")}
                  </label>
                  <Input
                    type="password"
                    placeholder={t("bexioTokenPlaceholder")}
                    value={bexioToken}
                    onChange={(e) => setBexioToken(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("whatToImportQ")}
                  </label>
                  <div className="flex gap-2">
                    {(["articles", "contacts"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setBexioImportTypes((prev) =>
                            prev.includes(type)
                              ? prev.filter((t) => t !== type)
                              : [...prev, type]
                          )
                        }}
                        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                          bexioImportTypes.includes(type)
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border"
                        }`}
                      >
                        {type === "articles" ? (
                          <IconPackage className="size-4" />
                        ) : (
                          <IconTruck className="size-4" />
                        )}
                        {type === "articles" ? t("articles") : t("contacts")}
                      </button>
                    ))}
                  </div>
                </div>

                {bexioError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <IconAlertTriangle className="size-4" />
                    {bexioError}
                  </div>
                )}

                <Button
                  onClick={connectBexio}
                  disabled={!bexioToken.trim() || bexioLoading}
                >
                  {bexioLoading ? (
                    <IconLoader2 className="size-4 mr-2 animate-spin" />
                  ) : null}
                  {t("connectPreview")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* bexio Preview */}
          {bexioPreview && !bexioResult && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("preview")}</CardTitle>
                  <CardDescription>
                    {t("previewDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {bexioPreview.articles && bexioPreview.articles.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <IconPackage className="size-4" />
                        {t("articles")} ({bexioPreview.articles.length})
                      </h3>
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                                {t("nameCol")}
                              </th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                                {t("number")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {bexioPreview.articles.slice(0, 10).map((a, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="px-3 py-2">{a.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {a.number || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {bexioPreview.articles.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            {t("andMore", { count: bexioPreview.articles.length - 10 })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {bexioPreview.contacts && bexioPreview.contacts.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <IconTruck className="size-4" />
                        {t("contacts")} ({bexioPreview.contacts.length})
                      </h3>
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                                {t("nameCol")}
                              </th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                                {t("emailCol")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {bexioPreview.contacts.slice(0, 10).map((c, i) => (
                              <tr key={i} className="border-b border-border/50">
                                <td className="px-3 py-2">{c.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">
                                  {c.email || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center gap-3">
                <Button onClick={importBexio} disabled={bexioImporting}>
                  {bexioImporting ? (
                    <IconLoader2 className="size-4 mr-2 animate-spin" />
                  ) : null}
                  {t("importNow")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setBexioPreview(null)
                    setBexioToken("")
                  }}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          )}

          {/* bexio Result */}
          {bexioResult && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="rounded-full bg-green-500/10 p-3">
                    <IconCheck className="size-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{t("bexioImportDone")}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {bexioResult.articles && (
                    <p className="text-sm">
                      <strong>{t("articles")}:</strong> {bexioResult.articles.imported} importiert,{" "}
                      {bexioResult.articles.skipped} übersprungen
                    </p>
                  )}
                  {bexioResult.contacts && (
                    <p className="text-sm">
                      <strong>{t("contacts")}:</strong> {bexioResult.contacts.imported} importiert,{" "}
                      {bexioResult.contacts.skipped} übersprungen
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button size="sm" onClick={() => router.push("/dashboard/materials")}>
                    {t("toMaterials")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/dashboard/suppliers")}
                  >
                    {t("toSuppliers")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 2: PROFFIX / SAP / Other — CSV instructions */}
      {selectedSource && ["proffix", "sap", "other"].includes(selectedSource) && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {t("exportData", { system: SOURCE_SYSTEMS.find((s) => s.id === selectedSource)?.name ?? "" })}
              </CardTitle>
              <CardDescription>
                {t("followSteps")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {EXPORT_INSTRUCTIONS[selectedSource]?.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <p className="text-sm pt-0.5">{step}</p>
                  </li>
                ))}
              </ol>

              {EXPORT_INSTRUCTIONS[selectedSource]?.tip && (
                <div className="mt-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  <strong>{t("tip")}:</strong> {EXPORT_INSTRUCTIONS[selectedSource]?.tip}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template downloads */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("csvTemplatesLabel")}</CardTitle>
              <CardDescription>
                {t("csvTemplatesOptional")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(["materials", "tools", "suppliers", "locations"] as EntityType[]).map(
                  (entity) => (
                    <Button
                      key={entity}
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate(entity)}
                    >
                      <IconDownload className="size-4 mr-2" />
                      {getEntityLabel(entity)}
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Button
            size="lg"
            onClick={() => router.push("/dashboard/import")}
            className="w-full sm:w-auto"
          >
            <IconFileSpreadsheet className="size-4 mr-2" />
            {t("toImportWizard")}
            <IconArrowRight className="size-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
