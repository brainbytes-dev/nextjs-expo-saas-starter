"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconSearch,
  IconPackage,
  IconTruck,
  IconCheck,
  IconX,
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

interface OrderItem {
  id: string
  orderNumber: string
  orderDate: string
  supplierName: string
  materialName: string
  materialNumber: string
  articleNumber: string
  orderedQty: number
  deliveredQty: number
  unit: string
  price: number
  delivered: boolean
}

const MOCK: OrderItem[] = [
  { id: "1", orderNumber: "BO-2025-038", orderDate: "2025-02-28", supplierName: "Hilti AG", materialName: "Kabelrohr 20mm grau", materialNumber: "M-001", articleNumber: "KR-20G-100", orderedQty: 300, deliveredQty: 300, unit: "m", price: 1.20, delivered: true },
  { id: "2", orderNumber: "BO-2025-038", orderDate: "2025-02-28", supplierName: "Hilti AG", materialName: "Elektro-Installationsband", materialNumber: "M-007", articleNumber: "HI-EB-10", orderedQty: 10, deliveredQty: 10, unit: "Rollen", price: 2.30, delivered: true },
  { id: "3", orderNumber: "BO-2025-035", orderDate: "2025-02-18", supplierName: "Würth Schweiz", materialName: "Kabelbinder 200mm", materialNumber: "M-004", articleNumber: "WU-KB200-100", orderedQty: 100, deliveredQty: 50, unit: "Pck", price: 4.90, delivered: false },
  { id: "4", orderNumber: "BO-2025-035", orderDate: "2025-02-18", supplierName: "Würth Schweiz", materialName: "Abzweigdose UP 68mm", materialNumber: "M-008", articleNumber: "WU-AZ68-25", orderedQty: 25, deliveredQty: 25, unit: "Stk", price: 1.85, delivered: true },
  { id: "5", orderNumber: "BO-2025-034", orderDate: "2025-02-15", supplierName: "Bossard AG", materialName: "Schraubendübelset M6", materialNumber: "M-005", articleNumber: "BS-SD-M6-50", orderedQty: 200, deliveredQty: 0, unit: "Stk", price: 0.15, delivered: false },
  { id: "6", orderNumber: "BO-2025-031", orderDate: "2025-02-05", supplierName: "Debrunner Acifer", materialName: "Verbindungsbox IP65", materialNumber: "M-002", articleNumber: "DA-VB65-10", orderedQty: 20, deliveredQty: 20, unit: "Stk", price: 3.80, delivered: true },
]

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

type SortKey = keyof OrderItem | null

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

export default function HistoryOrderItemsPage() {
  const t = useTranslations("history")
  const [search, setSearch] = useState("")
  const [supplierFilter, setSupplierFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [loading] = useState(false)

  const suppliers = useMemo(() => [...new Set(MOCK.map(i => i.supplierName))], [])

  const filtered = useMemo(() => MOCK.filter(i => {
    const ms = !search || i.materialName.toLowerCase().includes(search.toLowerCase()) || i.orderNumber.toLowerCase().includes(search.toLowerCase())
    const msu = supplierFilter === "all" || i.supplierName === supplierFilter
    const mdf = !dateFrom || i.orderDate >= dateFrom
    const mdt = !dateTo || i.orderDate <= dateTo + "T23:59:59"
    return ms && msu && mdf && mdt
  }), [search, supplierFilter, dateFrom, dateTo])

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
      ["Datum", "Bestellnummer", "Material", "Artikelnummer", "Menge", "Einheit", "Preis"],
      sorted.map(item => [item.orderDate, item.orderNumber, item.materialName, item.articleNumber, item.orderedQty, item.unit, item.price])
    , "bestellpositionen.csv")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("title")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("orderItems")}</h1>
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
        <Select value={supplierFilter} onValueChange={v => { setSupplierFilter(v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Lieferanten</SelectItem>
            {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px] cursor-pointer select-none" onClick={() => toggleSort("orderNumber")}>
                    {t("orderNumber")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="orderNumber" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px] cursor-pointer select-none" onClick={() => toggleSort("orderDate")}>
                    {t("date")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="orderDate" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("materialName")}>
                    {t("item")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="materialName" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px] cursor-pointer select-none" onClick={() => toggleSort("supplierName")}>
                    {t("supplier")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="supplierName" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[90px] text-right cursor-pointer select-none" onClick={() => toggleSort("orderedQty")}>
                    Bestellt<SortIcon sortKey={sortKey} sortDir={sortDir} col="orderedQty" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[90px] text-right cursor-pointer select-none" onClick={() => toggleSort("deliveredQty")}>
                    Geliefert<SortIcon sortKey={sortKey} sortDir={sortDir} col="deliveredQty" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px] text-right cursor-pointer select-none" onClick={() => toggleSort("price")}>
                    Preis/Stk<SortIcon sortKey={sortKey} sortDir={sortDir} col="price" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px] text-right">Total</TableHead>
                  <TableHead className="w-[60px] text-center">OK</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(item => (
                  <TableRow key={item.id} className="hover:bg-muted/80 border-b border-border">
                    <TableCell className="font-mono text-xs text-foreground">{item.orderNumber}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(item.orderDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconPackage className="size-3.5 text-muted-foreground/60" />
                        <div>
                          <p className="text-sm text-foreground">{item.materialName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{item.materialNumber} · {item.articleNumber}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <IconTruck className="size-3.5 text-muted-foreground/60" />
                        <span className="text-sm text-foreground">{item.supplierName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-mono text-foreground">{item.orderedQty} {item.unit}</TableCell>
                    <TableCell className={`text-right text-sm font-mono font-medium ${item.deliveredQty >= item.orderedQty ? "text-secondary" : item.deliveredQty > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {item.deliveredQty} {item.unit}
                    </TableCell>
                    <TableCell className="text-right text-sm text-foreground">CHF {item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-foreground">CHF {(item.price * item.orderedQty).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      {item.delivered
                        ? <IconCheck className="size-4 text-secondary inline" />
                        : <IconX className="size-4 text-muted-foreground inline" />}
                    </TableCell>
                  </TableRow>
                ))}
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
