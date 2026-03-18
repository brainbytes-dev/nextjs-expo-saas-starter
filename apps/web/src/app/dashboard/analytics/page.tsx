"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  IconDownload,
  IconLoader2,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconArrowsTransferDown,
  IconPackage,
  IconTool,
  IconChartBar,
} from "@tabler/icons-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StockMovementRow {
  date: string
  stockIn: number
  stockOut: number
}

interface MaterialCategory {
  name: string
  count: number
}

interface ToolUtilization {
  group: string
  total: number
  checkedOut: number
  available: number
}

interface TopMaterial {
  name: string
  changes: number
}

interface AnalyticsData {
  stockMovement: StockMovementRow[]
  materialCategories: MaterialCategory[]
  toolUtilization: ToolUtilization[]
  topMaterials: TopMaterial[]
}

interface KpiData {
  stockInTotal: number
  stockOutTotal: number
  uniqueMaterialsMoved: number
  toolCheckouts: number
}

interface KpiResponse {
  current: KpiData
  previous: KpiData
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PIE_COLORS = [
  "var(--chart-1, #6366f1)",
  "var(--chart-2, #22c55e)",
  "var(--chart-3, #f59e0b)",
  "var(--chart-4, #ec4899)",
  "var(--chart-5, #14b8a6)",
  "#8b5cf6",
  "#f97316",
]

const PRESET_RANGES = [
  { label: "Letzte 7 Tage", days: 7 },
  { label: "Letzte 30 Tage", days: 30 },
  { label: "Letzte 90 Tage", days: 90 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function today() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
  })
}

function downloadCsvBlob(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0]!)
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      headers.map((h) => String(r[h] ?? "").replace(/;/g, ",")).join(";")
    ),
  ]
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------
function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton style={{ height }} className="w-full rounded-lg" />
    </div>
  )
}

function KpiSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
interface KpiCardProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  current: number
  previous: number
  loading: boolean
}

