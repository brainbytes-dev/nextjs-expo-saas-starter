"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  IconPlus,
  IconClipboardCheck,
  IconTrash,
  IconDotsVertical,
  IconChevronRight,
  IconCheck,
  IconPlayerPlay,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InventoryCount {
  id: string
  name: string
  status: "draft" | "in_progress" | "completed" | "cancelled"
  locationId: string | null
  locationName: string | null
  startedAt: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
  itemCount: number
  countedCount: number
}

interface Location {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
}

const STATUS_VARIANTS: Record<
  string,
  "secondary" | "default" | "outline" | "destructive"
> = {
  draft: "secondary",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function InventoryPage() {
  const router = useRouter()

  const [counts, setCounts] = useState<InventoryCount[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newLocationId, setNewLocationId] = useState<string>("none")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<InventoryCount | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch locations once
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setLocations(Array.isArray(data) ? data : (data.data ?? [])))
      .catch(() => {})
  }, [])

  // Fetch inventory counts
  const fetchCounts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/inventory-counts?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setCounts(Array.isArray(data) ? data : [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void fetchCounts()
  }, [fetchCounts])

  // Create new count
  const handleCreate = async () => {
    if (!newName.trim()) {
      setCreateError("Name ist erforderlich")
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch("/api/inventory-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          locationId: newLocationId === "none" ? null : newLocationId,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        setCreateOpen(false)
        setNewName("")
        setNewLocationId("none")
        router.push(`/dashboard/inventory/${created.id}`)
      } else {
        const err = await res.json()
        setCreateError(err.error ?? "Fehler beim Erstellen")
      }
    } catch {
      setCreateError("Netzwerkfehler")
    } finally {
      setCreating(false)
    }
  }

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/inventory-counts/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setCounts((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // Start count
  const handleStart = async (id: string) => {
    try {
      const res = await fetch(`/api/inventory-counts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      })
      if (res.ok) {
        router.push(`/dashboard/inventory/${id}`)
      }
    } catch {
      // silently fail
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventur</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.length} Inventuren
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <IconPlus className="size-4" />
          Neue Inventur
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="draft">Entwurf</SelectItem>
            <SelectItem value="in_progress">In Bearbeitung</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
            <SelectItem value="cancelled">Storniert</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : counts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <IconClipboardCheck className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium">Keine Inventuren</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Erstellen Sie Ihre erste Inventur, um den Bestand zu zählen
            </p>
            <Button className="mt-6" onClick={() => setCreateOpen(true)}>
              <IconPlus className="size-4" />
              Neue Inventur
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {counts.map((count) => (
            <Card
              key={count.id}
              className="cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => router.push(`/dashboard/inventory/${count.id}`)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{count.name}</span>
                    <Badge variant={STATUS_VARIANTS[count.status] ?? "secondary"}>
                      {STATUS_LABELS[count.status] ?? count.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {count.locationName && (
                      <span>Standort: {count.locationName}</span>
                    )}
                    <span>
                      {count.countedCount} / {count.itemCount} gezählt
                    </span>
                    {count.startedAt && (
                      <span>Gestartet: {formatDate(count.startedAt)}</span>
                    )}
                    {count.completedAt && (
                      <span>Abgeschlossen: {formatDate(count.completedAt)}</span>
                    )}
                    <span>Erstellt: {formatDate(count.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {count.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStart(count.id)}
                    >
                      <IconPlayerPlay className="size-3.5" />
                      Starten
                    </Button>
                  )}
                  {count.status === "in_progress" && (
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/inventory/${count.id}`)}
                    >
                      <IconCheck className="size-3.5" />
                      Fortfahren
                    </Button>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <IconDotsVertical className="size-4" />
                        <span className="sr-only">Aktionen</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/dashboard/inventory/${count.id}`)}
                      >
                        <IconChevronRight className="size-4" />
                        Öffnen
                      </DropdownMenuItem>
                      {count.status === "draft" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(count)}
                          >
                            <IconTrash className="size-4" />
                            Löschen
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false)
            setNewName("")
            setNewLocationId("none")
            setCreateError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Inventur erstellen</DialogTitle>
            <DialogDescription>
              Geben Sie der Inventur einen Namen und wählen Sie optional einen
              Standort. Der aktuelle Bestand wird automatisch als Soll-Bestand
              übernommen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inv-name">Name *</Label>
              <Input
                id="inv-name"
                placeholder="z. B. Inventur Q1 2026"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={creating}
                onKeyDown={(e) => { if (e.key === "Enter") void handleCreate() }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-location">Standort (optional)</Label>
              <Select value={newLocationId} onValueChange={setNewLocationId} disabled={creating}>
                <SelectTrigger id="inv-location">
                  <SelectValue placeholder="Alle Standorte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Alle Standorte</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Abbrechen
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Wird erstellt..." : "Inventur erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inventur löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie &laquo;{deleteTarget?.name}&raquo; wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Wird gelöscht..." : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
