"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  IconCalendar,
  IconCheck,
  IconX,
  IconTool,
  IconPackage,
  IconUser,
  IconRefresh,
  IconClockHour4,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ReservationEntry {
  id: string
  entityType: string
  entityId: string
  userId: string
  userName: string | null
  userEmail: string | null
  quantity: number | null
  startDate: string
  endDate: string
  purpose: string | null
  status: string
  createdAt: string
}

type StatusFilter = "all" | "pending" | "confirmed" | "active" | "completed" | "cancelled"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300">Ausstehend</Badge>
    case "confirmed":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300">Bestätigt</Badge>
    case "active":
      return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300">Aktiv</Badge>
    case "completed":
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400">Abgeschlossen</Badge>
    case "cancelled":
      return <Badge variant="destructive">Abgesagt</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function entityIcon(type: string) {
  return type === "tool"
    ? <IconTool className="size-3.5 text-muted-foreground" />
    : <IconPackage className="size-3.5 text-muted-foreground" />
}

function entityLabel(type: string) {
  return type === "tool" ? "Werkzeug" : "Material"
}

// ---------------------------------------------------------------------------
// Timeline View
// ---------------------------------------------------------------------------
function TimelineView({ reservations }: { reservations: ReservationEntry[] }) {
  const now = new Date()
  const days: string[] = []
  for (let i = -2; i < 28; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    days.push(d.toISOString().split("T")[0])
  }

  const active = reservations.filter(
    (r) => r.status !== "cancelled" && r.status !== "completed"
  )

  const byEntity: Record<string, ReservationEntry[]> = {}
  for (const r of active) {
    const key = `${r.entityType}:${r.entityId}`
    if (!byEntity[key]) byEntity[key] = []
    byEntity[key].push(r)
  }

  const entityKeys = Object.keys(byEntity)

  if (entityKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <IconCalendar className="size-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Keine aktiven Reservierungen</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header row — dates */}
        <div className="flex items-center gap-0 mb-1">
          <div className="w-48 shrink-0 text-xs font-medium text-muted-foreground px-2">
            Element
          </div>
          {days.map((day) => {
            const isToday = day === now.toISOString().split("T")[0]
            const d = new Date(day)
            return (
              <div
                key={day}
                className={`w-6 shrink-0 text-center text-[9px] leading-tight py-0.5 ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}
              >
                {d.getDate() === 1 || isToday
                  ? d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" })
                  : d.getDate()}
              </div>
            )
          })}
        </div>

        {/* Entity rows */}
        {entityKeys.map((key) => {
          const res = byEntity[key]
          const first = res[0]
          return (
            <div key={key} className="flex items-center gap-0 mb-0.5 group">
              <div className="w-48 shrink-0 flex items-center gap-2 px-2 py-1.5 text-xs rounded-l border border-r-0 bg-muted/30">
                {entityIcon(first.entityType)}
                <span className="truncate font-medium">
                  {entityLabel(first.entityType)} {first.entityId.slice(0, 6)}…
                </span>
              </div>
              {days.map((day) => {
                const occupied = res.filter(
                  (r) => r.startDate <= day && r.endDate >= day
                )
                const isToday = day === now.toISOString().split("T")[0]
                const cell = occupied.length > 0 ? occupied[0] : null
                const bg = !cell
                  ? "bg-muted/20"
                  : cell.status === "active"
                  ? "bg-green-200 dark:bg-green-800/50"
                  : cell.status === "confirmed"
                  ? "bg-blue-200 dark:bg-blue-800/50"
                  : "bg-yellow-200 dark:bg-yellow-800/50"

                return (
                  <div
                    key={day}
                    title={cell ? `${cell.userName || cell.userEmail || "Unbekannt"} — ${cell.purpose || ""}` : undefined}
                    className={`w-6 h-8 shrink-0 border-t border-b border-r ${bg} ${isToday ? "border-l-2 border-l-primary" : ""} transition-opacity`}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ReservationsPage() {
  const router = useRouter()
  const [reservations, setReservations] = useState<ReservationEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [entityTypeFilter, setEntityTypeFilter] = useState<"all" | "tool" | "material">("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [myOnly, setMyOnly] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (entityTypeFilter !== "all") params.set("entityType", entityTypeFilter)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      if (myOnly) params.set("mine", "true")

      const res = await fetch(`/api/reservations?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReservations(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [statusFilter, entityTypeFilter, startDate, endDate, myOnly])

  useEffect(() => {
    load()
  }, [load])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) await load()
    } catch {
      // silent
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" })
      if (res.ok) await load()
    } catch {
      // silent
    }
  }

  const pendingCount = reservations.filter((r) => r.status === "pending").length

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reservierungen</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Übersicht aller Reservierungen für Werkzeuge und Materialien
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load}>
          <IconRefresh className="size-4" />
          Aktualisieren
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Ausstehend",
            count: reservations.filter((r) => r.status === "pending").length,
            cls: "text-yellow-600",
          },
          {
            label: "Bestätigt",
            count: reservations.filter((r) => r.status === "confirmed").length,
            cls: "text-blue-600",
          },
          {
            label: "Aktiv",
            count: reservations.filter((r) => r.status === "active").length,
            cls: "text-green-600",
          },
          {
            label: "Gesamt",
            count: reservations.length,
            cls: "text-foreground",
          },
        ].map(({ label, count, cls }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </p>
              <p className={`mt-1 text-2xl font-bold ${cls}`}>{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="pending">Ausstehend</SelectItem>
                  <SelectItem value="confirmed">Bestätigt</SelectItem>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="completed">Abgeschlossen</SelectItem>
                  <SelectItem value="cancelled">Abgesagt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Typ</Label>
              <Select
                value={entityTypeFilter}
                onValueChange={(v) => setEntityTypeFilter(v as "all" | "tool" | "material")}
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="tool">Werkzeuge</SelectItem>
                  <SelectItem value="material">Materialien</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Von</Label>
              <Input
                type="date"
                className="h-8 text-xs w-36"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Bis</Label>
              <Input
                type="date"
                className="h-8 text-xs w-36"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Button
              variant={myOnly ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setMyOnly(!myOnly)}
            >
              <IconUser className="size-3.5" />
              Meine Reservierungen
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setStatusFilter("all")
                setEntityTypeFilter("all")
                setStartDate("")
                setEndDate("")
                setMyOnly(false)
              }}
            >
              Zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: List / Timeline */}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Liste</TabsTrigger>
          <TabsTrigger value="timeline">
            Zeitachse
            {pendingCount > 0 && (
              <span className="ml-1.5 flex size-4 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── List Tab ─────────────────────────────────────────────── */}
        <TabsContent value="list">
          <Card>
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <IconCalendar className="size-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Keine Reservierungen gefunden</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Element</TableHead>
                    <TableHead>Benutzer</TableHead>
                    <TableHead>Zeitraum</TableHead>
                    <TableHead>Zweck</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {entityIcon(r.entityType)}
                          <span className="text-xs font-medium">
                            {entityLabel(r.entityType)}
                          </span>
                          <button
                            className="text-xs text-muted-foreground font-mono hover:underline"
                            onClick={() =>
                              router.push(
                                `/dashboard/${r.entityType === "tool" ? "tools" : "materials"}/${r.entityId}`
                              )
                            }
                          >
                            {r.entityId.slice(0, 8)}…
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <IconUser className="size-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            {r.userName || r.userEmail || "Unbekannt"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <IconClockHour4 className="size-3.5" />
                          {formatDate(r.startDate)} – {formatDate(r.endDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                        {r.purpose || "—"}
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-green-700 border-green-200 hover:bg-green-50"
                                onClick={() => handleStatusChange(r.id, "confirmed")}
                              >
                                <IconCheck className="size-3.5" />
                                Bestätigen
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
                                onClick={() => handleStatusChange(r.id, "cancelled")}
                              >
                                <IconX className="size-3.5" />
                                Absagen
                              </Button>
                            </>
                          )}
                          {r.status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleStatusChange(r.id, "active")}
                            >
                              Aktivieren
                            </Button>
                          )}
                          {r.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleStatusChange(r.id, "completed")}
                            >
                              Abschliessen
                            </Button>
                          )}
                          {(r.status === "completed" || r.status === "cancelled") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(r.id)}
                            >
                              Löschen
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* ── Timeline Tab ─────────────────────────────────────────── */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zeitachse — nächste 30 Tage</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <TimelineView reservations={reservations} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
