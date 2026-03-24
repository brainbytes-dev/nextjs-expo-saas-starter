"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconTool,
  IconChecklist,
  IconFileInvoice,
  IconClipboardList,
  IconAlertTriangle,
  IconFilter,
  IconCheck,
  IconLink,
  IconLoader2,
  IconCopy,
  IconCopyCheck,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

// ── Types ──────────────────────────────────────────────────────────────
type EventType = "toolBooking" | "task" | "order" | "commission" | "expiringMaterial"
type MaintenanceStatus = "overdue" | "this-week" | "upcoming"
type MaintenanceFilter = "all" | "overdue" | "this-week" | "upcoming"

interface CalendarEvent {
  id: string
  type: EventType
  title: string
  subtitle?: string
  date: string
  endDate?: string
  color: string
}

interface MaintenanceItem {
  id: string
  number: string | null
  name: string
  nextMaintenanceDate: string
  lastMaintenanceDate: string | null
  maintenanceIntervalDays: number | null
  assignedToId: string | null
  assignedUserName: string | null
  homeLocationName: string | null
  condition: string | null
  status: MaintenanceStatus
  daysUntil: number
}

interface ExpiringMaterial {
  stockId: string
  materialId: string
  materialName: string
  expiryDate: string
  quantity: number
  unit: string
  batchNumber: string | null
  daysUntil: number
}

// ── Mock calendar data ─────────────────────────────────────────────────
const MOCK_EVENTS: CalendarEvent[] = [
  { id: "1", type: "toolBooking", title: "Hilti TE 70-ATC", subtitle: "Thomas Müller → Baustelle Oerlikon", date: "2025-03-17", endDate: "2025-03-21", color: "bg-primary" },
  { id: "2", type: "toolBooking", title: "Bosch GBH 5-40 DE", subtitle: "Anna Weber → Baustelle Winterthur", date: "2025-03-18", endDate: "2025-03-19", color: "bg-primary" },
  { id: "3", type: "task", title: "Wartung Hilti TE 70", subtitle: "Thomas Müller — Hoch", date: "2025-03-25", color: "bg-primary" },
  { id: "4", type: "task", title: "Reparatur Bosch GBH", subtitle: "Anna Weber — In Bearbeitung", date: "2025-03-20", color: "bg-primary" },
  { id: "5", type: "order", title: "Bestellung Hilti AG", subtitle: "BO-2025-041", date: "2025-03-22", color: "bg-secondary" },
  { id: "6", type: "commission", title: "Kommission K-2025-007", subtitle: "Baustelle Nord → Lieferung", date: "2025-03-28", color: "bg-muted-foreground" },
  { id: "7", type: "toolBooking", title: "Kompressor Atlas Copco", subtitle: "Peter Keller → Lager B", date: "2025-03-24", endDate: "2025-03-26", color: "bg-primary" },
  { id: "8", type: "task", title: "Inspektion Sicherheitsventil", subtitle: "Sandra Huber — Mittel", date: "2025-03-19", color: "bg-primary" },
  { id: "9", type: "order", title: "Bestellung Würth Schweiz", subtitle: "BO-2025-042 — Geliefert", date: "2025-03-14", color: "bg-secondary" },
  { id: "10", type: "toolBooking", title: "Winkelschleifer Makita", subtitle: "Peter Keller → Baustelle Süd", date: "2025-03-10", endDate: "2025-03-12", color: "bg-primary" },
  { id: "11", type: "commission", title: "Kommission K-2025-006", subtitle: "Elektroinstallation Oerlikon", date: "2025-03-15", color: "bg-muted-foreground" },
  { id: "12", type: "task", title: "Beschaffung Kabelrohr 20mm", subtitle: "Peter Keller — Offen", date: "2025-03-30", color: "bg-primary" },
]

