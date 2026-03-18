"use client"

/**
 * ForecastTab
 * Shown inside the "Prognose" tab on the material detail page.
 *
 * Renders:
 *  - Combined line chart: historical consumption (solid) + forecast (dashed)
 *    + confidence interval (shaded area)
 *  - Reorder suggestion card
 *  - "Bestellung erstellen" button → drafts an order via POST /api/orders
 */

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import {
  IconLoader2,
  IconAlertTriangle,
  IconCheck,
  IconShoppingCart,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconInfoCircle,
} from "@tabler/icons-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ── Types ─────────────────────────────────────────────────────────────────────

interface DailyQty {
  date: string
  quantity: number
}

interface ForecastPoint {
  date: string
  predicted: number
  lower: number
  upper: number
}

interface ReorderSuggestion {
  reorderPoint: number
  reorderQuantity: number
  daysUntilStockout: number
  confidence: number
}

interface ForecastResponse {
  materialId: string
  materialName: string
  unit: string
  reorderLevel: number
  currentStock: number
  leadTimeDays: number
  avgDailyConsumption: number
  dataPointCount: number
  history: DailyQty[]
  forecast: ForecastPoint[]
  reorder: ReorderSuggestion
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" })
}

function confidenceLabel(c: number): { text: string; color: string } {
  if (c >= 0.75) return { text: "Hoch", color: "text-green-600 dark:text-green-400" }
  if (c >= 0.45) return { text: "Mittel", color: "text-yellow-600 dark:text-yellow-400" }
  return { text: "Niedrig", color: "text-red-600 dark:text-red-400" }
}

