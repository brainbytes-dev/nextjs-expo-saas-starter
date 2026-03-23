"use client"

import Image from "next/image"
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
  IconAlertTriangle,
  IconPackage,
  IconPhoto,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconDownload,
  IconUpload,
  IconTag,
  IconClock,
  IconCopy,
  IconShoppingCart,
  IconTruck,
  IconLoader2,
  IconCar,
} from "@tabler/icons-react"
import { toast } from "sonner"
import { BookToVehicleDialog } from "@/components/book-to-vehicle-dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Toggle } from "@/components/ui/toggle"
import { Checkbox } from "@/components/ui/checkbox"
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
import { BulkActionBar } from "@/components/bulk-action-bar"
import { addToCart } from "@/lib/cart"

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
  cheapestPrice: number | null
  cheapestSupplierName: string | null
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

function downloadCsv(rows: MaterialRow[], filename: string) {
  const headers = [
    "Nummer",
    "Name",
    "Gruppe",
    "Standort",
    "Bestand",
    "Einheit",
    "Meldebestand",
    "Ablaufdatum",
  ]
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      [
        r.number ?? "",
        r.name,
        r.group?.name ?? "",
        r.mainLocation?.name ?? "",
        r.totalStock,
        r.unit ?? "",
        r.reorderLevel ?? "",
        r.nearestExpiry ?? "",
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
  return <IconSelector className="ml-1 inline size-3.5 text-muted-foreground/50" />
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
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [expiringOnly, setExpiringOnly] = useState(false)
  const [page, setPage] = useState(1)

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Reference data
  const [groups, setGroups] = useState<MaterialGroup[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<MaterialRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Vehicle booking
  const [vehicleBookTarget, setVehicleBookTarget] = useState<{ id: string; name: string } | null>(null)

  // Reorder dialog
  const [reorderTarget, setReorderTarget] = useState<MaterialRow | null>(null)
  const [reorderLoading, setReorderLoading] = useState(false)
  const [reorderData, setReorderData] = useState<{
    materialName: string
    unit: string
    totalStock: number
    reorderLevel: number
    suggestedQuantity: number
    supplier: {
      id: string
      name: string
      unitPrice: number
      totalPrice: number
      leadTimeDays: number | null
      minOrderQuantity: number
    } | null
  } | null>(null)
  const [reorderQty, setReorderQty] = useState(1)
  const [reorderCreating, setReorderCreating] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Clear selection when page / filter changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [page, debouncedSearch, groupFilter, locationFilter, expiringOnly, lowStockOnly])

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
          setGroups(Array.isArray(g) ? g : (g.data ?? []))
        }
        if (locationsRes.ok) {
          const l = await locationsRes.json()
          setLocations(Array.isArray(l) ? l : (l.data ?? []))
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
        if (expiringOnly) params.set("expiringOnly", "true")

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
  }, [page, debouncedSearch, groupFilter, locationFilter, expiringOnly])

  // Delete handler (single)
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

  // Low-stock filter applied client-side to the current page data
  const filteredMaterials = useMemo(() => {
    let result = materials
    if (lowStockOnly) {
      result = result.filter(
        (m) => m.reorderLevel > 0 && m.totalStock <= m.reorderLevel
      )
    }
    if (expiringOnly) {
      result = result.filter((m) => m.nearestExpiry !== null)
    }
    return result
  }, [materials, lowStockOnly, expiringOnly])

  // ── Selection helpers ──────────────────────────────────────────────────────
  const visibleIds = filteredMaterials.map((m) => m.id)
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id))

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        visibleIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => new Set([...prev, ...visibleIds]))
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // ── Bulk actions ───────────────────────────────────────────────────────────
  const handleBulkDelete = useCallback(async () => {
    setBulkLoading(true)
    try {
      const res = await fetch("/api/materials/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      })
      if (res.ok) {
        const { ids: deletedIds } = await res.json() as { ids: string[] }
        const deletedSet = new Set(deletedIds)
        setMaterials((prev) => prev.filter((m) => !deletedSet.has(m.id)))
        setTotal((prev) => prev - deletedIds.length)
        setSelectedIds(new Set())
      }
    } catch {
      // TODO: toast error
    } finally {
      setBulkLoading(false)
    }
  }, [selectedIds])

  const handleBulkChangeGroup = useCallback(async (groupId: string) => {
    setBulkLoading(true)
    try {
      const res = await fetch("/api/materials/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], update: { groupId } }),
      })
      if (res.ok) {
        const group = groups.find((g) => g.id === groupId) ?? null
        setMaterials((prev) =>
          prev.map((m) =>
            selectedIds.has(m.id) ? { ...m, groupId, group } : m
          )
        )
        setSelectedIds(new Set())
      }
    } catch {
      // TODO: toast error
    } finally {
      setBulkLoading(false)
    }
  }, [selectedIds, groups])

  const handleBulkChangeLocation = useCallback(async (locationId: string) => {
    setBulkLoading(true)
    try {
      const res = await fetch("/api/materials/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], update: { mainLocationId: locationId } }),
      })
      if (res.ok) {
        const loc = locations.find((l) => l.id === locationId) ?? null
        setMaterials((prev) =>
          prev.map((m) =>
            selectedIds.has(m.id)
              ? { ...m, mainLocationId: locationId, mainLocation: loc }
              : m
          )
        )
        setSelectedIds(new Set())
      }
    } catch {
      // TODO: toast error
    } finally {
      setBulkLoading(false)
    }
  }, [selectedIds, locations])

  const handleBulkExport = useCallback(() => {
    const selectedRows = filteredMaterials.filter((m) => selectedIds.has(m.id))
    downloadCsv(selectedRows, "materialien-auswahl.csv")
  }, [filteredMaterials, selectedIds])

  // Reorder: open dialog with suggestion
  const handleOpenReorder = useCallback(async (mat: MaterialRow) => {
    setReorderTarget(mat)
    setReorderLoading(true)
    try {
      const res = await fetch(`/api/materials/${mat.id}/reorder`)
      if (res.ok) {
        const data = await res.json()
        setReorderData(data)
        setReorderQty(data.suggestedQuantity ?? 1)
      }
    } catch {
      toast.error(t("reorder.noSupplier"))
    } finally {
      setReorderLoading(false)
    }
  }, [t])

  // Reorder: confirm
  const handleConfirmReorder = useCallback(async () => {
    if (!reorderData?.supplier || !reorderTarget) return
    setReorderCreating(true)
    try {
      const res = await fetch(`/api/materials/${reorderTarget.id}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: reorderQty,
          supplierId: reorderData.supplier.id,
        }),
      })
      if (res.ok) {
        const order = await res.json()
        setReorderTarget(null)
        setReorderData(null)
        toast.success(t("reorder.success", { orderNumber: order.orderNumber }), {
          action: {
            label: t("reorder.successLink"),
            onClick: () => router.push(`/dashboard/orders/${order.orderId}`),
          },
        })
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error ?? "Fehler")
      }
    } catch {
      toast.error("Fehler bei der Bestellung")
    } finally {
      setReorderCreating(false)
    }
  }, [reorderTarget, reorderData, reorderQty, t, router])

  // CSV export: fetch all pages then download
  const handleExport = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: "1", limit: "9999" })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (groupFilter && groupFilter !== "all") params.set("groupId", groupFilter)
      if (locationFilter && locationFilter !== "all")
        params.set("locationId", locationFilter)

      const res = await fetch(`/api/materials?${params.toString()}`)
      if (!res.ok) return
      const json: MaterialsResponse = await res.json()
      let allRows = json.data ?? []
      if (lowStockOnly) {
        allRows = allRows.filter(
          (m) => m.reorderLevel > 0 && m.totalStock <= m.reorderLevel
        )
      }
      if (expiringOnly) {
        allRows = allRows.filter((m) => m.nearestExpiry !== null)
      }
      downloadCsv(allRows, "materialien.csv")
    } catch {
      // silently fail
    }
  }, [debouncedSearch, groupFilter, locationFilter, lowStockOnly, expiringOnly])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------
  const columns = useMemo<ColumnDef<MaterialRow>[]>(
    () => [
      // ── Checkbox column ──────────────────────────────────────────────────
      {
        id: "select",
        size: 44,
        enableSorting: false,
        header: () => (
          <Checkbox
            checked={allVisibleSelected ? true : someVisibleSelected ? "indeterminate" : false}
            onCheckedChange={toggleSelectAll}
            aria-label={t("selectAll")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => toggleRow(row.original.id)}
            aria-label={t("selectItem", { name: row.original.name })}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        accessorKey: "image",
        header: () => t("image"),
        size: 60,
        enableSorting: false,
        cell: ({ row }) => {
          const src = row.original.image
          return (
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {src ? (
                <Image
                  src={src}
                  alt={row.original.name}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                  unoptimized
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
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            {t("number")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {(getValue() as string) || "\u2014"}
          </span>
        ),
      },
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
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            {t("group")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 150,
        sortingFn: (a, b) => {
          const nameA = a.original.group?.name ?? ""
          const nameB = b.original.group?.name ?? ""
          return nameA.localeCompare(nameB)
        },
        cell: ({ row }) => {
          const group = row.original.group
          if (!group)
            return <span className="text-muted-foreground">\u2014</span>
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
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.mainLocation?.name ?? "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "totalStock",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            {t("stock")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
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
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            {t("reorderLevel")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 110,
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {(getValue() as number) || "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "nearestExpiry",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() =>
              column.toggleSorting(column.getIsSorted() === "asc")
            }
          >
            {t("expiryDate")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
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
        accessorKey: "cheapestSupplierName",
        header: () => t("supplier"),
        size: 140,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.cheapestSupplierName ? (
              <span className="flex items-center gap-1.5">
                <IconTruck className="size-3.5 text-muted-foreground" />
                {row.original.cheapestSupplierName}
              </span>
            ) : (
              <span className="text-muted-foreground">{"\u2014"}</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "cheapestPrice",
        header: () => t("price"),
        size: 100,
        enableSorting: false,
        cell: ({ row }) => {
          const price = row.original.cheapestPrice
          if (price == null) return <span className="text-muted-foreground">{"\u2014"}</span>
          return (
            <span className="text-sm font-medium">
              CHF {(price / 100).toFixed(2)}
            </span>
          )
        },
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
                  router.push(`/dashboard/materials/${row.original.id}`)
                }
              >
                <IconEdit className="size-4" />
                {tc("edit")}
              </DropdownMenuItem>
              {row.original.cheapestSupplierName && (
                <DropdownMenuItem
                  onClick={() => {
                    addToCart({
                      id: `${row.original.id}-${Date.now()}`,
                      type: "material",
                      materialId: row.original.id,
                      number: row.original.number ?? "",
                      materialName: row.original.name,
                      supplierName: row.original.cheapestSupplierName ?? "",
                      supplierId: "",
                      articleNumber: row.original.number ?? "",
                      purchasePrice: row.original.cheapestPrice ?? 0,
                      orderUnit: row.original.unit ?? "Stk",
                      quantity: 1,
                    })
                    toast.success(t("addedToCart"))
                  }}
                >
                  <IconShoppingCart className="size-4" />
                  {t("addToCart")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setVehicleBookTarget({ id: row.original.id, name: row.original.name })}
              >
                <IconCar className="size-4" />
                {t("bookToVehicle")}
              </DropdownMenuItem>
              {row.original.reorderLevel > 0 && row.original.totalStock < row.original.reorderLevel && (
                <DropdownMenuItem
                  onClick={() => handleOpenReorder(row.original)}
                >
                  <IconShoppingCart className="size-4 text-amber-500" />
                  {t("reorder.button")}
                </DropdownMenuItem>
              )}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tc, router, selectedIds, allVisibleSelected, someVisibleSelected]
  )

  const table = useReactTable({
    data: filteredMaterials,
    columns,
    state: {
      sorting,
    },
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/dashboard/materials/duplicates")}
          >
            <IconCopy className="size-4" />
            {t("checkDuplicates")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <IconDownload className="size-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/dashboard/materials/import")}
          >
            <IconUpload className="size-4" />
            {tc("import")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/dashboard/materials/labels")}
          >
            <IconTag className="size-4" />
            {t("labels")}
          </Button>
          <Button onClick={() => router.push("/dashboard/materials/new")}>
            <IconPlus className="size-4" />
            {t("addMaterial")}
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
          value={groupFilter}
          onValueChange={(v) => {
            setGroupFilter(v)
            setPage(1)
          }}
        >
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
        <Select
          value={locationFilter}
          onValueChange={(v) => {
            setLocationFilter(v)
            setPage(1)
          }}
        >
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
        <Toggle
          pressed={lowStockOnly}
          onPressedChange={(pressed) => {
            setLowStockOnly(pressed)
            setPage(1)
          }}
          aria-label={t("lowStockOnly")}
          className={
            lowStockOnly
              ? "border border-orange-500/40 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 hover:text-orange-600 data-[state=on]:bg-orange-500/10 data-[state=on]:text-orange-600"
              : "border border-border"
          }
        >
          <IconAlertTriangle
            className={`size-4 ${lowStockOnly ? "text-orange-500" : "text-muted-foreground"}`}
          />
          <span className="ml-1.5 text-sm">{t("lowStockOnly")}</span>
        </Toggle>
        <Toggle
          pressed={expiringOnly}
          onPressedChange={(pressed) => {
            setExpiringOnly(pressed)
            setPage(1)
          }}
          aria-label={t("expiringOnly")}
          className={
            expiringOnly
              ? "border border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 hover:text-red-600 data-[state=on]:bg-red-500/10 data-[state=on]:text-red-600"
              : "border border-border"
          }
        >
          <IconClock
            className={`size-4 ${expiringOnly ? "text-red-500" : "text-muted-foreground"}`}
          />
          <span className="ml-1.5 text-sm">{t("expiringOnly")}</span>
        </Toggle>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-4 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded" />
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
        ) : filteredMaterials.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <IconPackage className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium">
              {debouncedSearch || lowStockOnly
                ? tc("noData")
                : t("createFirst")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {debouncedSearch
                ? t("tryDifferentSearch")
                : lowStockOnly
                  ? t("noLowStock")
                  : t("startBuilding")}
            </p>
            {!debouncedSearch && !lowStockOnly && (
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
                <TableRow
                  key={row.id}
                  className={`cursor-pointer ${
                    selectedIds.has(row.original.id)
                      ? "bg-primary/5"
                      : row.original.nearestExpiry && isExpired(row.original.nearestExpiry)
                        ? "bg-destructive/5 hover:bg-destructive/10"
                        : row.original.nearestExpiry && isExpiringSoon(row.original.nearestExpiry)
                          ? "bg-amber-500/5 hover:bg-amber-500/10"
                          : ""
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={
                        cell.column.id === "select" || cell.column.id === "actions"
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                    >
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
      {!loading && filteredMaterials.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * ITEMS_PER_PAGE + 1}&ndash;
            {Math.min(page * ITEMS_PER_PAGE, total)} {tc("of")} {total}
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

      {/* Reorder confirmation dialog */}
      <Dialog
        open={!!reorderTarget}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setReorderTarget(null)
            setReorderData(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconShoppingCart className="size-5 text-amber-500" />
              {t("reorder.title")}
            </DialogTitle>
            <DialogDescription>
              {reorderTarget?.name}
            </DialogDescription>
          </DialogHeader>

          {reorderLoading ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">{t("reorder.loading")}</span>
            </div>
          ) : reorderData?.supplier ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("reorder.bestSupplier")}</span>
                  <span className="font-medium flex items-center gap-1.5">
                    <IconTruck className="size-4 text-muted-foreground" />
                    {reorderData.supplier.name}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("reorder.unitPrice")}</span>
                  <span className="font-medium">
                    CHF {(reorderData.supplier.unitPrice / 100).toFixed(2)}
                  </span>
                </div>
                {reorderData.supplier.leadTimeDays != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t("reorder.leadTime")}</span>
                    <span className="font-medium">
                      {t("reorder.leadTimeDays", { days: reorderData.supplier.leadTimeDays })}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reorder-qty-list">{t("reorder.quantity")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="reorder-qty-list"
                    type="number"
                    min={reorderData.supplier.minOrderQuantity}
                    value={reorderQty}
                    onChange={(e) => setReorderQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">{reorderData.unit}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("reorder.suggestedQty")}: {reorderData.suggestedQuantity} {reorderData.unit}
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between text-lg font-semibold">
                <span>{t("reorder.totalCost")}</span>
                <span>CHF {((reorderData.supplier.unitPrice * reorderQty) / 100).toFixed(2)}</span>
              </div>
            </div>
          ) : reorderData && !reorderData.supplier ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <IconAlertTriangle className="size-10 text-amber-500" />
              <p className="mt-3 font-medium">{t("reorder.noSupplier")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("reorder.noSupplierDesc")}</p>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReorderTarget(null)
                setReorderData(null)
              }}
              disabled={reorderCreating}
            >
              {tc("cancel")}
            </Button>
            {reorderData?.supplier && (
              <Button
                onClick={handleConfirmReorder}
                disabled={reorderCreating || reorderLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {reorderCreating ? (
                  <>
                    <IconLoader2 className="size-4 animate-spin" />
                    {t("reorder.creating")}
                  </>
                ) : (
                  <>
                    <IconShoppingCart className="size-4" />
                    {t("reorder.confirm")}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteMaterial")}</DialogTitle>
            <DialogDescription>
              {t("deleteConfirmMessage", { name: deleteTarget?.name ?? "" })}
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

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        entityLabel={t("title")}
        groups={groups}
        locations={locations}
        onDelete={handleBulkDelete}
        onChangeGroup={handleBulkChangeGroup}
        onChangeLocation={handleBulkChangeLocation}
        onExport={handleBulkExport}
        onCancel={() => setSelectedIds(new Set())}
        loading={bulkLoading}
      />

      {/* Book to vehicle dialog */}
      <BookToVehicleDialog
        entityType="material"
        entityId={vehicleBookTarget?.id ?? ""}
        entityName={vehicleBookTarget?.name ?? ""}
        open={!!vehicleBookTarget}
        onOpenChange={(open) => { if (!open) setVehicleBookTarget(null) }}
        onSuccess={() => window.location.reload()}
      />
    </div>
  )
}
