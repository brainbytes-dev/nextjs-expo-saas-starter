"use client"

import { useEffect, useState } from "react"
import { IconTrash, IconFolder, IconMapPin, IconDownload, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

interface SelectableGroup {
  id: string
  name: string
}

interface SelectableLocation {
  id: string
  name: string
}

interface BulkActionBarProps {
  /** Number of currently selected items. Bar is hidden when 0. */
  selectedCount: number
  /** Label shown in the count badge, e.g. "Materialien" or "Werkzeuge" */
  entityLabel?: string
  /** Available groups for the "Gruppe ändern" action. */
  groups?: SelectableGroup[]
  /** Available locations for the "Standort ändern" action. */
  locations?: SelectableLocation[]
  /** Called when the user confirms bulk delete. */
  onDelete: () => Promise<void>
  /** Called when the user picks a new group. */
  onChangeGroup: (groupId: string) => Promise<void>
  /** Called when the user picks a new location. */
  onChangeLocation: (locationId: string) => Promise<void>
  /** Called when the user clicks "Exportieren". */
  onExport: () => void
  /** Called when the user clicks "Abbrechen". */
  onCancel: () => void
  /** Whether a bulk operation is currently in flight. */
  loading?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BulkActionBar({
  selectedCount,
  entityLabel = "Einträge",
  groups = [],
  locations = [],
  onDelete,
  onChangeGroup,
  onChangeLocation,
  onExport,
  onCancel,
  loading = false,
}: BulkActionBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [locationDialogOpen, setLocationDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState("")
  const [selectedLocation, setSelectedLocation] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Reset pickers when dialogs close
  useEffect(() => {
    if (!groupDialogOpen) setSelectedGroup("")
  }, [groupDialogOpen])

  useEffect(() => {
    if (!locationDialogOpen) setSelectedLocation("")
  }, [locationDialogOpen])

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleDelete() {
    setSubmitting(true)
    try {
      await onDelete()
    } finally {
      setSubmitting(false)
      setDeleteDialogOpen(false)
    }
  }

  async function handleGroupConfirm() {
    if (!selectedGroup) return
    setSubmitting(true)
    try {
      await onChangeGroup(selectedGroup)
    } finally {
      setSubmitting(false)
      setGroupDialogOpen(false)
    }
  }

  async function handleLocationConfirm() {
    if (!selectedLocation) return
    setSubmitting(true)
    try {
      await onChangeLocation(selectedLocation)
    } finally {
      setSubmitting(false)
      setLocationDialogOpen(false)
    }
  }

  if (selectedCount === 0) return null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating bar */}
      <div
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 duration-200"
        role="toolbar"
        aria-label="Massenaktionen"
      >
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          {/* Count badge */}
          <span className="mr-2 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground tabular-nums">
            {selectedCount} {entityLabel} ausgewählt
          </span>

          {/* Delete */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading || submitting}
            className="gap-1.5"
          >
            <IconTrash className="size-3.5" />
            Löschen
          </Button>

          {/* Change group — only shown when groups are provided */}
          {groups.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGroupDialogOpen(true)}
              disabled={loading || submitting}
              className="gap-1.5"
            >
              <IconFolder className="size-3.5" />
              Gruppe ändern
            </Button>
          )}

          {/* Change location — only shown when locations are provided */}
          {locations.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocationDialogOpen(true)}
              disabled={loading || submitting}
              className="gap-1.5"
            >
              <IconMapPin className="size-3.5" />
              Standort ändern
            </Button>
          )}

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={loading || submitting}
            className="gap-1.5"
          >
            <IconDownload className="size-3.5" />
            Exportieren
          </Button>

          {/* Cancel */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={loading || submitting}
            className="gap-1"
          >
            <IconX className="size-3.5" />
            Abbrechen
          </Button>
        </div>
      </div>

      {/* ── Delete confirmation dialog ──────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { if (!submitting) setDeleteDialogOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCount} {entityLabel} löschen</DialogTitle>
            <DialogDescription>
              Möchten Sie wirklich <strong>{selectedCount} {entityLabel}</strong> löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? "Wird gelöscht…" : `${selectedCount} löschen`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change group dialog ─────────────────────────────────────────────── */}
      <Dialog open={groupDialogOpen} onOpenChange={(o) => { if (!submitting) setGroupDialogOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gruppe ändern</DialogTitle>
            <DialogDescription>
              Wählen Sie die neue Gruppe für {selectedCount} {entityLabel}.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Gruppe auswählen…" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button onClick={handleGroupConfirm} disabled={!selectedGroup || submitting}>
              {submitting ? "Wird gespeichert…" : "Übernehmen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change location dialog ──────────────────────────────────────────── */}
      <Dialog open={locationDialogOpen} onOpenChange={(o) => { if (!submitting) setLocationDialogOpen(o) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Standort ändern</DialogTitle>
            <DialogDescription>
              Wählen Sie den neuen Hauptstandort für {selectedCount} {entityLabel}.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
              <SelectValue placeholder="Standort auswählen…" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationDialogOpen(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button onClick={handleLocationConfirm} disabled={!selectedLocation || submitting}>
              {submitting ? "Wird gespeichert…" : "Übernehmen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
