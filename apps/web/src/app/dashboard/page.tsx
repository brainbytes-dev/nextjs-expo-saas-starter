"use client"

import { useTranslations } from "next-intl"
import { useSession } from "@/lib/auth-client"
import { useState, useEffect } from "react"
import {
  IconPackage,
  IconTool,
  IconKey,
  IconUsers,
  IconAlertTriangle,
  IconClock,
  IconTrendingUp,
  IconPlus,
} from "@tabler/icons-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// ── Types ────────────────────────────────────────────────────────────
interface DashboardStats {
  materials: number
  tools: number
  keys: number
  users: number
  maxUsers: number
  lowStockCount: number
  expiringCount: number
  overdueToolsCount: number
}

interface ChartDataPoint {
  month: string
  materials: number
  tools: number
  keys: number
}

interface RecentActivity {
  id: string
  type: "material" | "tool" | "key"
  action: string
  item: string
  user: string
  location: string
  quantity: number
  date: string
}

// ── Chart config ─────────────────────────────────────────────────────
const chartConfig = {
  materials: {
    label: "Materialien",
    color: "var(--color-blue-500)",
  },
  tools: {
    label: "Werkzeuge",
    color: "var(--color-emerald-500)",
  },
  keys: {
    label: "Schluessel",
    color: "var(--color-amber-500)",
  },
} satisfies ChartConfig

// ── Placeholder data ─────────────────────────────────────────────────
const placeholderChartData: ChartDataPoint[] = [
  { month: "Apr 2025", materials: 42, tools: 18, keys: 5 },
  { month: "Mai 2025", materials: 56, tools: 24, keys: 8 },
  { month: "Jun 2025", materials: 38, tools: 15, keys: 3 },
  { month: "Jul 2025", materials: 64, tools: 32, keys: 12 },
  { month: "Aug 2025", materials: 48, tools: 22, keys: 6 },
  { month: "Sep 2025", materials: 72, tools: 28, keys: 9 },
  { month: "Okt 2025", materials: 55, tools: 20, keys: 7 },
  { month: "Nov 2025", materials: 61, tools: 35, keys: 11 },
  { month: "Dez 2025", materials: 45, tools: 19, keys: 4 },
  { month: "Jan 2026", materials: 68, tools: 30, keys: 10 },
  { month: "Feb 2026", materials: 52, tools: 26, keys: 8 },
  { month: "Mär 2026", materials: 74, tools: 38, keys: 14 },
]

const placeholderActivity: RecentActivity[] = [
  { id: "1", type: "material", action: "Entnahme", item: "Schraube M8x40", user: "Max Müller", location: "Lager Hauptgebäude", quantity: -25, date: "17.03.2026 09:12" },
  { id: "2", type: "tool", action: "Ausbuchung", item: "Bohrmaschine Hilti TE 6-A", user: "Anna Schmidt", location: "Baustelle Zürich", quantity: 1, date: "17.03.2026 08:45" },
  { id: "3", type: "material", action: "Wareneingang", item: "Kabelbinder 200mm", user: "Peter Weber", location: "Lager Hauptgebäude", quantity: 500, date: "16.03.2026 16:30" },
  { id: "4", type: "key", action: "Ausgabe", item: "Schlüssel Büro 3.OG", user: "Lisa Meier", location: "Empfang", quantity: 1, date: "16.03.2026 14:20" },
  { id: "5", type: "material", action: "Korrektur", item: "Dübel Fischer SX 10", user: "Max Müller", location: "Fahrzeug MU-123", quantity: -10, date: "16.03.2026 11:05" },
  { id: "6", type: "tool", action: "Rückgabe", item: "Akkuschrauber Makita DDF", user: "Thomas Braun", location: "Lager Hauptgebäude", quantity: 1, date: "15.03.2026 17:00" },
  { id: "7", type: "material", action: "Entnahme", item: "Klebeband Tesa 50mm", user: "Anna Schmidt", location: "Baustelle Zürich", quantity: -12, date: "15.03.2026 15:30" },
  { id: "8", type: "material", action: "Bestellung eingegangen", item: "Isolierband rot", user: "System", location: "Lager Hauptgebäude", quantity: 200, date: "15.03.2026 10:00" },
  { id: "9", type: "tool", action: "Ausbuchung", item: "Messgerät Fluke 179", user: "Peter Weber", location: "Baustelle Bern", quantity: 1, date: "14.03.2026 08:15" },
  { id: "10", type: "key", action: "Rückgabe", item: "Schlüssel Lager Süd", user: "Lisa Meier", location: "Empfang", quantity: 1, date: "14.03.2026 07:50" },
]

