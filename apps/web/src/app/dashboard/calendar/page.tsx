"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendar,
  IconTool,
  IconChecklist,
  IconFileInvoice,
  IconClipboardList,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// ── Types ──────────────────────────────────────────────────────────────
type EventType = "toolBooking" | "task" | "order" | "commission"

interface CalendarEvent {
  id: string
  type: EventType
  title: string
  subtitle?: string
  date: string // YYYY-MM-DD
  endDate?: string
  color: string
}

// ── Mock Data ──────────────────────────────────────────────────────────
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
  toolBooking: { icon: IconTool, label: "Werkzeug Buchungen", bg: "bg-primary/10", text: "text-primary" },
  task: { icon: IconChecklist, label: "Aufgaben", bg: "bg-primary/10", text: "text-primary" },
  order: { icon: IconFileInvoice, label: "Bestellungen", bg: "bg-secondary/10", text: "text-secondary" },
  commission: { icon: IconClipboardList, label: "Kommissionen", bg: "bg-muted", text: "text-muted-foreground" },
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  // Convert Sun=0 to Mon=0
  return (new Date(year, month, 1).getDay() + 6) % 7
}

// ── Page ───────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const t = useTranslations("calendar")

  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(new Set(["toolBooking", "task", "order", "commission"]))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

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
        const key = cur.toISOString().split("T")[0]
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(ev)
        cur.setDate(cur.getDate() + 1)
      }
    })
    return map
  }, [activeTypes])

  const selectedEvents = selectedDay ? (eventsForDate.get(selectedDay) ?? []) : []

  const todayStr = today.toISOString().split("T")[0]

  // Build grid cells
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Übersicht aller Buchungen, Aufgaben und Bestellungen
          </p>
        </div>
        {/* Legend / Filter */}
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <div className="flex gap-6">
        {/* Calendar Grid */}
        <Card className="border-0 shadow-sm flex-1">
          <CardContent className="p-0">
            {/* Month navigation */}
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

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map(day => (
                <div key={day} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Day grid */}
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
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`min-h-[96px] p-2 border-b border-r border-border cursor-pointer transition-colors
                      ${isWeekend ? "bg-muted/50" : ""}
                      ${isSelected ? "bg-primary/10 ring-2 ring-inset ring-primary/30" : "hover:bg-muted"}
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
                        <div key={ev.id} className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${ev.color} text-white`}>
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} weitere</div>
                      )}
                    </div>
                  </div>
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
                  <p className="text-sm text-muted-foreground">Tag auswählen um Ereignisse anzuzeigen</p>
                </div>

                {/* Upcoming events */}
                <div className="mt-2 border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Demnächst</p>
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
    </div>
  )
}
