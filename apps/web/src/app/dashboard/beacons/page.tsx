"use client"

import { useTranslations } from "next-intl"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconDotsVertical,
  IconBluetooth,
  IconBattery,
  IconBattery1,
  IconBattery2,
  IconBattery3,
  IconBattery4,
  IconMapPin,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconRefresh,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
interface BeaconRow {
  id: string
  name: string | null
  uuid: string
  major: number | null
  minor: number | null
  locationId: string | null
  locationName: string | null
  entityType: string | null
  entityId: string | null
  batteryLevel: number | null
  lastSeenAt: string | null
  isActive: boolean
  createdAt: string
}

interface BeaconStats {
  active: number
  lowBattery: number
  coveredLocations: number
}

interface Location {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function truncateUuid(uuid: string): string {
  if (uuid.length <= 13) return uuid
  return `${uuid.slice(0, 8)}...${uuid.slice(-4)}`
}

function BatteryIndicator({ level }: { level: number | null }) {
  if (level === null) {
    return <span className="text-muted-foreground text-sm">--</span>
  }
  let color = "text-green-500"
  let Icon = IconBattery4
  if (level <= 10) {
    color = "text-red-500"
    Icon = IconBattery
  } else if (level <= 20) {
    color = "text-red-500"
    Icon = IconBattery1
  } else if (level <= 50) {
    color = "text-yellow-500"
    Icon = IconBattery2
  } else if (level <= 75) {
    color = "text-green-500"
    Icon = IconBattery3
  }
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{level}%</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BeaconsPage() {
  const t = useTranslations("beacons")
  const [beacons, setBeacons] = useState<BeaconRow[]>([])
  const [stats, setStats] = useState<BeaconStats>({ active: 0, lowBattery: 0, coveredLocations: 0 })
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editBeacon, setEditBeacon] = useState<BeaconRow | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formUuid, setFormUuid] = useState("")
  const [formMajor, setFormMajor] = useState("")
  const [formMinor, setFormMinor] = useState("")
  const [formLocationId, setFormLocationId] = useState("")
  const [formEntityType, setFormEntityType] = useState("")
  const [formEntityId, setFormEntityId] = useState("")

