"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconArrowLeft,
  IconEdit,
  IconTrash,
  IconPlus,
  IconMinus,
  IconPhoto,
  IconAlertTriangle,
  IconDeviceFloppy,
  IconExternalLink,
} from "@tabler/icons-react"
import { QrCodeDisplay } from "@/components/qr-code"
import { ZebraLabelButton } from "@/components/zebra-label-button"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MaterialGroup {
  id: string
  name: string
  color: string | null
}

interface Location {
  id: string
  name: string
}

interface MaterialDetail {
  id: string
  number: string | null
  name: string
  image: string | null
  groupId: string | null
  group: MaterialGroup | null
  mainLocationId: string | null
  mainLocation: Location | null
  unit: string
  barcode: string | null
  manufacturer: string | null
  manufacturerNumber: string | null
  reorderLevel: number
  notes: string | null
  isActive: boolean
}

interface StockEntry {
  id: string
  locationId: string
  location: Location
  quantity: number
  batchNumber: string | null
  serialNumber: string | null
  expiryDate: string | null
}

interface SupplierLink {
  id: string
  supplierId: string
  supplierName: string
  supplierNumber: string | null
  unitPrice: number | null
  currency: string
}

interface TaskEntry {
  id: string
  title: string
  status: string
  dueDate: string | null
  assignedTo: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function isExpiringSoon(dateStr: string | null): boolean {
  if (!dateStr) return false
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 30
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function taskStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-secondary/10 text-secondary"
    case "in_progress":
      return "bg-primary/10 text-primary"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function taskStatusLabel(status: string) {
  switch (status) {
    case "completed":
      return "Erledigt"
    case "in_progress":
      return "In Bearbeitung"
    default:
      return "Offen"
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MaterialDetailPage() {
  const t = useTranslations("materials")
  const tc = useTranslations("common")
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const materialId = params.id

  // Data state
  const [material, setMaterial] = useState<MaterialDetail | null>(null)
  const [stocks, setStocks] = useState<StockEntry[]>([])
  const [suppliers, setSuppliers] = useState<SupplierLink[]>([])
  const [tasks, setTasks] = useState<TaskEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [form, setForm] = useState<Partial<MaterialDetail>>({})
  const [isEditing, setIsEditing] = useState(false)

  // Reference data
  const [groups, setGroups] = useState<MaterialGroup[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  // Stock booking dialog
  const [bookingType, setBookingType] = useState<"in" | "out" | null>(null)
  const [bookingQty, setBookingQty] = useState(1)
  const [bookingLocationId, setBookingLocationId] = useState("")
  const [bookingLoading, setBookingLoading] = useState(false)

  // Delete dialog
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Fetch everything
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [matRes, stocksRes, suppRes, tasksRes, groupsRes, locsRes] =
          await Promise.all([
            fetch(`/api/materials/${materialId}`),
            fetch(`/api/materials/${materialId}/stocks`),
            fetch(`/api/materials/${materialId}/suppliers`),
            fetch(`/api/materials/${materialId}/tasks`),
            fetch("/api/material-groups"),
            fetch("/api/locations"),
          ])

        if (matRes.ok) {
          const m = await matRes.json()
          setMaterial(m)
          setForm(m)
        }
        if (stocksRes.ok) {
          const s = await stocksRes.json()
          setStocks(Array.isArray(s) ? s : s.data ?? [])
        }
        if (suppRes.ok) {
          const s = await suppRes.json()
          setSuppliers(Array.isArray(s) ? s : s.data ?? [])
        }
        if (tasksRes.ok) {
          const t = await tasksRes.json()
          setTasks(Array.isArray(t) ? t : t.data ?? [])
        }
        if (groupsRes.ok) {
          const g = await groupsRes.json()
          setGroups(Array.isArray(g) ? g : g.data ?? [])
        }
        if (locsRes.ok) {
          const l = await locsRes.json()
          setLocations(Array.isArray(l) ? l : l.data ?? [])
        }
      } catch {
        // TODO: handle error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [materialId])

  // Save handler
  const handleSave = useCallback(async () => {
    if (!material) return
    setSaving(true)
    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          number: form.number,
          unit: form.unit,
          barcode: form.barcode,
          groupId: form.groupId,
          mainLocationId: form.mainLocationId,
          reorderLevel: form.reorderLevel,
          manufacturer: form.manufacturer,
          manufacturerNumber: form.manufacturerNumber,
          notes: form.notes,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setMaterial(updated)
        setForm(updated)
        setIsEditing(false)
      }
    } catch {
      // TODO: toast
    } finally {
      setSaving(false)
    }
  }, [material, materialId, form])

  // Delete handler
  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/materials/${materialId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        router.push("/dashboard/materials")
      }
    } catch {
      // TODO: toast
    } finally {
      setDeleting(false)
    }
  }, [materialId, router])

