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
  IconCar,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconDownload,
  IconAlertTriangle,
  IconCheck,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VehicleMetadata {
  make?: string
  model?: string
  year?: number
  nextMfk?: string
  nextService?: string
  mileage?: number
  driverId?: string
  driverName?: string
  notes?: string
}

interface VehicleRow {
  id: string
  name: string // Kennzeichen
  type: string
  category: string | null
  address: string | null
  isActive: boolean
  metadata: VehicleMetadata | null
  createdAt: string
  updatedAt: string
}

interface OrgMember {
  userId: string
  user: { name: string; email: string }
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------
const ITEMS_PER_PAGE = 20

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function isDateOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function isDateSoon(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  return d >= now && d <= thirtyDays
}

function downloadCsv(rows: VehicleRow[], filename: string) {
  const headers = [
    "Kennzeichen",
    "Marke",
    "Modell",
    "Baujahr",
    "Fahrer",
    "Kilometerstand",
    "Naechste MFK",
    "Naechster Service",
    "Status",
    "Notizen",
  ]
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      [
        r.name,
        r.metadata?.make ?? "",
        r.metadata?.model ?? "",
        r.metadata?.year ?? "",
        r.metadata?.driverName ?? "",
        r.metadata?.mileage ?? "",
        r.metadata?.nextMfk ?? "",
        r.metadata?.nextService ?? "",
        r.isActive ? "Aktiv" : "Inaktiv",
        r.metadata?.notes ?? "",
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
// Searchable Combobox for Make/Model
// ---------------------------------------------------------------------------
function SearchableCombobox({
  value,
  onSelect,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  loading,
}: {
  value: string
  onSelect: (v: string) => void
  options: string[]
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || placeholder}
          <IconSelector className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Laden...
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => (
                    <CommandItem
                      key={opt}
                      value={opt}
                      onSelect={() => {
                        onSelect(opt)
                        setOpen(false)
                      }}
                    >
                      <IconCheck
                        className={`mr-2 size-4 ${value === opt ? "opacity-100" : "opacity-0"}`}
                      />
                      {opt}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Create Vehicle Dialog
// ---------------------------------------------------------------------------
function CreateVehicleDialog({
  open,
  onOpenChange,
  onCreated,
  t,
  tc,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (vehicle: VehicleRow) => void
  t: ReturnType<typeof useTranslations<"vehicles">>
  tc: ReturnType<typeof useTranslations<"common">>
}) {
  const [licensePlate, setLicensePlate] = useState("")
  const [make, setMake] = useState("")
  const [model, setModel] = useState("")
  const [year, setYear] = useState("")
  const [nextMfk, setNextMfk] = useState("")
  const [nextService, setNextService] = useState("")
  const [mileage, setMileage] = useState("")
  const [driverId, setDriverId] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  // Catalog data
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [makesLoading, setMakesLoading] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(false)

  // Members for driver selection
  const [members, setMembers] = useState<OrgMember[]>([])

  // Load makes on open
  useEffect(() => {
    if (!open) return
    setMakesLoading(true)
    fetch("/api/vehicles/catalog?type=makes")
      .then((r) => r.ok ? r.json() : { makes: [] })
      .then((data) => setMakes(data.makes ?? []))
      .catch(() => {})
      .finally(() => setMakesLoading(false))
  }, [open])

  // Load models when make changes
  useEffect(() => {
    if (!make) {
      setModels([])
      return
    }
    setModelsLoading(true)
    setModel("")
    fetch(`/api/vehicles/catalog?type=models&make=${encodeURIComponent(make)}`)
      .then((r) => r.ok ? r.json() : { models: [] })
      .then((data) => setModels(data.models ?? []))
      .catch(() => {})
      .finally(() => setModelsLoading(false))
  }, [make])

  // Load org members
  useEffect(() => {
    if (!open) return
    fetch("/api/organizations/members")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.members ?? data.data ?? [])
        setMembers(list)
      })
      .catch(() => {})
  }, [open])

  function resetForm() {
    setLicensePlate("")
    setMake("")
    setModel("")
    setYear("")
    setNextMfk("")
    setNextService("")
    setMileage("")
    setDriverId("")
    setNotes("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!licensePlate.trim()) return

    setSaving(true)
    try {
      const effectiveDriverId = driverId === "none" ? "" : driverId
      const selectedMember = members.find((m) => m.userId === effectiveDriverId)
      const metadata: VehicleMetadata = {
        make: make || undefined,
        model: model || undefined,
        year: year ? parseInt(year, 10) : undefined,
        nextMfk: nextMfk || undefined,
        nextService: nextService || undefined,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        driverId: effectiveDriverId || undefined,
        driverName: selectedMember?.user?.name || undefined,
        notes: notes || undefined,
      }

      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: licensePlate.trim(),
          type: "vehicle",
          category: make && model ? `${make} ${model}` : make || undefined,
          metadata,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        onCreated(created)
        resetForm()
        onOpenChange(false)
      }
    } catch {
      // TODO: toast error
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addVehicle")}</DialogTitle>
          <DialogDescription>{t("addVehicleDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Kennzeichen */}
          <div className="grid gap-2">
            <Label htmlFor="licensePlate">{t("licensePlate")} *</Label>
            <Input
              id="licensePlate"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="ZH 123456"
              required
            />
          </div>

          {/* Marke */}
          <div className="grid gap-2">
            <Label>{t("make")}</Label>
            <SearchableCombobox
              value={make}
              onSelect={setMake}
              options={makes}
              placeholder={t("selectMake")}
              searchPlaceholder={`${tc("search")}...`}
              emptyText={t("noMakeFound")}
              loading={makesLoading}
            />
          </div>

          {/* Modell */}
          <div className="grid gap-2">
            <Label>{t("model")}</Label>
            <SearchableCombobox
              value={model}
              onSelect={setModel}
              options={models}
              placeholder={make ? t("selectModel") : t("selectMakeFirst")}
              searchPlaceholder={`${tc("search")}...`}
              emptyText={t("noModelFound")}
              loading={modelsLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Baujahr */}
            <div className="grid gap-2">
              <Label htmlFor="year">{t("year")}</Label>
              <Input
                id="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                min={1900}
                max={new Date().getFullYear() + 1}
              />
            </div>

            {/* Kilometerstand */}
            <div className="grid gap-2">
              <Label htmlFor="mileage">{t("mileage")}</Label>
              <Input
                id="mileage"
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="45000"
                min={0}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Naechste MFK */}
            <div className="grid gap-2">
              <Label htmlFor="nextMfk">{t("nextMfk")}</Label>
              <Input
                id="nextMfk"
                type="date"
                value={nextMfk}
                onChange={(e) => setNextMfk(e.target.value)}
              />
            </div>

            {/* Naechster Service */}
            <div className="grid gap-2">
              <Label htmlFor="nextService">{t("nextService")}</Label>
              <Input
                id="nextService"
                type="date"
                value={nextService}
                onChange={(e) => setNextService(e.target.value)}
              />
            </div>
          </div>

          {/* Fahrer */}
          <div className="grid gap-2">
            <Label>{t("driver")}</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectDriver")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noDriver")}</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.user?.name || m.user?.email || m.userId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notizen */}
          <div className="grid gap-2">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={saving || !licensePlate.trim()}>
              {saving ? tc("loading") : tc("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function VehiclesPage() {
  const t = useTranslations("vehicles")
  const tc = useTranslations("common")
  const router = useRouter()

  // Data state
  const [vehicles, setVehicles] = useState<VehicleRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filter / pagination state
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([])

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<VehicleRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch vehicles
  useEffect(() => {
    async function fetchVehicles() {
      setLoading(true)
      try {
        const res = await fetch("/api/locations?type=vehicle")
        if (res.ok) {
          const json = await res.json()
          const data: VehicleRow[] = Array.isArray(json) ? json : (json.data ?? [])
          setVehicles(data)
        }
      } catch {
        // TODO: toast error
      } finally {
        setLoading(false)
      }
    }
    fetchVehicles()
  }, [])

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/locations/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setVehicles((prev) => prev.filter((v) => v.id !== deleteTarget.id))
      }
    } catch {
      // TODO: toast error
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget])

  // Toggle active/inactive status
  const handleToggleStatus = useCallback(async (vehicle: VehicleRow) => {
    const newStatus = !vehicle.isActive
    try {
      const res = await fetch(`/api/locations/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      })
      if (res.ok) {
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === vehicle.id ? { ...v, isActive: newStatus } : v
          )
        )
        toast.success(
          newStatus ? t("statusActivated") : t("statusDeactivated")
        )
      }
    } catch {
      toast.error(tc("error"))
    }
  }, [t, tc])

  // Client-side filtering
  const filteredVehicles = useMemo(() => {
    let list = vehicles

    // Status filter
    if (statusFilter === "active") {
      list = list.filter((v) => v.isActive)
    } else if (statusFilter === "inactive") {
      list = list.filter((v) => !v.isActive)
    }

    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.metadata?.make?.toLowerCase().includes(q) ?? false) ||
          (v.metadata?.model?.toLowerCase().includes(q) ?? false) ||
          (v.metadata?.driverName?.toLowerCase().includes(q) ?? false)
      )
    }

    return list
  }, [vehicles, debouncedSearch, statusFilter])

  // Client-side pagination
  const total = filteredVehicles.length
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const pagedVehicles = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filteredVehicles.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredVehicles, page])

  // CSV export
  const handleExport = useCallback(() => {
    downloadCsv(filteredVehicles, "fahrzeuge.csv")
  }, [filteredVehicles])

  // On vehicle created
  const handleCreated = useCallback((vehicle: VehicleRow) => {
    setVehicles((prev) => [vehicle, ...prev])
  }, [])

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------
  const columns = useMemo<ColumnDef<VehicleRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("licensePlate")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 150,
        cell: ({ row }) => (
          <button
            onClick={() => router.push(`/dashboard/locations/${row.original.id}`)}
            className="text-left font-mono font-medium text-foreground hover:underline"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        id: "make",
        accessorFn: (row) => row.metadata?.make ?? "",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("make")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 140,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.metadata?.make ?? "\u2014"}
          </span>
        ),
      },
      {
        id: "model",
        accessorFn: (row) => row.metadata?.model ?? "",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("model")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 140,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.metadata?.model ?? "\u2014"}
          </span>
        ),
      },
      {
        id: "driver",
        accessorFn: (row) => row.metadata?.driverName ?? "",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("driver")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 150,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.metadata?.driverName ?? (
              <span className="text-muted-foreground">{"\u2014"}</span>
            )}
          </span>
        ),
      },
      {
        id: "mileage",
        accessorFn: (row) => row.metadata?.mileage ?? 0,
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("mileage")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 130,
        cell: ({ row }) => {
          const km = row.original.metadata?.mileage
          return (
            <span className="text-sm tabular-nums">
              {km != null ? `${km.toLocaleString("de-CH")} km` : "\u2014"}
            </span>
          )
        },
      },
      {
        id: "nextMfk",
        accessorFn: (row) => row.metadata?.nextMfk ?? "",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("nextMfk")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 140,
        cell: ({ row }) => {
          const date = row.original.metadata?.nextMfk
          const overdue = isDateOverdue(date)
          const soon = isDateSoon(date)
          return (
            <div className="flex items-center gap-1.5">
              {overdue && <IconAlertTriangle className="size-4 text-destructive" />}
              <span
                className={
                  overdue
                    ? "text-sm font-medium text-destructive"
                    : soon
                      ? "text-sm font-medium text-amber-600"
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
        id: "nextService",
        accessorFn: (row) => row.metadata?.nextService ?? "",
        header: ({ column }) => (
          <button
            className="flex cursor-pointer select-none items-center"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("nextService")}
            <SortIcon sorted={column.getIsSorted()} />
          </button>
        ),
        size: 140,
        cell: ({ row }) => {
          const date = row.original.metadata?.nextService
          const overdue = isDateOverdue(date)
          const soon = isDateSoon(date)
          return (
            <div className="flex items-center gap-1.5">
              {overdue && <IconAlertTriangle className="size-4 text-destructive" />}
              <span
                className={
                  overdue
                    ? "text-sm font-medium text-destructive"
                    : soon
                      ? "text-sm font-medium text-amber-600"
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
        accessorKey: "isActive",
        header: () => tc("status"),
        size: 90,
        enableSorting: false,
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleStatus(row.original)
            }}
            className="cursor-pointer"
            title={t("toggleStatus")}
          >
            {row.original.isActive ? (
              <Badge
                variant="outline"
                className="bg-secondary/10 text-secondary border-secondary/30 hover:bg-secondary/20 transition-colors"
              >
                {tc("active")}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground border-border hover:bg-muted/80 transition-colors"
              >
                {tc("inactive")}
              </Badge>
            )}
          </button>
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
    [t, tc, router, handleToggleStatus]
  )

  const table = useReactTable({
    data: pagedVehicles,
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
            {total} {t("vehiclesCount", { count: total })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <IconDownload className="size-4" />
            CSV
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <IconPlus className="size-4" />
            {t("addVehicle")}
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
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={tc("status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")}</SelectItem>
            <SelectItem value="active">{tc("active")}</SelectItem>
            <SelectItem value="inactive">{tc("inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <Card className="overflow-hidden">
          <div className="space-y-4 p-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </Card>
      ) : filteredVehicles.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
            <IconCar className="size-6 text-muted-foreground" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-lg font-medium">
              {debouncedSearch || statusFilter !== "all"
                ? tc("noData")
                : t("noVehicles")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch
                ? t("tryDifferentSearch")
                : statusFilter !== "all"
                  ? t("noFilterMatch")
                  : t("createFirstDescription")}
            </p>
          </div>
          {!debouncedSearch && statusFilter === "all" && (
            <Button onClick={() => setCreateOpen(true)}>
              <IconPlus className="size-4" />
              {t("addVehicle")}
            </Button>
          )}
        </div>
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
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/dashboard/locations/${row.original.id}`)
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={
                        cell.column.id === "actions" || cell.column.id === "isActive"
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
        </Card>
      )}

      {/* Pagination */}
      {!loading && filteredVehicles.length > 0 && (
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

      {/* Create Vehicle Dialog */}
      <CreateVehicleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
        t={t}
        tc={tc}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteVehicle")}</DialogTitle>
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
    </div>
  )
}
