"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "Gerade eben"
  if (mins < 60) return `vor ${mins} Min.`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `vor ${hrs} Std.`
  return `vor ${Math.floor(hrs / 24)} Tag(en)`
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
        "flex flex-col gap-3 rounded-2xl p-8 border",
        alert
          ? "bg-red-950/60 border-red-700/50 text-red-100"
          : "bg-white/5 border-white/10 text-white",
      ].join(" ")}
    >
      <Icon className={`size-10 ${alert ? "text-red-400" : "text-blue-400"}`} />
      <span className="text-6xl font-black tabular-nums tracking-tight">{value}</span>
      <span className="text-2xl font-semibold text-white/70">{label}</span>
      {sub && <span className="text-lg text-white/50">{sub}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// View: KPI Overview
// ---------------------------------------------------------------------------
function KpiView({ stats }: { stats: DashboardStats | null }) {
  if (!stats) return <LoadingView label="KPI wird geladen..." />
  return (
    <section className="flex-1 flex flex-col gap-6 p-10">
      <h2 className="text-3xl font-bold text-white/60 uppercase tracking-widest">Übersicht</h2>
      <div className="flex-1 grid grid-cols-2 gap-6">
        <KpiCard icon={IconPackage} label="Materialien" value={stats.materials} />
        <KpiCard icon={IconTool} label="Werkzeuge" value={stats.tools} />
        <KpiCard
          icon={IconAlertTriangle}
          label="Niedriger Bestand"
          value={stats.lowStockCount}
          alert={stats.lowStockCount > 0}
          sub={stats.lowStockCount > 0 ? "Nachbestellung erforderlich" : "Alles im grünen Bereich"}
        />
        <KpiCard
          icon={IconClock}
          label="Überfällige Werkzeuge"
          value={stats.overdueToolsCount}
          alert={stats.overdueToolsCount > 0}
          sub={stats.overdueToolsCount > 0 ? "Rückgabe ausstehend" : "Alle zurückgegeben"}
        />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <KpiCard icon={IconKey} label="Schlüssel" value={stats.keys} />
        <KpiCard icon={IconUsers} label="Benutzer" value={stats.users} />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// View: Low Stock
// ---------------------------------------------------------------------------
function LowStockView({ items }: { items: LowStockItem[] | null }) {
  if (!items) return <LoadingView label="Bestand wird geladen..." />
  if (items.length === 0) {
    return (
      <EmptyView
        icon={IconPackage}
        title="Kein niedriger Bestand"
        sub="Alle Materialien sind ausreichend vorrätig."
      />
    )
  }
  return (
    <section className="flex-1 flex flex-col gap-6 p-10 overflow-hidden">
      <h2 className="text-3xl font-bold text-red-400 uppercase tracking-widest flex items-center gap-3">
        <IconAlertTriangle className="size-8" />
        Niedriger Bestand ({items.length})
      </h2>
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {items.slice(0, 10).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-6 rounded-xl px-6 py-4 bg-red-950/40 border border-red-800/40"
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
              <span className="text-lg text-white/40 shrink-0">/ {item.reorderLevel} Min.</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// View: Overdue Tools
// ---------------------------------------------------------------------------
function OverdueToolsView({ items }: { items: OverdueTool[] | null }) {
  if (!items) return <LoadingView label="Werkzeuge werden geladen..." />
  if (items.length === 0) {
    return (
      <EmptyView
        icon={IconTool}
        title="Keine überfälligen Werkzeuge"
        sub="Alle Werkzeuge wurden rechtzeitig zurückgegeben."
      />
    )
  }
  return (
    <section className="flex-1 flex flex-col gap-6 p-10 overflow-hidden">
      <h2 className="text-3xl font-bold text-orange-400 uppercase tracking-widest flex items-center gap-3">
        <IconClock className="size-8" />
        Überfällige Werkzeuge ({items.length})
      </h2>
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {items.slice(0, 10).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-6 rounded-xl px-6 py-4 bg-orange-950/30 border border-orange-800/30"
          >
            <span className="font-mono text-orange-400/70 text-xl w-28 shrink-0">
              {item.number ?? "—"}
            </span>
            <span className="flex-1 text-2xl font-semibold text-white truncate">{item.name}</span>
            <span className="text-xl text-orange-300 shrink-0">
              {item.assignedUserName ?? "Unbekannt"}
            </span>
            <IconChevronRight className="size-5 text-white/30" />
            <span className="text-xl text-white/50 shrink-0">
              {item.homeLocationName ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// View: Today's Activity
// ---------------------------------------------------------------------------
function ActivityView({ items }: { items: ActivityItem[] | null }) {
  if (!items) return <LoadingView label="Aktivität wird geladen..." />
  if (items.length === 0) {
    return (
      <EmptyView
        icon={IconActivity}
        title="Keine Aktivität heute"
        sub="Noch keine Buchungen in diesem Zeitraum."
      />
    )
  }
  return (
    <section className="flex-1 flex flex-col gap-6 p-10 overflow-hidden">
      <h2 className="text-3xl font-bold text-blue-400 uppercase tracking-widest flex items-center gap-3">
        <IconActivity className="size-8" />
        Letzte Aktivitäten
      </h2>
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {items.slice(0, 10).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-6 rounded-xl px-6 py-4 bg-white/5 border border-white/10"
          >
            <span
              className={[
                "text-lg font-bold rounded-lg px-3 py-1 w-32 text-center shrink-0",
                item.source === "stock"
                  ? "bg-blue-900/50 text-blue-300"
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
              {formatRelativeTime(item.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// View: Upcoming Maintenance
// ---------------------------------------------------------------------------
function MaintenanceView({ items }: { items: MaintenanceItem[] | null }) {
  if (!items) return <LoadingView label="Wartungen werden geladen..." />
  if (items.length === 0) {
    return (
      <EmptyView
        icon={IconTools}
        title="Keine anstehenden Wartungen"
        sub="Alle Werkzeuge sind auf dem aktuellen Stand."
      />
    )
  }
  return (
    <section className="flex-1 flex flex-col gap-6 p-10 overflow-hidden">
      <h2 className="text-3xl font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-3">
        <IconTools className="size-8" />
        Wartungen ({items.length})
      </h2>
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {items.slice(0, 10).map((item) => {
          const isOverdue = item.status === "overdue"
          const isThisWeek = item.status === "this-week"
          return (
            <div
              key={item.id}
              className={[
                "flex items-center gap-6 rounded-xl px-6 py-4 border",
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
                {isOverdue ? "Überfällig" : isThisWeek ? "Diese Woche" : `${item.daysUntil}d`}
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
      </div>
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
  const [pct, setPct] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    setPct(0)
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      setPct(Math.min(100, (elapsed / duration) * 100))
    }, 100)
    return () => clearInterval(id)
  }, [duration])

  return (
    <div className="h-1 w-full bg-white/10">
      <div
        className="h-full bg-blue-500 transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// View labels + icons for the tab indicator
// ---------------------------------------------------------------------------
const VIEW_META: Record<ViewId, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  kpi: { label: "KPI", icon: IconActivity },
  lowstock: { label: "Niedriger Bestand", icon: IconAlertTriangle },
  overdue: { label: "Überfällige Werkzeuge", icon: IconClock },
  activity: { label: "Aktivität", icon: IconActivity },
  maintenance: { label: "Wartungen", icon: IconTools },
}

// ---------------------------------------------------------------------------
// Main TV Dashboard Page
// ---------------------------------------------------------------------------
export default function TvPage() {
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
    void fetchData()
    const id = setInterval(() => void fetchData(), REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none font-sans">
      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-10 py-5 bg-black/40 border-b border-white/10 shrink-0">
        {/* Logo / org name */}
        <div className="flex items-center gap-3">
          <div className="text-2xl font-black tracking-tight">
            Logistik<span className="text-blue-400">App</span>
          </div>
          {orgName && (
            <>
              <span className="text-white/30 text-2xl">/</span>
              <span className="text-2xl font-semibold text-white/70">{orgName}</span>
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
                  ? "bg-blue-600 text-white"
                  : "bg-white/10 text-white/40 hover:bg-white/15 hover:text-white/60",
              ].join(" ")}
            >
              {VIEW_META[v].label}
            </button>
          ))}
        </div>

        {/* Clock */}
        <div className="text-right">
          <p className="text-4xl font-mono font-bold tabular-nums">{clock}</p>
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
      <footer className="shrink-0 px-10 py-3 bg-black/30 border-t border-white/5 flex items-center justify-between text-xs text-white/20">
        <span>Pfeiltasten: Ansicht wechseln &nbsp;·&nbsp; F11: Vollbild</span>
        <span>
          Automatische Aktualisierung alle {REFRESH_INTERVAL_MS / 1000} Sek.
          &nbsp;·&nbsp; Ansichtswechsel alle {VIEW_DURATION_MS / 1000} Sek.
        </span>
      </footer>
    </div>
  )
}
