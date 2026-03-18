"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconSearch,
  IconTruck,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconDownload,
  IconChevronUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"

type OrderStatus = "delivered" | "cancelled" | "ordered"

interface HistoryOrder {
  id: string
  orderNumber: string
  orderDate: string
  deliveryDate: string | null
  supplierName: string
  status: OrderStatus
  positionCount: number
  total: number
  createdBy: string
}

const MOCK: HistoryOrder[] = [
  { id: "1", orderNumber: "BO-2025-038", orderDate: "2025-02-28", deliveryDate: "2025-03-04", supplierName: "Hilti AG", status: "delivered", positionCount: 5, total: 312.40, createdBy: "Thomas Müller" },
  { id: "2", orderNumber: "BO-2025-035", orderDate: "2025-02-18", deliveryDate: "2025-02-22", supplierName: "Würth Schweiz", status: "delivered", positionCount: 3, total: 87.60, createdBy: "Anna Weber" },
  { id: "3", orderNumber: "BO-2025-034", orderDate: "2025-02-15", deliveryDate: null, supplierName: "Bossard AG", status: "cancelled", positionCount: 2, total: 45.00, createdBy: "Peter Keller" },
  { id: "4", orderNumber: "BO-2025-031", orderDate: "2025-02-05", deliveryDate: "2025-02-10", supplierName: "Debrunner Acifer", status: "delivered", positionCount: 7, total: 198.30, createdBy: "Thomas Müller" },
  { id: "5", orderNumber: "BO-2025-028", orderDate: "2025-01-28", deliveryDate: "2025-02-01", supplierName: "Haberkorn AG", status: "delivered", positionCount: 4, total: 124.80, createdBy: "Sandra Huber" },
  { id: "6", orderNumber: "BO-2025-025", orderDate: "2025-01-20", deliveryDate: "2025-01-25", supplierName: "Hilti AG", status: "delivered", positionCount: 6, total: 445.20, createdBy: "Anna Weber" },
  { id: "7", orderNumber: "BO-2025-022", orderDate: "2025-01-12", deliveryDate: null, supplierName: "Würth Schweiz", status: "cancelled", positionCount: 1, total: 29.50, createdBy: "Thomas Müller" },
]

const STATUS: Record<OrderStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  delivered: { label: "Geliefert", icon: IconCheck, color: "text-secondary bg-secondary/10" },
  cancelled: { label: "Storniert", icon: IconX, color: "text-muted-foreground bg-muted" },
  ordered: { label: "Bestellt", icon: IconAlertCircle, color: "text-primary bg-primary/10" },
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}
function fmtCHF(v: number) { return `CHF ${v.toFixed(2)}` }

type SortKey = keyof HistoryOrder | null

const PAGE_SIZE = 25

function SortIcon({ sortKey, sortDir, col }: { sortKey: SortKey; sortDir: "asc" | "desc"; col: SortKey }) {
  if (sortKey !== col) return null
  return sortDir === "asc" ? <IconChevronUp className="size-3 ml-1 inline" /> : <IconChevronDown className="size-3 ml-1 inline" />
}

function downloadCsv(headers: string[], rows: (string | number | null | undefined)[][], filename: string) {
  const lines = [
    headers.join(";"),
    ...rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
  ]
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function HistoryOrdersPage() {
  const t = useTranslations("history")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [loading] = useState(false)

  const filtered = useMemo(() => MOCK.filter(o => {
    const ms = !search || o.orderNumber.toLowerCase().includes(search.toLowerCase()) || o.supplierName.toLowerCase().includes(search.toLowerCase())
    const mst = statusFilter === "all" || o.status === statusFilter
    const mdf = !dateFrom || o.orderDate >= dateFrom
    const mdt = !dateTo || o.orderDate <= dateTo + "T23:59:59"
    return ms && mst && mdf && mdt
  }), [search, statusFilter, dateFrom, dateTo])

  const sorted = useMemo(() => {
    if (!sortKey) return [...filtered]
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? ""
      const bv = b[sortKey] ?? ""
      const cmp = String(av).localeCompare(String(bv), "de", { numeric: true })
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const total = sorted.length
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
    setPage(1)
  }

  function handleExport() {
    downloadCsv(
      ["Datum", "Bestellnummer", "Lieferant", "Status", "Betrag", "Erstellt von"],
      sorted.map(o => [o.orderDate, o.orderNumber, o.supplierName, STATUS[o.status].label, o.total, o.createdBy])
    , "bestellungen.csv")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("title")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("orders")}</h1>
        </div>
        <Button variant="outline" className="gap-2 text-sm" onClick={handleExport}>
          <IconDownload className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Suchen…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="delivered">Geliefert</SelectItem>
            <SelectItem value="cancelled">Storniert</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Von</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1) }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Bis</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1) }}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-mono"
          />
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("orderNumber")}>
                    {t("orderNumber")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="orderNumber" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px] cursor-pointer select-none" onClick={() => toggleSort("orderDate")}>
                    {t("date")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="orderDate" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("supplierName")}>
                    {t("supplier")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="supplierName" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px] cursor-pointer select-none" onClick={() => toggleSort("deliveryDate")}>
                    Lieferdatum<SortIcon sortKey={sortKey} sortDir={sortDir} col="deliveryDate" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px] cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    {t("status")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="status" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px] text-center">Pos.</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px] text-right cursor-pointer select-none" onClick={() => toggleSort("total")}>
                    Total<SortIcon sortKey={sortKey} sortDir={sortDir} col="total" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px] cursor-pointer select-none" onClick={() => toggleSort("createdBy")}>
                    {t("user")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="createdBy" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(o => {
                  const s = STATUS[o.status]
                  const Icon = s.icon
                  return (
                    <TableRow key={o.id} className="hover:bg-muted/80 border-b border-border">
                      <TableCell className="font-mono text-sm font-medium text-foreground">{o.orderNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(o.orderDate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <IconTruck className="size-3.5 text-muted-foreground/60" />
                          <span className="text-sm text-foreground">{o.supplierName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.deliveryDate ? fmt(o.deliveryDate) : "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${s.color}`}>
                          <Icon className="size-3" />{s.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-foreground">{o.positionCount}</TableCell>
                      <TableCell className="text-right font-medium text-sm text-foreground">{fmtCHF(o.total)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.createdBy}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? "Keine Einträge"
            : `Zeige ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} von ${total} Einträgen`}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <IconChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage(p => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))}
            disabled={page >= Math.ceil(total / PAGE_SIZE)}
          >
            <IconChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
