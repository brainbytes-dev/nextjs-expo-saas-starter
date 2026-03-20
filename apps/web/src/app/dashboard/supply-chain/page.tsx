"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  IconLoader2,
  IconShoppingCart,
  IconClock,
  IconTruck,
  IconCheck,
  IconArrowRight,
  IconStar,
  IconStarFilled,
  IconChartBar,
  IconAlertTriangle,
} from "@tabler/icons-react"
import {
  AreaChart,
  Area,
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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SupplyChainData {
  pipeline: {
    draft: number
    ordered: number
    partial: number
    received: number
  }
  stats: {
    totalVolume: number
    openOrders: number
    avgDeliveryDays: number
    onTimeRate: number
  }
  stockFlow: Array<{
    month: string
    inbound: number
    outbound: number
  }>
  supplierPerformance: Array<{
    name: string
    orders: number
    avgDays: number | null
    onTimeRate: number | null
    rating: number | null
  }>
  topConsumed: Array<{
    name: string
    quantity: number
  }>
  deliveryStatus: Array<{
    status: string
    label: string
    count: number
  }>
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

// ---------------------------------------------------------------------------
// Skeleton Loaders
// ---------------------------------------------------------------------------
function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton style={{ height }} className="w-full rounded-lg" />
    </div>
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
// Star Rating Component
// ---------------------------------------------------------------------------
function StarRating({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">--</span>
  const full = Math.floor(value)
  const stars = []
  for (let i = 0; i < 5; i++) {
    stars.push(
      i < full ? (
        <IconStarFilled key={i} className="size-3.5 text-amber-500" />
      ) : (
        <IconStar key={i} className="size-3.5 text-muted-foreground/40" />
      )
    )
  }
  return (
    <div className="flex items-center gap-0.5">
      {stars}
      <span className="ml-1 text-xs text-muted-foreground">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pipeline Step Component
// ---------------------------------------------------------------------------
function PipelineStep({
  label,
  count,
  icon: Icon,
  colorClass,
  bgClass,
  isLast,
}: {
  label: string
  count: number
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  bgClass: string
  isLast?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center gap-1.5">
        <div className={`flex items-center justify-center rounded-xl p-3 ${bgClass}`}>
          <Icon className={`size-6 ${colorClass}`} />
        </div>
        <p className="text-2xl font-bold tabular-nums">{count}</p>
        <p className="text-xs text-muted-foreground text-center">{label}</p>
      </div>
      {!isLast && (
        <IconArrowRight className="mx-1 size-5 text-muted-foreground/40 shrink-0 self-start mt-5" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SupplyChainPage() {
  const [data, setData] = useState<SupplyChainData | null>(null)
  const [loading, setLoading] = useState(true)

  const orgId = useMemo(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("organizationId") ?? null
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const headers: HeadersInit = {}
      if (orgId) headers["x-organization-id"] = orgId
      const res = await fetch("/api/analytics/supply-chain", { headers })
      if (res.ok) {
        const d = (await res.json()) as SupplyChainData
        setData(d)
      }
    } catch {
      // silent — demo data returned from API on error
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const totalDeliveries = data?.deliveryStatus?.reduce((s, r) => s + r.count, 0) ?? 0

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lieferkette</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gesamtansicht der Supply Chain: Lieferanten, Bestellungen, Lieferungen, Bestand und Verbrauch.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-24" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconShoppingCart className="size-4" />
                  Bestellvolumen
                </div>
                <p className="text-3xl font-bold tabular-nums">
                  CHF {(data?.stats.totalVolume ?? 0).toLocaleString("de-CH")}
                </p>
                <p className="text-xs text-muted-foreground">Alle Bestellungen</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconAlertTriangle className="size-4" />
                  Offene Bestellungen
                </div>
                <p className="text-3xl font-bold tabular-nums">
                  {data?.stats.openOrders ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Entwurf, bestellt oder teilgeliefert</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconClock className="size-4" />
                  Ø Lieferzeit
                </div>
                <p className="text-3xl font-bold tabular-nums">
                  {data?.stats.avgDeliveryDays ?? 0} Tage
                </p>
                <p className="text-xs text-muted-foreground">Durchschnitt aller Lieferanten</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IconCheck className="size-4" />
                  Pünktlichkeitsrate
                </div>
                <p className="text-3xl font-bold tabular-nums">
                  {data?.stats.onTimeRate ?? 0}%
                </p>
                <Progress value={data?.stats.onTimeRate ?? 0} className="mt-1 h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Bestell-Pipeline</CardTitle>
          <CardDescription className="text-xs">
            Aktuelle Verteilung aller Bestellungen nach Status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-8 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Skeleton className="h-14 w-14 rounded-xl" />
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-center gap-2 py-4 sm:gap-4">
              <PipelineStep
                label="Entwurf"
                count={data?.pipeline.draft ?? 0}
                icon={IconShoppingCart}
                colorClass="text-indigo-500"
                bgClass="bg-indigo-500/10"
              />
              <PipelineStep
                label="Bestellt"
                count={data?.pipeline.ordered ?? 0}
                icon={IconClock}
                colorClass="text-amber-500"
                bgClass="bg-amber-500/10"
              />
              <PipelineStep
                label="Teilgeliefert"
                count={data?.pipeline.partial ?? 0}
                icon={IconTruck}
                colorClass="text-pink-500"
                bgClass="bg-pink-500/10"
              />
              <PipelineStep
                label="Geliefert"
                count={data?.pipeline.received ?? 0}
                icon={IconCheck}
                colorClass="text-green-500"
                bgClass="bg-green-500/10"
                isLast
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Stock Flow Area Chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Warenfluss</CardTitle>
            <CardDescription className="text-xs">
              Monatliche Ein- und Ausgänge der letzten 6 Monate
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={280} />
            ) : !data?.stockFlow?.length ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Keine Daten verfügbar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={data.stockFlow}
                  margin={{ top: 4, right: 12, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradInbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-2, #22c55e)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--chart-2, #22c55e)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradOutbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1, #6366f1)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--chart-1, #6366f1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="inbound"
                    name="Eingang"
                    stroke="var(--chart-2, #22c55e)"
                    strokeWidth={2}
                    fill="url(#gradInbound)"
                  />
                  <Area
                    type="monotone"
                    dataKey="outbound"
                    name="Ausgang"
                    stroke="var(--chart-1, #6366f1)"
                    strokeWidth={2}
                    fill="url(#gradOutbound)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Consumed Materials Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <IconChartBar className="size-4 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Top Verbrauch</CardTitle>
                <CardDescription className="text-xs">
                  Meistverbrauchte Materialien (letzte 30 Tage)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={280} />
            ) : !data?.topConsumed?.length ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Keine Verbrauchsdaten verfügbar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={[...data.topConsumed].reverse()}
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
                    width={130}
                    tickFormatter={(v: string) =>
                      v.length > 18 ? v.slice(0, 17) + "\u2026" : v
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      Number(value ?? 0).toLocaleString("de-CH"),
                      "Menge",
                    ]}
                  />
                  <Bar
                    dataKey="quantity"
                    name="Verbrauch"
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

        {/* Delivery Status Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lieferstatus</CardTitle>
            <CardDescription className="text-xs">
              Aktuelle Verteilung aller Lieferungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton height={280} />
            ) : !data?.deliveryStatus?.length ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Keine Lieferungen vorhanden
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.deliveryStatus}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      label={({ label, percent }: { label?: string; percent?: number }) =>
                        `${label ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {data.deliveryStatus.map((_, idx) => (
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
                  {data.deliveryStatus.map((d, idx) => (
                    <div key={d.status} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{d.label}</span>
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        {d.count}
                      </Badge>
                    </div>
                  ))}
                  {totalDeliveries > 0 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">Total:</span>
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        {totalDeliveries}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier Performance Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lieferantenperformance</CardTitle>
          <CardDescription className="text-xs">
            Bestellvolumen, Lieferzeiten und Bewertungen der Top-Lieferanten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !data?.supplierPerformance?.length ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              Keine Lieferantendaten vorhanden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lieferant</TableHead>
                    <TableHead className="text-right">Bestellungen</TableHead>
                    <TableHead className="text-right">Ø Lieferzeit</TableHead>
                    <TableHead className="text-right">Pünktlichkeit</TableHead>
                    <TableHead>Bewertung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.supplierPerformance.map((s) => (
                    <TableRow key={s.name}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.orders}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.avgDays !== null ? `${s.avgDays} Tage` : "--"}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.onTimeRate !== null ? (
                          <Badge
                            variant={s.onTimeRate >= 90 ? "default" : s.onTimeRate >= 70 ? "secondary" : "destructive"}
                            className="tabular-nums"
                          >
                            {s.onTimeRate}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StarRating value={s.rating} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
