"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconArrowLeft,
  IconBuildingWarehouse,
  IconTruck,
  IconBuildingFactory,
  IconAmbulance,
  IconStethoscope,
  IconHeartbeat,
  IconUser,
  IconPackage,
  IconTool,
  IconKey,
  IconEdit,
  IconDeviceFloppy,
  IconX,
  IconMapPin,
  IconPlus,
  IconMinus,
  IconAlertTriangle,
  IconQrcode,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import GpsPicker, { type GpsValue } from "@/components/gps-picker"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LOCATION_TYPES = [
  { value: "warehouse", icon: IconBuildingWarehouse, color: "text-primary" },
  { value: "vehicle", icon: IconTruck, color: "text-primary" },
  { value: "site", icon: IconBuildingFactory, color: "text-primary" },
  { value: "station", icon: IconAmbulance, color: "text-destructive" },
  { value: "practice", icon: IconStethoscope, color: "text-secondary" },
  {
    value: "operating_room",
    icon: IconHeartbeat,
    color: "text-muted-foreground",
  },
  { value: "user", icon: IconUser, color: "text-muted-foreground" },
] as const


const LOCATION_TYPE_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>
    color: string
    badgeBg: string
  }
> = {
  warehouse: {
    icon: IconBuildingWarehouse,
    color: "bg-primary/10 text-primary",
    badgeBg: "bg-primary/10 text-primary border-border",
  },
  vehicle: {
    icon: IconTruck,
    color: "bg-primary/10 text-primary",
    badgeBg: "bg-primary/10 text-primary border-border",
  },
  site: {
    icon: IconBuildingFactory,
    color: "bg-primary/10 text-primary",
    badgeBg: "bg-primary/10 text-primary border-border",
  },
  station: {
    icon: IconAmbulance,
    color: "bg-destructive/10 text-destructive",
    badgeBg: "bg-destructive/10 text-destructive border-destructive/30",
  },
  practice: {
    icon: IconStethoscope,
    color: "bg-secondary/10 text-secondary",
    badgeBg: "bg-secondary/10 text-secondary border-secondary/30",
  },
  operating_room: {
    icon: IconHeartbeat,
    color: "bg-muted text-muted-foreground",
    badgeBg: "bg-muted text-muted-foreground border-border",
  },
  user: {
    icon: IconUser,
    color: "bg-muted text-muted-foreground",
    badgeBg: "bg-muted text-muted-foreground border-border",
  },
}

const TYPE_I18N_MAP: Record<string, string> = {
  warehouse: "warehouse",
  vehicle: "vehicle",
  site: "site",
  station: "station",
  practice: "practice",
  operating_room: "operatingRoom",
  user: "user",
}