// ── KPI Card Component ───────────────────────────────────────────────
function KpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  suffix,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  value: string | number
  label: string
  suffix?: string
}) {
  return (
    <Card className="@container/card">
      <CardContent className="flex items-center gap-4 pt-6">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <Icon className={`size-6 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight @[250px]/card:text-3xl">
              {value}
            </span>
            {suffix && (
              <span className="text-sm text-muted-foreground">{suffix}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
          <IconPlus className="size-4" />
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Alert Card Component ─────────────────────────────────────────────
function AlertCard({
  icon: Icon,
  borderColor,
  iconColor,
  bgColor,
  label,
  count,
}: {
  icon: React.ElementType
  borderColor: string
  iconColor: string
  bgColor: string
  label: string
  count: number
}) {
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${bgColor}`}>
          <Icon className={`size-4.5 ${iconColor}`} />
        </div>
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="secondary" className="ml-auto tabular-nums">
          {count}
        </Badge>
      </CardContent>
    </Card>
  )
}

// ── Activity type badge ──────────────────────────────────────────────
function TypeBadge({ type }: { type: "material" | "tool" | "key" }) {
  const config = {
    material: { label: "Material", className: "bg-primary/10 text-primary" },
    tool: { label: "Werkzeug", className: "bg-secondary/10 text-secondary" },
    key: { label: "Schlüssel", className: "bg-primary/10 text-primary" },
  }
  const c = config[type]
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>
}

// ── Main Dashboard Page ──────────────────────────────────────────────
export default function DashboardPage() {
  const t = useTranslations("dashboard")
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>(placeholderChartData)
  const [activity, setActivity] = useState<RecentActivity[]>(placeholderActivity)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Replace with real API call once /api/dashboard/stats is implemented
    // fetch(`/api/dashboard/stats?orgId=${orgId}`)
    const timer = setTimeout(() => {
      setStats({
        materials: 1284,
        tools: 347,
        keys: 86,
        users: 12,
        maxUsers: 25,
        lowStockCount: 7,
        expiringCount: 3,
        overdueToolsCount: 2,
      })
      setLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  const userName = session?.user?.name?.split(" ")[0] ?? ""

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Greeting */}
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("greeting", { name: userName })}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("title")}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {loading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 pt-6">
                  <Skeleton className="size-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : stats ? (
          <>
            <KpiCard
              icon={IconPackage}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              value={stats.materials.toLocaleString("de-CH")}
              label={t("materials")}
            />
            <KpiCard
              icon={IconTool}
              iconBg="bg-secondary/10"
              iconColor="text-secondary"
              value={stats.tools.toLocaleString("de-CH")}
              label={t("tools")}
            />
            <KpiCard
              icon={IconKey}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              value={stats.keys.toLocaleString("de-CH")}
              label={t("keys")}
            />
            <KpiCard
              icon={IconUsers}
              iconBg="bg-muted"
              iconColor="text-muted-foreground"
              value={stats.users}
              label={t("users")}
              suffix={`/ ${stats.maxUsers}`}
            />
          </>
        ) : null}
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-3">
        {loading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-3 py-4">
                  <Skeleton className="size-9 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="ml-auto h-5 w-8 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : stats ? (
          <>
            <AlertCard
              icon={IconAlertTriangle}
              borderColor="border-l-destructive"
              iconColor="text-destructive"
              bgColor="bg-destructive/10"
              label={t("lowStock")}
              count={stats.lowStockCount}
            />
            <AlertCard
              icon={IconClock}
              borderColor="border-l-primary"
              iconColor="text-primary"
              bgColor="bg-primary/10"
              label={t("expiringItems")}
              count={stats.expiringCount}
            />
            <AlertCard
              icon={IconTrendingUp}
              borderColor="border-l-primary"
              iconColor="text-primary"
              bgColor="bg-primary/10"
              label={t("overdueTools")}
              count={stats.overdueToolsCount}
            />
          </>
        ) : null}
      </div>

      {/* Chart */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("bookingsLast12Months")}</CardTitle>
            <CardDescription>
              {t("materials")} / {t("tools")} / {t("keys")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillMaterials" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-blue-500)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-blue-500)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillTools" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-emerald-500)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-emerald-500)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillKeys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-amber-500)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-amber-500)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                  />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="materials"
                    type="monotone"
                    fill="url(#fillMaterials)"
                    stroke="var(--color-blue-500)"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="tools"
                    type="monotone"
                    fill="url(#fillTools)"
                    stroke="var(--color-emerald-500)"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="keys"
                    type="monotone"
                    fill="url(#fillKeys)"
                    stroke="var(--color-amber-500)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Letzte Aktivitäten</CardTitle>
            <CardDescription>Die letzten 10 Buchungen und Bestandsänderungen</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typ</TableHead>
                    <TableHead>Aktion</TableHead>
                    <TableHead>Artikel</TableHead>
                    <TableHead>Nutzer</TableHead>
                    <TableHead>Lagerort</TableHead>
                    <TableHead className="text-right">Menge</TableHead>
                    <TableHead>Datum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <TypeBadge type={a.type} />
                      </TableCell>
                      <TableCell className="font-medium">{a.action}</TableCell>
                      <TableCell>{a.item}</TableCell>
                      <TableCell className="text-muted-foreground">{a.user}</TableCell>
                      <TableCell className="text-muted-foreground">{a.location}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        <span className={a.quantity < 0 ? "text-destructive" : "text-secondary"}>
                          {a.quantity > 0 ? `+${a.quantity}` : a.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{a.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
