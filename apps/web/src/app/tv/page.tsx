"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import type { ActivityItem } from "@/app/api/dashboard/activity/route"
import {
  IconPackage,
  IconTool,
  IconKey,
  IconUsers,
  IconAlertTriangle,
  IconClock,
  IconActivity,
  IconTools,
  IconChevronRight,
} from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DashboardStats {
  materials: number
  tools: number
  keys: number
  users: number
  lowStockCount: number
  expiringCount: number
  overdueToolsCount: number
}

interface LowStockItem {
  id: string
  name: string
  number: string | null
  totalStock: number
  reorderLevel: number | null
  mainLocationName: string | null
}

interface OverdueTool {
  id: string
  name: string
  number: string | null
  assignedUserName: string | null
  homeLocationName: string | null
  nextMaintenanceDate: string | null
  condition: string | null
}

interface MaintenanceItem {
  id: string
  name: string
  number: string | null
  nextMaintenanceDate: string
  status: "overdue" | "this-week" | "upcoming"
  daysUntil: number
  assignedUserName: string | null
  homeLocationName: string | null
}

type ViewId = "kpi" | "lowstock" | "overdue" | "activity" | "maintenance"

const VIEWS: ViewId[] = ["kpi", "lowstock", "overdue", "activity", "maintenance"]
const VIEW_DURATION_MS = 15_000
const REFRESH_INTERVAL_MS = 60_000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatRelativeTime(isoString: string, t: (key: string, values?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return t("justNow")
  if (mins < 60) return t("minutesAgo", { count: mins })
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return t("hoursAgo", { count: hrs })
  return t("daysAgo", { count: Math.floor(hrs / 24) })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function useNowClock(): string {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

/**
 * Auto-scrolling list container for TV mode.
 * If content overflows, smoothly scrolls down then snaps back to top.
 */
function AutoScrollList({ children, className }: { children: React.ReactNode; className?: string }) {
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    let raf: number
    let scrollY = 0
    const speed = 0.5 // px per frame

    function tick() {
      if (!node) return
      const maxScroll = node.scrollHeight - node.clientHeight
      if (maxScroll <= 0) return // fits on screen, no scrolling needed

      scrollY += speed
      if (scrollY >= maxScroll + 60) {
        // Pause at bottom, then snap back
        scrollY = 0
        node.scrollTop = 0
      } else {
        node.scrollTop = scrollY
      }
      raf = requestAnimationFrame(tick)
    }

    // Start after a short delay
    const timer = setTimeout(() => { raf = requestAnimationFrame(tick) }, 2000)
    return () => { clearTimeout(timer); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div ref={containerRef} className={`flex-1 overflow-hidden ${className ?? ""}`}>
      {children}
    </div>
  )
}

function useDateLabel(): string {
  const [label, setLabel] = useState("")
  useEffect(() => {
    const update = () =>
      setLabel(
        new Date().toLocaleDateString("de-CH", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      )
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])
  return label
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  sub?: string
  alert?: boolean
}) {
  return (
    <div
      className={[
        "flex flex-col gap-2 lg:gap-3 rounded-2xl p-4 lg:p-8 border",
        alert
          ? "bg-red-950/60 border-red-700/50 text-red-100"
          : "bg-white/5 border-white/10 text-white",
      ].join(" ")}
    >
      <Icon className={`size-6 lg:size-10 ${alert ? "text-red-400" : "text-primary"}`} />
      <span className="text-3xl lg:text-6xl font-black tabular-nums tracking-tight">{value}</span>
      <span className="text-base lg:text-2xl font-semibold text-white/70">{label}</span>
      {sub && <span className="text-lg text-white/50">{sub}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// View: KPI Overview
// ---------------------------------------------------------------------------
function KpiView({ stats }: { stats: DashboardStats | null }) {
  const t = useTranslations("tvDashboard")
  if (!stats) return <LoadingView label={t("kpiLoading")} />
  return (
    <section className="flex-1 flex flex-col gap-3 lg:gap-6 p-4 lg:p-10">
      <h2 className="text-xl lg:text-3xl font-bold text-white/60 uppercase tracking-widest">{t("overview")}</h2>
      <div className="flex-1 grid grid-cols-3 gap-3 lg:gap-6">
        <KpiCard icon={IconPackage} label={t("materials")} value={stats.materials} />
        <KpiCard icon={IconTool} label={t("tools")} value={stats.tools} />
        <KpiCard
          icon={IconAlertTriangle}
          label={t("lowStock")}
          value={stats.lowStockCount}
          alert={stats.lowStockCount > 0}
          sub={stats.lowStockCount > 0 ? t("reorderRequired") : t("allGood")}
        />
        <KpiCard
          icon={IconClock}
          label={t("overdueTools")}
          value={stats.overdueToolsCount}
          alert={stats.overdueToolsCount > 0}
          sub={stats.overdueToolsCount > 0 ? t("returnPending") : t("allReturned")}
        />
        <KpiCard icon={IconKey} label={t("keys")} value={stats.keys} />
        <KpiCard icon={IconUsers} label={t("users")} value={stats.users} />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// View: Low Stock
// ---------------------------------------------------------------------------
function LowStockView({ items }: { items: LowStockItem[] | null }) {
  const t = useTranslations("tvDashboard")
  if (!items) return <LoadingView label={t("stockLoading")} />
  if (items.length === 0) {
    return (
      <EmptyView
        icon={IconPackage}
        title={t("noLowStock")}
        sub={t("noLowStockDesc")}
      />
    )
  }
  return (
    <section className="flex-1 flex flex-col gap-3 lg:gap-6 p-4 lg:p-10 overflow-hidden">
      <h2 className="text-xl lg:text-3xl font-bold text-red-400 uppercase tracking-widest flex items-center gap-2 lg:gap-3">
        <IconAlertTriangle className="size-6 lg:size-8" />
        {t("lowStockCount", { count: items.length })}
      </h2>
      <AutoScrollList className="flex flex-col gap-2 lg:gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 lg:gap-6 rounded-xl px-3 lg:px-6 py-2 lg:py-4 bg-red-950/40 border border-red-800/40"
          >
            <span className="font-mono text-red-400/70 text-xl w-28 shrink-0">
              {item.number ?? "—"}
            </span>
            <span className="flex-1 text-2xl font-semibold text-white truncate">{item.name}</span>
            <span className="text-xl text-white/50 shrink-0">
              {item.mainLocationName ?? "—"}
            </span>
            <span className="text-3xl font-black text-red-400 tabular-nums w-24 text-right shrink-0">
              {item.totalStock}
            </span>
            {item.reorderLevel !== null && (
              <span className="text-lg text-white/40 shrink-0">/ {item.reorderLevel} {t("minLabel")}</span>
            )}
          </div>
        ))}
      </AutoScrollList>
    </section>
  )
}

// ---------------------------------------------------------------------------
// View: Overdue Tools
// ---------------------------------------------------------------------------
function OverdueToolsView({ items }: { items: OverdueTool[] | null }) {
  const t = useTranslations("tvDashboard")
  if (!items) return <LoadingView label={t("toolsLoading")} />
  if (items.length === 0) {
    return (
      <EmptyView
        icon={IconTool}
        title={t("noOverdueTools")}
        sub={t("noOverdueToolsDesc")}
      />
    )
  }
  return (
    <section className="flex-1 flex flex-col gap-3 lg:gap-6 p-4 lg:p-10 overflow-hidden">
      <h2 className="text-xl lg:text-3xl font-bold text-primary uppercase tracking-widest flex items-center gap-2 lg:gap-3">
        <IconClock className="size-6 lg:size-8" />
        {t("overdueToolsCount", { count: items.length })}
      </h2>
      <AutoScrollList className="flex flex-col gap-2 lg:gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 lg:gap-6 rounded-xl px-3 lg:px-6 py-2 lg:py-4 bg-primary/10 border border-primary/30"
          >
            <span className="font-mono text-primary/70 text-xl w-28 shrink-0">
              {item.number ?? "—"}
            </span>
            <span className="flex-1 text-2xl font-semibold text-white truncate">{item.name}</span>
            <span className="text-xl text-primary shrink-0">
              {item.assignedUserName ?? t("unknown")}
            </span>
            <IconChevronRight className="size-5 text-white/30" />
            <span className="text-xl text-white/50 shrink-0">
              {item.homeLocationName ?? "—"}
            </span>
          </div>
        ))}
      </AutoScrollList>
    </section>
  )
}

// ---------------------------------------------------------------------------
// View: Today's Activity
// ---------------------------------------------------------------------------
function ActivityView({ items }: { items: ActivityItem[] | null }) {
  const t = useTranslations("tvDashboard")
  if (!items) return <LoadingView label={t("activityLoading")} />
  if (items.length === 0) {
    return (
      <EmptyView
        icon={IconActivity}
        title={t("noActivity")}
        sub={t("noActivityDesc")}
      />
    )
  }
  return (
    <section className="flex-1 flex flex-col gap-3 lg:gap-6 p-4 lg:p-10 overflow-hidden">
      <h2 className="text-xl lg:text-3xl font-bold text-primary uppercase tracking-widest flex items-center gap-2 lg:gap-3">
        <IconActivity className="size-6 lg:size-8" />
        {t("recentActivity")}
      </h2>
      <AutoScrollList className="flex flex-col gap-2 lg:gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 lg:gap-6 rounded-xl px-3 lg:px-6 py-2 lg:py-4 bg-white/5 border border-white/10"
          >
            <span
              className={[
                "text-lg font-bold rounded-lg px-3 py-1 w-32 text-center shrink-0",
                item.source === "stock"
                  ? "bg-primary/20 text-primary"
                  : "bg-purple-900/50 text-purple-300",
              ].join(" ")}
            >
              {item.action}
            </span>
            <span className="flex-1 text-2xl font-semibold text-white truncate">
              {item.itemName}
            </span>
            {item.quantity !== null && (
              <span
                className={[
                  "text-2xl font-black tabular-nums w-20 text-right shrink-0",
                  item.quantity > 0 ? "text-green-400" : "text-red-400",
                ].join(" ")}
              >
                {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
              </span>
            )}
            <span className="text-xl text-white/50 shrink-0 w-36 text-right">
              {item.userName ?? "—"}
            </span>
            <span className="text-lg text-white/30 shrink-0 w-32 text-right">
              {formatRelativeTime(item.createdAt, t)}
            </span>
          </div>
        ))}
      </AutoScrollList>
    </section>
  )
}

