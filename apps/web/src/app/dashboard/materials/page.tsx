"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconDotsVertical,
  IconAlertTriangle,
  IconPackage,
  IconPhoto,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
interface MaterialGroup {
  id: string
  name: string
  color: string | null
}

interface Location {
  id: string
  name: string
}

interface MaterialRow {
  id: string
  number: string | null
  name: string
  image: string | null
  groupId: string | null
  group: MaterialGroup | null
  mainLocationId: string | null
  mainLocation: Location | null
  totalStock: number
  reorderLevel: number
  nearestExpiry: string | null
  unit: string
}

interface MaterialsResponse {
  data: MaterialRow[]
  total: number
  page: number
  limit: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ITEMS_PER_PAGE = 20

function isExpiringSoon(dateStr: string | null): boolean {
  if (!dateStr) return false
  const expiry = new Date(dateStr)
  const now = new Date()
  const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays <= 30
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MaterialsPage() {
  const t = useTranslations("materials")
  const tc = useTranslations("common")
  const router = useRouter()

  // Data state
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filter / pagination state
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  // Reference data
  const [groups, setGroups] = useState<MaterialGroup[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<MaterialRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch reference data once
  useEffect(() => {
    async function fetchReferenceData() {
      try {
        const [groupsRes, locationsRes] = await Promise.all([
          fetch("/api/material-groups"),
          fetch("/api/locations"),
        ])
        if (groupsRes.ok) {
          const g = await groupsRes.json()
          setGroups(Array.isArray(g) ? g : g.data ?? [])
        }
        if (locationsRes.ok) {
          const l = await locationsRes.json()
          setLocations(Array.isArray(l) ? l : l.data ?? [])
        }
      } catch {
        // silently fail — filters will just be empty
      }
    }
    fetchReferenceData()
  }, [])

  // Fetch materials
  useEffect(() => {
    async function fetchMaterials() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ITEMS_PER_PAGE),
        })
        if (debouncedSearch) params.set("search", debouncedSearch)
        if (groupFilter && groupFilter !== "all") params.set("groupId", groupFilter)
        if (locationFilter && locationFilter !== "all")
          params.set("locationId", locationFilter)

        const res = await fetch(`/api/materials?${params.toString()}`)
        if (res.ok) {
          const json: MaterialsResponse = await res.json()
          setMaterials(json.data ?? [])
          setTotal(json.total ?? 0)
        }
      } catch {
        // TODO: toast error
      } finally {
        setLoading(false)
      }
    }
    fetchMaterials()
  }, [page, debouncedSearch, groupFilter, locationFilter])

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/materials/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== deleteTarget.id))
        setTotal((prev) => prev - 1)
      }
    } catch {
      // TODO: toast error
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------
  const columns = useMemo<ColumnDef<MaterialRow>[]>(
    () => [
      {
        accessorKey: "image",
        header: () => t("image"),
        size: 60,
        cell: ({ row }) => {
          const src = row.original.image
          return (
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {src ? (
                <img
                  src={src}
                  alt={row.original.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <IconPhoto className="size-4 text-muted-foreground" />
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "number",
        header: () => t("number"),
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {(getValue() as string) || "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: () => t("name"),
        size: 220,
        cell: ({ row }) => (
          <button
            onClick={() =>
              router.push(`/dashboard/materials/${row.original.id}`)
            }
            className="text-left font-medium text-foreground hover:underline"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: "group",
        header: () => t("group"),
        size: 150,
        cell: ({ row }) => {
          const group = row.original.group
          if (!group) return <span className="text-muted-foreground">\u2014</span>
          return (
            <Badge
              variant="secondary"
              className="text-xs"
              style={
                group.color
                  ? {
                      backgroundColor: `${group.color}18`,
                      color: group.color,
                      borderColor: `${group.color}30`,
                    }
                  : undefined
              }
            >
              {group.name}
            </Badge>
          )
        },
      },
      {
        accessorKey: "mainLocation",
        header: () => t("mainLocation"),
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.mainLocation?.name ?? "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "totalStock",
        header: () => t("stock"),
        size: 90,
        cell: ({ row }) => {
          const stock = row.original.totalStock
          const reorder = row.original.reorderLevel
          const isBelowReorder = reorder > 0 && stock < reorder
          return (
            <span
              className={
                isBelowReorder
                  ? "font-semibold text-destructive"
                  : "font-medium text-secondary"
              }
            >
              {stock} {row.original.unit}
            </span>
          )
        },
      },
      {
        accessorKey: "reorderLevel",
        header: () => t("reorderLevel"),
        size: 110,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {(getValue() as number) || "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "nearestExpiry",
        header: () => t("expiryDate"),
        size: 130,
        cell: ({ row }) => {
          const expiry = row.original.nearestExpiry
          const expired = isExpired(expiry)
          const expiring = isExpiringSoon(expiry)
          return (
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
                      : "text-sm text-muted-foreground"
                }
              >
                {formatDate(expiry)}
              </span>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => tc("actions"),
        size: 60,
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
                  router.push(`/dashboard/materials/${row.original.id}`)
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
    data: materials,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
        <Button onClick={() => router.push("/dashboard/materials/new")}>
          <IconPlus className="size-4" />
          {t("addMaterial")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${tc("search")}...`}
            className="pl-9"
          />
        </div>
        <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("group")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={(v) => { setLocationFilter(v); setPage(1) }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("mainLocation")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-40 flex-1" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        ) : materials.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <IconPackage className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium">
              {debouncedSearch
                ? tc("noData")
                : "Erstellen Sie Ihr erstes Material"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {debouncedSearch
                ? "Versuchen Sie einen anderen Suchbegriff"
                : "Beginnen Sie mit dem Aufbau Ihres Materialbestands"}
            </p>
            {!debouncedSearch && (
              <Button
                className="mt-6"
                onClick={() => router.push("/dashboard/materials/new")}
              >
                <IconPlus className="size-4" />
                {t("addMaterial")}
              </Button>
            )}
          </div>
        ) : (
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
        )}
      </Card>

      {/* Pagination */}
      {!loading && materials.length > 0 && (
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
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Material l&ouml;schen</DialogTitle>
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
