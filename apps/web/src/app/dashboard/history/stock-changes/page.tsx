"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconSearch,
  IconArrowUp,
  IconArrowDown,
  IconArrowsExchange,
  IconPackage,
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

type ChangeType = "in" | "out" | "transfer" | "correction"

interface StockChange {
  id: string
  date: string
  materialName: string
  materialNumber: string
  type: ChangeType
  quantity: number
  unit: string
  fromLocation: string | null
  toLocation: string | null
  user: string
  reason: string | null
  batchNumber: string | null
}

const MOCK: StockChange[] = [
  { id: "1", date: "2025-03-15 09:42", materialName: "Kabelrohr 20mm grau", materialNumber: "M-001", type: "in", quantity: 100, unit: "m", fromLocation: null, toLocation: "Lager A", user: "Thomas Müller", reason: "Wareneingang BO-2025-038", batchNumber: null },
  { id: "2", date: "2025-03-14 14:15", materialName: "Verbindungsbox IP65", materialNumber: "M-002", type: "out", quantity: 10, unit: "Stk", fromLocation: "Lager A", toLocation: "Baustelle Oerlikon", user: "Anna Weber", reason: "Kommission K-2025-001", batchNumber: "B2025-12" },
  { id: "3", date: "2025-03-13 11:30", materialName: "Lüsterklemme 4mm²", materialNumber: "M-003", type: "transfer", quantity: 50, unit: "Stk", fromLocation: "Lager A", toLocation: "Fahrzeug VW T6", user: "Peter Keller", reason: "Umlagerbuchung", batchNumber: null },
  { id: "4", date: "2025-03-12 16:00", materialName: "Kabelbinder 200mm", materialNumber: "M-004", type: "out", quantity: 25, unit: "Pck", fromLocation: "Lager B", toLocation: "Baustelle Winterthur", user: "Sandra Huber", reason: null, batchNumber: null },
  { id: "5", date: "2025-03-11 08:20", materialName: "Schraubendübelset M6", materialNumber: "M-005", type: "correction", quantity: -5, unit: "Stk", fromLocation: "Lager A", toLocation: null, user: "Thomas Müller", reason: "Inventurdifferenz", batchNumber: null },
  { id: "6", date: "2025-03-10 13:45", materialName: "Kabelrohr 20mm grau", materialNumber: "M-001", type: "out", quantity: 50, unit: "m", fromLocation: "Lager A", toLocation: "Baustelle Zürich Nord", user: "Anna Weber", reason: "Kommission K-2025-004", batchNumber: null },
  { id: "7", date: "2025-03-08 10:10", materialName: "Silikon transparent 310ml", materialNumber: "M-006", type: "in", quantity: 12, unit: "Stk", fromLocation: null, toLocation: "Lager A", user: "Peter Keller", reason: "Wareneingang BO-2025-035", batchNumber: "B2025-09" },
]

const TYPE_CONFIG: Record<ChangeType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; qtyColor: string }> = {
  in: { label: "Eingang", icon: IconArrowDown, color: "text-secondary bg-secondary/10", qtyColor: "text-secondary" },
  out: { label: "Ausgang", icon: IconArrowUp, color: "text-destructive bg-destructive/10", qtyColor: "text-destructive" },
  transfer: { label: "Umbuchung", icon: IconArrowsExchange, color: "text-primary bg-primary/10", qtyColor: "text-primary" },
  correction: { label: "Korrektur", icon: IconArrowsExchange, color: "text-primary bg-primary/10", qtyColor: "text-primary" },
}

type SortKey = keyof StockChange | null

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

export default function HistoryStockChangesPage() {
  const t = useTranslations("history")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [loading] = useState(false)

  const filtered = useMemo(() => MOCK.filter(c => {
    const ms = !search || c.materialName.toLowerCase().includes(search.toLowerCase()) || c.materialNumber.toLowerCase().includes(search.toLowerCase())
    const mt = typeFilter === "all" || c.type === typeFilter
    const mdf = !dateFrom || c.date >= dateFrom
    const mdt = !dateTo || c.date <= dateTo + "T23:59:59"
    return ms && mt && mdf && mdt
  }), [search, typeFilter, dateFrom, dateTo])

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
      ["Datum", "Material", "Nummer", "Typ", "Menge", "Einheit", "Von", "Nach", "Benutzer", "Grund"],
      sorted.map(c => [c.date, c.materialName, c.materialNumber, TYPE_CONFIG[c.type].label, c.quantity, c.unit, c.fromLocation, c.toLocation, c.user, c.reason])
    , "lagerbewegungen.csv")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("title")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("stockChanges")}</h1>
        </div>
        <Button variant="outline" className="gap-2 text-sm" onClick={handleExport}>
          <IconDownload className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Material suchen…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            <SelectItem value="in">Eingang</SelectItem>
            <SelectItem value="out">Ausgang</SelectItem>
            <SelectItem value="transfer">Umbuchung</SelectItem>
            <SelectItem value="correction">Korrektur</SelectItem>
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
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[150px] cursor-pointer select-none" onClick={() => toggleSort("date")}>
                    {t("date")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="date" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("materialName")}>
                    {t("item")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="materialName" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px] cursor-pointer select-none" onClick={() => toggleSort("type")}>
                    Typ<SortIcon sortKey={sortKey} sortDir={sortDir} col="type" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[90px] text-right cursor-pointer select-none" onClick={() => toggleSort("quantity")}>
                    {t("quantity")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="quantity" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px] cursor-pointer select-none" onClick={() => toggleSort("fromLocation")}>
                    {t("from")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="fromLocation" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px] cursor-pointer select-none" onClick={() => toggleSort("toLocation")}>
                    {t("to")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="toLocation" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px] cursor-pointer select-none" onClick={() => toggleSort("user")}>
                    {t("user")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="user" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Grund</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(c => {
                  const cfg = TYPE_CONFIG[c.type]
                  const TypeIcon = cfg.icon
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/80 border-b border-border">
                      <TableCell className="text-xs font-mono text-muted-foreground">{c.date}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconPackage className="size-3.5 text-muted-foreground/60" />
                          <div>
                            <p className="text-sm text-foreground">{c.materialName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{c.materialNumber}{c.batchNumber ? ` · ${c.batchNumber}` : ""}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${cfg.color}`}>
                          <TypeIcon className="size-3" />{cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold text-sm ${cfg.qtyColor}`}>
                        {c.type === "out" || (c.type === "correction" && c.quantity < 0) ? "−" : "+"}{Math.abs(c.quantity)} {c.unit}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.fromLocation ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.toLocation ?? "—"}</TableCell>
                      <TableCell className="text-sm text-foreground">{c.user}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.reason ?? "—"}</TableCell>
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