const EVENT_TYPE_CONFIG: Record<EventType, { icon: React.ComponentType<{ className?: string }>; label: string; bg: string; text: string }> = {
  toolBooking: { icon: IconTool, label: "toolBookings", bg: "bg-primary/10", text: "text-primary" },
  task: { icon: IconChecklist, label: "tasks", bg: "bg-primary/10", text: "text-primary" },
  order: { icon: IconFileInvoice, label: "orders", bg: "bg-secondary/10", text: "text-secondary" },
  commission: { icon: IconClipboardList, label: "commissions", bg: "bg-muted", text: "text-muted-foreground" },
  expiringMaterial: { icon: IconAlertTriangle, label: "Ablaufdaten", bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400" },
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7
}

// ── Status helpers ──────────────────────────────────────────────────────
function getStatusConfig(t: (key: string) => string): Record<MaintenanceStatus, { label: string; badgeClass: string; rowClass: string }> {
  return {
    overdue: {
      label: t("overdue"),
      badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
      rowClass: "border-l-4 border-l-destructive",
    },
    "this-week": {
      label: t("thisWeek"),
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
      rowClass: "border-l-4 border-l-amber-500",
    },
    upcoming: {
      label: t("upcoming"),
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      rowClass: "border-l-4 border-l-emerald-500",
    },
  }
}

function getFilterLabels(t: (key: string) => string): Record<MaintenanceFilter, string> {
  return {
    all: t("all"),
    overdue: t("overdue"),
    "this-week": t("thisWeek"),
    upcoming: t("upcoming"),
  }
}

// ── iCal subscription button ────────────────────────────────────────────

function IcalSubscribeButton() {
  const t = useTranslations("calendar")
  const [loading, setLoading] = useState(false)
  const [feedUrl, setFeedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generateToken = useCallback(async () => {
    if (feedUrl) return
    setLoading(true)
    try {
      const res = await fetch("/api/maintenance/ical", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        setFeedUrl(data.feedUrl)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [feedUrl])

  const copyUrl = useCallback(async () => {
    if (!feedUrl) return
    try {
      await navigator.clipboard.writeText(feedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }, [feedUrl])

  if (!feedUrl) {
    return (
      <Button variant="outline" size="sm" onClick={generateToken} disabled={loading}>
        {loading ? (
          <IconLoader2 className="size-4 animate-spin" />
        ) : (
          <IconLink className="size-4" />
        )}
        {t("subscribe")}
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
      <IconLink className="size-4 shrink-0 text-muted-foreground" />
      <input
        readOnly
        value={feedUrl}
        className="min-w-0 flex-1 bg-transparent text-xs font-mono text-muted-foreground focus:outline-none"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2" onClick={copyUrl}>
        {copied ? (
          <IconCopyCheck className="size-4 text-secondary" />
        ) : (
          <IconCopy className="size-4" />
        )}
      </Button>
    </div>
  )
}

// ── Maintenance Row ─────────────────────────────────────────────────────

function MaintenanceRow({
  item,
  onComplete,
  onReschedule,
  rescheduling,
}: {
  item: MaintenanceItem
  onComplete: (id: string) => void
  onReschedule: (id: string, newDate: string) => void
  rescheduling: boolean
}) {
  const t = useTranslations("calendar")
  const tc = useTranslations("common")
  const [completing, setCompleting] = useState(false)
  const STATUS_CONFIG = getStatusConfig(t)
  const cfg = STATUS_CONFIG[item.status]

  const handleComplete = async () => {
    setCompleting(true)
    try {
      const res = await fetch(`/api/tools/${item.id}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Maintenance completed" }),
      })
      if (res.ok) {
        onComplete(item.id)
      }
    } catch {
      // silent
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg bg-card border ${cfg.rowClass}`}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
        <IconTool className="size-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{item.name}</p>
          {item.number && (
            <span className="text-xs text-muted-foreground">#{item.number}</span>
          )}
          <span
            className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}
          >
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-muted-foreground">
          <span>
            {t("due")}:{" "}
            <strong className="text-foreground">
              {new Date(item.nextMaintenanceDate + "T00:00:00").toLocaleDateString("de-CH", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </strong>
          </span>
          {item.daysUntil < 0 && (
            <span className="text-destructive font-medium">
              {Math.abs(item.daysUntil)} Tag{Math.abs(item.daysUntil) !== 1 ? "e" : ""} überfällig
            </span>
          )}
          {item.assignedUserName && <span>{t("assignedTo")}: {item.assignedUserName}</span>}
          {item.homeLocationName && <span>{t("location")}: {item.homeLocationName}</span>}
        </div>
        {/* Reschedule date input */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">{t("reschedule")}:</span>
          <input
            type="date"
            defaultValue={item.nextMaintenanceDate}
            className="rounded border border-input bg-background px-2 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            onChange={(e) => {
              if (e.target.value) onReschedule(item.id, e.target.value)
            }}
            disabled={rescheduling}
          />
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/tools/${item.id}`}>{tc("details")}</Link>
        </Button>
        <Button
          size="sm"
          onClick={handleComplete}
          disabled={completing}
          className="gap-1.5"
        >
          <IconCheck className="size-3.5" />
          {completing ? "..." : t("performMaintenance")}
        </Button>
      </div>
    </div>
  )
}

// ── Calendar day cell (drag target) ─────────────────────────────────────

interface DayCellProps {
  day: number
  dateStr: string
  dayEvents: CalendarEvent[]
  isToday: boolean
  isSelected: boolean
  isWeekend: boolean
  onSelect: (dateStr: string | null) => void
  onDropMaintenance: (toolId: string, newDate: string) => void
}

function DayCell({
  day,
  dateStr,
  dayEvents,
  isToday,
  isSelected,
  isWeekend,
  onSelect,
  onDropMaintenance,
}: DayCellProps) {
  const t = useTranslations("calendar")
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onClick={() => onSelect(isSelected ? null : dateStr)}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const toolId = e.dataTransfer.getData("text/plain")
        if (toolId) onDropMaintenance(toolId, dateStr)
      }}
      className={`min-h-[96px] p-2 border-b border-r border-border cursor-pointer transition-colors
        ${isWeekend ? "bg-muted/50" : ""}
        ${isSelected ? "bg-primary/10 ring-2 ring-inset ring-primary/30" : "hover:bg-muted"}
        ${dragOver ? "bg-primary/20 ring-2 ring-inset ring-primary/50" : ""}
      `}
    >
      <div className="flex justify-end mb-1">
        <span className={`inline-flex items-center justify-center size-6 text-xs font-medium rounded-full
          ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
          {day}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        {dayEvents.slice(0, 3).map(ev => (
          <div
            key={ev.id}
            draggable={ev.id.startsWith("maint-")}
            onDragStart={(e) => {
              if (ev.id.startsWith("maint-")) {
                e.dataTransfer.setData("text/plain", ev.id.replace("maint-", ""))
              }
            }}
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${ev.color} text-white
              ${ev.id.startsWith("maint-") ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            {ev.title}
          </div>
        ))}
        {dayEvents.length > 3 && (
          <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} {t("more")}</div>
        )}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const t = useTranslations("calendar")

  const STATUS_CONFIG = getStatusConfig(t)
  const FILTER_LABELS = getFilterLabels(t)

  const MONTHS = t("months").split(",")
  const WEEKDAYS = t("weekdays").split(",")

  // ── Calendar state ─────────────────────────────────────────────────
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set(["toolBooking", "task", "order", "commission", "expiringMaterial"]))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // ── Maintenance state ──────────────────────────────────────────────
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([])
  const [maintenanceLoading, setMaintenanceLoading] = useState(true)
  const [filter, setFilter] = useState<MaintenanceFilter>("all")
  const [activeTab, setActiveTab] = useState<"calendar" | "maintenance">("calendar")
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const isMounted = useRef(true)

  // ── Expiring materials state ────────────────────────────────────────
  const [expiringMaterials, setExpiringMaterials] = useState<ExpiringMaterial[]>([])

  useEffect(() => {
    isMounted.current = true
    const load = async () => {
      try {
        const res = await fetch("/api/maintenance?days=30")
        if (res.ok) {
          const data: MaintenanceItem[] = await res.json()
          if (isMounted.current) setMaintenance(data)
        }
      } catch {
        // silent — no maintenance data
      } finally {
        if (isMounted.current) setMaintenanceLoading(false)
      }
    }
    void load()

    // Fetch expiring materials (next 90 days)
    const loadExpiring = async () => {
      try {
        const res = await fetch("/api/materials/expiring?days=90")
        if (res.ok) {
          const data: ExpiringMaterial[] = await res.json()
          if (isMounted.current) setExpiringMaterials(data)
        }
      } catch {
        // silent — no expiring material data
      }
    }
    void loadExpiring()

    return () => { isMounted.current = false }
  }, [])

  const handleMaintenanceComplete = (id: string) => {
    setMaintenance((prev) => prev.filter((m) => m.id !== id))
  }

  // Reschedule: PATCH nextMaintenanceDate
  const handleReschedule = useCallback(async (toolId: string, newDate: string) => {
    setReschedulingId(toolId)
    try {
      const res = await fetch(`/api/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextMaintenanceDate: newDate }),
      })
      if (res.ok) {
        const today = new Date().toISOString().split("T")[0]!
        setMaintenance((prev) =>
          prev.map((m) => {
            if (m.id !== toolId) return m
            const daysUntil = Math.ceil(
              (new Date(newDate).getTime() - new Date(today).getTime()) / 86_400_000
            )
            let status: MaintenanceStatus
            if (newDate < today) status = "overdue"
            else if (daysUntil <= 7) status = "this-week"
            else status = "upcoming"
            return { ...m, nextMaintenanceDate: newDate, daysUntil, status }
          })
        )
      }
    } catch {
      // silent
    } finally {
      setReschedulingId(null)
    }
  }, [])

  const filteredMaintenance = useMemo(() => {
    if (filter === "all") return maintenance
    return maintenance.filter((m) => m.status === filter)
  }, [maintenance, filter])

  // counts for filter pills
  const counts = useMemo(() => ({
    all: maintenance.length,
    overdue: maintenance.filter((m) => m.status === "overdue").length,
    "this-week": maintenance.filter((m) => m.status === "this-week").length,
    upcoming: maintenance.filter((m) => m.status === "upcoming").length,
  }), [maintenance])

  // ── Calendar helpers ───────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOffset = getFirstDayOfMonth(currentYear, currentMonth)

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  function toggleType(type: EventType) {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const eventsForDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    MOCK_EVENTS.forEach(ev => {
      if (!activeTypes.has(ev.type)) return
      const start = new Date(ev.date)
      const end = ev.endDate ? new Date(ev.endDate) : start
      const cur = new Date(start)
      while (cur <= end) {
        const key = cur.toISOString().split("T")[0]!
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(ev)
        cur.setDate(cur.getDate() + 1)
      }
    })
    // Overlay maintenance events on calendar with color coding
    maintenance.forEach(item => {
      const key = item.nextMaintenanceDate
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push({
        id: `maint-${item.id}`,
        type: "task",
        title: `${t("maintenancePlanner")}: ${item.name}`,
        subtitle: STATUS_CONFIG[item.status].label,
        date: key,
        color: item.status === "overdue"
          ? "bg-destructive"
          : item.status === "this-week"
            ? "bg-amber-500"
            : "bg-emerald-500",
      })
    })
    // Overlay expiring material events
    if (activeTypes.has("expiringMaterial")) {
      expiringMaterials.forEach(item => {
        const key = item.expiryDate
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push({
          id: `expiry-${item.stockId}`,
          type: "expiringMaterial",
          title: item.materialName,
          subtitle: `${item.quantity} ${item.unit}${item.batchNumber ? ` — ${item.batchNumber}` : ""} — ${item.daysUntil} Tage`,
          date: key,
          color: item.daysUntil <= 7 ? "bg-red-500" : item.daysUntil <= 30 ? "bg-amber-500" : "bg-orange-400",
        })
      })
    }
    return map
  }, [activeTypes, maintenance, expiringMaterials, t, STATUS_CONFIG])

  const selectedEvents = selectedDay ? (eventsForDate.get(selectedDay) ?? []) : []
  const todayStr = today.toISOString().split("T")[0]!

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {counts.overdue > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
              <IconAlertTriangle className="size-4 text-destructive shrink-0" />
              <span className="text-sm font-medium text-destructive">
                {counts.overdue} überfällige Wartung{counts.overdue !== 1 ? "en" : ""}
              </span>
            </div>
          )}
          <IcalSubscribeButton />
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
            ${activeTab === "calendar"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <span className="flex items-center gap-2">
            <IconCalendar className="size-4" />
            Kalender
          </span>
        </button>
        <button
          onClick={() => setActiveTab("maintenance")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px
            ${activeTab === "maintenance"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <span className="flex items-center gap-2">
            <IconTool className="size-4" />
            Wartungsplaner
            {counts.overdue > 0 && (
              <span className="inline-flex items-center justify-center size-5 text-[11px] font-bold rounded-full bg-destructive text-destructive-foreground">
                {counts.overdue}
              </span>
            )}
          </span>
        </button>
      </div>

      {/* ── CALENDAR TAB ─────────────────────────────────────────────── */}
      {activeTab === "calendar" && (
        <>
          {/* Legend / Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]).map(([type, cfg]) => {
              const Icon = cfg.icon
              const active = activeTypes.has(type)
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer
                    ${active ? `${cfg.bg} ${cfg.text} border-transparent` : "bg-background text-muted-foreground border-border opacity-50"}`}
                >
                  <Icon className="size-3.5" />
                  {cfg.label}
                </button>
              )
            })}
            {/* Maintenance color legend */}
            <div className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-full bg-destructive" /> Überfällig</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-full bg-amber-500" /> Diese Woche</span>
              <span className="flex items-center gap-1"><span className="inline-block size-2.5 rounded-full bg-emerald-500" /> Demnächst</span>
            </div>
          </div>

          <div className="flex gap-6">
            {/* Calendar Grid */}
            <Card className="border-0 shadow-sm flex-1">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <Button variant="ghost" size="icon" onClick={prevMonth}>
                    <IconChevronLeft className="size-4" />
                  </Button>
                  <h2 className="text-base font-semibold text-foreground">
                    {MONTHS[currentMonth]} {currentYear}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <IconChevronRight className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 border-b border-border">
                  {WEEKDAYS.map((day: string) => (
                    <div key={day} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {cells.map((day, i) => {
                    if (day === null) {
                      return <div key={`empty-${i}`} className="min-h-[96px] border-b border-r border-border" />
                    }
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    const dayEvents = eventsForDate.get(dateStr) ?? []
                    const isToday = dateStr === todayStr
                    const isSelected = dateStr === selectedDay
                    const isWeekend = (i % 7) >= 5

                    return (
                      <DayCell
                        key={dateStr}
                        day={day}
                        dateStr={dateStr}
                        dayEvents={dayEvents}
                        isToday={isToday}
                        isSelected={isSelected}
                        isWeekend={isWeekend}
                        onSelect={setSelectedDay}
                        onDropMaintenance={handleReschedule}
                      />
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Side panel */}
            <div className="w-72 flex-shrink-0">
              {selectedDay ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      {new Date(selectedDay + "T00:00:00").toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" })}
                    </h3>
                    {selectedEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {selectedEvents.map(ev => {
                          const cfg = EVENT_TYPE_CONFIG[ev.type]
                          const Icon = cfg.icon
                          return (
                            <div key={ev.id} className={`rounded-lg p-3 ${cfg.bg}`}>
                              <div className={`flex items-center gap-1.5 text-xs font-semibold ${cfg.text} mb-1`}>
                                <Icon className="size-3.5" />
                                {cfg.label}
                              </div>
                              <p className={`text-sm font-medium ${cfg.text}`}>{ev.title}</p>
                              {ev.subtitle && (
                                <p className={`text-xs mt-0.5 opacity-70 ${cfg.text}`}>{ev.subtitle}</p>
                              )}
                              {ev.endDate && ev.endDate !== ev.date && (
                                <p className={`text-xs mt-1 opacity-60 ${cfg.text}`}>
                                  bis {new Date(ev.endDate + "T00:00:00").toLocaleDateString("de-CH", { day: "numeric", month: "short" })}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                      <IconCalendar className="size-10 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">{t("selectDay")}</p>
                      <p className="text-xs text-muted-foreground/70">{t("dragHint")}</p>
                    </div>

                    <div className="mt-2 border-t border-border pt-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("upcoming")}</p>
                      {MOCK_EVENTS
                        .filter(ev => activeTypes.has(ev.type) && ev.date >= todayStr)
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .slice(0, 5)
                        .map(ev => {
                          const cfg = EVENT_TYPE_CONFIG[ev.type]
                          const Icon = cfg.icon
                          return (
                            <div key={ev.id} className="flex gap-2.5 py-2 border-b border-border last:border-0">
                              <span className={`inline-flex items-center justify-center size-7 rounded-lg flex-shrink-0 ${cfg.bg}`}>
                                <Icon className={`size-3.5 ${cfg.text}`} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{ev.title}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(ev.date + "T00:00:00").toLocaleDateString("de-CH", { day: "numeric", month: "short" })}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── MAINTENANCE TAB ──────────────────────────────────────────── */}
      {activeTab === "maintenance" && (
        <div className="space-y-4">
          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <IconFilter className="size-4 text-muted-foreground shrink-0" />
            {(Object.keys(FILTER_LABELS) as MaintenanceFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer
                  ${filter === f
                    ? "bg-foreground text-background border-transparent"
                    : "bg-background text-muted-foreground border-border hover:border-foreground/30"}`}
              >
                {FILTER_LABELS[f]}
                <Badge
                  variant="secondary"
                  className="ml-0.5 px-1.5 py-0 text-[10px] h-4 tabular-nums"
                >
                  {counts[f]}
                </Badge>
              </button>
            ))}
          </div>

          {maintenanceLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredMaintenance.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <IconTool className="size-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {filter === "all"
                    ? t("noMaintenanceAll")
                    : `Keine Einträge für Filter: ${FILTER_LABELS[filter]}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("maintenanceHint")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMaintenance.map((item) => (
                <MaintenanceRow
                  key={item.id}
                  item={item}
                  onComplete={handleMaintenanceComplete}
                  onReschedule={handleReschedule}
                  rescheduling={reschedulingId === item.id}
                />
              ))}
            </div>
          )}

          {/* Summary card */}
          {!maintenanceLoading && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{t("summary30")}</CardTitle>
                <CardDescription>{t("maintenanceNext30")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {(["overdue", "this-week", "upcoming"] as MaintenanceStatus[]).map((s) => {
                    const cfg = STATUS_CONFIG[s]
                    return (
                      <div key={s} className="space-y-1">
                        <p className={`text-2xl font-bold tabular-nums ${
                          s === "overdue" ? "text-destructive" :
                          s === "this-week" ? "text-amber-600" :
                          "text-emerald-600"
                        }`}>
                          {counts[s]}
                        </p>
                        <p className="text-xs text-muted-foreground">{cfg.label}</p>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