function stockoutSeverity(days: number): "critical" | "warning" | "ok" {
  if (days <= 7) return "critical"
  if (days <= 30) return "warning"
  return "ok"
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>
  label?: string
  unit: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      {label && <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>}
      {payload.map((p) => {
        if (p.dataKey === "interval") return null
        return (
          <p key={p.dataKey} style={{ color: p.color }}>
            <span className="font-medium">{p.name}:</span>{" "}
            {Number(p.value).toLocaleString("de-CH")} {unit}
          </p>
        )
      })}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ForecastTabProps {
  materialId: string
  unit?: string
}

export function ForecastTab({ materialId, unit = "Stk" }: ForecastTabProps) {
  const router = useRouter()
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [daysAhead, setDaysAhead] = useState("30")
  const [leadTime, setLeadTime] = useState("7")
  const [ordering, setOrdering] = useState(false)
  const [orderCreated, setOrderCreated] = useState(false)

  const orgId =
    typeof window !== "undefined" ? (localStorage.getItem("organizationId") ?? undefined) : undefined

  const fetchForecast = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ days: daysAhead, leadTime })
      const res = await fetch(`/api/materials/${materialId}/forecast?${params}`, {
        headers: orgId ? { "x-organization-id": orgId } : {},
      })
      if (!res.ok) {
        setError("Prognose konnte nicht geladen werden.")
        return
      }
      const json = (await res.json()) as ForecastResponse
      setData(json)
    } catch {
      setError("Netzwerkfehler beim Laden der Prognose.")
    } finally {
      setLoading(false)
    }
  }, [materialId, daysAhead, leadTime, orgId])

  useEffect(() => {
    void fetchForecast()
  }, [fetchForecast])

  // Build combined chart data: history (solid) + forecast (dashed)
  const chartData = (() => {
    if (!data) return []
    const hist = data.history.map((d) => ({
      dateLabel: formatDate(d.date),
      historisch: d.quantity,
      prognose: undefined as number | undefined,
      lower: undefined as number | undefined,
      upper: undefined as number | undefined,
    }))

    const fore = data.forecast.map((d) => ({
      dateLabel: formatDate(d.date),
      historisch: undefined as number | undefined,
      prognose: d.predicted,
      lower: d.lower,
      upper: d.upper,
    }))
    return [...hist, ...fore]
  })()

  const handleCreateOrder = useCallback(async () => {
    if (!data) return
    setOrdering(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
      const orderNumber = `PROG-${today}-${rand}`

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(orgId ? { "x-organization-id": orgId } : {}),
        },
        body: JSON.stringify({
          orderNumber,
          status: "draft",
          orderDate: today,
          currency: "CHF",
          notes: `Prognose-Nachbestellung: ${data.materialName} — ${data.reorder.reorderQuantity} ${data.unit} (${data.reorder.daysUntilStockout} Tage bis Nullbestand)`,
          items: [
            {
              materialId,
              quantity: data.reorder.reorderQuantity,
            },
          ],
        }),
      })
      if (res.ok) {
        setOrderCreated(true)
        setTimeout(() => router.push("/dashboard/orders"), 1500)
      }
    } catch {
      // silently fail — user can navigate manually
    } finally {
      setOrdering(false)
    }
  }, [data, materialId, orgId, router])

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex gap-4">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <IconAlertTriangle className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{error ?? "Keine Daten verfügbar."}</p>
        <Button variant="outline" size="sm" onClick={fetchForecast}>
          Erneut versuchen
        </Button>
      </div>
    )
  }

  const { reorder } = data
  const severity = stockoutSeverity(reorder.daysUntilStockout)
  const conf = confidenceLabel(reorder.confidence)

  const severityBadge = {
    critical: <Badge variant="destructive">Kritisch</Badge>,
    warning: <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-400/30">Warnung</Badge>,
    ok: <Badge variant="secondary">OK</Badge>,
  }[severity]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Prognosehorizont</span>
          <Select value={daysAhead} onValueChange={setDaysAhead}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14">14 Tage</SelectItem>
              <SelectItem value="30">30 Tage</SelectItem>
              <SelectItem value="60">60 Tage</SelectItem>
              <SelectItem value="90">90 Tage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Lieferzeit</span>
          <Select value={leadTime} onValueChange={setLeadTime}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 Tage</SelectItem>
              <SelectItem value="7">7 Tage</SelectItem>
              <SelectItem value="14">14 Tage</SelectItem>
              <SelectItem value="30">30 Tage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
          <IconInfoCircle className="size-3.5" />
          Basierend auf {data.dataPointCount} Verbrauchstagen (letzte 90 Tage)
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Verbrauchsprognose</CardTitle>
          <CardDescription className="text-xs">
            Historischer Verbrauch (—) und Prognose (- -) mit Konfidenzbereich
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Keine Verbrauchsdaten in den letzten 90 Tagen
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10 }}
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
                <Tooltip content={<ChartTooltip unit={data.unit} />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />

                {/* Confidence interval shaded area */}
                <Area
                  type="monotone"
                  dataKey="upper"
                  name="Obere Grenze"
                  fill="var(--chart-1, #6366f1)"
                  stroke="none"
                  fillOpacity={0.12}
                  legendType="none"
                  activeDot={false}
                />
                <Area
                  type="monotone"
                  dataKey="lower"
                  name="Untere Grenze"
                  fill="var(--background)"
                  stroke="none"
                  fillOpacity={1}
                  legendType="none"
                  activeDot={false}
                />

                {/* Historical solid line */}
                <Line
                  type="monotone"
                  dataKey="historisch"
                  name="Historisch"
                  stroke="var(--chart-2, #22c55e)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />

                {/* Forecast dashed line */}
                <Line
                  type="monotone"
                  dataKey="prognose"
                  name="Prognose"
                  stroke="var(--chart-1, #6366f1)"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />

                {/* Reorder point reference line */}
                {data.reorderLevel > 0 && (
                  <ReferenceLine
                    y={data.reorderLevel}
                    stroke="var(--chart-4, #ec4899)"
                    strokeDasharray="4 4"
                    label={{ value: "Meldebestand", position: "insideTopRight", fontSize: 10, fill: "var(--chart-4, #ec4899)" }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">

        {/* Days until stockout */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tage bis Nullbestand
              </p>
              {severityBadge}
            </div>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${
              severity === "critical" ? "text-destructive" :
              severity === "warning" ? "text-yellow-600 dark:text-yellow-400" :
              "text-foreground"
            }`}>
              {reorder.daysUntilStockout === Infinity ? ">" : ""}{
                reorder.daysUntilStockout === Infinity ? "90" :
                reorder.daysUntilStockout
              }
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              bei ⌀ {data.avgDailyConsumption.toLocaleString("de-CH")} {data.unit}/Tag
            </p>
          </CardContent>
        </Card>

        {/* Reorder suggestion */}
        <Card className={severity === "critical" ? "border-destructive/40" : severity === "warning" ? "border-yellow-400/40" : ""}>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Empfohlene Nachbestellung
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {reorder.reorderQuantity.toLocaleString("de-CH")}
              <span className="ml-1 text-sm font-normal text-muted-foreground">{data.unit}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Meldebestand: {reorder.reorderPoint} {data.unit}
            </p>
          </CardContent>
        </Card>

        {/* Confidence */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Prognose-Konfidenz
            </p>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${conf.color}`}>
              {Math.round(reorder.confidence * 100)} %
            </p>
            <p className={`mt-1 text-xs font-medium ${conf.color}`}>{conf.text}</p>
          </CardContent>
        </Card>
      </div>

      {/* Reorder action */}
      {(severity === "critical" || severity === "warning") && (
        <Card className={severity === "critical" ? "border-destructive/40 bg-destructive/5" : "border-yellow-400/40 bg-yellow-50/50 dark:bg-yellow-900/10"}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-sm">
                {severity === "critical" ? "Dringend: " : ""}Empfohlene Nachbestellung
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {reorder.reorderQuantity} {data.unit} in den nächsten{" "}
                {reorder.daysUntilStockout === Infinity
                  ? "Wochen"
                  : `${Math.max(0, reorder.daysUntilStockout - (data.leadTimeDays ?? 7))} Tagen`}{" "}
                bestellen (Lieferzeit: {data.leadTimeDays} Tage)
              </p>
            </div>
            <Button
              size="sm"
              disabled={ordering || orderCreated}
              onClick={handleCreateOrder}
              className="gap-2 shrink-0"
              variant={severity === "critical" ? "destructive" : "default"}
            >
              {orderCreated ? (
                <>
                  <IconCheck className="size-4" />
                  Erstellt
                </>
              ) : ordering ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Wird erstellt…
                </>
              ) : (
                <>
                  <IconShoppingCart className="size-4" />
                  Bestellung erstellen
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
