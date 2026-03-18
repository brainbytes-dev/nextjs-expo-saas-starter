"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconSearch,
  IconClipboardList,
  IconCheck,
  IconMapPin,
  IconUser,
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
import { Skeleton } from "@/components/ui/skeleton"

interface CommissionEntry {
  id: string
  commissionName: string
  commissionNumber: string
  customer: string | null
  responsible: string
  closedAt: string
  totalEntries: number
  targetLocation: string
}

const MOCK: CommissionEntry[] = [
  { id: "1", commissionName: "Wartung Industrieanlage Schlieren", commissionNumber: "K-2025-003", customer: "Industriewerke AG", responsible: "Peter Keller", closedAt: "2025-02-28", totalEntries: 24, targetLocation: "Lager A" },
  { id: "2", commissionName: "Notfallreparatur Kabelschaden", commissionNumber: "K-2025-006", customer: "Muster AG", responsible: "Anna Weber", closedAt: "2025-03-10", totalEntries: 4, targetLocation: "Baustelle Oerlikon" },
  { id: "3", commissionName: "Elektroinstallation Schulhaus 2024", commissionNumber: "K-2024-041", customer: "Kanton Zürich", responsible: "Thomas Müller", closedAt: "2024-12-20", totalEntries: 38, targetLocation: "Baustelle Seuzach" },
  { id: "4", commissionName: "Revision Wohnüberbauung Dietikon", commissionNumber: "K-2024-039", customer: "Heimag AG", responsible: "Sandra Huber", closedAt: "2024-12-05", totalEntries: 15, targetLocation: "Baustelle Dietikon" },
  { id: "5", commissionName: "Umbau Bürogebäude Phase 1", commissionNumber: "K-2024-033", customer: "Corporate AG", responsible: "Anna Weber", closedAt: "2024-11-15", totalEntries: 22, targetLocation: "Fahrzeug Ford Transit" },
]

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

type SortKey = keyof CommissionEntry | null

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

export default function HistoryCommissionsPage() {
  const t = useTranslations("history")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const [loading] = useState(false)

  const filtered = useMemo(() => MOCK.filter(c => {
    const ms = !search ||
      c.commissionName.toLowerCase().includes(search.toLowerCase()) ||
      c.commissionNumber.toLowerCase().includes(search.toLowerCase()) ||
      (c.customer ?? "").toLowerCase().includes(search.toLowerCase())
    const mdf = !dateFrom || c.closedAt >= dateFrom
    const mdt = !dateTo || c.closedAt <= dateTo + "T23:59:59"
    return ms && mdf && mdt
  }), [search, dateFrom, dateTo])

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
      ["Datum", "Komissionsnummer", "Status", "Standort", "Benutzer"],
      sorted.map(c => [c.closedAt, c.commissionNumber, "Abgeschlossen", c.targetLocation, c.responsible])
    , "kommissionen.csv")
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("title")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("commissions")}</h1>
        </div>
        <Button variant="outline" className="gap-2 text-sm" onClick={handleExport}>
          <IconDownload className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Kommission oder Kunde suchen…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} className="pl-9" />
        </div>
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
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px] cursor-pointer select-none" onClick={() => toggleSort("commissionNumber")}>
                    Nummer<SortIcon sortKey={sortKey} sortDir={sortDir} col="commissionNumber" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort("commissionName")}>
                    Kommission<SortIcon sortKey={sortKey} sortDir={sortDir} col="commissionName" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px] cursor-pointer select-none" onClick={() => toggleSort("customer")}>
                    Kunde<SortIcon sortKey={sortKey} sortDir={sortDir} col="customer" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[150px] cursor-pointer select-none" onClick={() => toggleSort("targetLocation")}>
                    Ziel Lagerort<SortIcon sortKey={sortKey} sortDir={sortDir} col="targetLocation" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px] cursor-pointer select-none" onClick={() => toggleSort("responsible")}>
                    Verantwortlich<SortIcon sortKey={sortKey} sortDir={sortDir} col="responsible" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px] text-center cursor-pointer select-none" onClick={() => toggleSort("totalEntries")}>
                    Einträge<SortIcon sortKey={sortKey} sortDir={sortDir} col="totalEntries" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px] cursor-pointer select-none" onClick={() => toggleSort("closedAt")}>
                    Abgeschlossen<SortIcon sortKey={sortKey} sortDir={sortDir} col="closedAt" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map(c => (
                  <TableRow key={c.id} className="hover:bg-muted/80 border-b border-border">
                    <TableCell className="font-mono text-sm font-medium text-foreground">{c.commissionNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <IconClipboardList className="size-3.5 text-muted-foreground/60" />
                        <span className="text-sm font-medium text-foreground">{c.commissionName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{c.customer ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <IconMapPin className="size-3.5 text-muted-foreground/60" />
                        <span className="text-sm text-foreground">{c.targetLocation}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <IconUser className="size-3.5 text-muted-foreground/60" />
                        <span className="text-sm text-foreground">{c.responsible}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center gap-1 text-xs font-medium text-secondary bg-secondary/10 px-2 py-1 rounded-md">
                        <IconCheck className="size-3" />{c.totalEntries}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(c.closedAt)}</TableCell>
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
