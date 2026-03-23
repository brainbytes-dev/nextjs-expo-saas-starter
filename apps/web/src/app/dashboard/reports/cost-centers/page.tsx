"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  IconBuildingFactory2,
  IconDownload,
  IconPrinter,
  IconLoader2,
  IconChevronDown,
  IconChevronRight,
  IconCurrencyEuro,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { downloadCsv, printReport, type ExportColumn } from "@/lib/export-utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CostLineItem {
  projectId: string
  projectName: string
  costCenter: string | null
  projectNumber: string | null
  materialId: string
  materialName: string
  materialNumber: string | null
  unit: string | null
  totalQty: number
  unitPrice: number
  totalCost: number
}

interface ProjectGroup {
  projectId: string
  projectName: string
  costCenter: string | null
  projectNumber: string | null
  totalCost: number
  lines: CostLineItem[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function thirtyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function fmtChf(amount: number): string {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
  }).format(amount)
}

// Flatten groups into CSV rows
function flattenForExport(groups: ProjectGroup[]) {
  return groups.flatMap((g) =>
    g.lines.map((l) => ({
      projekt: g.projectName,
      projektNummer: g.projectNumber ?? "",
      kostenstelle: g.costCenter ?? "",
      material: l.materialName,
      materialNummer: l.materialNumber ?? "",
      einheit: l.unit ?? "",
      menge: l.totalQty,
      einzelpreis: l.unitPrice.toFixed(2),
      gesamtkosten: l.totalCost.toFixed(2),
    }))
  )
}

type FlatRow = ReturnType<typeof flattenForExport>[number]

const EXPORT_COLUMNS: ExportColumn<FlatRow>[] = [
  { label: "Projekt", accessor: "projekt" },
  { label: "Projektnummer", accessor: "projektNummer" },
  { label: "Kostenstelle", accessor: "kostenstelle" },
  { label: "Material", accessor: "material" },
  { label: "Material Nr.", accessor: "materialNummer" },
  { label: "Einheit", accessor: "einheit" },
  { label: "Menge", accessor: "menge" },
  { label: "Einzelpreis (CHF)", accessor: "einzelpreis" },
  { label: "Gesamtkosten (CHF)", accessor: "gesamtkosten" },
]

