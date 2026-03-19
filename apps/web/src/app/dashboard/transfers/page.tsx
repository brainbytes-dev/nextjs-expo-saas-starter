"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  IconPlus,
  IconSearch,
  IconTruck,
  IconArrowRight,
  IconCheck,
  IconX,
  IconClock,
  IconPackage,
  IconDotsVertical,
  IconEye,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────
type TransferStatus =
  | "pending"
  | "approved"
  | "in_transit"
  | "completed"
  | "cancelled"

interface TransferItem {
  id: string
  materialId: string
  materialName: string | null
  materialNumber: string | null
  quantity: number
  pickedQuantity: number
}

interface Transfer {
  id: string
  status: TransferStatus
  fromLocationId: string
  toLocationId: string
  fromLocationName: string
  toLocationName: string
  requestedById: string
  requestedByName: string
  approvedById: string | null
  approvedByName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  items: TransferItem[]
}

interface Location {
  id: string
  name: string
}

interface Material {
  id: string
  name: string
  number: string | null
}

// ── Config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  TransferStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: "Ausstehend",
    color: "bg-muted text-muted-foreground",
    icon: IconClock,
  },
  approved: {
    label: "Genehmigt",
    color: "bg-primary/10 text-primary",
    icon: IconCheck,
  },
  in_transit: {
    label: "Unterwegs",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    icon: IconTruck,
  },
  completed: {
    label: "Abgeschlossen",
    color: "bg-secondary/10 text-secondary",
    icon: IconCheck,
  },
  cancelled: {
    label: "Storniert",
    color: "bg-destructive/10 text-destructive",
    icon: IconX,
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ── Empty line item row ─────────────────────────────────────────────────
const EMPTY_LINE = { materialId: "", quantity: 1 }

// ── Create Transfer Dialog ─────────────────────────────────────────────
function CreateTransferDialog({
  open,
  onClose,
  onCreated,
  locations,
  materials,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
  locations: Location[]
  materials: Material[]
}) {
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [notes, setNotes] = useState("")
  const [lines, setLines] = useState([{ ...EMPTY_LINE }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }])
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateLine(idx: number, field: "materialId" | "quantity", value: string | number) {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validLines = lines.filter((l) => l.materialId && l.quantity > 0)
    if (!fromId || !toId) {
      setError("Bitte Quell- und Ziellager auswählen.")
      return
    }
    if (fromId === toId) {
      setError("Quell- und Ziellager müssen unterschiedlich sein.")
      return
    }
    if (validLines.length === 0) {
      setError("Mindestens eine Position erforderlich.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromLocationId: fromId,
          toLocationId: toId,
          notes: notes.trim() || undefined,
          items: validLines.map((l) => ({
            materialId: l.materialId,
            quantity: Number(l.quantity),
          })),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError((data as { error?: string }).error ?? "Fehler beim Erstellen")
        return
      }
      onCreated()
      onClose()
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.")
    } finally {
      setSaving(false)
    }
  }

  // Reset on close
  const handleClose = () => {
    setFromId("")
    setToId("")
    setNotes("")
    setLines([{ ...EMPTY_LINE }])
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Neuer Umbuchungsauftrag</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Locations row */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Von Lager</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger>
                  <SelectValue placeholder="Quellort wählen…" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <IconArrowRight className="size-4 text-muted-foreground mb-2.5" />
            <div className="flex flex-col gap-1.5">
              <Label>Nach Lager</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Zielort wählen…" />
                </SelectTrigger>
                <SelectContent>
                  {locations
                    .filter((l) => l.id !== fromId)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line items */}
          <div className="flex flex-col gap-2">
            <Label>Positionen</Label>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs w-[60%]">Material</TableHead>
                    <TableHead className="text-xs w-[25%]">Menge</TableHead>
                    <TableHead className="w-[15%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={idx} className="hover:bg-transparent">
                      <TableCell className="py-1.5">
                        <Select
                          value={line.materialId}
                          onValueChange={(v) => updateLine(idx, "materialId", v)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Material wählen…" />
                          </SelectTrigger>
                          <SelectContent>
                            {materials.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.number ? `${m.number} — ` : ""}
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(idx, "quantity", Number(e.target.value))
                          }
                          className="h-8 text-sm w-20"
                        />
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length === 1}
                        >
                          <IconX className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start gap-1.5 h-8 text-xs"
              onClick={addLine}
            >
              <IconPlus className="size-3.5" />
              Position hinzufügen
            </Button>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label>Notizen (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Bemerkungen zum Umbuchungsauftrag…"
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Wird erstellt…" : "Auftrag erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail Dialog ──────────────────────────────────────────────────────
function TransferDetailDialog({
  transfer,
  onClose,
  onAction,
}: {
  transfer: Transfer | null
  onClose: () => void
  onAction: (id: string, action: string) => Promise<void>
}) {
  const [acting, setActing] = useState(false)

  if (!transfer) return null

  const statusCfg = STATUS_CONFIG[transfer.status]
  const StatusIcon = statusCfg.icon

  async function handleAction(action: string) {
    setActing(true)
    try {
      await onAction(transfer!.id, action)
      onClose()
    } finally {
      setActing(false)
    }
  }

  return (
    <Dialog open={!!transfer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Umbuchungsauftrag
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md",
                statusCfg.color
              )}
            >
              <StatusIcon className="size-3" />
              {statusCfg.label}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Route */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground">
              {transfer.fromLocationName}
            </span>
            <IconArrowRight className="size-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground">
              {transfer.toLocationName}
            </span>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Angefragt von</p>
              <p className="font-medium text-foreground mt-0.5">
                {transfer.requestedByName}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Erstellt am</p>
              <p className="font-medium text-foreground mt-0.5">
                {formatDate(transfer.createdAt)}
              </p>
            </div>
            {transfer.approvedByName && (
              <div>
                <p className="text-xs text-muted-foreground">Genehmigt von</p>
                <p className="font-medium text-foreground mt-0.5">
                  {transfer.approvedByName}
                </p>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Positionen
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs">Material</TableHead>
                    <TableHead className="text-xs text-right">Menge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfer.items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm">
                        <p className="font-medium text-foreground">
                          {item.materialName ?? "—"}
                        </p>
                        {item.materialNumber && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {item.materialNumber}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right font-medium">
                        {item.quantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {transfer.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Notizen
              </p>
              <p className="text-sm text-foreground">{transfer.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={onClose} disabled={acting}>
            Schliessen
          </Button>
          {transfer.status === "pending" && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleAction("cancel")}
                disabled={acting}
              >
                <IconX className="size-4 mr-1.5" />
                Ablehnen
              </Button>
              <Button
                size="sm"
                onClick={() => handleAction("approve")}
                disabled={acting}
              >
                <IconCheck className="size-4 mr-1.5" />
                Genehmigen
              </Button>
            </>
          )}
          {transfer.status === "approved" && (
            <Button
              size="sm"
              onClick={() => handleAction("complete")}
              disabled={acting}
            >
              <IconCheck className="size-4 mr-1.5" />
              Abschliessen &amp; Lagerbestand buchen
            </Button>
          )}
          {transfer.status === "in_transit" && (
            <Button
              size="sm"
              onClick={() => handleAction("complete")}
              disabled={acting}
            >
              <IconCheck className="size-4 mr-1.5" />
              Als abgeschlossen markieren
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ────────────────────────────────────────────────────────────────
export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCreate, setShowCreate] = useState(false)
  const [detailTransfer, setDetailTransfer] = useState<Transfer | null>(null)

  // ── Data loading ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [transfersRes, locationsRes, materialsRes] = await Promise.all([
        fetch("/api/transfers"),
        fetch("/api/locations"),
        fetch("/api/materials?limit=500"),
      ])

      if (transfersRes.ok) {
        const data = await transfersRes.json()
        setTransfers(Array.isArray(data) ? data : [])
      }
      if (locationsRes.ok) {
        const data = await locationsRes.json()
        setLocations(Array.isArray(data) ? data : [])
      }
      if (materialsRes.ok) {
        const data = await materialsRes.json()
        // API may return { data: [...] } or direct array
        const list = Array.isArray(data) ? data : (data?.data ?? [])
        setMaterials(list)
      }
    } catch {
      // fail silently — table shows empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // ── Filtering ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      const matchSearch =
        !search ||
        t.fromLocationName.toLowerCase().includes(search.toLowerCase()) ||
        t.toLocationName.toLowerCase().includes(search.toLowerCase()) ||
        t.requestedByName.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || t.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [transfers, search, statusFilter])

  // ── Stats ───────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      pending: transfers.filter((t) => t.status === "pending").length,
      approved: transfers.filter((t) => t.status === "approved").length,
      in_transit: transfers.filter((t) => t.status === "in_transit").length,
      completed: transfers.filter((t) => t.status === "completed").length,
    }),
    [transfers]
  )

  // ── Actions ──────────────────────────────────────────────────────────
  async function handleAction(id: string, action: string) {
    const res = await fetch(`/api/transfers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      await loadData()
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <IconTruck className="size-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Umbuchungsaufträge
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.pending} ausstehend &middot; {stats.approved} genehmigt &middot;{" "}
            {stats.in_transit} unterwegs
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <IconPlus className="size-4" />
          Neuer Auftrag
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(
          [
            ["pending", "Ausstehend"],
            ["approved", "Genehmigt"],
            ["in_transit", "Unterwegs"],
            ["completed", "Abgeschlossen"],
          ] as [keyof typeof stats, string][]
        ).map(([key, label]) => {
          const cfg = STATUS_CONFIG[key as TransferStatus]
          const StatusIcon = cfg.icon
          return (
            <Card
              key={key}
              className={cn(
                "border-0 cursor-pointer transition-all hover:shadow-md",
                statusFilter === key && "ring-2 ring-primary"
              )}
              onClick={() =>
                setStatusFilter(statusFilter === key ? "all" : key)
              }
            >
              <CardContent className="p-4 flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center justify-center size-9 rounded-lg",
                    cfg.color
                  )}
                >
                  <StatusIcon className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground leading-tight">
                    {stats[key]}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Suchen nach Lager, Person…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {(
              Object.entries(STATUS_CONFIG) as [
                TransferStatus,
                (typeof STATUS_CONFIG)[TransferStatus],
              ][]
            ).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty className="py-16">
              <EmptyMedia>
                <IconTruck className="size-12 text-muted-foreground/40" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Keine Umbuchungsaufträge</EmptyTitle>
                <EmptyDescription>
                  {search
                    ? "Passen Sie Ihre Suche an."
                    : "Erstellen Sie den ersten Umbuchungsauftrag."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Strecke
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px] text-center">
                    Pos.
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">
                    Angefragt von
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">
                    Datum
                  </TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((transfer) => {
                  const cfg = STATUS_CONFIG[transfer.status]
                  const StatusIcon = cfg.icon
                  return (
                    <TableRow
                      key={transfer.id}
                      className="group hover:bg-muted/80 border-b border-border cursor-pointer"
                      onClick={() => setDetailTransfer(transfer)}
                    >
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md whitespace-nowrap",
                            cfg.color
                          )}
                        >
                          <StatusIcon className="size-3" />
                          {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-medium text-foreground">
                            {transfer.fromLocationName}
                          </span>
                          <IconArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground">
                            {transfer.toLocationName}
                          </span>
                        </div>
                        {transfer.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {transfer.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <IconPackage className="size-3.5" />
                          {transfer.items.length}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {transfer.requestedByName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(transfer.createdAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <IconDotsVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => setDetailTransfer(transfer)}
                            >
                              <IconEye className="size-4" /> Details
                            </DropdownMenuItem>
                            {transfer.status === "pending" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() =>
                                    handleAction(transfer.id, "approve")
                                  }
                                >
                                  <IconCheck className="size-4" /> Genehmigen
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 text-destructive focus:text-destructive"
                                  onClick={() =>
                                    handleAction(transfer.id, "cancel")
                                  }
                                >
                                  <IconX className="size-4" /> Ablehnen
                                </DropdownMenuItem>
                              </>
                            )}
                            {(transfer.status === "approved" ||
                              transfer.status === "in_transit") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() =>
                                    handleAction(transfer.id, "complete")
                                  }
                                >
                                  <IconCheck className="size-4" /> Abschliessen
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateTransferDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadData}
        locations={locations}
        materials={materials}
      />

      <TransferDetailDialog
        transfer={detailTransfer}
        onClose={() => setDetailTransfer(null)}
        onAction={handleAction}
      />
    </div>
  )
}