const TEMPLATES = [
  { value: "none", label: "Kein Template" },
  { value: "rettungswagen", label: "Rettungswagen (Standard)" },
  { value: "baustelle", label: "Baustelle (Standard)" },
  { value: "praxis", label: "Arztpraxis (Standard)" },
  { value: "op", label: "OP-Saal (Standard)" },
  { value: "lager", label: "Lager (Standard)" },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LocationDetail {
  id: string
  name: string
  type: string
  category: string | null
  template: string | null
  address: string | null
  latitude: string | null
  longitude: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  stockSummary?: {
    materials: number
    tools: number
    keys: number
  }
}

interface StockItem {
  id: string
  materialId: string
  materialName?: string
  materialNumber?: string
  quantity: number
  unit?: string
  minStock: number | null
  maxStock: number | null
  expiryDate: string | null
  batchNumber: string | null
}

interface ToolItem {
  id: string
  name: string
  number: string | null
  condition: string | null
  assignedToId: string | null
}

interface KeyItem {
  id: string
  name: string
  number: string | null
  address: string | null
  quantity: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getTypeConfig(type: string) {
  return (
    LOCATION_TYPE_CONFIG[type] ?? {
      icon: IconMapPin,
      color: "bg-muted text-muted-foreground",
      badgeBg: "bg-muted text-muted-foreground border-border",
    }
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function conditionBadge(condition: string | null) {
  const map: Record<string, { label: string; className: string }> = {
    good: {
      label: "Gut",
      className: "bg-secondary/10 text-secondary border-secondary/30",
    },
    damaged: {
      label: "Beschädigt",
      className: "bg-primary/10 text-primary border-border",
    },
    repair: {
      label: "In Reparatur",
      className: "bg-primary/10 text-primary border-border",
    },
    decommissioned: {
      label: "Ausgemustert",
      className:
        "bg-destructive/10 text-destructive border-destructive/30",
    },
  }
  const key = condition ?? "good"
  const info = map[key] ?? { label: key, className: "" }
  return (
    <Badge variant="outline" className={info.className}>
      {info.label}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LocationDetailPage() {
  const t = useTranslations("locations")
  const tc = useTranslations("common")
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  // Location state
  const [location, setLocation] = useState<LocationDetail | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Sub-resource state
  const [stocks, setStocks] = useState<StockItem[]>([])
  const [tools, setTools] = useState<ToolItem[]>([])
  const [keys, setKeys] = useState<KeyItem[]>([])
  const [loadingStocks, setLoadingStocks] = useState(false)
  const [loadingTools, setLoadingTools] = useState(false)
  const [loadingKeys, setLoadingKeys] = useState(false)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<{
    name: string
    type: string
    category: string
    address: string
    template: string
    latitude: string
    longitude: string
  }>({
    name: "",
    type: "",
    category: "",
    address: "",
    template: "none",
    latitude: "",
    longitude: "",
  })

  // Fetch location details
  useEffect(() => {
    async function fetchLocation() {
      setLoadingLocation(true)
      try {
        const res = await fetch(`/api/locations/${id}`)
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (res.ok) {
          const data: LocationDetail = await res.json()
          setLocation(data)
          setEditForm({
            name: data.name,
            type: data.type,
            category: data.category ?? "",
            address: data.address ?? "",
            template: data.template ?? "none",
            latitude: data.latitude ?? "",
            longitude: data.longitude ?? "",
          })
        }
      } catch {
        // TODO: toast error
      } finally {
        setLoadingLocation(false)
      }
    }
    if (id) fetchLocation()
  }, [id])

  // Fetch stocks for this location
  useEffect(() => {
    async function fetchStocks() {
      setLoadingStocks(true)
      try {
        const res = await fetch(`/api/material-stocks?locationId=${id}`)
        if (res.ok) {
          const data = await res.json()
          setStocks(Array.isArray(data) ? data : (data.data ?? []))
        }
      } catch {
        // silently fail — table will show empty
      } finally {
        setLoadingStocks(false)
      }
    }
    async function fetchTools() {
      setLoadingTools(true)
      try {
        const res = await fetch(`/api/tools?locationId=${id}`)
        if (res.ok) {
          const data = await res.json()
          setTools(Array.isArray(data) ? data : (data.data ?? []))
        }
      } catch {
        // silently fail
      } finally {
        setLoadingTools(false)
      }
    }
    async function fetchKeys() {
      setLoadingKeys(true)
      try {
        const res = await fetch(`/api/keys?locationId=${id}`)
        if (res.ok) {
          const data = await res.json()
          setKeys(Array.isArray(data) ? data : (data.data ?? []))
        }
      } catch {
        // silently fail
      } finally {
        setLoadingKeys(false)
      }
    }

    if (id) {
      fetchStocks()
      fetchTools()
      fetchKeys()
    }
  }, [id])

  // Save edits
  const handleSave = useCallback(async () => {
    if (!location) return
    setSaving(true)
    try {
      const body = {
        name: editForm.name.trim(),
        type: editForm.type,
        category: editForm.category.trim() || null,
        address: editForm.address.trim() || null,
        template: editForm.template !== "none" ? editForm.template : null,
        latitude: editForm.latitude.trim() || null,
        longitude: editForm.longitude.trim() || null,
      }
      const res = await fetch(`/api/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated: LocationDetail = await res.json()
        setLocation((prev) =>
          prev ? { ...prev, ...updated } : updated
        )
        setEditing(false)
      }
    } catch {
      // TODO: toast error
    } finally {
      setSaving(false)
    }
  }, [editForm, id, location])

  const handleCancelEdit = useCallback(() => {
    if (!location) return
    setEditForm({
      name: location.name,
      type: location.type,
      category: location.category ?? "",
      address: location.address ?? "",
      template: location.template ?? "none",
      latitude: location.latitude ?? "",
      longitude: location.longitude ?? "",
    })
    setEditing(false)
  }, [location])

  // ---------------------------------------------------------------------------
  // Loading / not found states
  // ---------------------------------------------------------------------------
  if (loadingLocation) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
        <Skeleton className="h-8 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (notFound || !location) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 lg:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => router.push("/dashboard/locations")}
        >
          <IconArrowLeft className="size-4" />
          {tc("back")}
        </Button>
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
          <IconAlertTriangle className="size-10 text-muted-foreground" />
          <h3 className="text-lg font-medium">Lagerort nicht gefunden</h3>
          <p className="text-sm text-muted-foreground">
            Dieser Lagerort existiert nicht oder wurde gelöscht.
          </p>
          <Button onClick={() => router.push("/dashboard/locations")}>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    )
  }

  const config = getTypeConfig(location.type)
  const TypeIcon = config.icon
  const i18nKey = TYPE_I18N_MAP[location.type]
  const summary = location.stockSummary ?? {
    materials: stocks.length,
    tools: tools.length,
    keys: keys.length,
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => router.push("/dashboard/locations")}
      >
        <IconArrowLeft className="size-4" />
        {tc("back")}
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {editing ? (
          /* Edit form header */
          <div className="flex-1 space-y-4">
            <h2 className="text-lg font-semibold">Lagerort bearbeiten</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-name">
                  {t("name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Name"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("type")} <span className="text-destructive">*</span></Label>
                <Select
                  value={editForm.type}
                  onValueChange={(v) =>
                    setEditForm((f) => ({ ...f, type: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((lt) => {
                      const Icon = lt.icon
                      return (
                        <SelectItem key={lt.value} value={lt.value}>
                          <Icon className={`size-4 ${lt.color}`} />
                          {t(`types.${TYPE_I18N_MAP[lt.value]}`)}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">{t("category")}</Label>
                <Input
                  id="edit-category"
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="Kategorie"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Adresse</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Adresse"
                />
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={editForm.template}
                  onValueChange={(v) =>
                    setEditForm((f) => ({ ...f, template: v }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((tpl) => (
                      <SelectItem key={tpl.value} value={tpl.value}>
                        {tpl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm font-medium">GPS-Koordinaten</Label>
                <GpsPicker
                  value={{ latitude: editForm.latitude, longitude: editForm.longitude }}
                  onChange={(gps: GpsValue) =>
                    setEditForm((f) => ({ ...f, latitude: gps.latitude, longitude: gps.longitude }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !editForm.name.trim() || !editForm.type}
              >
                <IconDeviceFloppy className="size-4" />
                {saving ? tc("loading") : tc("save")}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                <IconX className="size-4" />
                {tc("cancel")}
              </Button>
            </div>
          </div>
        ) : (
          /* Display header */
          <>
            <div className="flex items-center gap-4">
              <div
                className={`flex size-12 items-center justify-center rounded-xl ${config.color}`}
              >
                <TypeIcon className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {location.name}
                  </h1>
                  <Badge variant="outline" className={config.badgeBg}>
                    {i18nKey ? t(`types.${i18nKey}`) : location.type}
                  </Badge>
                  {!location.isActive && (
                    <Badge
                      variant="outline"
                      className="bg-muted text-muted-foreground border-border"
                    >
                      Inaktiv
                    </Badge>
                  )}
                </div>
                {location.category && (
                  <p className="text-sm text-muted-foreground">
                    {location.category}
                  </p>
                )}
                {location.address && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {location.address}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <QuickBookingSheet
                t={t}
                tCommon={tc}
                locationName={location.name}
              />
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/locations/${id}/qr`)}
              >
                <IconQrcode className="size-4" />
                QR-Code
              </Button>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <IconEdit className="size-4" />
                {tc("edit")}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Overview cards */}
      {!editing && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("materialCount")}
              </CardTitle>
              <IconPackage className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                {summary.materials}
              </div>
              <p className="text-xs text-muted-foreground">
                Verschiedene Materialien
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("toolCount")}
              </CardTitle>
              <IconTool className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                {summary.tools}
              </div>
              <p className="text-xs text-muted-foreground">Zugewiesene Werkzeuge</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("keyCount")}
              </CardTitle>
              <IconKey className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                {summary.keys}
              </div>
              <p className="text-xs text-muted-foreground">Schlüssel</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs: Stock / Tools / Keys */}
      {!editing && (
        <Tabs defaultValue="stock" className="space-y-4">
          <TabsList>
            <TabsTrigger value="stock">
              <IconPackage className="size-4" />
              {t("currentStock")}
            </TabsTrigger>
            <TabsTrigger value="tools">
              <IconTool className="size-4" />
              Werkzeuge
            </TabsTrigger>
            <TabsTrigger value="keys">
              <IconKey className="size-4" />
              Schlüssel
            </TabsTrigger>
          </TabsList>

          {/* Stock Tab */}
          <TabsContent value="stock">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nummer</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Bestand</TableHead>
                    <TableHead>Einheit</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead>Ablaufdatum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingStocks ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : stocks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Keine Materialien an diesem Lagerort.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stocks.map((stock) => {
                      const isLow =
                        stock.minStock !== null &&
                        stock.quantity <= stock.minStock
                      return (
                        <TableRow key={stock.id}>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {stock.materialNumber ?? "\u2014"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {stock.materialName ?? stock.materialId}
                          </TableCell>
                          <TableCell
                            className={`text-right tabular-nums font-semibold ${isLow ? "text-destructive" : ""}`}
                          >
                            {stock.quantity}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {stock.unit ?? "\u2014"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {stock.minStock ?? "\u2014"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {stock.maxStock ?? "\u2014"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(stock.expiryDate)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nummer</TableHead>
                    <TableHead>Werkzeug</TableHead>
                    <TableHead>Zustand</TableHead>
                    <TableHead>Zugewiesen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTools ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : tools.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Keine Werkzeuge an diesem Lagerort.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tools.map((tool) => (
                      <TableRow key={tool.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {tool.number ?? "\u2014"}
                        </TableCell>
                        <TableCell className="font-medium">{tool.name}</TableCell>
                        <TableCell>{conditionBadge(tool.condition)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {tool.assignedToId ?? "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Keys Tab */}
          <TabsContent value="keys">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nummer</TableHead>
                    <TableHead>Schlüssel</TableHead>
                    <TableHead>Adresse / Zuordnung</TableHead>
                    <TableHead className="text-right">Anzahl</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingKeys ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : keys.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Keine Schlüssel an diesem Lagerort.
                      </TableCell>
                    </TableRow>
                  ) : (
                    keys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {key.number ?? "\u2014"}
                        </TableCell>
                        <TableCell className="font-medium">{key.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {key.address ?? "\u2014"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {key.quantity}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick Booking Sheet
// ---------------------------------------------------------------------------
function QuickBookingSheet({
  t,
  tCommon,
  locationName,
}: {
  t: ReturnType<typeof useTranslations<"locations">>
  tCommon: ReturnType<typeof useTranslations<"common">>
  locationName: string
}) {
  const [open, setOpen] = useState(false)
  const [bookingType, setBookingType] = useState<string>("in")
  const [quantity, setQuantity] = useState<number>(1)
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    // Quick booking is a stock change — implementation depends on stock change API
    // For now we close the sheet; a full implementation would POST to /api/stock-changes
    setSaving(true)
    try {
      // TODO: implement POST /api/stock-changes when API route is available
      setOpen(false)
      setQuantity(1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <IconPlus className="size-4" />
          {t("quickBooking")}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("quickBooking")}</SheetTitle>
          <SheetDescription>
            Material ein- oder ausbuchen an: {locationName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4">
          <div className="space-y-2">
            <Label>Buchungsart</Label>
            <Select value={bookingType} onValueChange={setBookingType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">
                  <IconPlus className="size-4 text-secondary" />
                  Einbuchen (Zugang)
                </SelectItem>
                <SelectItem value="out">
                  <IconMinus className="size-4 text-destructive" />
                  Ausbuchen (Abgang)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Menge</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <IconMinus className="size-4" />
              </Button>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.target.value)))
                }
                className="text-center tabular-nums"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
              >
                <IconPlus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notiz (optional)</Label>
            <Input placeholder="z.B. Lieferung vom 17.03.2026" />
          </div>
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {bookingType === "in" ? (
              <>
                <IconPlus className="size-4" />
                Einbuchen
              </>
            ) : (
              <>
                <IconMinus className="size-4" />
                Ausbuchen
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