// ---------------------------------------------------------------------------
// ProjectRow — expandable table row group
// ---------------------------------------------------------------------------
function ProjectRow({ group, t }: { group: ProjectGroup; t: (key: string) => string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 font-medium">
          <span className="flex items-center gap-2">
            {expanded ? (
              <IconChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
            {group.projectName}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {group.projectNumber ?? "—"}
        </td>
        <td className="px-4 py-3 text-sm">
          {group.costCenter ? (
            <Badge variant="secondary" className="font-mono text-xs">
              {group.costCenter}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right text-sm text-muted-foreground">
          {group.lines.length} {t("positions")}
        </td>
        <td className="px-4 py-3 text-right font-semibold">
          {fmtChf(group.totalCost)}
        </td>
      </tr>

      {expanded &&
        group.lines.map((line) => (
          <tr key={line.materialId} className="bg-muted/20 text-sm">
            <td className="px-4 py-2 pl-12 text-muted-foreground">
              {line.materialName}
              {line.materialNumber && (
                <span className="ml-2 font-mono text-xs text-muted-foreground/60">
                  #{line.materialNumber}
                </span>
              )}
            </td>
            <td className="px-4 py-2 text-muted-foreground" colSpan={2} />
            <td className="px-4 py-2 text-right text-muted-foreground">
              {line.totalQty} {line.unit ?? ""}
            </td>
            <td className="px-4 py-2 text-right">
              {line.unitPrice > 0 ? (
                <>
                  <span className="text-muted-foreground">
                    {line.totalQty} × {fmtChf(line.unitPrice)} ={" "}
                  </span>
                  {fmtChf(line.totalCost)}
                </>
              ) : (
                <span className="text-muted-foreground italic">
                  {t("noPrice")}
                </span>
              )}
            </td>
          </tr>
        ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function CostCenterReportPage() {
  const t = useTranslations("costCenters")
  const [from, setFrom] = useState(thirtyDaysAgo())
  const [to, setTo] = useState(today())
  const [groups, setGroups] = useState<ProjectGroup[] | null>(null)
  const [loading, setLoading] = useState<"fetch" | "csv" | "print" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalAllProjects = groups?.reduce((s, g) => s + g.totalCost, 0) ?? 0

  const fetchData = useCallback(async (): Promise<ProjectGroup[]> => {
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    const res = await fetch(`/api/reports/cost-centers?${params}`)
    if (!res.ok) throw new Error(t("loadError"))
    const json = await res.json()
    return (json.data ?? []) as ProjectGroup[]
  }, [from, to])

  const handleFetch = useCallback(async () => {
    setLoading("fetch")
    setError(null)
    try {
      const data = await fetchData()
      setGroups(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"))
    } finally {
      setLoading(null)
    }
  }, [fetchData])

  const handleCsv = useCallback(async () => {
    setLoading("csv")
    try {
      const data = await fetchData()
      const flat = flattenForExport(data)
      downloadCsv(flat, EXPORT_COLUMNS, "kostenstellen-bericht.csv")
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"))
    } finally {
      setLoading(null)
    }
  }, [fetchData])

  const handlePrint = useCallback(async () => {
    setLoading("print")
    try {
      const data = await fetchData()
      const flat = flattenForExport(data)
      printReport("Kostenstellen-Bericht", flat, EXPORT_COLUMNS)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("unknownError"))
    } finally {
      setLoading(null)
    }
  }, [fetchData])

  const isBusy = loading !== null

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {/* Filter card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <IconBuildingFactory2 className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t("filterExport")}</CardTitle>
              <CardDescription className="text-xs">
                {t("filterDescription")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t("from")}</Label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8 w-40 text-xs"
                disabled={isBusy}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{t("to")}</Label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 w-40 text-xs"
                disabled={isBusy}
              />
            </div>
            <Button
              size="sm"
              onClick={handleFetch}
              disabled={isBusy}
              className="h-8"
            >
              {loading === "fetch" ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconCurrencyEuro className="size-4" />
              )}
              {t("loadReport")}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCsv}
                disabled={isBusy}
                className="h-8"
              >
                {loading === "csv" ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconDownload className="size-4" />
                )}
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isBusy}
                className="h-8"
              >
                {loading === "print" ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconPrinter className="size-4" />
                )}
                {t("printPdf")}
              </Button>
            </div>
          </div>
          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {groups !== null && (
        <>
          {/* Top-10 chart (CSS bar chart — no chart library dependency) */}
          {groups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("topCostCenters", { count: Math.min(groups.length, 10) })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {groups.slice(0, 10).map((g, i) => {
                    const pct =
                      totalAllProjects > 0
                        ? (g.totalCost / totalAllProjects) * 100
                        : 0
                    return (
                      <div key={g.projectId} className="flex items-center gap-3">
                        <span className="w-4 shrink-0 text-xs text-muted-foreground text-right">
                          {i + 1}
                        </span>
                        <span className="w-48 shrink-0 truncate text-sm font-medium">
                          {g.projectName}
                        </span>
                        <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full rounded bg-primary/80 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
                          {fmtChf(g.totalCost)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">
                  {t("costBreakdown", { count: groups.length })}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("clickToExpand")}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t("totalCosts")}</p>
                <p className="text-xl font-bold">{fmtChf(totalAllProjects)}</p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {groups.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("noData")}
                  <br />
                  {t("noDataHint")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                        <th className="px-4 py-2 text-left font-medium">{t("colProject")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("colProjectNum")}</th>
                        <th className="px-4 py-2 text-left font-medium">{t("colCostCenter")}</th>
                        <th className="px-4 py-2 text-right font-medium">{t("positions")}</th>
                        <th className="px-4 py-2 text-right font-medium">{t("totalCosts")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {groups.map((g) => (
                        <ProjectRow key={g.projectId} group={g} t={t} />
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/40 font-semibold">
                        <td className="px-4 py-3" colSpan={4}>
                          {t("total")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {fmtChf(totalAllProjects)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