// ---------------------------------------------------------------------------
// View: Upcoming Maintenance
// ---------------------------------------------------------------------------
function MaintenanceView({ items }: { items: MaintenanceItem[] | null }) {
  const t = useTranslations("tvDashboard")
  if (!items) return <LoadingView label={t("maintenanceLoading")} />
  if (items.length === 0) {
    return (
      <EmptyView
        icon={IconTools}
        title={t("noMaintenance")}
        sub={t("noMaintenanceDesc")}
      />
    )
  }
  return (
    <section className="flex-1 flex flex-col gap-3 lg:gap-6 p-4 lg:p-10 overflow-hidden">
      <h2 className="text-xl lg:text-3xl font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-2 lg:gap-3">
        <IconTools className="size-6 lg:size-8" />
        {t("maintenanceCount", { count: items.length })}
      </h2>
      <AutoScrollList className="flex flex-col gap-2 lg:gap-3">
        {items.map((item) => {
          const isOverdue = item.status === "overdue"
          const isThisWeek = item.status === "this-week"
          return (
            <div
              key={item.id}
              className={[
                "flex items-center gap-3 lg:gap-6 rounded-xl px-3 lg:px-6 py-2 lg:py-4 border",
                isOverdue
                  ? "bg-red-950/40 border-red-800/40"
                  : isThisWeek
                    ? "bg-yellow-950/30 border-yellow-800/30"
                    : "bg-white/5 border-white/10",
              ].join(" ")}
            >
              <span
                className={[
                  "text-lg font-bold rounded-lg px-3 py-1 w-28 text-center shrink-0",
                  isOverdue
                    ? "bg-red-900/60 text-red-300"
                    : isThisWeek
                      ? "bg-yellow-900/60 text-yellow-300"
                      : "bg-green-900/40 text-green-300",
                ].join(" ")}
              >
                {isOverdue ? t("overdue") : isThisWeek ? t("thisWeek") : `${item.daysUntil}d`}
              </span>
              <span className="font-mono text-white/40 text-xl w-28 shrink-0">
                {item.number ?? "—"}
              </span>
              <span className="flex-1 text-2xl font-semibold text-white truncate">{item.name}</span>
              <span className="text-xl text-white/50 shrink-0">
                {formatDate(item.nextMaintenanceDate)}
              </span>
            </div>
          )
        })}
      </AutoScrollList>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Loading / Empty helper views
// ---------------------------------------------------------------------------
function LoadingView({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <span className="text-3xl text-white/30 animate-pulse">{label}</span>
    </div>
  )
}

function EmptyView({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  sub: string
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-10">
      <Icon className="size-24 text-white/10" />
      <p className="text-4xl font-bold text-white/40">{title}</p>
      <p className="text-2xl text-white/25">{sub}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Progress bar (auto-advance indicator)
// ---------------------------------------------------------------------------
function ProgressBar({ duration }: { duration: number }) {
  const [started, setStarted] = useState(false)

  useEffect(() => {
    // Start at 0%, then trigger CSS transition to 100%
    const raf = requestAnimationFrame(() => setStarted(true))
    return () => { cancelAnimationFrame(raf); setStarted(false) }
  }, [duration])

  return (
    <div className="h-1 w-full bg-white/10">
      <div
        className="h-full bg-primary"
        style={{
          width: started ? "100%" : "0%",
          transition: started ? `width ${duration}ms linear` : "none",
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// View labels + icons for the tab indicator
// ---------------------------------------------------------------------------
const VIEW_META: Record<ViewId, { labelKey: string; icon: React.ComponentType<{ className?: string }> }> = {
  kpi: { labelKey: "viewKpi", icon: IconActivity },
  lowstock: { labelKey: "viewLowStock", icon: IconAlertTriangle },
  overdue: { labelKey: "viewOverdue", icon: IconClock },
  activity: { labelKey: "viewActivity", icon: IconActivity },
  maintenance: { labelKey: "viewMaintenance", icon: IconTools },
}

// ---------------------------------------------------------------------------
// Main TV Dashboard Page
// ---------------------------------------------------------------------------
export default function TvPage() {
  const t = useTranslations("tvDashboard")
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const clock = useNowClock()
  const dateLabel = useDateLabel()

  // Data state
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lowStock, setLowStock] = useState<LowStockItem[] | null>(null)
  const [overdueTools, setOverdueTools] = useState<OverdueTool[] | null>(null)
  const [activity, setActivity] = useState<ActivityItem[] | null>(null)
  const [maintenance, setMaintenance] = useState<MaintenanceItem[] | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)

  // View rotation
  const [viewIndex, setViewIndex] = useState(0)
  const currentView = VIEWS[viewIndex]!

  // Auth guard
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login")
    }
  }, [session, isPending, router])

  // Fetch all data
  const fetchData = useCallback(async () => {
    const [statsRes, activityRes, maintenanceRes, materialsRes, toolsRes] =
      await Promise.allSettled([
        fetch("/api/dashboard/stats"),
        fetch("/api/dashboard/activity"),
        fetch("/api/maintenance?days=30"),
        fetch("/api/materials?limit=50"),
        fetch("/api/tools?limit=50"),
      ])

    if (statsRes.status === "fulfilled" && statsRes.value.ok) {
      setStats(await statsRes.value.json())
    }

    if (activityRes.status === "fulfilled" && activityRes.value.ok) {
      const data = await activityRes.value.json()
      setActivity(data.data ?? data)
    }

    if (maintenanceRes.status === "fulfilled" && maintenanceRes.value.ok) {
      setMaintenance(await maintenanceRes.value.json())
    }

    if (materialsRes.status === "fulfilled" && materialsRes.value.ok) {
      const data = await materialsRes.value.json()
      const items: LowStockItem[] = (data.data ?? []).filter(
        (m: LowStockItem & { reorderLevel: number | null; totalStock: number }) =>
          m.reorderLevel !== null && m.totalStock < m.reorderLevel
      )
      setLowStock(items)
    }

    if (toolsRes.status === "fulfilled" && toolsRes.value.ok) {
      const data = await toolsRes.value.json()
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const overdue: OverdueTool[] = (data.data ?? []).filter(
        (t: OverdueTool & { assignedToId: string | null; updatedAt: string }) =>
          t.assignedToId !== null
      )
      setOverdueTools(overdue)
    }
  }, [])

  // Fetch org name
  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => (r.ok ? r.json() : null))
      .then((orgs) => {
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrgName(orgs[0].name ?? null)
        }
      })
      .catch(() => {})
  }, [])

  // Initial load + periodic refresh
  useEffect(() => {
    const controller = new AbortController()
    const load = () => { void fetchData() }
    // Defer initial load to avoid synchronous setState in effect
    const timeout = setTimeout(load, 0)
    const id = setInterval(load, REFRESH_INTERVAL_MS)
    return () => { controller.abort(); clearTimeout(timeout); clearInterval(id) }
  }, [fetchData])

  // Auto-advance view
  useEffect(() => {
    const id = setInterval(() => {
      setViewIndex((i) => (i + 1) % VIEWS.length)
    }, VIEW_DURATION_MS)
    return () => clearInterval(id)
  }, [])

  // Keyboard: F11 hint is informational; Escape handled by browser
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setViewIndex((i) => (i + 1) % VIEWS.length)
      if (e.key === "ArrowLeft") setViewIndex((i) => (i - 1 + VIEWS.length) % VIEWS.length)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  if (isPending || !session) return null

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col select-none font-sans overflow-hidden">
      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 lg:px-10 py-3 lg:py-5 bg-black/40 border-b border-white/10 shrink-0">
        {/* Logo / org name */}
        <div className="flex items-center gap-3">
          <div className="text-2xl font-black tracking-tight">
            Logistik<span className="text-primary">App</span>
          </div>
          {orgName && (
            <>
              <span className="text-white/30 text-2xl">/</span>
              <span className="text-base lg:text-2xl font-semibold text-white/70">{orgName}</span>
            </>
          )}
        </div>

        {/* View indicator */}
        <div className="flex items-center gap-2">
          {VIEWS.map((v, i) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewIndex(i)}
              className={[
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                i === viewIndex
                  ? "bg-primary text-white"
                  : "bg-white/10 text-white/40 hover:bg-white/15 hover:text-white/60",
              ].join(" ")}
            >
              {t(VIEW_META[v].labelKey)}
            </button>
          ))}
        </div>

        {/* Clock */}
        <div className="text-right">
          <p className="text-2xl lg:text-4xl font-mono font-bold tabular-nums">{clock}</p>
          <p className="text-base text-white/40 capitalize">{dateLabel}</p>
        </div>
      </header>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      <ProgressBar key={viewIndex} duration={VIEW_DURATION_MS} />

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {currentView === "kpi" && <KpiView stats={stats} />}
        {currentView === "lowstock" && <LowStockView items={lowStock} />}
        {currentView === "overdue" && <OverdueToolsView items={overdueTools} />}
        {currentView === "activity" && <ActivityView items={activity} />}
        {currentView === "maintenance" && <MaintenanceView items={maintenance} />}
      </main>

      {/* ── Footer hint ─────────────────────────────────────────────────────── */}
      <footer className="shrink-0 px-4 lg:px-10 py-2 lg:py-3 bg-black/30 border-t border-white/5 flex items-center justify-between text-xs text-white/20">
        <span>{t("footerKeys")}</span>
        <span>{t("footerRefresh", { refreshSec: REFRESH_INTERVAL_MS / 1000, viewSec: VIEW_DURATION_MS / 1000 })}</span>
      </footer>
    </div>
  )
}
