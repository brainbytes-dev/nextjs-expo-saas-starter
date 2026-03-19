"use client"

import { useState, useEffect, useCallback } from "react"
import {
  IconPlus,
  IconMapPin,
  IconRadar,
  IconBolt,
  IconTrash,
  IconLogin,
  IconLogout,
  IconDotsVertical,
  IconActivity,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ── Types ──────────────────────────────────────────────────────────────

interface Location {
  id: string
  name: string
}

interface GeofenceRow {
  id: string
  locationId: string
  locationName: string | null
  latitude: string
  longitude: string
  radiusMeters: number
  autoCheckin: boolean | null
  autoCheckout: boolean | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface GeofenceEvent {
  id: string
  geofenceId: string
  userId: string
  userName: string | null
  eventType: string
  triggeredAt: string
  latitude: string | null
  longitude: string | null
  autoAction: string | null
  locationName: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isToday(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

// ── Create Dialog ──────────────────────────────────────────────────────

function CreateGeofenceDialog({
  open,
  onClose,
  onCreated,
  locations,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  locations: Location[]
}) {
  const [locationId, setLocationId] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [radiusMeters, setRadiusMeters] = useState("100")
  const [autoCheckin, setAutoCheckin] = useState(true)
  const [autoCheckout, setAutoCheckout] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!locationId) {
      setError("Bitte einen Standort auswaehlen.")
      return
    }
    if (!latitude || !longitude) {
      setError("Bitte Koordinaten eingeben.")
      return
    }
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (isNaN(lat) || isNaN(lng)) {
      setError("Ungueltige Koordinaten.")
      return
    }
    const radius = parseInt(radiusMeters)
    if (isNaN(radius) || radius < 10) {
      setError("Radius muss mindestens 10 Meter betragen.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId,
          latitude: lat,
          longitude: lng,
          radiusMeters: radius,
          autoCheckin,
          autoCheckout,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError((data as { error?: string }).error ?? "Fehler beim Erstellen")
        return
      }
      onCreated()
      handleClose()
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.")
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setLocationId("")
    setLatitude("")
    setLongitude("")
    setRadiusMeters("100")
    setAutoCheckin(true)
    setAutoCheckout(true)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neuen Geofence erstellen</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Standort</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Standort waehlen..." />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Breitengrad (Lat)</Label>
              <Input
                type="text"
                placeholder="47.3769"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Laengengrad (Lng)</Label>
              <Input
                type="text"
                placeholder="8.5417"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Radius (Meter)</Label>
            <Input
              type="number"
              min={10}
              max={10000}
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-checkin">Auto-Checkin</Label>
            <Switch
              id="auto-checkin"
              checked={autoCheckin}
              onCheckedChange={setAutoCheckin}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-checkout">Auto-Checkout</Label>
            <Switch
              id="auto-checkout"
              checked={autoCheckout}
              onCheckedChange={setAutoCheckout}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Wird erstellt..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function GeofencesPage() {
  const [geofencesList, setGeofencesList] = useState<GeofenceRow[]>([])
  const [events, setEvents] = useState<GeofenceEvent[]>([])
  const [locationsList, setLocationsList] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [geoRes, eventsRes, locRes] = await Promise.all([
        fetch("/api/geofences"),
        fetch("/api/geofence-events?limit=30"),
        fetch("/api/locations?limit=200"),
      ])

      if (geoRes.ok) {
        const geoData = await geoRes.json()
        setGeofencesList(geoData.data ?? [])
      }
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json()
        setEvents(eventsData.data ?? [])
      }
      if (locRes.ok) {
        const locData = await locRes.json()
        setLocationsList(locData.data ?? [])
      }
    } catch (err) {
      console.error("Failed to load geofences data:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Toggle handlers ──────────────────────────────────────────────────

  async function toggleField(
    id: string,
    field: "isActive" | "autoCheckin" | "autoCheckout",
    value: boolean
  ) {
    try {
      const res = await fetch(`/api/geofences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      })
      if (res.ok) {
        setGeofencesList((prev) =>
          prev.map((g) => (g.id === id ? { ...g, [field]: value } : g))
        )
      }
    } catch {
      // Silently fail — user sees no toggle change
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Geofence wirklich loeschen?")) return
    try {
      const res = await fetch(`/api/geofences/${id}`, { method: "DELETE" })
      if (res.ok) {
        setGeofencesList((prev) => prev.filter((g) => g.id !== id))
      }
    } catch {
      // Silently fail
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────

  const activeCount = geofencesList.filter((g) => g.isActive).length
  const todayEventsCount = events.filter((e) => isToday(e.triggeredAt)).length
  const autoActionsCount = events.filter(
    (e) => e.autoAction && isToday(e.triggeredAt)
  ).length

  // ── Render ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Geofencing</h1>
          <p className="text-muted-foreground text-sm">
            Standortbasierte automatische Aktionen verwalten
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <IconPlus className="mr-2 h-4 w-4" />
          Neuen Geofence erstellen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktive Geofences
            </CardTitle>
            <IconRadar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-muted-foreground text-xs">
              von {geofencesList.length} insgesamt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Events heute
            </CardTitle>
            <IconActivity className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayEventsCount}</div>
            <p className="text-muted-foreground text-xs">
              Geofence-Ereignisse
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Automatische Aktionen
            </CardTitle>
            <IconBolt className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autoActionsCount}</div>
            <p className="text-muted-foreground text-xs">
              Auto-Checkins / Checkouts heute
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Geofences Table */}
      <Card>
        <CardHeader>
          <CardTitle>Geofences</CardTitle>
        </CardHeader>
        <CardContent>
          {geofencesList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconMapPin className="text-muted-foreground mb-3 h-10 w-10" />
              <p className="text-muted-foreground text-sm">
                Noch keine Geofences vorhanden.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <IconPlus className="mr-2 h-4 w-4" />
                Ersten Geofence erstellen
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Standort</TableHead>
                  <TableHead>Koordinaten</TableHead>
                  <TableHead className="text-center">Radius</TableHead>
                  <TableHead className="text-center">Auto-Checkin</TableHead>
                  <TableHead className="text-center">Auto-Checkout</TableHead>
                  <TableHead className="text-center">Aktiv</TableHead>
                  <TableHead className="text-right">Erstellt</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {geofencesList.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <IconMapPin className="text-muted-foreground h-4 w-4" />
                        {g.locationName ?? "Unbekannt"}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {parseFloat(g.latitude).toFixed(4)},{" "}
                      {parseFloat(g.longitude).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{g.radiusMeters} m</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={g.autoCheckin ?? false}
                        onCheckedChange={(v) =>
                          toggleField(g.id, "autoCheckin", v)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={g.autoCheckout ?? false}
                        onCheckedChange={(v) =>
                          toggleField(g.id, "autoCheckout", v)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={g.isActive}
                        onCheckedChange={(v) =>
                          toggleField(g.id, "isActive", v)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDate(g.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <IconDotsVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(g.id)}
                          >
                            <IconTrash className="mr-2 h-4 w-4" />
                            Loeschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Geofence-Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconActivity className="text-muted-foreground mb-3 h-10 w-10" />
              <p className="text-muted-foreground text-sm">
                Noch keine Events vorhanden.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Standort</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Aktion</TableHead>
                  <TableHead className="text-right">Zeitpunkt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="font-medium">
                      {ev.userName ?? "Unbekannt"}
                    </TableCell>
                    <TableCell>{ev.locationName ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ev.eventType === "enter" ? "default" : "secondary"
                        }
                      >
                        {ev.eventType === "enter" ? (
                          <IconLogin className="mr-1 h-3 w-3" />
                        ) : (
                          <IconLogout className="mr-1 h-3 w-3" />
                        )}
                        {ev.eventType === "enter" ? "Eintritt" : "Austritt"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ev.autoAction ? (
                        <Badge variant="outline">
                          <IconBolt className="mr-1 h-3 w-3" />
                          {ev.autoAction === "checkin"
                            ? "Auto-Checkin"
                            : "Auto-Checkout"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDateTime(ev.triggeredAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <CreateGeofenceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchData}
        locations={locationsList}
      />
    </div>
  )
}