function KpiCard({ title, icon: Icon, current, previous, loading }: KpiCardProps) {
  const change = pct(current, previous)

  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <KpiSkeleton />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="size-4" />
              {title}
            </div>
            <p className="text-3xl font-bold tabular-nums">{current.toLocaleString("de-CH")}</p>
            <div className="flex items-center gap-1 text-xs">
              {change === null ? (
                <span className="text-muted-foreground">Kein Vorperiodenwert</span>
              ) : change > 0 ? (
                <>
                  <IconTrendingUp className="size-3 text-green-500" />
                  <span className="font-medium text-green-600 dark:text-green-400">
                    +{change}%
                  </span>
                  <span className="text-muted-foreground">vs. Vorperiode</span>
                </>
              ) : change < 0 ? (
                <>
                  <IconTrendingDown className="size-3 text-red-500" />
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {change}%
                  </span>
                  <span className="text-muted-foreground">vs. Vorperiode</span>
                </>
              ) : (
                <>
                  <IconMinus className="size-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Keine Änderung</span>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------
function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      {label && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="text-sm" style={{ color: p.color }}>
          <span className="font-medium">{p.name}:</span>{" "}
          {p.value.toLocaleString("de-CH")}
        </p>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function AnalyticsPage() {
  const [preset, setPreset] = useState<string>("30")
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(today())
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [kpi, setKpi] = useState<KpiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [kpiLoading, setKpiLoading] = useState(true)

  // Sync preset -> date range
  const handlePreset = (value: string) => {
    setPreset(value)
    if (value !== "custom") {
      const days = parseInt(value, 10)
      setFrom(daysAgo(days))
      setTo(today())
    }
  }

  // Detect manual date change -> switch to custom
  const handleFromChange = (v: string) => {
    setFrom(v)
    setPreset("custom")
  }
  const handleToChange = (v: string) => {
    setTo(v)
    setPreset("custom")
  }

  const orgId = useMemo(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("organizationId") ?? null
  }, [])

  const buildHeaders = useCallback(() => {
    const h: HeadersInit = {}
    if (orgId) h["x-organization-id"] = orgId
    return h
  }, [orgId])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setKpiLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      const headers = buildHeaders()
      const [analyticsRes, kpiRes] = await Promise.all([
        fetch(`/api/analytics?${params}`, { headers }),
        fetch(`/api/analytics/kpi?${params}`, { headers }),
      ])

      if (analyticsRes.ok) {
        const d = await analyticsRes.json() as AnalyticsData
        setData(d)
      }
      setLoading(false)

      if (kpiRes.ok) {
        const k = await kpiRes.json() as KpiResponse
        setKpi(k)
      }
      setKpiLoading(false)
    } catch {
      setLoading(false)
      setKpiLoading(false)
    }
  }, [from, to, buildHeaders])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── CSV exports ──────────────────────────────────────────────────
  const exportStockMovement = () => {
    if (!data?.stockMovement) return
    downloadCsvBlob(
      "lagerbewegungen.csv",
      data.stockMovement.map((r) => ({
        Datum: r.date,
        Eingang: r.stockIn,
        Ausgang: r.stockOut,
      }))
    )
  }

  const exportTopMaterials = () => {
    if (!data?.topMaterials) return
    downloadCsvBlob(
      "top-materialien.csv",
      data.topMaterials.map((r) => ({
        Material: r.name,
        Bewegungen: r.changes,
      }))
    )
  }

  const exportAll = () => {
    exportStockMovement()
    exportTopMaterials()
  }

  // ── Formatted stock movement with short date labels ──────────────
  const stockMovementFormatted = useMemo(
    () =>
      (data?.stockMovement ?? []).map((r) => ({
        ...r,
        dateLabel: formatDate(r.date),
      })),
    [data]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytik</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lagerstatistiken, Werkzeugauslastung und Materialverbrauch im Überblick.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportAll}
          disabled={loading || !data}
          className="gap-2 self-start sm:self-auto"
        >
          <IconDownload className="size-4" />
          Alle Daten exportieren
        </Button>
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-5">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Zeitraum</Label>
            <Select value={preset} onValueChange={handlePreset}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESET_RANGES.map((p) => (
                  <SelectItem key={p.days} value={String(p.days)}>
                    {p.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Benutzerdefiniert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Von</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => handleFromChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Bis</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => handleToChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          {loading && (
            <IconLoader2 className="mb-1 size-4 animate-spin text-muted-foreground" />
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Eingänge"
          icon={IconArrowsTransferDown}
          current={kpi?.current.stockInTotal ?? 0}
          previous={kpi?.previous.stockInTotal ?? 0}
          loading={kpiLoading}
        />
        <KpiCard
          title="Ausgänge"
          icon={IconArrowsTransferDown}
          current={kpi?.current.stockOutTotal ?? 0}
          previous={kpi?.previous.stockOutTotal ?? 0}
          loading={kpiLoading}
        />
        <KpiCard
          title="Materialien bewegt"
          icon={IconPackage}
          current={kpi?.current.uniqueMaterialsMoved ?? 0}
          previous={kpi?.previous.uniqueMaterialsMoved ?? 0}
          loading={kpiLoading}
        />
        <KpiCard
          title="Werkzeug-Buchungen"
          icon={IconTool}
          current={kpi?.current.toolCheckouts ?? 0}
          previous={kpi?.previous.toolCheckouts ?? 0}
          loading={kpiLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* ── Stock Movement Line Chart ──────────────────────────── */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-base">Lagerbewegungen</CardTitle>
              <CardDescription className="text-xs">
                Tägliche Ein- und Ausgänge im gewählten Zeitraum
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportStockMovement}
              disabled={loading || !data?.stockMovement?.length}
              className="h-7 gap-1 text-xs"
            >
              <IconDownload className="size-3" />
              CSV
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={280} />
            ) : !stockMovementFormatted.length ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Keine Lagerbewegungen im gewählten Zeitraum
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={stockMovementFormatted}
                  margin={{ top: 4, right: 12, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="stockIn"
                    name="Eingang"
                    stroke="var(--chart-2, #22c55e)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="stockOut"
                    name="Ausgang"
                    stroke="var(--chart-1, #6366f1)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Material Categories Pie Chart ──────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Materialien nach Gruppe</CardTitle>
            <CardDescription className="text-xs">
              Verteilung aller aktiven Materialien
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={280} />
            ) : !data?.materialCategories?.length ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Keine Daten verfügbar
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.materialCategories}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {data.materialCategories.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        Number(value ?? 0).toLocaleString("de-CH"),
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {data.materialCategories.map((cat, idx) => (
                    <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{cat.name}</span>
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {cat.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Tool Utilization Bar Chart ─────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Werkzeugauslastung</CardTitle>
            <CardDescription className="text-xs">
              Ausgecheckte vs. verfügbare Werkzeuge pro Gruppe
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={280} />
            ) : !data?.toolUtilization?.length ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Keine Werkzeugdaten verfügbar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.toolUtilization}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="group"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar
                    dataKey="available"
                    name="Verfügbar"
                    fill="var(--chart-2, #22c55e)"
                    radius={[0, 3, 3, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="checkedOut"
                    name="Ausgecheckt"
                    fill="var(--chart-1, #6366f1)"
                    radius={[0, 3, 3, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Top 10 Materials Horizontal Bar Chart ──────────────── */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-base">Top 10 Materialien</CardTitle>
              <CardDescription className="text-xs">
                Meistbewegte Materialien im gewählten Zeitraum (Anzahl Buchungen)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <IconChartBar className="size-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={exportTopMaterials}
                disabled={loading || !data?.topMaterials?.length}
                className="h-7 gap-1 text-xs"
              >
                <IconDownload className="size-3" />
                CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={300} />
            ) : !data?.topMaterials?.length ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Keine Bewegungen im gewählten Zeitraum
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[...data.topMaterials].reverse()}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={150}
                    tickFormatter={(v: string) =>
                      v.length > 22 ? v.slice(0, 21) + "…" : v
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      Number(value ?? 0).toLocaleString("de-CH"),
                      "Buchungen",
                    ]}
                  />
                  <Bar
                    dataKey="changes"
                    name="Buchungen"
                    fill="var(--chart-3, #f59e0b)"
                    radius={[0, 4, 4, 0]}
                    label={{
                      position: "right",
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
