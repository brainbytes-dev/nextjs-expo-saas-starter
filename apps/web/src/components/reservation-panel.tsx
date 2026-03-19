"use client"

import { useState, useEffect, useCallback } from "react"
import {
  IconCalendar,
  IconPlus,
  IconAlertTriangle,
  IconCheck,
  IconX,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

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

type ReservationStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled"

interface ReservationPanelProps {
  entityType: "tool" | "material"
  entityId: string
  showQuantity?: boolean
  currentUserId?: string
  isAdmin?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

function statusDot(status: string) {
  switch (status) {
    case "pending":    return "bg-yellow-400"
    case "confirmed":  return "bg-blue-500"
    case "active":     return "bg-green-500"
    case "completed":  return "bg-gray-400"
    case "cancelled":  return "bg-red-400"
    default:           return "bg-gray-300"
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function today() {
  return new Date().toISOString().split("T")[0]
}

// ---------------------------------------------------------------------------
// Mini calendar row component
// ---------------------------------------------------------------------------
function CalendarTimeline({ reservations }: { reservations: ReservationEntry[] }) {
  // Build a 30-day window from today
  const now = new Date()
  const days: Date[] = []
  for (let i = 0; i < 30; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    days.push(d)
  }

  const activeRes = reservations.filter(
    (r) => r.status !== "cancelled" && r.status !== "completed"
  )

  return (
    <div className="mt-4 overflow-x-auto">
      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Nächste 30 Tage
      </p>
      <div className="flex gap-0.5 min-w-max">
        {days.map((day) => {
          const dayStr = day.toISOString().split("T")[0]
          const occupied = activeRes.filter(
            (r) => r.startDate <= dayStr && r.endDate >= dayStr
          )
          const isToday = dayStr === today()
          const statusClass =
            occupied.length === 0
              ? "bg-muted"
              : occupied[0].status === "active"
              ? "bg-green-400 dark:bg-green-600"
              : occupied[0].status === "confirmed"
              ? "bg-blue-400 dark:bg-blue-600"
              : "bg-yellow-400 dark:bg-yellow-600"

          return (
            <div
              key={dayStr}
              title={`${formatDate(dayStr)}${occupied.length > 0 ? " — " + occupied.map((r) => r.userName || r.userEmail || "Unbekannt").join(", ") : ""}`}
              className="flex flex-col items-center gap-0.5"
            >
              <div
                className={`h-8 w-5 rounded-sm ${statusClass} ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
              />
              {day.getDate() === 1 || isToday ? (
                <span className="text-[9px] text-muted-foreground">
                  {day.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" })}
                </span>
              ) : (
                <span className="text-[9px] text-transparent select-none">--</span>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-yellow-400 inline-block" />Ausstehend</span>
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-blue-400 inline-block" />Bestätigt</span>
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-green-400 inline-block" />Aktiv</span>
        <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-muted inline-block border" />Frei</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function ReservationPanel({
  entityType,
  entityId,
  showQuantity = false,
  currentUserId,
  isAdmin = false,
}: ReservationPanelProps) {
  const [reservations, setReservations] = useState<ReservationEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [hasConflict, setHasConflict] = useState(false)

  // Form state
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [purpose, setPurpose] = useState("")
  const [quantity, setQuantity] = useState(1)

  const loadReservations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/reservations?entityType=${entityType}&entityId=${entityId}`
      )
      if (res.ok) {
        const data = await res.json()
        setReservations(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  const handleSubmit = async () => {
    if (!startDate || !endDate) return
    setSubmitting(true)
    setHasConflict(false)
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          startDate,
          endDate,
          purpose: purpose.trim() || undefined,
          quantity: showQuantity ? quantity : 1,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.hasConflict) {
          setHasConflict(true)
        }
        await loadReservations()
        setShowDialog(false)
        setStartDate("")
        setEndDate("")
        setPurpose("")
        setQuantity(1)
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) await loadReservations()
    } catch {
      // silent
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, { method: "DELETE" })
      if (res.ok) await loadReservations()
    } catch {
      // silent
    }
  }

  const upcoming = reservations.filter(
    (r) => r.status !== "cancelled" && r.status !== "completed"
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <IconCalendar className="size-4" />
            Reservierungen
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
            <IconPlus className="size-4" />
            Reservieren
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-16 animate-pulse rounded bg-muted" />
        ) : (
          <>
            <CalendarTimeline reservations={reservations} />

            {upcoming.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Aktive Reservierungen
                </p>
                {upcoming.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                  >
                    <span
                      className={`mt-1 size-2.5 shrink-0 rounded-full ${statusDot(r.status)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {r.userName || r.userEmail || "Unbekannt"}
                        </span>
                        {statusBadge(r.status)}
                        {showQuantity && r.quantity && r.quantity > 1 && (
                          <Badge variant="outline">{r.quantity}×</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        {formatDate(r.startDate)} – {formatDate(r.endDate)}
                      </p>
                      {r.purpose && (
                        <p className="text-muted-foreground text-xs mt-0.5 truncate">
                          {r.purpose}
                        </p>
                      )}
                    </div>
                    {isAdmin && r.status === "pending" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Bestätigen"
                          onClick={() => handleStatusChange(r.id, "confirmed")}
                        >
                          <IconCheck className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-destructive hover:bg-destructive/10"
                          title="Absagen"
                          onClick={() => handleStatusChange(r.id, "cancelled")}
                        >
                          <IconX className="size-3.5" />
                        </Button>
                      </div>
                    )}
                    {!isAdmin && r.userId === currentUserId && r.status === "pending" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                        title="Stornieren"
                        onClick={() => handleDelete(r.id)}
                      >
                        <IconX className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {upcoming.length === 0 && !loading && (
              <p className="mt-4 text-sm text-muted-foreground text-center py-4">
                Keine aktiven Reservierungen
              </p>
            )}
          </>
        )}
      </CardContent>

      {/* ─── New Reservation Dialog ───────────────────────────────── */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDialog(false)
            setHasConflict(false)
            setStartDate("")
            setEndDate("")
            setPurpose("")
            setQuantity(1)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservierung erstellen</DialogTitle>
            <DialogDescription>
              Reservieren Sie dieses Element für einen bestimmten Zeitraum.
            </DialogDescription>
          </DialogHeader>

          {hasConflict && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
              <IconAlertTriangle className="size-4 mt-0.5 shrink-0" />
              <span>
                Es gibt eine überlappende Reservierung in diesem Zeitraum. Ihre Anfrage wurde
                trotzdem gespeichert und muss manuell bestätigt werden.
              </span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={startDate}
                  min={today()}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Enddatum</Label>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate || today()}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {showQuantity && (
              <div className="space-y-2">
                <Label>Menge</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Verwendungszweck{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                placeholder="z.B. Baustelle Musterstrasse, Projekt XY…"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="min-h-[72px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={submitting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !startDate || !endDate}
            >
              <IconCalendar className="size-4" />
              {submitting ? "Wird gespeichert…" : "Reservieren"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
