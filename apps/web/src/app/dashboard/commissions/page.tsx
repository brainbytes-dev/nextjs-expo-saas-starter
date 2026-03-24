"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconPlus,
  IconSearch,
  IconClipboardList,
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
  IconMapPin,
  IconUser,
  IconPrinter,
  IconCar,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { printLieferscheinBatch, type LieferscheinData } from "@/lib/lieferschein-pdf"

// ── Types ──────────────────────────────────────────────────────────────
type CommissionStatus = "open" | "inProgress" | "completed"

interface ApiCommission {
  id: string
  name: string
  number: number | null
  manualNumber: string | null
  status: string
  targetLocationId: string | null
  targetLocationName: string | null
  customerId: string | null
  customerName: string | null
  responsibleId: string | null
  responsibleName: string | null
  vehicleId: string | null
  vehicleName: string | null
  entryCount: number
  createdAt: string
  updatedAt: string
}

interface Commission {
  id: string
  name: string
  number: string
  manualNumber: string | null
  targetLocation: string
  customer: string | null
  responsible: string
  vehicleId: string | null
  vehicleName: string | null
  entryCount: number
  status: CommissionStatus
  createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, CommissionStatus> = {
  open: "open",
  in_progress: "inProgress",
  completed: "completed",
}

function mapApiToCommission(raw: ApiCommission): Commission {
  return {
    id: raw.id,
    name: raw.name,
    number: raw.number != null ? `K-${String(raw.number).padStart(4, "0")}` : "—",
    manualNumber: raw.manualNumber,
    targetLocation: raw.targetLocationName ?? "—",
    customer: raw.customerName ?? null,
    responsible: raw.responsibleName ?? "—",
    vehicleId: raw.vehicleId,
    vehicleName: raw.vehicleName,
    entryCount: Number(raw.entryCount) || 0,
    status: STATUS_MAP[raw.status] ?? "open",
    createdAt: raw.createdAt,
  }
}

const STATUS_COLORS: Record<CommissionStatus, string> = {
  open:       "bg-muted text-muted-foreground",
  inProgress: "bg-primary/10 text-primary",
  completed:  "bg-secondary/10 text-secondary",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function EntryCount({ total }: { total: number }) {
  return (
    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{total}</span>
  )
}

function buildLieferschein(c: Commission): LieferscheinData {
  return {
    number: c.number,
    manualNumber: c.manualNumber,
    commissionName: c.name,
    customerName: c.customer,
    customerAddress: null,
    targetLocation: c.targetLocation,
    responsible: c.responsible,
    createdAt: c.createdAt,
    entries: [],
    signature: null,
    signedAt: null,
    signedBy: null,
    org: {
      name: "Zentory",
      address: null,
      zip: null,
      city: null,
      country: "CH",
      logo: null,
    },
  }
}

// ── Page ───────────────────────────────────────────────────────────────
export default function CommissionsPage() {
  const t = useTranslations("commissions")
  const tc = useTranslations("common")
  const router = useRouter()

  const [commissions, setCommissions] = useState<Commission[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    async function fetchCommissions() {
      try {
        const res = await fetch("/api/commissions?limit=100")
        if (!res.ok) throw new Error("Failed to fetch commissions")
        const json = await res.json()
        if (cancelled) return
        const items: ApiCommission[] = json.data ?? json
        setCommissions(items.map(mapApiToCommission))
      } catch (err) {
        console.error("Failed to load commissions:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCommissions()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    return commissions.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.number.toLowerCase().includes(search.toLowerCase()) ||
        (c.customer ?? "").toLowerCase().includes(search.toLowerCase()) ||
        c.responsible.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [commissions, search, statusFilter])

  const totalEntries = commissions.reduce((s, c) => s + c.entryCount, 0)

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id))
  const someSelected = !allSelected && filtered.some((c) => selected.has(c.id))
  const selectedCount = [...selected].filter((id) => filtered.some((c) => c.id === id)).length

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((c) => next.delete(c.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        filtered.forEach((c) => next.add(c.id))
        return next
      })
    }
  }

  function handleBatchPrint() {
    const items = filtered.filter((c) => selected.has(c.id)).map(buildLieferschein)
    printLieferscheinBatch(items)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {commissions.length} {t("title")} · {totalEntries} {tc("entries")}
          </p>
        </div>
        <Button className="gap-2">
          <IconPlus className="size-4" />
          {t("addCommission")}
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4">
        {(["open", "inProgress", "completed"] as CommissionStatus[]).map((s) => {
          const count = commissions.filter((c) => c.status === s).length
          return (
            <Card
              key={s}
              className={`border-0 cursor-pointer transition-all hover:shadow-md ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t(`statuses.${s}`)}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{count}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters + batch actions */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={`${tc("search")}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {selectedCount > 0 && (
          <Button variant="outline" onClick={handleBatchPrint} className="gap-2 whitespace-nowrap">
            <IconPrinter className="size-4" />
            {t("printDeliveryNotes", { count: selectedCount })}
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Empty className="py-16">
              <EmptyMedia>
                <IconClipboardList className="size-12 text-muted-foreground/40" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>{t("noCommissionsFound")}</EmptyTitle>
                <EmptyDescription>
                  {search ? t("adjustSearch") : t("createFirst")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="w-10 pl-4">
                    <Checkbox
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label={t("selectAll")}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">{t("number")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("name")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">{tc("status")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[170px]">{t("targetLocation")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("customer")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("vehicle")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("responsible")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[150px]">{t("progress")}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((commission) => {
                  const statusColor = STATUS_COLORS[commission.status]
                  const isChecked = selected.has(commission.id)
                  return (
                    <TableRow
                      key={commission.id}
                      className={`group hover:bg-muted/80 border-b border-border ${isChecked ? "bg-primary/5" : ""}`}
                    >
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(commission.id)}
                          aria-label={t("selectItem", { number: commission.number })}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-mono text-sm font-medium text-foreground">{commission.number}</p>
                          {commission.manualNumber && (
                            <p className="text-xs text-muted-foreground">{commission.manualNumber}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p
                          className="font-medium text-foreground text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={() => router.push(`/dashboard/commissions/${commission.id}`)}
                        >
                          {commission.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(commission.createdAt)}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md ${statusColor}`}>
                          {t(`statuses.${commission.status}`)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <IconMapPin className="size-3.5 text-muted-foreground/60 flex-shrink-0" />
                          <span className="text-sm text-foreground truncate">{commission.targetLocation}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{commission.customer ?? "—"}</TableCell>
                      <TableCell>
                        {commission.vehicleName ? (
                          <div className="flex items-center gap-1.5">
                            <IconCar className="size-3.5 text-muted-foreground/60 flex-shrink-0" />
                            <span className="text-sm text-foreground truncate">{commission.vehicleName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <IconUser className="size-3.5 text-muted-foreground/60 flex-shrink-0" />
                          <span className="text-sm text-foreground">{commission.responsible}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <EntryCount total={commission.entryCount} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <IconDotsVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={() => router.push(`/dashboard/commissions/${commission.id}`)}>
                              <IconEye className="size-4" /> {t("showDetails")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <IconPrinter className="size-4" />
                              {t("printDeliveryNote")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2"><IconEdit className="size-4" /> {tc("edit")}</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive"><IconTrash className="size-4" /> {tc("delete")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
