"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconSearch,
  IconTool,
  IconCheck,
  IconAlertCircle,
  IconUser,
  IconMapPin,
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

type BookingStatus = "returned" | "overdue" | "checkedOut"

interface ToolBooking {
  id: string
  checkOutDate: string
  returnedDate: string | null
  toolName: string
  toolNumber: string
  assignedTo: string
  location: string
  status: BookingStatus
  daysOut: number
}

const MOCK: ToolBooking[] = [
  { id: "1", checkOutDate: "2025-03-10", returnedDate: "2025-03-14", toolName: "Hilti TE 70-ATC", toolNumber: "WZ-001", assignedTo: "Thomas Müller", location: "Baustelle Oerlikon", status: "returned", daysOut: 4 },
  { id: "2", checkOutDate: "2025-03-08", returnedDate: "2025-03-08", toolName: "Bosch GBH 5-40 DE", toolNumber: "WZ-002", assignedTo: "Anna Weber", location: "Baustelle Winterthur", status: "returned", daysOut: 1 },
  { id: "3", checkOutDate: "2025-03-01", returnedDate: null, toolName: "Winkelschleifer Makita GA9020", toolNumber: "WZ-007", assignedTo: "Peter Keller", location: "Baustelle Süd", status: "overdue", daysOut: 16 },
  { id: "4", checkOutDate: "2025-03-12", returnedDate: "2025-03-15", toolName: "Bohrmaschine Metabo SBE700", toolNumber: "WZ-009", assignedTo: "Sandra Huber", location: "Baustelle Zürich Nord", status: "returned", daysOut: 3 },
  { id: "5", checkOutDate: "2025-03-14", returnedDate: null, toolName: "Kompressor Atlas Copco GA15", toolNumber: "WZ-005", assignedTo: "Thomas Müller", location: "Lager B", status: "checkedOut", daysOut: 3 },
  { id: "6", checkOutDate: "2025-02-20", returnedDate: "2025-02-28", toolName: "Säbelsäge Bosch GSA 1100 E", toolNumber: "WZ-012", assignedTo: "Anna Weber", location: "Baustelle Winterthur", status: "returned", daysOut: 8 },
  { id: "7", checkOutDate: "2025-02-14", returnedDate: null, toolName: "Hilti TE 30-A36", toolNumber: "WZ-003", assignedTo: "Peter Keller", location: "Fahrzeug VW T6 ZH-777", status: "overdue", daysOut: 31 },
]

const STATUS_CFG: Record<BookingStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  returned: { label: "Zurückgegeben", color: "text-secondary bg-secondary/10", icon: IconCheck },
  overdue: { label: "Überfällig", color: "text-destructive bg-destructive/10", icon: IconAlertCircle },
  checkedOut: { label: "Ausgecheckt", color: "text-primary bg-primary/10", icon: IconTool },
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

type SortKey = keyof ToolBooking | null

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

export default function HistoryToolBookingsPage() {
  const t = useTranslations("history")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [loading] = useState(false)

  const filtered = useMemo(() => MOCK.filter(b => {
    const ms = !search || b.toolName.toLowerCase().includes(search.toLowerCase()) || b.assignedTo.toLowerCase().includes(search.toLowerCase())
    const mst = statusFilter === "all" || b.status === statusFilter
    const mdf = !dateFrom || b.checkOutDate >= dateFrom
    const mdt = !dateTo || b.checkOutDate <= dateTo + "T23:59:59"
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
      ["Datum", "Werkzeug", "Nummer", "Typ", "Von Standort", "Nach Standort", "Benutzer", "Notizen"],
      sorted.map(b => [b.checkOutDate, b.toolName, b.toolNumber, STATUS_CFG[b.status].label, b.location, b.returnedDate ?? "", b.assignedTo, ""])
    , "werkzeugbuchungen.csv")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("title")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("toolBookings")}</h1>
        </div>
        <Button variant="outline" className="gap-2 text-sm" onClick={handleExport}>
          <IconDownload className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Werkzeug oder Person…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="returned">Zurückgegeben</SelectItem>
            <SelectItem value="checkedOut">Ausgecheckt</SelectItem>
            <SelectItem value="overdue">Überfällig</SelectItem>
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
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("toolName")}>
                    Werkzeug<SortIcon sortKey={sortKey} sortDir={sortDir} col="toolName" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px] cursor-pointer select-none" onClick={() => toggleSort("status")}>
                    Status<SortIcon sortKey={sortKey} sortDir={sortDir} col="status" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px] cursor-pointer select-none" onClick={() => toggleSort("assignedTo")}>
                    {t("assignedTo")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="assignedTo" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[160px] cursor-pointer select-none" onClick={() => toggleSort("location")}>
                    Standort<SortIcon sortKey={sortKey} sortDir={sortDir} col="location" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px] cursor-pointer select-none" onClick={() => toggleSort("checkOutDate")}>
                    Ausgecheckt<SortIcon sortKey={sortKey} sortDir={sortDir} col="checkOutDate" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px] cursor-pointer select-none" onClick={() => toggleSort("returnedDate")}>
                    {t("returnedAt")}<SortIcon sortKey={sortKey} sortDir={sortDir} col="returnedDate" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px] text-right cursor-pointer select-none" onClick={() => toggleSort("daysOut")}>
                    Tage<SortIcon sortKey={sortKey} sortDir={sortDir} col="daysOut" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(b => {
                  const cfg = STATUS_CFG[b.status]
                  const Icon = cfg.icon
                  return (
                    <TableRow key={b.id} className="hover:bg-muted/80 border-b border-border">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconTool className="size-3.5 text-muted-foreground/60" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{b.toolName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{b.toolNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${cfg.color}`}>
                          <Icon className="size-3" />{cfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <IconUser className="size-3.5 text-muted-foreground/60" />
                          <span className="text-sm text-foreground">{b.assignedTo}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <IconMapPin className="size-3.5 text-muted-foreground/60" />
                          <span className="text-sm text-foreground">{b.location}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(b.checkOutDate)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.returnedDate ? fmt(b.returnedDate) : "—"}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold text-sm ${b.status === "overdue" ? "text-destructive" : "text-foreground"}`}>
                        {b.daysOut}d
                      </TableCell>
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
