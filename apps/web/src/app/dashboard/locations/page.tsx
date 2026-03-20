"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
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
  IconMapPin,
  IconBuildingWarehouse,
  IconTruck,
  IconBuildingFactory,
  IconAmbulance,
  IconStethoscope,
  IconHeartbeat,
  IconUser,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconDownload,
  IconLayoutGrid,
  IconLayoutList,
  IconPackage,
  IconTool,
  IconKey,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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
interface LocationRow {
  id: string
  name: string
  type: string
  category: string | null
  template: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface LocationsResponse {
  data?: LocationRow[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ITEMS_PER_PAGE = 20

const LOCATION_TYPE_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>
    color: string
    badgeBg: string
    label: string
  }
> = {
  warehouse: {
    icon: IconBuildingWarehouse,
    color: "bg-primary/10 text-primary",
    badgeBg: "bg-primary/10 text-primary border-border",
    label: "Lager",
  },
  vehicle: {
    icon: IconTruck,
    color: "bg-primary/10 text-primary",
    badgeBg: "bg-primary/10 text-primary border-border",
    label: "Fahrzeug",
  },
  site: {
    icon: IconBuildingFactory,
    color: "bg-primary/10 text-primary",
    badgeBg: "bg-primary/10 text-primary border-border",
    label: "Baustelle",
  },
  station: {
    icon: IconAmbulance,
    color: "bg-destructive/10 text-destructive",
    badgeBg: "bg-destructive/10 text-destructive border-destructive/30",
    label: "Station",
  },
  practice: {
    icon: IconStethoscope,
    color: "bg-secondary/10 text-secondary",
    badgeBg: "bg-secondary/10 text-secondary border-secondary/30",
    label: "Praxis",
  },
  operating_room: {
    icon: IconHeartbeat,
    color: "bg-muted text-muted-foreground",
    badgeBg: "bg-muted text-muted-foreground border-border",
    label: "OP-Saal",
  },
  user: {
    icon: IconUser,
    color: "bg-muted text-muted-foreground",
    badgeBg: "bg-muted text-muted-foreground border-border",
    label: "Nutzer",
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getTypeConfig(type: string) {
  return (
    LOCATION_TYPE_CONFIG[type] ?? {
      icon: IconMapPin,
      color: "bg-muted text-muted-foreground",
      badgeBg: "bg-muted text-muted-foreground border-border",
      label: type,
    }
  )
}

function downloadCsv(rows: LocationRow[], filename: string) {
  const headers = ["Name", "Typ", "Kategorie", "Adresse", "Template", "Aktiv"]
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      [
        r.name,
        r.type,
        r.category ?? "",
        r.address ?? "",
        r.template ?? "",
        r.isActive ? "Ja" : "Nein",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";")
    ),
  ]
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc")
    return <IconChevronUp className="ml-1 inline size-3.5 text-foreground" />
  if (sorted === "desc")
    return <IconChevronDown className="ml-1 inline size-3.5 text-foreground" />
  return (
    <IconSelector className="ml-1 inline size-3.5 text-muted-foreground/50" />
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LocationsPage() {
  const t = useTranslations("locations")
  const tc = useTranslations("common")
  const router = useRouter()

  // Data state
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filter / pagination state
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [view, setView] = useState<string>("table")

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<LocationRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch all locations (API does not support pagination yet — handled client-side)
  useEffect(() => {
    async function fetchLocations() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (typeFilter && typeFilter !== "all") params.set("type", typeFilter)

        const res = await fetch(`/api/locations?${params.toString()}`)
        if (res.ok) {
          const json: LocationRow[] | LocationsResponse = await res.json()
          const data = Array.isArray(json) ? json : (json.data ?? [])
          setLocations(data)
        }
      } catch {
        // TODO: toast error
      } finally {
        setLoading(false)
      }
    }
    fetchLocations()
  }, [typeFilter])

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/locations/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setLocations((prev) => prev.filter((l) => l.id !== deleteTarget.id))
      }
    } catch {
      // TODO: toast error
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  // Client-side search filter
  const filteredLocations = useMemo(() => {
    if (!debouncedSearch) return locations
    const q = debouncedSearch.toLowerCase()
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.category?.toLowerCase().includes(q) ?? false) ||
        (l.address?.toLowerCase().includes(q) ?? false)
    )
  }, [locations, debouncedSearch])

  // Client-side pagination
  const total = filteredLocations.length
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const pagedLocations = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredLocations.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredLocations, page])

  // CSV export of all filtered data
  const handleExport = useCallback(() => {
    downloadCsv(filteredLocations, "lagerorte.csv")
  }, [filteredLocations])

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------
  const columns = useMemo<ColumnDef<LocationRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            {t("name")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 220,
        cell: ({ row }) => (
          <button
            onClick={() =>
              router.push(`/dashboard/locations/${row.original.id}`)
            }
            className="text-left font-medium text-foreground hover:underline"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            {t("type")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 150,
        cell: ({ row }) => {
          const cfg = getTypeConfig(row.original.type)
          const Icon = cfg.icon
          const i18nKey = TYPE_I18N_MAP[row.original.type]
          return (
            <Badge variant="outline" className={cfg.badgeBg}>
              <Icon className="size-3.5" />
              {i18nKey ? t(`types.${i18nKey}`) : row.original.type}
            </Badge>
          )
        },
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            {t("category")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 150,
        sortingFn: (a, b) => {
          const nameA = a.original.category ?? ""
          const nameB = b.original.category ?? ""
          return nameA.localeCompare(nameB, "de")
        },
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.category ?? "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "address",
        header: () => "Adresse",
        size: 200,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.address ?? "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: () => "Status",
        size: 90,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge
              variant="outline"
              className="bg-secondary/10 text-secondary border-secondary/30"
            >
              Aktiv
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-muted text-muted-foreground border-border"
            >
              Inaktiv
            </Badge>
          ),
      },
      {
        id: "actions",
        header: () => tc("actions"),
        size: 60,
        enableSorting: false,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <IconDotsVertical className="size-4" />
                <span className="sr-only">{tc("actions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  router.push(`/dashboard/locations/${row.original.id}`)
                }
              >
                <IconEdit className="size-4" />
                {tc("edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteTarget(row.original)}
              >
                <IconTrash className="size-4" />
                {tc("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, tc, router]
  )

  const table = useReactTable({
    data: pagedLocations,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} {t("title")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <IconDownload className="size-4" />
            CSV
          </Button>
          <Button onClick={() => router.push("/dashboard/locations/new")}>
            <IconPlus className="size-4" />
            {t("addLocation")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative flex-1 sm:max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${tc("search")}...`}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            {Object.entries(LOCATION_TYPE_CONFIG).map(([type, cfg]) => {
              const Icon = cfg.icon
              const i18nKey = TYPE_I18N_MAP[type]
              return (
                <SelectItem key={type} value={type}>
                  <Icon className="size-4" />
                  {i18nKey ? t(`types.${i18nKey}`) : cfg.label}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => {
            if (v) setView(v)
          }}
          className="ml-auto"
        >
          <ToggleGroupItem value="table" aria-label="Tabellenansicht">
            <IconLayoutList className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Kachelansicht">
            <IconLayoutGrid className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      {loading ? (
        <Card className="overflow-hidden">
          <div className="space-y-4 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-48 flex-1" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </Card>
      ) : filteredLocations.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
            <IconMapPin className="size-6 text-muted-foreground" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-lg font-medium">
              {debouncedSearch
                ? tc("noData")
                : "Keine Lagerorte vorhanden"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? "Versuchen Sie einen anderen Suchbegriff"
                : "Erstellen Sie Ihren ersten Lagerort, um Materialien, Werkzeuge und Schlüssel zu verwalten."}
            </p>
          </div>
          {!debouncedSearch && (
            <Button onClick={() => router.push("/dashboard/locations/new")}>
              <IconPlus className="size-4" />
              {t("addLocation")}
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <LocationGrid
          locations={pagedLocations}
          t={t}
          onCardClick={(id) => router.push(`/dashboard/locations/${id}`)}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {!loading && filteredLocations.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * ITEMS_PER_PAGE + 1}&ndash;
            {Math.min(page * ITEMS_PER_PAGE, total)} von {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <IconChevronLeft className="size-4" />
              {tc("back")}
            </Button>
            <span className="min-w-[3rem] text-center text-sm font-medium">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {tc("next")}
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lagerort l&ouml;schen</DialogTitle>
            <DialogDescription>
              M&ouml;chten Sie &laquo;{deleteTarget?.name}&raquo; wirklich
              l&ouml;schen? Diese Aktion kann nicht r&uuml;ckg&auml;ngig gemacht
              werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
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

// ---------------------------------------------------------------------------
// Grid View Sub-component
// ---------------------------------------------------------------------------
function LocationGrid({
  locations,
  t,
  onCardClick,
}: {
  locations: LocationRow[]
  t: ReturnType<typeof useTranslations<"locations">>
  onCardClick: (id: string) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {locations.map((loc) => {
        const cfg = getTypeConfig(loc.type)
        const Icon = cfg.icon
        const i18nKey = TYPE_I18N_MAP[loc.type]
        return (
          <Card
            key={loc.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => onCardClick(loc.id)}
          >
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
              <div
                className={`flex size-10 items-center justify-center rounded-lg ${cfg.color}`}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">{loc.name}</CardTitle>
                <Badge
                  variant="outline"
                  className={`mt-1 text-xs ${cfg.badgeBg}`}
                >
                  {i18nKey ? t(`types.${i18nKey}`) : cfg.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loc.category && (
                <p className="mb-3 text-sm text-muted-foreground">
                  {loc.category}
                </p>
              )}
              {loc.address && (
                <p className="mb-3 truncate text-xs text-muted-foreground">
                  {loc.address}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <IconPackage className="size-3.5" />
                <span>Materialien</span>
                <span className="ml-auto">
                  <IconTool className="mr-1 inline size-3.5" />
                  Werkzeuge
                </span>
                <IconKey className="size-3.5" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