  // Stock booking handler
  const handleBooking = useCallback(async () => {
    if (!bookingType || !bookingLocationId) return
    setBookingLoading(true)
    try {
      const res = await fetch(`/api/materials/${materialId}/stock-changes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeType: bookingType === "in" ? "in" : "out",
          quantity: bookingType === "in" ? bookingQty : -bookingQty,
          locationId: bookingLocationId,
        }),
      })
      if (res.ok) {
        // Refresh stocks
        const stocksRes = await fetch(
          `/api/materials/${materialId}/stocks`
        )
        if (stocksRes.ok) {
          const s = await stocksRes.json()
          setStocks(Array.isArray(s) ? s : s.data ?? [])
        }
        setBookingType(null)
        setBookingQty(1)
        setBookingLocationId("")
      }
    } catch {
      // TODO: toast
    } finally {
      setBookingLoading(false)
    }
  }, [bookingType, bookingLocationId, bookingQty, materialId])

  const totalStock = stocks.reduce((sum, s) => sum + s.quantity, 0)

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <h2 className="text-lg font-medium">Material nicht gefunden</h2>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/dashboard/materials")}
        >
          <IconArrowLeft className="size-4" />
          {tc("back")}
        </Button>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/materials")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {material.image ? (
              <img
                src={material.image}
                alt={material.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <IconPhoto className="size-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {material.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {material.number && (
                <span className="font-mono">{material.number} &middot; </span>
              )}
              {material.group?.name ?? t("group")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBookingType("in")}
          >
            <IconPlus className="size-4" />
            Einbuchen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBookingType("out")}
          >
            <IconMinus className="size-4" />
            Ausbuchen
          </Button>
          <Separator orientation="vertical" className="mx-1 h-6" />
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm(material)
                  setIsEditing(false)
                }}
              >
                {tc("cancel")}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <IconDeviceFloppy className="size-4" />
                {saving ? tc("loading") : tc("save")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <IconEdit className="size-4" />
                {tc("edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDelete(true)}
                className="text-destructive hover:text-destructive"
              >
                <IconTrash className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("stock")}
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                material.reorderLevel > 0 && totalStock < material.reorderLevel
                  ? "text-destructive"
                  : "text-foreground"
              }`}
            >
              {totalStock} <span className="text-sm font-normal text-muted-foreground">{material.unit}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("reorderLevel")}
            </p>
            <p className="mt-1 text-2xl font-bold">
              {material.reorderLevel || "\u2014"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Lagerorte
            </p>
            <p className="mt-1 text-2xl font-bold">{stocks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("tabs.suppliers")}
            </p>
            <p className="mt-1 text-2xl font-bold">{suppliers.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">{t("tabs.general")}</TabsTrigger>
          <TabsTrigger value="locations">{t("tabs.locations")}</TabsTrigger>
          <TabsTrigger value="suppliers">{t("tabs.suppliers")}</TabsTrigger>
          <TabsTrigger value="tasks">{t("tabs.tasks")}</TabsTrigger>
          <TabsTrigger value="qr">QR-Code</TabsTrigger>
        </TabsList>

        {/* ─── General Tab ─────────────────────────────────────────── */}
        <TabsContent value="general">
          <Card>
            <CardContent className="grid gap-6 p-6 sm:grid-cols-2">
              {/* Name */}
              <div className="space-y-2">
                <Label>{t("name")}</Label>
                {isEditing ? (
                  <Input
                    value={form.name ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm">{material.name}</p>
                )}
              </div>

              {/* Nummer */}
              <div className="space-y-2">
                <Label>{t("number")}</Label>
                {isEditing ? (
                  <Input
                    value={form.number ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, number: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm font-mono">
                    {material.number || "\u2014"}
                  </p>
                )}
              </div>

              {/* Einheit */}
              <div className="space-y-2">
                <Label>{t("unit")}</Label>
                {isEditing ? (
                  <Input
                    value={form.unit ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unit: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm">{material.unit}</p>
                )}
              </div>

              {/* Barcode */}
              <div className="space-y-2">
                <Label>{t("barcode")}</Label>
                {isEditing ? (
                  <Input
                    value={form.barcode ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, barcode: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm font-mono">
                    {material.barcode || "\u2014"}
                  </p>
                )}
              </div>

              {/* Material Gruppe */}
              <div className="space-y-2">
                <Label>{t("group")}</Label>
                {isEditing ? (
                  <Select
                    value={form.groupId ?? ""}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, groupId: v || null }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("group")} />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    {material.group ? (
                      <Badge
                        variant="secondary"
                        style={
                          material.group.color
                            ? {
                                backgroundColor: `${material.group.color}18`,
                                color: material.group.color,
                                borderColor: `${material.group.color}30`,
                              }
                            : undefined
                        }
                      >
                        {material.group.name}
                      </Badge>
                    ) : (
                      "\u2014"
                    )}
                  </p>
                )}
              </div>

              {/* Haupt Lagerort */}
              <div className="space-y-2">
                <Label>{t("mainLocation")}</Label>
                {isEditing ? (
                  <Select
                    value={form.mainLocationId ?? ""}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, mainLocationId: v || null }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("mainLocation")} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">
                    {material.mainLocation?.name ?? "\u2014"}
                  </p>
                )}
              </div>

              {/* Meldebestand */}
              <div className="space-y-2">
                <Label>{t("reorderLevel")}</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    min={0}
                    value={form.reorderLevel ?? 0}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reorderLevel: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm">{material.reorderLevel}</p>
                )}
              </div>

              {/* Hersteller */}
              <div className="space-y-2">
                <Label>{t("manufacturer")}</Label>
                {isEditing ? (
                  <Input
                    value={form.manufacturer ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, manufacturer: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm">
                    {material.manufacturer || "\u2014"}
                  </p>
                )}
              </div>

              {/* Herstellernummer */}
              <div className="space-y-2">
                <Label>{t("manufacturerNumber")}</Label>
                {isEditing ? (
                  <Input
                    value={form.manufacturerNumber ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        manufacturerNumber: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <p className="text-sm font-mono">
                    {material.manufacturerNumber || "\u2014"}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("tabs.notes")}</Label>
                {isEditing ? (
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    value={form.notes ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {material.notes || "\u2014"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Locations / Stock Tab ───────────────────────────────── */}
        <TabsContent value="locations">
          <Card>
            {stocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-muted-foreground">
                  Kein Bestand vorhanden
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setBookingType("in")}
                >
                  <IconPlus className="size-4" />
                  Einbuchen
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lagerort</TableHead>
                    <TableHead>Menge</TableHead>
                    <TableHead>{t("batchNumber")}</TableHead>
                    <TableHead>{t("serialNumber")}</TableHead>
                    <TableHead>{t("expiryDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks.map((s) => {
                    const expired = isExpired(s.expiryDate)
                    const expiring = isExpiringSoon(s.expiryDate)
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.location.name}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold">
                            {s.quantity}
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {material.unit}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.batchNumber || "\u2014"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.serialNumber || "\u2014"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {(expired || expiring) && (
                              <IconAlertTriangle
                                className={
                                  expired
                                    ? "size-4 text-destructive"
                                    : "size-4 text-primary"
                                }
                              />
                            )}
                            <span
                              className={
                                expired
                                  ? "text-sm font-medium text-destructive"
                                  : expiring
                                    ? "text-sm font-medium text-primary"
                                    : "text-sm"
                              }
                            >
                              {formatDate(s.expiryDate)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* ─── Suppliers Tab ───────────────────────────────────────── */}
        <TabsContent value="suppliers">
          <Card>
            {suppliers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-muted-foreground">
                  Keine Bezugsquellen verknüpft
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lieferant</TableHead>
                    <TableHead>Lieferantennummer</TableHead>
                    <TableHead>Einkaufspreis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {s.supplierName}
                          <IconExternalLink className="size-3.5 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {s.supplierNumber || "\u2014"}
                      </TableCell>
                      <TableCell>
                        {s.unitPrice != null
                          ? `${(s.unitPrice / 100).toFixed(2)} ${s.currency}`
                          : "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* ─── Tasks Tab ───────────────────────────────────────────── */}
        <TabsContent value="tasks">
          <Card>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-sm text-muted-foreground">
                  Keine Aufgaben vorhanden
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aufgabe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>F&auml;llig</TableHead>
                    <TableHead>Zugewiesen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        {task.title}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${taskStatusColor(task.status)}`}
                        >
                          {taskStatusLabel(task.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(task.dueDate)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.assignedTo ?? "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* ─── QR-Code Tab ─────────────────────────────────────────── */}
        <TabsContent value="qr">
          <div className="flex flex-col items-center gap-6 py-8">
            <p className="text-sm text-muted-foreground font-mono text-center max-w-sm">
              Dieser QR-Code verlinkt direkt auf die Materialseite. Ausdrucken und am Lagerort anbringen.
            </p>
            <QrCodeDisplay
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}/dashboard/materials/${material.id}`
                  : `/dashboard/materials/${material.id}`
              }
              label={`${material.number ?? ""} · ${material.name}`}
              size={200}
            />
            <ZebraLabelButton
              data={{
                name: material.name,
                number: material.number,
                qrValue: typeof window !== "undefined" ? `${window.location.origin}/dashboard/materials/${material.id}` : `/dashboard/materials/${material.id}`,
                location: material.mainLocation?.name,
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Stock Booking Dialog ──────────────────────────────────── */}
      <Dialog
        open={bookingType !== null}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setBookingType(null)
            setBookingQty(1)
            setBookingLocationId("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bookingType === "in" ? "Einbuchen" : "Ausbuchen"}
            </DialogTitle>
            <DialogDescription>
              {bookingType === "in"
                ? "Material dem Bestand hinzuf\u00fcgen"
                : "Material aus dem Bestand entnehmen"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Lagerort</Label>
              <Select
                value={bookingLocationId}
                onValueChange={setBookingLocationId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Lagerort w\u00e4hlen" />
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
            <div className="space-y-2">
              <Label>Menge</Label>
              <Input
                type="number"
                min={1}
                value={bookingQty}
                onChange={(e) =>
                  setBookingQty(Math.max(1, parseInt(e.target.value) || 1))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBookingType(null)
                setBookingQty(1)
                setBookingLocationId("")
              }}
              disabled={bookingLoading}
            >
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleBooking}
              disabled={bookingLoading || !bookingLocationId}
            >
              {bookingLoading
                ? tc("loading")
                : bookingType === "in"
                  ? "Einbuchen"
                  : "Ausbuchen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Dialog ─────────────────────────────────────────── */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Material l&ouml;schen</DialogTitle>
            <DialogDescription>
              M&ouml;chten Sie &laquo;{material.name}&raquo; wirklich
              l&ouml;schen? Alle Bestandsdaten gehen verloren.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              disabled={deleting}
            >
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? tc("loading") : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
