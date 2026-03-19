"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  IconTruck,
  IconSearch,
  IconPlus,
  IconLayoutKanban,
  IconTable,
  IconAlertTriangle,
  IconExternalLink,
  IconCalendar,
  IconPackage,
  IconClock,
  IconCheck,
  IconDotsVertical,
  IconTrash,
  IconEye,
  IconArrowRight,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────
type DeliveryStatus = "ordered" | "confirmed" | "shipped" | "in_transit" | "delivered"

interface Delivery {
  id: string
  orderId: string
  supplierId: string | null
  trackingNumber: string | null
  carrier: string | null
  expectedDeliveryDate: string | null
  actualDeliveryDate: string | null
  status: string
  notes: string | null
  trackingUrl: string | null
  lastStatusUpdate: string | null
  createdAt: string
  updatedAt: string
  orderNumber: string | null
  orderDate: string | null
  supplierName: string | null
}

interface Order { id: string; orderNumber: string | null; supplierId: string }
interface Supplier { id: string; name: string }

// ── Status config ──────────────────────────────────────────────────────
const DELIVERY_STATUSES: DeliveryStatus[] = ["ordered", "confirmed", "shipped", "in_transit", "delivered"]

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  ordered: { label: "Bestellt", color: "text-muted-foreground", bgColor: "bg-muted/50", icon: IconPackage },
  confirmed: { label: "Bestätigt", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-900/20", icon: IconCheck },
  shipped: { label: "Versendet", color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-50 dark:bg-violet-900/20", icon: IconArrowRight },
  in_transit: { label: "Unterwegs", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-900/20", icon: IconTruck },
  delivered: { label: "Geliefert", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-50 dark:bg-green-900/20", icon: IconCheck },
}

// ── Swiss carriers ─────────────────────────────────────────────────────
const CARRIERS = [
  { id: "post", name: "Die Post", urlTemplate: "https://service.post.ch/ekp-web/ui/entry/search?parcelCodes={tracking}" },
  { id: "dhl", name: "DHL", urlTemplate: "https://www.dhl.com/ch-de/home/tracking/tracking-parcel.html?submit=1&tracking-id={tracking}" },
  { id: "dpd", name: "DPD", urlTemplate: "https://tracking.dpd.de/status/de_CH/parcel/{tracking}" },
  { id: "planzer", name: "Planzer", urlTemplate: "https://www.planzer.ch/tracking/?id={tracking}" },
  { id: "camion", name: "Camion Transport", urlTemplate: "https://www.camiontransport.ch/tracking?nr={tracking}" },
  { id: "other", name: "Andere", urlTemplate: "" },
]

function generateTrackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null
  const c = CARRIERS.find((cr) => cr.id === carrier || cr.name === carrier)
  if (!c || !c.urlTemplate) return null
  return c.urlTemplate.replace("{tracking}", encodeURIComponent(trackingNumber))
}

function formatDate(iso: string | null) {
  if (!iso) return "–"
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatDateShort(iso: string | null) {
  if (!iso) return "–"
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" })
}

function isOverdue(d: Delivery): boolean {
  if (!d.expectedDeliveryDate || d.status === "delivered") return false
  const expected = new Date(d.expectedDeliveryDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return expected < today
}

function daysBetween(dateA: string, dateB: string): number {
  return Math.round((new Date(dateB).getTime() - new Date(dateA).getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as DeliveryStatus] ?? STATUS_CONFIG.ordered
}

// ── Kanban Card ────────────────────────────────────────────────────────
function KanbanCard({ delivery, onDragStart, onClick }: { delivery: Delivery; onDragStart: (e: React.DragEvent, id: string) => void; onClick: (d: Delivery) => void }) {
  const overdue = isOverdue(delivery)
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, delivery.id)}
      onClick={() => onClick(delivery)}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border border-border bg-background p-3 shadow-sm",
        "cursor-grab active:cursor-grabbing active:opacity-60 active:shadow-lg",
        "hover:border-primary/40 hover:shadow-md transition-all duration-150",
        overdue && "border-destructive/40"
      )}
    >
      {overdue && <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-destructive" />}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground leading-snug">{delivery.orderNumber || "–"}</p>
        {overdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 leading-5 shrink-0">Überfällig</Badge>}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-1">{delivery.supplierName || "Unbekannt"}</p>
      {delivery.trackingNumber && (
        <div className="flex items-center gap-1">
          <IconTruck className="size-3 text-muted-foreground/60" />
          <span className="text-xs font-mono text-muted-foreground truncate">
            {delivery.carrier ? `${delivery.carrier}: ` : ""}{delivery.trackingNumber}
          </span>
        </div>
      )}
      {delivery.expectedDeliveryDate && (
        <span className={cn("flex items-center gap-1 text-xs", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
          <IconCalendar className="size-3 shrink-0" />
          {formatDateShort(delivery.expectedDeliveryDate)}
        </span>
      )}
    </div>
  )
}

// ── Kanban Column ──────────────────────────────────────────────────────
const COLUMN_BG: Record<DeliveryStatus, string> = {
  ordered: "bg-muted/30", confirmed: "bg-blue-50/50 dark:bg-blue-900/10", shipped: "bg-violet-50/50 dark:bg-violet-900/10",
  in_transit: "bg-orange-50/50 dark:bg-orange-900/10", delivered: "bg-green-50/50 dark:bg-green-900/10",
}

function KanbanColumn({ status, deliveries, onDragStart, onDragOver, onDrop, onDragLeave, isDragOver, onClick }: {
  status: DeliveryStatus; deliveries: Delivery[]; onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void; onDragLeave: () => void; isDragOver: boolean; onClick: (d: Delivery) => void
}) {
  const cfg = STATUS_CONFIG[status]
  const StatusIcon = cfg.icon
  return (
    <div className="flex flex-col gap-2 min-w-[220px] flex-1">
      <div className="flex items-center gap-2 px-1">
        <StatusIcon className={cn("size-4", cfg.color)} />
        <span className={cn("text-sm font-semibold", cfg.color)}>{cfg.label}</span>
        <span className="flex items-center justify-center size-5 rounded-full bg-muted text-xs font-bold text-muted-foreground">{deliveries.length}</span>
      </div>
      <div
        onDragOver={onDragOver} onDrop={onDrop} onDragLeave={onDragLeave}
        className={cn("flex flex-col gap-2 rounded-xl p-2 min-h-[300px] transition-colors duration-150", COLUMN_BG[status], isDragOver && "ring-2 ring-primary ring-inset bg-primary/10")}
      >
        {deliveries.map((d) => <KanbanCard key={d.id} delivery={d} onDragStart={onDragStart} onClick={onClick} />)}
        {deliveries.length === 0 && <div className="flex-1 flex items-center justify-center min-h-[100px]"><p className="text-xs text-muted-foreground/50">Keine Lieferungen</p></div>}
      </div>
    </div>
  )
}

// ── Detail Sheet ───────────────────────────────────────────────────────
function DeliveryDetailSheet({ delivery, open, onClose, onStatusChange }: {
  delivery: Delivery | null; open: boolean; onClose: () => void; onStatusChange: (id: string, status: DeliveryStatus) => void
}) {
  if (!delivery) return null
  const overdue = isOverdue(delivery)
  const cfg = getStatusConfig(delivery.status)
  const StatusIcon = cfg.icon
  const trackingLink = delivery.trackingUrl || generateTrackingUrl(delivery.carrier, delivery.trackingNumber)
  const currentIdx = DELIVERY_STATUSES.indexOf(delivery.status as DeliveryStatus)

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><IconTruck className="size-5" />Lieferung {delivery.orderNumber || "–"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 mt-6">
          <div className="flex items-center gap-3">
            <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md", cfg.bgColor, cfg.color)}>
              <StatusIcon className="size-4" />{cfg.label}
            </span>
            {overdue && <Badge variant="destructive" className="gap-1"><IconAlertTriangle className="size-3" />Überfällig</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-muted-foreground">Bestellnummer</p><p className="text-sm font-medium">{delivery.orderNumber || "–"}</p></div>
            <div><p className="text-xs text-muted-foreground">Lieferant</p><p className="text-sm font-medium">{delivery.supplierName || "–"}</p></div>
            <div><p className="text-xs text-muted-foreground">Spediteur</p><p className="text-sm font-medium">{CARRIERS.find((c) => c.id === delivery.carrier)?.name || delivery.carrier || "–"}</p></div>
            <div>
              <p className="text-xs text-muted-foreground">Sendungsnummer</p>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-mono font-medium">{delivery.trackingNumber || "–"}</p>
                {trackingLink && <a href={trackingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80"><IconExternalLink className="size-3.5" /></a>}
              </div>
            </div>
            <div><p className="text-xs text-muted-foreground">Erwartete Lieferung</p><p className={cn("text-sm font-medium", overdue && "text-destructive")}>{formatDate(delivery.expectedDeliveryDate)}</p></div>
            <div><p className="text-xs text-muted-foreground">Tatsächliche Lieferung</p><p className="text-sm font-medium">{formatDate(delivery.actualDeliveryDate)}</p></div>
          </div>
          {delivery.notes && <div><p className="text-xs text-muted-foreground mb-1">Notizen</p><p className="text-sm text-foreground bg-muted/50 rounded-md p-3">{delivery.notes}</p></div>}
          {/* Status Timeline */}
          <div>
            <p className="text-xs text-muted-foreground mb-3">Status-Verlauf</p>
            <div className="flex flex-col gap-0">
              {DELIVERY_STATUSES.map((s, idx) => {
                const sCfg = STATUS_CONFIG[s]; const SIcon = sCfg.icon; const isActive = idx <= currentIdx; const isCurrent = s === delivery.status
                return (
                  <div key={s} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn("size-6 rounded-full flex items-center justify-center border-2 shrink-0", isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground")}>
                        <SIcon className="size-3" />
                      </div>
                      {idx < DELIVERY_STATUSES.length - 1 && <div className={cn("w-0.5 h-6", idx < currentIdx ? "bg-primary" : "bg-border")} />}
                    </div>
                    <div className="pb-4"><p className={cn("text-sm font-medium leading-6", isCurrent ? "text-foreground" : isActive ? "text-muted-foreground" : "text-muted-foreground/50")}>{sCfg.label}</p></div>
                  </div>
                )
              })}
            </div>
          </div>
          {delivery.status !== "delivered" && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Status ändern</p>
              <div className="flex gap-2 flex-wrap">
                {DELIVERY_STATUSES.filter((s) => DELIVERY_STATUSES.indexOf(s) > currentIdx).map((s) => {
                  const sCfg = STATUS_CONFIG[s]
                  return <Button key={s} variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => onStatusChange(delivery.id, s)}><sCfg.icon className="size-3" />{sCfg.label}</Button>
                })}
              </div>
            </div>
          )}
          <div className="border-t pt-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Erstellt: {formatDate(delivery.createdAt)}</span>
              <span>Letztes Update: {delivery.lastStatusUpdate ? formatDate(delivery.lastStatusUpdate) : "–"}</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Create Dialog ──────────────────────────────────────────────────────
function CreateDeliveryDialog({ open, onClose, onCreated, orders }: {
  open: boolean; onClose: () => void; onCreated: () => void; orders: Order[]; suppliers?: Supplier[]
}) {
  const [orderId, setOrderId] = useState("")
  const [carrier, setCarrier] = useState("")
  const [trackingNumber, setTrackingNumber] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() { setOrderId(""); setCarrier(""); setTrackingNumber(""); setExpectedDate(""); setNotes(""); setError(null) }

  async function handleSubmit() {
    if (!orderId) { setError("Bitte eine Bestellung auswählen"); return }
    setSaving(true); setError(null)
    try {
      const selectedOrder = orders.find((o) => o.id === orderId)
      const trackingUrl = generateTrackingUrl(carrier, trackingNumber)
      const res = await fetch("/api/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, supplierId: selectedOrder?.supplierId || null, carrier: carrier || null, trackingNumber: trackingNumber || null, expectedDeliveryDate: expectedDate || null, notes: notes || null, trackingUrl }),
      })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Fehler beim Erstellen") }
      reset(); onCreated(); onClose()
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Unbekannter Fehler") } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Lieferverfolgung erstellen</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</div>}
          <div className="space-y-1.5">
            <Label>Bestellung *</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger><SelectValue placeholder="Bestellung auswählen..." /></SelectTrigger>
              <SelectContent>{orders.map((o) => <SelectItem key={o.id} value={o.id}>{o.orderNumber || o.id.slice(0, 8)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Spediteur</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger><SelectValue placeholder="Spediteur wählen..." /></SelectTrigger>
              <SelectContent>{CARRIERS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Sendungsnummer</Label><Input placeholder="z.B. 99.12.345678.90123456" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Erwartete Lieferung</Label><Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Notizen</Label><Textarea placeholder="Optionale Bemerkungen..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose() }}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={saving}>{saving ? "Erstellen..." : "Erstellen"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [availableOrders, setAvailableOrders] = useState<Order[]>([])
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban")
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [dragOverCol, setDragOverCol] = useState<DeliveryStatus | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const fetchDeliveries = useCallback(async () => {
    try { const res = await fetch("/api/deliveries?limit=200"); if (!res.ok) throw new Error(); const json = await res.json(); setDeliveries(json.data || []) } catch { /* silent */ }
  }, [])

  const fetchOrders = useCallback(async () => {
    try { const res = await fetch("/api/orders?limit=200"); if (res.ok) { const json = await res.json(); setAvailableOrders(json.data || json || []) } } catch { /* silent */ }
  }, [])

  const fetchSuppliers = useCallback(async () => {
    try { const res = await fetch("/api/suppliers?limit=200"); if (res.ok) { const json = await res.json(); setAvailableSuppliers(json.data || json || []) } } catch { /* silent */ }
  }, [])

  useEffect(() => { Promise.all([fetchDeliveries(), fetchOrders(), fetchSuppliers()]).finally(() => setLoading(false)) }, [fetchDeliveries, fetchOrders, fetchSuppliers])

  const updateStatus = useCallback(async (id: string, newStatus: DeliveryStatus) => {
    setDeliveries((prev) => prev.map((d) => d.id === id ? { ...d, status: newStatus, ...(newStatus === "delivered" ? { actualDeliveryDate: new Date().toISOString().split("T")[0] } : {}), lastStatusUpdate: new Date().toISOString() } : d))
    try {
      const body: Record<string, string> = { status: newStatus }
      if (newStatus === "delivered") body.actualDeliveryDate = new Date().toISOString().split("T")[0]
      const res = await fetch(`/api/deliveries/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
    } catch { fetchDeliveries() }
  }, [fetchDeliveries])

  const deleteDelivery = useCallback(async (id: string) => {
    setDeliveries((prev) => prev.filter((d) => d.id !== id))
    try { const res = await fetch(`/api/deliveries/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error() } catch { fetchDeliveries() }
  }, [fetchDeliveries])

  const filtered = useMemo(() => {
    return deliveries.filter((d) => {
      const matchSearch = !search || (d.orderNumber ?? "").toLowerCase().includes(search.toLowerCase()) || (d.supplierName ?? "").toLowerCase().includes(search.toLowerCase()) || (d.trackingNumber ?? "").toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || d.status === statusFilter
      const matchSupplier = supplierFilter === "all" || d.supplierId === supplierFilter
      return matchSearch && matchStatus && matchSupplier
    })
  }, [deliveries, search, statusFilter, supplierFilter])

  const stats = useMemo(() => {
    const inTransit = deliveries.filter((d) => d.status === "in_transit" || d.status === "shipped").length
    const overdue = deliveries.filter((d) => isOverdue(d)).length
    const delivered = deliveries.filter((d) => d.status === "delivered")
    let avgDays = 0
    if (delivered.length) {
      const totalDays = delivered.reduce((sum, d) => d.createdAt && d.actualDeliveryDate ? sum + daysBetween(d.createdAt, d.actualDeliveryDate) : sum, 0)
      avgDays = Math.round(totalDays / delivered.length)
    }
    return { inTransit, overdue, avgDays, total: deliveries.length }
  }, [deliveries])

  const kanbanGroups = useMemo(() => {
    const groups: Record<DeliveryStatus, Delivery[]> = { ordered: [], confirmed: [], shipped: [], in_transit: [], delivered: [] }
    filtered.forEach((d) => { const s = d.status as DeliveryStatus; if (groups[s]) groups[s].push(d); else groups.ordered.push(d) })
    return groups
  }, [filtered])

  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, string>()
    deliveries.forEach((d) => { if (d.supplierId && d.supplierName) map.set(d.supplierId, d.supplierName) })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [deliveries])

  function handleDragStart(e: React.DragEvent, id: string) { setDragId(id); e.dataTransfer.effectAllowed = "move" }
  function handleDragOver(e: React.DragEvent, status: DeliveryStatus) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(status) }
  function handleDrop(e: React.DragEvent, status: DeliveryStatus) { e.preventDefault(); setDragOverCol(null); if (dragId) { updateStatus(dragId, status); setDragId(null) } }
  function handleCardClick(d: Delivery) { setSelectedDelivery(d); setDetailOpen(true) }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lieferverfolgung</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{stats.total} Lieferungen verfolgen</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button onClick={() => setViewMode("kanban")} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all", viewMode === "kanban" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <IconLayoutKanban className="size-3.5" />Kanban
            </button>
            <button onClick={() => setViewMode("table")} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all", viewMode === "table" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <IconTable className="size-3.5" />Tabelle
            </button>
          </div>
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}><IconPlus className="size-4" />Neue Lieferung</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center"><IconTruck className="size-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{stats.inTransit}</p><p className="text-xs text-muted-foreground">Unterwegs</p></div></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-3"><div className={cn("size-10 rounded-lg flex items-center justify-center", stats.overdue > 0 ? "bg-destructive/10" : "bg-muted")}><IconAlertTriangle className={cn("size-5", stats.overdue > 0 ? "text-destructive" : "text-muted-foreground")} /></div><div><p className={cn("text-2xl font-bold", stats.overdue > 0 ? "text-destructive" : "text-foreground")}>{stats.overdue}</p><p className="text-xs text-muted-foreground">Überfällig</p></div></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center"><IconClock className="size-5 text-blue-600 dark:text-blue-400" /></div><div><p className="text-2xl font-bold text-foreground">{stats.avgDays > 0 ? `${stats.avgDays} Tage` : "–"}</p><p className="text-xs text-muted-foreground">Ø Lieferzeit</p></div></div></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><div className="flex items-center gap-3"><div className="size-10 rounded-lg bg-muted flex items-center justify-center"><IconPackage className="size-5 text-muted-foreground" /></div><div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Lieferungen</p></div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {(["all", ...DELIVERY_STATUSES] as const).map((s) => {
            const isAll = s === "all"
            const count = isAll ? deliveries.length : deliveries.filter((d) => d.status === s).length
            const label = isAll ? "Alle" : STATUS_CONFIG[s as DeliveryStatus].label
            return (
              <button key={s} onClick={() => setStatusFilter(s)} className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer", statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-border/80")}>
                {label}<span className={cn("inline-flex items-center justify-center size-4 rounded-full text-[10px]", statusFilter === s ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>{count}</span>
              </button>
            )
          })}
        </div>
        <div className="flex-1" />
        {uniqueSuppliers.length > 0 && (
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Lieferant..." /></SelectTrigger>
            <SelectContent><SelectItem value="all">Alle Lieferanten</SelectItem>{uniqueSuppliers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <div className="relative w-[220px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-xs" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : filtered.length === 0 && deliveries.length === 0 ? (
        <Card className="border-0 shadow-sm"><CardContent className="py-16 text-center">
          <IconTruck className="size-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Keine Lieferungen vorhanden</h3>
          <p className="text-sm text-muted-foreground mb-4">Erstellen Sie eine Lieferverfolgung für Ihre Bestellungen.</p>
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}><IconPlus className="size-4" />Erste Lieferung erstellen</Button>
        </CardContent></Card>
      ) : viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DELIVERY_STATUSES.map((status) => (
            <KanbanColumn key={status} status={status} deliveries={kanbanGroups[status]} onDragStart={handleDragStart}
              onDragOver={(e) => handleDragOver(e, status)} onDrop={(e) => handleDrop(e, status)} onDragLeave={() => setDragOverCol(null)} isDragOver={dragOverCol === status} onClick={handleCardClick} />
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="text-xs font-medium text-muted-foreground">Bestellung</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Lieferant</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Spediteur</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Sendungsnr.</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Erwartet</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Geliefert</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">Keine Lieferungen gefunden</TableCell></TableRow>
              ) : filtered.map((d) => {
                const cfg = getStatusConfig(d.status); const StatusIcon = cfg.icon; const overdue = isOverdue(d)
                const trackingLink = d.trackingUrl || generateTrackingUrl(d.carrier, d.trackingNumber)
                const carrierLabel = CARRIERS.find((c) => c.id === d.carrier)?.name || d.carrier
                return (
                  <TableRow key={d.id} className={cn("hover:bg-muted/50 cursor-pointer", overdue && "bg-destructive/5")} onClick={() => handleCardClick(d)}>
                    <TableCell><p className="text-sm font-semibold text-foreground">{d.orderNumber || "–"}</p><p className="text-xs text-muted-foreground">{formatDate(d.orderDate)}</p></TableCell>
                    <TableCell className="text-sm text-foreground">{d.supplierName || "–"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{carrierLabel || "–"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono text-foreground">{d.trackingNumber || "–"}</span>
                        {trackingLink && <a href={trackingLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:text-primary/80"><IconExternalLink className="size-3.5" /></a>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md", cfg.bgColor, cfg.color)}><StatusIcon className="size-3" />{cfg.label}</span>
                        {overdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Überfällig</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className={cn("text-sm", overdue ? "text-destructive font-medium" : "text-foreground")}>{formatDate(d.expectedDeliveryDate)}</TableCell>
                    <TableCell className="text-sm text-foreground">{formatDate(d.actualDeliveryDate)}</TableCell>
                    <TableCell>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><IconDotsVertical className="size-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={() => handleCardClick(d)}><IconEye className="size-4" />Details</DropdownMenuItem>
                            {d.status !== "delivered" && (<><DropdownMenuSeparator />{DELIVERY_STATUSES.filter((s) => DELIVERY_STATUSES.indexOf(s) > DELIVERY_STATUSES.indexOf(d.status as DeliveryStatus)).map((s) => { const SIcon = STATUS_CONFIG[s].icon; return <DropdownMenuItem key={s} className="gap-2" onClick={() => updateStatus(d.id, s)}><SIcon className="size-4" />{STATUS_CONFIG[s].label}</DropdownMenuItem> })}</>)}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => deleteDelivery(d.id)}><IconTrash className="size-4" />Löschen</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <DeliveryDetailSheet delivery={selectedDelivery} open={detailOpen} onClose={() => { setDetailOpen(false); setSelectedDelivery(null) }} onStatusChange={(id, status) => { updateStatus(id, status); setSelectedDelivery((prev) => prev && prev.id === id ? { ...prev, status } : prev) }} />
      <CreateDeliveryDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchDeliveries} orders={availableOrders} suppliers={availableSuppliers} />
    </div>
  )
}
