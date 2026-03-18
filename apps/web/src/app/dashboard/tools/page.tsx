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
  IconTool,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconDownload,
  IconUpload,
  IconAlertTriangle,
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
type ToolCondition = "good" | "damaged" | "repair" | "decommissioned"

interface ToolGroup {
  id: string
  name: string
  color: string | null
}

interface ToolRow {
  id: string
  number: string | null
  name: string
  image: string | null
  groupId: string | null
  groupName: string | null
  homeLocationId: string | null
  homeLocationName: string | null
  assignedToId: string | null
  assignedUserName: string | null
  assignedLocationId: string | null
  barcode: string | null
  manufacturer: string | null
  serialNumber: string | null
  condition: ToolCondition | null
  nextMaintenanceDate: string | null
}

interface ToolsResponse {
  data: ToolRow[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ITEMS_PER_PAGE = 20

const conditionConfig: Record<ToolCondition, { label: string; className: string }> = {
  good: { label: "Gut", className: "bg-secondary/10 text-secondary border-transparent" },
  damaged: { label: "Beschädigt", className: "bg-primary/10 text-primary border-transparent" },
  repair: { label: "Reparatur", className: "bg-destructive/10 text-destructive border-transparent" },
  decommissioned: { label: "Ausgemustert", className: "bg-muted text-muted-foreground border-transparent" },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function isMaintenanceOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function downloadCsv(rows: ToolRow[], filename: string) {
  const headers = [
    "Nummer",
    "Name",
    "Gruppe",
    "Heimstandort",
    "Zugewiesen An",
    "Zustand",
    "Seriennummer",
    "Nächste Wartung",
  ]
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      [
        r.number ?? "",
        r.name,
        r.groupName ?? "",
        r.homeLocationName ?? "",
        r.assignedUserName ?? "",
        r.condition ? (conditionConfig[r.condition]?.label ?? r.condition) : "",
        r.serialNumber ?? "",
        r.nextMaintenanceDate ?? "",
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
export default function ToolsPage() {
  const t = useTranslations("tools")
  const tc = useTranslations("common")
  const router = useRouter()

  // Data state
  const [tools, setTools] = useState<ToolRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filter / pagination state
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [groupFilter, setGroupFilter] = useState<string>("all")
  const [conditionFilter, setConditionFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Reference data
  const [groups, setGroups] = useState<ToolGroup[]>([])

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ToolRow | null>(null)
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
        const res = await fetch("/api/tool-groups")
        if (res.ok) {
          const g = await res.json()
          setGroups(Array.isArray(g) ? g : (g.data ?? []))
        }
      } catch {
        // silently fail — filter will just be empty
      }
    }
    fetchReferenceData()
  }, [])

  // Fetch tools
  useEffect(() => {
    async function fetchTools() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(ITEMS_PER_PAGE),
        })
        if (debouncedSearch) params.set("search", debouncedSearch)
        if (groupFilter && groupFilter !== "all") params.set("groupId", groupFilter)
        if (conditionFilter && conditionFilter !== "all")
          params.set("condition", conditionFilter)

        const res = await fetch(`/api/tools?${params.toString()}`)
        if (res.ok) {
          const json: ToolsResponse = await res.json()
          setTools(json.data ?? [])
          setTotal(json.pagination?.total ?? 0)
        }
      } catch {
        // TODO: toast error
      } finally {
        setLoading(false)
      }
    }
    fetchTools()
  }, [page, debouncedSearch, groupFilter, conditionFilter])

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tools/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setTools((prev) => prev.filter((t) => t.id !== deleteTarget.id))
        setTotal((prev) => prev - 1)
      }
    } catch {
      // TODO: toast error
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  // CSV export: fetch all pages then download
  const handleExport = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: "1", limit: "9999" })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (groupFilter && groupFilter !== "all") params.set("groupId", groupFilter)
      if (conditionFilter && conditionFilter !== "all")
        params.set("condition", conditionFilter)

      const res = await fetch(`/api/tools?${params.toString()}`)
      if (!res.ok) return
      const json: ToolsResponse = await res.json()
      downloadCsv(json.data ?? [], "werkzeuge.csv")
    } catch {
      // silently fail
    }
  }, [debouncedSearch, groupFilter, conditionFilter])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------
  const columns = useMemo<ColumnDef<ToolRow>[]>(
    () => [
      {
        accessorKey: "image",
        header: () => "Bild",
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
                <IconTool className="size-4 text-muted-foreground" />
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
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
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
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("name")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 220,
        cell: ({ row }) => (
          <button
            onClick={() => router.push(`/dashboard/tools/${row.original.id}`)}
            className="text-left font-medium text-foreground hover:underline"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: "groupName",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("group")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 150,
        cell: ({ row }) => {
          const name = row.original.groupName
          const group = groups.find((g) => g.id === row.original.groupId)
          if (!name) return <span className="text-muted-foreground">\u2014</span>
          return (
            <Badge
              variant="secondary"
              className="text-xs"
              style={
                group?.color
                  ? {
                      backgroundColor: `${group.color}18`,
                      color: group.color,
                      borderColor: `${group.color}30`,
                    }
                  : undefined
              }
            >
              {name}
            </Badge>
          )
        },
      },
      {
        accessorKey: "homeLocationName",
        header: () => t("home"),
        size: 150,
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.homeLocationName ?? "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "assignedUserName",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("assignedTo")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.assignedUserName ?? (
              <span className="text-muted-foreground">\u2014</span>
            )}
          </span>
        ),
      },
      {
        accessorKey: "condition",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("condition")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 120,
        cell: ({ row }) => {
          const cond = row.original.condition
          if (!cond) return <span className="text-muted-foreground">\u2014</span>
          const cfg = conditionConfig[cond]
          return (
            <Badge variant="outline" className={`text-xs ${cfg.className}`}>
              {cfg.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: "nextMaintenanceDate",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("maintenanceDue")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 140,
        cell: ({ row }) => {
          const date = row.original.nextMaintenanceDate
          const overdue = isMaintenanceOverdue(date)
          return (
            <div className="flex items-center gap-1.5">
              {overdue && (
                <IconAlertTriangle className="size-4 text-destructive" />
              )}
              <span
                className={
                  overdue
                    ? "text-sm font-medium text-destructive"
                    : "text-sm text-muted-foreground"
                }
              >
                {formatDate(date)}
              </span>
            </div>
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
                onClick={() => router.push(`/dashboard/tools/${row.original.id}`)}
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
    [t, tc, router, groups]
  )

  const table = useReactTable({
    data: tools,
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push("/dashboard/tools/import")}
          >
            <IconUpload className="size-4" />
            Import
          </Button>
          <Button onClick={() => router.push("/dashboard/tools/new")}>
            <IconPlus className="size-4" />
            {t("addTool")}
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
          value={conditionFilter}
          onValueChange={(v) => {
            setConditionFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("condition")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="good">Gut</SelectItem>
            <SelectItem value="damaged">Besch&auml;digt</SelectItem>
            <SelectItem value="repair">Reparatur</SelectItem>
            <SelectItem value="decommissioned">Ausgemustert</SelectItem>
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
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        ) : tools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <IconTool className="size-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-medium">
              {debouncedSearch || conditionFilter !== "all" || groupFilter !== "all"
                ? tc("noData")
                : "Erfassen Sie Ihr erstes Werkzeug"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {debouncedSearch
                ? "Versuchen Sie einen anderen Suchbegriff"
                : conditionFilter !== "all" || groupFilter !== "all"
                  ? "Keine Werkzeuge entsprechen dem Filter"
                  : "Beginnen Sie mit dem Aufbau Ihrer Werkzeugverwaltung"}
            </p>
            {!debouncedSearch && conditionFilter === "all" && groupFilter === "all" && (
              <Button
                className="mt-6"
                onClick={() => router.push("/dashboard/tools/new")}
              >
                <IconPlus className="size-4" />
                {t("addTool")}
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
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/tools/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={
                        cell.column.id === "actions"
                          ? (e) => e.stopPropagation()
                          : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      {!loading && tools.length > 0 && (
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
            <DialogTitle>Werkzeug l&ouml;schen</DialogTitle>
            <DialogDescription>
              M&ouml;chten Sie &laquo;{deleteTarget?.name}&raquo; wirklich
              l&ouml;schen? Diese Aktion kann nicht r&uuml;ckg&auml;ngig
              gemacht werden.
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
