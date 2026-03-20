"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  IconPlus,
  IconRepeat,
  IconLoader2,
  IconTrash,
  IconPlayerPause,
  IconPlayerPlay,
  IconCalendar,
  IconTruck,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"

// ── Types ─────────────────────────────────────────────────────────────
interface RecurringOrder {
  id: string
  name: string
  supplierId: string
  supplierName: string | null
  items: { materialId: string; quantity: number; materialName?: string }[]
  frequency: string
  dayOfWeek: number | null
  dayOfMonth: number | null
  nextRunAt: string | null
  lastRunAt: string | null
  isActive: boolean
  createdAt: string
}

interface Supplier {
  id: string
  name: string
}

interface Material {
  id: string
  name: string
  articleNumber: string | null
  unit: string | null
}

// ── Constants ─────────────────────────────────────────────────────────
const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Wöchentlich",
  biweekly: "Alle 2 Wochen",
  monthly: "Monatlich",
}

const FREQUENCY_COLORS: Record<string, string> = {
  weekly: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  biweekly: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  monthly: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
}

const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

// ── Create Dialog ─────────────────────────────────────────────────────
function CreateRecurringOrderDialog({
  suppliers,
  materials,
  onCreated,
}: {
  suppliers: Supplier[]
  materials: Material[]
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [frequency, setFrequency] = useState("weekly")
  const [dayOfWeek, setDayOfWeek] = useState("1") // Monday
  const [dayOfMonth, setDayOfMonth] = useState("1")
  const [orderItems, setOrderItems] = useState<{ materialId: string; quantity: number }[]>([
    { materialId: "", quantity: 1 },
  ])

  function addItem() {
    setOrderItems((prev) => [...prev, { materialId: "", quantity: 1 }])
  }

  function removeItem(index: number) {
    setOrderItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: "materialId" | "quantity", value: string | number) {
    setOrderItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  async function handleSubmit() {
    if (!name || !supplierId || orderItems.some((i) => !i.materialId)) return
    setSaving(true)
    try {
      const res = await fetch("/api/recurring-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          supplierId,
          frequency,
          dayOfWeek: frequency !== "monthly" ? parseInt(dayOfWeek) : null,
          dayOfMonth: frequency === "monthly" ? parseInt(dayOfMonth) : null,
          items: orderItems.map((i) => ({ materialId: i.materialId, quantity: i.quantity })),
        }),
      })
      if (!res.ok) throw new Error()
      setOpen(false)
      resetForm()
      onCreated()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setName("")
    setSupplierId("")
    setFrequency("weekly")
    setDayOfWeek("1")
    setDayOfMonth("1")
    setOrderItems([{ materialId: "", quantity: 1 }])
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <IconPlus className="size-4" />
          Neue wiederkehrende Bestellung
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neue wiederkehrende Bestellung</DialogTitle>
          <DialogDescription>
            Automatisieren Sie regelmässige Bestellungen bei Ihren Lieferanten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ro-name">Bezeichnung</Label>
            <Input
              id="ro-name"
              placeholder="z.B. Wöchentliche Verbrauchsmaterial-Bestellung"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Supplier */}
          <div className="space-y-1.5">
            <Label>Lieferant</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Lieferant wählen" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label>Frequenz</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Wöchentlich</SelectItem>
                <SelectItem value="biweekly">Alle 2 Wochen</SelectItem>
                <SelectItem value="monthly">Monatlich</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Day */}
          {frequency !== "monthly" ? (
            <div className="space-y-1.5">
              <Label>Wochentag</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Tag im Monat</Label>
              <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1}.
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Artikel</Label>
              <Button type="button" variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={addItem}>
                <IconPlus className="size-3" />
                Artikel hinzufügen
              </Button>
            </div>
            {orderItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select
                  value={item.materialId}
                  onValueChange={(v) => updateItem(idx, "materialId", v)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Material wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {m.articleNumber && (
                          <span className="ml-1 text-muted-foreground">({m.articleNumber})</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  className="w-20"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                />
                {orderItems.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive shrink-0"
                    onClick={() => removeItem(idx)}
                  >
                    <IconTrash className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name || !supplierId}>
            {saving ? (
              <>
                <IconLoader2 className="size-4 animate-spin mr-1" />
                Speichern...
              </>
            ) : (
              "Erstellen"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────
export default function RecurringOrdersPage() {
  const [orders, setOrders] = useState<RecurringOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const [ordersRes, suppliersRes, materialsRes] = await Promise.all([
        fetch("/api/recurring-orders"),
        fetch("/api/suppliers?limit=200"),
        fetch("/api/materials?limit=500"),
      ])

      if (ordersRes.ok) {
        const data = await ordersRes.json()
        setOrders(Array.isArray(data) ? data : [])
      }
      if (suppliersRes.ok) {
        const data = await suppliersRes.json()
        setSuppliers(Array.isArray(data) ? data : data.data ?? [])
      }
      if (materialsRes.ok) {
        const data = await materialsRes.json()
        setMaterials(Array.isArray(data) ? data : data.data ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // ── Toggle active ──────────────────────────────────────────────────
  async function toggleActive(order: RecurringOrder) {
    const newActive = !order.isActive
    // Optimistic
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, isActive: newActive } : o))
    )
    try {
      const res = await fetch(`/api/recurring-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, isActive: order.isActive } : o))
      )
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setOrders((prev) => prev.filter((o) => o.id !== id))
    try {
      await fetch(`/api/recurring-orders/${id}`, { method: "DELETE" })
    } catch {
      fetchAll()
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────
  const activeCount = orders.filter((o) => o.isActive).length
  const pausedCount = orders.filter((o) => !o.isActive).length
  const nextDays = useMemo(() => {
    const activeDays = orders
      .filter((o) => o.isActive && o.nextRunAt)
      .map((o) => daysUntil(o.nextRunAt))
      .filter((d): d is number => d !== null)
    return activeDays.length > 0 ? Math.min(...activeDays) : null
  }, [orders])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <IconRepeat className="size-6" />
            Wiederkehrende Bestellungen
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automatisierte Nachbestellungen bei Ihren Lieferanten
          </p>
        </div>
        <CreateRecurringOrderDialog
          suppliers={suppliers}
          materials={materials}
          onCreated={fetchAll}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <IconPlayerPlay className="size-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Aktiv</p>
            </div>
            <p className="text-3xl font-bold text-foreground mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <IconPlayerPause className="size-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">Pausiert</p>
            </div>
            <p className="text-3xl font-bold text-foreground mt-1">{pausedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <IconCalendar className="size-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Nächste Ausführung</p>
            </div>
            <p className="text-3xl font-bold text-foreground mt-1">
              {nextDays !== null ? (
                <>
                  {nextDays} <span className="text-base font-normal text-muted-foreground">Tage</span>
                </>
              ) : (
                "—"
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <Empty className="py-16">
              <EmptyMedia>
                <IconRepeat className="size-12 text-muted-foreground/40" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Keine wiederkehrenden Bestellungen</EmptyTitle>
                <EmptyDescription>
                  Erstellen Sie Ihre erste automatische Bestellung.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Bezeichnung
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[160px]">
                    Lieferant
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">
                    Frequenz
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">
                    Nächste Ausführung
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px]">
                    Status
                  </TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const days = daysUntil(order.nextRunAt)
                  return (
                    <TableRow
                      key={order.id}
                      className="group hover:bg-muted/80 border-b border-border"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm text-foreground">{order.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(order.items as { materialId: string; quantity: number }[]).length} Artikel
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <IconTruck className="size-3.5 text-muted-foreground/60 shrink-0" />
                          <span className="text-sm text-foreground truncate">
                            {order.supplierName ?? "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={FREQUENCY_COLORS[order.frequency] ?? ""}
                        >
                          {FREQUENCY_LABELS[order.frequency] ?? order.frequency}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {order.frequency === "monthly"
                            ? `Am ${order.dayOfMonth ?? 1}. des Monats`
                            : order.dayOfWeek !== null
                              ? DAY_NAMES[order.dayOfWeek]
                              : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-foreground">{formatDate(order.nextRunAt)}</p>
                        {days !== null && order.isActive && (
                          <p className="text-[10px] text-muted-foreground">
                            in {days} {days === 1 ? "Tag" : "Tagen"}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={order.isActive}
                            onCheckedChange={() => toggleActive(order)}
                            className="scale-90"
                          />
                          <span className="text-xs text-muted-foreground">
                            {order.isActive ? "Aktiv" : "Pausiert"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(order.id)}
                        >
                          <IconTrash className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
