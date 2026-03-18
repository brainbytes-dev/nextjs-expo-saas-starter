"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useSession } from "@/lib/auth-client"
import { useState, useEffect, useRef } from "react"
import {
  IconPackage,
  IconTool,
  IconKey,
  IconUsers,
  IconAlertTriangle,
  IconClock,
  IconArrowRight,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconRefresh,
  IconClipboardList,
  IconBoxSeam,
  IconRepeat,
  IconEdit,
  IconCheck,
} from "@tabler/icons-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { PrintButton } from "@/components/print-button"
import type { ActivityItem } from "@/app/api/dashboard/activity/route"

// ── Types ─────────────────────────────────────────────────────────────
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


interface MaintenanceItem {
  id: string
  name: string
  number: string | null
  nextMaintenanceDate: string
  assignedUserName: string | null
  homeLocationName: string | null
  status: "overdue" | "this-week" | "upcoming"
  daysUntil: number
}

interface ChartDataPoint {
  month: string
  materials: number
  tools: number
  keys: number
}

// ── Chart config ──────────────────────────────────────────────────────
const areaChartConfig = {
  materials: { label: "Materialien", color: "hsl(var(--chart-1))" },
  tools:     { label: "Werkzeuge",   color: "hsl(var(--chart-2))" },
  keys:      { label: "Schlüssel",   color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

// ── Placeholder chart data (last 12 months) ───────────────────────────
const PLACEHOLDER_CHART: ChartDataPoint[] = [
  { month: "Apr 25", materials: 42, tools: 18, keys: 5 },
  { month: "Mai 25", materials: 56, tools: 24, keys: 8 },
  { month: "Jun 25", materials: 38, tools: 15, keys: 3 },
  { month: "Jul 25", materials: 64, tools: 32, keys: 12 },
  { month: "Aug 25", materials: 48, tools: 22, keys: 6 },
  { month: "Sep 25", materials: 72, tools: 28, keys: 9 },
  { month: "Okt 25", materials: 55, tools: 20, keys: 7 },
  { month: "Nov 25", materials: 61, tools: 35, keys: 11 },
  { month: "Dez 25", materials: 45, tools: 19, keys: 4 },
  { month: "Jan 26", materials: 68, tools: 30, keys: 10 },
  { month: "Feb 26", materials: 52, tools: 26, keys: 8 },
  { month: "Mär 26", materials: 74, tools: 38, keys: 14 },
]

// ── Helpers ───────────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60)          return "Gerade eben"
  if (diff < 3600)        return `vor ${Math.floor(diff / 60)} Min.`
  if (diff < 86400)       return `vor ${Math.floor(diff / 3600)} Std.`
  if (diff < 86400 * 7)   return `vor ${Math.floor(diff / 86400)} Tag${Math.floor(diff / 86400) !== 1 ? "en" : ""}`
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function buildDescription(item: ActivityItem): string {
  const who = item.userName ?? "Unbekannt"
  const qty = item.quantity
  const where = item.locationName ? ` (${item.locationName})` : ""
  if (item.source === "stock" && qty !== null) {
    const sign = qty > 0 ? `+${qty}` : `${qty}`
    return `${who} — ${sign}× ${item.itemName}${where}`
  }
  return `${who} — ${item.itemName}${where}`
}

// ── Sub-components ────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  label,
  suffix,
  href,
}: {
  icon: React.ElementType
  iconBg: string
  iconColor: string
  value: string | number
  label: string
  suffix?: string
  href: string
}) {
  return (
    <Card className="@container/card group transition-shadow hover:shadow-md">
      <CardContent className="flex items-center gap-4 pt-6 pb-5">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`size-6 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums tracking-tight @[240px]/card:text-3xl">
              {value}
            </span>
            {suffix && (
              <span className="text-sm text-muted-foreground">{suffix}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={href} aria-label={`Zu ${label}`}>
            <IconArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

interface AlertCardProps {
  icon: React.ElementType
  borderColor: string
  iconColor: string
  bgColor: string
  badgeVariant?: "destructive" | "secondary" | "default" | "outline"
  label: string
  sublabel?: string
  count: number
  href: string
}

function AlertCard({
  icon: Icon,
  borderColor,
  iconColor,
  bgColor,
  badgeVariant = "secondary",
  label,
  sublabel,
  count,
  href,
}: AlertCardProps) {
  return (
    <Link href={href} className="block group">
      <Card className={`border-l-4 ${borderColor} transition-shadow group-hover:shadow-md`}>
        <CardContent className="flex items-center gap-3 py-4">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${bgColor}`}>
            <Icon className={`size-4.5 ${iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">{label}</p>
            {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
          </div>
          <Badge variant={badgeVariant} className="ml-auto tabular-nums shrink-0 text-sm px-2.5 py-0.5">
            {count}
          </Badge>
          <IconArrowRight className="size-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardContent>
      </Card>
    </Link>
  )
}

function ActivitySourceIcon({ source }: { source: ActivityItem["source"] }) {
  if (source === "tool") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary/10">
        <IconTool className="size-4 text-secondary" />
      </div>
    )
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
      <IconBoxSeam className="size-4 text-primary" />
    </div>
  )
}

function ActivityActionBadge({ action }: { action: string }) {
  const isReturn = action === "Rückgabe" || action === "Wareneingang"
  const isOut = action === "Entnahme" || action === "Ausbuchung"

  if (isReturn) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
        <IconArrowUp className="size-3" />
        {action}
      </span>
    )
  }
  if (isOut) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600">
        <IconArrowDown className="size-3" />
        {action}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <IconRepeat className="size-3" />
      {action}
    </span>
  )
}

function ActivityFeedSkeleton() {
  return (
    <div className="divide-y divide-border">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="size-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

// ── Main Dashboard Page ───────────────────────────────────────────────
export default function DashboardPage() {
  const t = useTranslations("dashboard")
  const { data: session } = useSession()

  const [stats, setStats]         = useState<DashboardStats | null>(null)
  const [activity, setActivity]   = useState<ActivityItem[]>([])
  const [chartData]               = useState<ChartDataPoint[]>(PLACEHOLDER_CHART)
  const [loading, setLoading]     = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<MaintenanceItem[]>([])
  const [maintenanceLoading, setMaintenanceLoading] = useState(true)
  const isMounted = useRef(false)

  useEffect(() => {
    isMounted.current = true
    const run = async () => {
      setLoading(true)
      try {
        const r = await fetch("/api/dashboard/stats")
        const data: DashboardStats = await r.json()
        if (isMounted.current) setStats(data)
      } catch {
        // stats stay null; page still usable
      } finally {
        if (isMounted.current) setLoading(false)
      }
    }
    void run()
    return () => { isMounted.current = false }
  }, [refreshKey])

  useEffect(() => {
    isMounted.current = true
    const run = async () => {
      setActivityLoading(true)
      try {
        const r = await fetch("/api/dashboard/activity")
        const data: { data: ActivityItem[] } = await r.json()
        if (isMounted.current) setActivity(data.data ?? [])
      } catch {
        if (isMounted.current) setActivity([])
      } finally {
        if (isMounted.current) setActivityLoading(false)
      }
    }
    void run()
    return () => { isMounted.current = false }
  }, [refreshKey])


  useEffect(() => {
    isMounted.current = true
    const run = async () => {
      setMaintenanceLoading(true)
      try {
        const r = await fetch("/api/maintenance?days=7")
        const data: MaintenanceItem[] = await r.json()
        if (isMounted.current) setUpcomingMaintenance(data)
      } catch {
        if (isMounted.current) setUpcomingMaintenance([])
      } finally {
        if (isMounted.current) setMaintenanceLoading(false)
      }
    }
    void run()
    return () => { isMounted.current = false }
  }, [refreshKey])

  const handleRefresh = () => setRefreshKey((k) => k + 1)

  const firstName = session?.user?.name?.split(" ")[0] ?? ""

  // Alert severity: only flag non-zero counts
  const hasAlerts = stats && (stats.lowStockCount + stats.expiringCount + stats.overdueToolsCount) > 0

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("greeting", { name: firstName })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hier ist dein Überblick für heute
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 no-print">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5"
          >
            <IconRefresh className="size-3.5" />
            Aktualisieren
          </Button>
          <PrintButton />
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <section aria-label="Kennzahlen" className="px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-4 pt-6 pb-5">
                  <Skeleton className="size-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : stats ? (
            <>
              <KpiCard
                icon={IconPackage}
                iconBg="bg-blue-500/10"
                iconColor="text-blue-500"
                value={stats.materials.toLocaleString("de-CH")}
                label="Materialien"
                href="/dashboard/materials"
              />
              <KpiCard
                icon={IconTool}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-600"
                value={stats.tools.toLocaleString("de-CH")}
                label="Werkzeuge"
                href="/dashboard/tools"
              />
              <KpiCard
                icon={IconKey}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-600"
                value={stats.keys.toLocaleString("de-CH")}
                label="Schlüssel"
                href="/dashboard/keys"
              />
              <KpiCard
                icon={IconUsers}
                iconBg="bg-muted"
                iconColor="text-muted-foreground"
                value={stats.users}
                label="Nutzer"
                suffix={`/ ${stats.maxUsers}`}
                href="/dashboard/settings/users"
              />
            </>
          ) : (
            <Card className="col-span-full">
              <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                Statistiken konnten nicht geladen werden.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* ── Alert Cards ──────────────────────────────────────────────── */}
      {(loading || hasAlerts !== false) && (
        <section aria-label="Warnmeldungen" className="px-4 lg:px-6">
          {!loading && hasAlerts && (
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Handlungsbedarf
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-3">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <Skeleton className="size-9 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </CardContent>
                </Card>
              ))
            ) : stats ? (
              <>
                <AlertCard
                  icon={IconAlertTriangle}
                  borderColor="border-l-destructive"
                  iconColor="text-destructive"
                  bgColor="bg-destructive/10"
                  badgeVariant={stats.lowStockCount > 0 ? "destructive" : "secondary"}
                  label="Unter Meldebestand"
                  sublabel="Materialien mit zu wenig Bestand"
                  count={stats.lowStockCount}
                  href="/dashboard/materials?filter=lowStock"
                />
                <AlertCard
                  icon={IconClock}
                  borderColor="border-l-amber-500"
                  iconColor="text-amber-600"
                  bgColor="bg-amber-500/10"
                  badgeVariant={stats.expiringCount > 0 ? "default" : "secondary"}
                  label="Bald ablaufend"
                  sublabel="Ablaufdatum in 30 Tagen"
                  count={stats.expiringCount}
                  href="/dashboard/materials?filter=expiring"
                />
                <AlertCard
                  icon={IconTool}
                  borderColor="border-l-orange-500"
                  iconColor="text-orange-600"
                  bgColor="bg-orange-500/10"
                  badgeVariant={stats.overdueToolsCount > 0 ? "default" : "secondary"}
                  label="Überfällige Werkzeuge"
                  sublabel="Seit mehr als 7 Tagen ausgecheckt"
                  count={stats.overdueToolsCount}
                  href="/dashboard/tools?filter=overdue"
                />
              </>
            ) : null}
          </div>
        </section>
      )}

      {/* ── Main grid: Activity + Quick Actions ──────────────────────── */}
      <div className="grid grid-cols-1 gap-6 px-4 lg:px-6 @3xl/main:grid-cols-3">

        {/* Activity Feed — 2/3 width on larger screens */}
        <Card className="@3xl/main:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Letzte Aktivitäten</CardTitle>
              <CardDescription>Buchungen und Bestandsänderungen</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
              <Link href="/dashboard/history/stock-changes">
                Alle anzeigen
                <IconArrowRight className="size-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <ActivityFeedSkeleton />
            ) : activity.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Noch keine Aktivitäten vorhanden.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <ActivitySourceIcon source={item.source} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">
                        {buildDescription(item)}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <ActivityActionBadge action={item.action} />
                        {item.quantity !== null && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span className={`text-xs tabular-nums font-medium ${item.quantity < 0 ? "text-destructive" : "text-emerald-600"}`}>
                              {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <time
                      dateTime={item.createdAt}
                      className="shrink-0 text-xs text-muted-foreground"
                      title={new Date(item.createdAt).toLocaleString("de-CH")}
                    >
                      {formatRelativeTime(item.createdAt)}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions — 1/3 width */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Schnellaktionen</CardTitle>
            <CardDescription>Häufig verwendete Funktionen</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start gap-2.5 h-10" asChild>
              <Link href="/dashboard/materials/new">
                <span className="flex size-6 items-center justify-center rounded bg-blue-500/10">
                  <IconPackage className="size-3.5 text-blue-500" />
                </span>
                Material erfassen
              </Link>
            </Button>
            <Button variant="outline" className="justify-start gap-2.5 h-10" asChild>
              <Link href="/dashboard/tools/new">
                <span className="flex size-6 items-center justify-center rounded bg-emerald-500/10">
                  <IconTool className="size-3.5 text-emerald-600" />
                </span>
                Werkzeug erfassen
              </Link>
            </Button>
            <Button variant="outline" className="justify-start gap-2.5 h-10" asChild>
              <Link href="/dashboard/keys/new">
                <span className="flex size-6 items-center justify-center rounded bg-amber-500/10">
                  <IconKey className="size-3.5 text-amber-600" />
                </span>
                Schlüssel erfassen
              </Link>
            </Button>
            <Separator className="my-1" />
            <Button variant="outline" className="justify-start gap-2.5 h-10" asChild>
              <Link href="/dashboard/commissions">
                <span className="flex size-6 items-center justify-center rounded bg-primary/10">
                  <IconClipboardList className="size-3.5 text-primary" />
                </span>
                Lieferschein erstellen
              </Link>
            </Button>
            <Button variant="outline" className="justify-start gap-2.5 h-10" asChild>
              <Link href="/dashboard/history/stock-changes">
                <span className="flex size-6 items-center justify-center rounded bg-muted">
                  <IconEdit className="size-3.5 text-muted-foreground" />
                </span>
                Bestandsänderung buchen
              </Link>
            </Button>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="default" className="w-full gap-1.5" asChild>
              <Link href="/dashboard/materials/new">
                <IconPlus className="size-4" />
                Neues Element anlegen
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* ── Anstehende Wartungen Widget ──────────────────────────────── */}
      {(maintenanceLoading || upcomingMaintenance.length > 0) && (
        <section aria-label="Anstehende Wartungen" className="px-4 lg:px-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Anstehende Wartungen</CardTitle>
                <CardDescription>Werkzeuge mit Wartungsfälligkeit in den nächsten 7 Tagen</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
                <Link href="/dashboard/calendar">
                  Alle anzeigen
                  <IconArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {maintenanceLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-xl" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-28" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingMaintenance.slice(0, 5).map((item) => {
                    const isOverdue = item.status === "overdue"
                    const isThisWeek = item.status === "this-week"
                    return (
                      <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl
                          ${isOverdue ? "bg-destructive/10" : isThisWeek ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                          <IconTool className={`size-4
                            ${isOverdue ? "text-destructive" : isThisWeek ? "text-amber-600" : "text-emerald-600"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {isOverdue
                              ? `${Math.abs(item.daysUntil)} Tag${Math.abs(item.daysUntil) !== 1 ? "e" : ""} überfällig`
                              : `Fällig: ${new Date(item.nextMaintenanceDate + "T00:00:00").toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}`}
                            {item.assignedUserName && ` — ${item.assignedUserName}`}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/tools/${item.id}`}>
                            <IconCheck className="size-3.5 mr-1" />
                            Wartung
                          </Link>
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* ── Area Chart ───────────────────────────────────────────────── */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Buchungen — letzte 12 Monate</CardTitle>
            <CardDescription>Materialien / Werkzeuge / Schlüssel (Platzhalterdaten)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[260px] w-full rounded-lg" />
            ) : (
              <ChartContainer config={areaChartConfig} className="h-[260px] w-full">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradMaterials" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradTools" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--chart-2))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradKeys" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--chart-3))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11 }}
                    width={30}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    dataKey="materials"
                    type="monotone"
                    fill="url(#gradMaterials)"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="tools"
                    type="monotone"
                    fill="url(#gradTools)"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="keys"
                    type="monotone"
                    fill="url(#gradKeys)"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