  const fetchBeacons = useCallback(async () => {
    try {
      const res = await fetch("/api/ble-beacons")
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      setBeacons(json.data ?? [])
      setStats(json.stats ?? { active: 0, lowBattery: 0, coveredLocations: 0 })
    } catch (err) {
      console.error("Failed to fetch beacons:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/locations?limit=200")
      if (!res.ok) return
      const json = await res.json()
      setLocations(json.data ?? [])
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    fetchBeacons()
    fetchLocations()
  }, [fetchBeacons, fetchLocations])

  // Filter by search
  const filteredBeacons = useMemo(() => {
    if (!search) return beacons
    const q = search.toLowerCase()
    return beacons.filter(
      (b) =>
        (b.name ?? "").toLowerCase().includes(q) ||
        b.uuid.toLowerCase().includes(q) ||
        (b.locationName ?? "").toLowerCase().includes(q)
    )
  }, [beacons, search])

  // Reset form
  const resetForm = useCallback(() => {
    setFormName("")
    setFormUuid("")
    setFormMajor("")
    setFormMinor("")
    setFormLocationId("")
    setFormEntityType("")
    setFormEntityId("")
    setEditBeacon(null)
  }, [])

  const openCreateDialog = useCallback(() => {
    resetForm()
    setDialogOpen(true)
  }, [resetForm])

  const openEditDialog = useCallback((beacon: BeaconRow) => {
    setEditBeacon(beacon)
    setFormName(beacon.name ?? "")
    setFormUuid(beacon.uuid)
    setFormMajor(beacon.major?.toString() ?? "")
    setFormMinor(beacon.minor?.toString() ?? "")
    setFormLocationId(beacon.locationId ?? "")
    setFormEntityType(beacon.entityType ?? "")
    setFormEntityId(beacon.entityId ?? "")
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      if (editBeacon) {
        // PATCH
        const res = await fetch(`/api/ble-beacons/${editBeacon.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName || null,
            uuid: formUuid,
            major: formMajor ? parseInt(formMajor) : null,
            minor: formMinor ? parseInt(formMinor) : null,
            locationId: formLocationId || null,
            entityType: formEntityType || null,
            entityId: formEntityId || null,
          }),
        })
        if (!res.ok) throw new Error("Failed to update")
      } else {
        // POST
        const res = await fetch("/api/ble-beacons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName || null,
            beaconUuid: formUuid,
            major: formMajor ? parseInt(formMajor) : null,
            minor: formMinor ? parseInt(formMinor) : null,
            locationId: formLocationId || null,
            entityType: formEntityType || null,
            entityId: formEntityId || null,
          }),
        })
        if (!res.ok) throw new Error("Failed to create")
      }
      setDialogOpen(false)
      resetForm()
      fetchBeacons()
    } catch (err) {
      console.error("Save beacon error:", err)
    } finally {
      setSaving(false)
    }
  }, [editBeacon, formName, formUuid, formMajor, formMinor, formLocationId, formEntityType, formEntityId, resetForm, fetchBeacons])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm(t("confirmDelete"))) return
      try {
        await fetch(`/api/ble-beacons/${id}`, { method: "DELETE" })
        fetchBeacons()
      } catch (err) {
        console.error("Delete beacon error:", err)
      }
    },
    [fetchBeacons, t]
  )

  const handleToggleActive = useCallback(
    async (beacon: BeaconRow) => {
      try {
        await fetch(`/api/ble-beacons/${beacon.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !beacon.isActive }),
        })
        fetchBeacons()
      } catch (err) {
        console.error("Toggle active error:", err)
      }
    },
    [fetchBeacons]
  )

  // Format last seen with translations
  const formatLastSeen = useCallback(
    (dateStr: string | null): string => {
      if (!dateStr) return t("never")
      const d = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffMin = Math.floor(diffMs / 60000)
      if (diffMin < 1) return t("justNow")
      if (diffMin < 60) return t("minutesAgo", { count: diffMin })
      const diffH = Math.floor(diffMin / 60)
      if (diffH < 24) return t("hoursAgo", { count: diffH })
      const diffD = Math.floor(diffH / 24)
      return t("daysAgo", { count: diffD })
    },
    [t]
  )

  // Table columns
  const columns = useMemo<ColumnDef<BeaconRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("nameLabel"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <IconBluetooth className="h-4 w-4 text-blue-500" />
            <span className="font-medium">{row.original.name ?? t("unnamed")}</span>
          </div>
        ),
      },
      {
        accessorKey: "uuid",
        header: t("uuid"),
        cell: ({ row }) => (
          <code className="text-muted-foreground text-xs" title={row.original.uuid}>
            {truncateUuid(row.original.uuid)}
          </code>
        ),
      },
      {
        id: "majorMinor",
        header: t("majorMinor"),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.major ?? "--"} / {row.original.minor ?? "--"}
          </span>
        ),
      },
      {
        accessorKey: "locationName",
        header: t("locationCol"),
        cell: ({ row }) =>
          row.original.locationName ? (
            <div className="flex items-center gap-1">
              <IconMapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{row.original.locationName}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">--</span>
          ),
      },
      {
        accessorKey: "entityType",
        header: t("entityCol"),
        cell: ({ row }) => {
          const et = row.original.entityType
          if (!et) return <span className="text-muted-foreground text-sm">--</span>
          const key = `entityTypes.${et}` as const
          return <Badge variant="outline">{t.has(key) ? t(key) : et}</Badge>
        },
      },
      {
        accessorKey: "batteryLevel",
        header: t("battery"),
        cell: ({ row }) => <BatteryIndicator level={row.original.batteryLevel} />,
      },
      {
        accessorKey: "lastSeenAt",
        header: t("lastSeenCol"),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatLastSeen(row.original.lastSeenAt)}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: t("statusCol"),
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">{t("active")}</Badge>
          ) : (
            <Badge variant="secondary">{t("inactive")}</Badge>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <IconDotsVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(row.original)}>
                <IconEdit className="mr-2 h-4 w-4" />
                {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(row.original)}>
                {row.original.isActive ? t("deactivate") : t("activate")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(row.original.id)}
              >
                <IconTrash className="mr-2 h-4 w-4" />
                {t("deleteLabel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [openEditDialog, handleDelete, handleToggleActive, t, formatLastSeen]
  )

  const table = useReactTable({
    data: filteredBeacons,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchBeacons}>
            <IconRefresh className="h-4 w-4" />
          </Button>
          <Button onClick={openCreateDialog}>
            <IconPlus className="mr-2 h-4 w-4" />
            {t("newBeacon")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("title")}</CardTitle>
            <IconBluetooth className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("lowBattery")}</CardTitle>
            <IconBattery1 className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.lowBattery}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("coveredLocations")}</CardTitle>
            <IconMapPin className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coveredLocations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" ? (
                        <IconChevronUp className="h-3.5 w-3.5" />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <IconChevronDown className="h-3.5 w-3.5" />
                      ) : header.column.getCanSort() ? (
                        <IconSelector className="text-muted-foreground h-3.5 w-3.5" />
                      ) : null}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <IconBluetooth className="text-muted-foreground h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                      {search ? t("noBeaconsSearch") : t("noBeaconsYet")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editBeacon ? t("editBeacon") : t("newBeacon")}
            </DialogTitle>
            <DialogDescription>
              {editBeacon
                ? t("editBeaconDesc")
                : t("newBeaconDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="beacon-name">{t("nameLabel")}</Label>
              <Input
                id="beacon-name"
                placeholder={t("namePlaceholder")}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="beacon-uuid">{t("uuidRequired")}</Label>
              <Input
                id="beacon-uuid"
                placeholder="e.g. 2D7A9F0C-E0E8-4CC9-A71B-A21DB2D034A1"
                value={formUuid}
                onChange={(e) => setFormUuid(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="beacon-major">{t("major")}</Label>
                <Input
                  id="beacon-major"
                  type="number"
                  placeholder="0-65535"
                  value={formMajor}
                  onChange={(e) => setFormMajor(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="beacon-minor">{t("minor")}</Label>
                <Input
                  id="beacon-minor"
                  type="number"
                  placeholder="0-65535"
                  value={formMinor}
                  onChange={(e) => setFormMinor(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="beacon-location">{t("locationLabel")}</Label>
              <Select value={formLocationId} onValueChange={setFormLocationId}>
                <SelectTrigger id="beacon-location">
                  <SelectValue placeholder={t("selectLocation")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("noLocation")}</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="beacon-entity-type">{t("entityTypeLabel")}</Label>
                <Select value={formEntityType} onValueChange={setFormEntityType}>
                  <SelectTrigger id="beacon-entity-type">
                    <SelectValue placeholder={t("selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("noneType")}</SelectItem>
                    <SelectItem value="tool">{t("entityTypes.tool")}</SelectItem>
                    <SelectItem value="location">{t("entityTypes.location")}</SelectItem>
                    <SelectItem value="zone">{t("entityTypes.zone")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="beacon-entity-id">{t("entityIdLabel")}</Label>
                <Input
                  id="beacon-entity-id"
                  placeholder={t("entityIdPlaceholder")}
                  value={formEntityId}
                  onChange={(e) => setFormEntityId(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formUuid}>
              {saving ? t("saving") : editBeacon ? t("update") : t("register")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
