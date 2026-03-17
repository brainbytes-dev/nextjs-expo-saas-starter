"use client"

import { useState, useMemo } from "react"
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
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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

// ── Types ──────────────────────────────────────────────────────────────
type CommissionStatus = "open" | "inProgress" | "completed"

interface Commission {
  id: string
  name: string
  number: string
  manualNumber: string | null
  targetLocation: string
  customer: string | null
  responsible: string
  entryCount: number
  openCount: number
  status: CommissionStatus
  createdAt: string
}

// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK_COMMISSIONS: Commission[] = [
  { id: "1", name: "Elektroinstallation Oerlikon Phase 1", number: "K-2025-001", manualNumber: "PJ-230/1", targetLocation: "Baustelle Oerlikon", customer: "Muster AG", responsible: "Thomas Müller", entryCount: 12, openCount: 5, status: "inProgress", createdAt: "2025-02-10" },
  { id: "2", name: "Reparatur Schulhaus Winterthur", number: "K-2025-002", manualNumber: null, targetLocation: "Baustelle Winterthur", customer: "Stadt Winterthur", responsible: "Anna Weber", entryCount: 8, openCount: 8, status: "open", createdAt: "2025-02-18" },
  { id: "3", name: "Wartung Industrieanlage Schlieren", number: "K-2025-003", manualNumber: "WA-2025-3", targetLocation: "Lager A", customer: "Industriewerke AG", responsible: "Peter Keller", entryCount: 24, openCount: 0, status: "completed", createdAt: "2025-01-15" },
  { id: "4", name: "Neubau Wohnüberbauung Zürich Nord", number: "K-2025-004", manualNumber: null, targetLocation: "Baustelle Zürich Nord", customer: "Baupartner GmbH", responsible: "Thomas Müller", entryCount: 45, openCount: 31, status: "inProgress", createdAt: "2025-02-28" },
  { id: "5", name: "Umbau Bürogebäude Zug", number: "K-2025-005", manualNumber: "PJ-228", targetLocation: "Fahrzeug VW T6 ZH-777", customer: "Finance Corp AG", responsible: "Sandra Huber", entryCount: 6, openCount: 6, status: "open", createdAt: "2025-03-05" },
  { id: "6", name: "Notfallreparatur Kabelschaden", number: "K-2025-006", manualNumber: null, targetLocation: "Baustelle Oerlikon", customer: "Muster AG", responsible: "Anna Weber", entryCount: 4, openCount: 0, status: "completed", createdAt: "2025-03-08" },
  { id: "7", name: "Revision Elektroinstallation Lager", number: "K-2025-007", manualNumber: "REV-2025-1", targetLocation: "Lager A", customer: null, responsible: "Peter Keller", entryCount: 18, openCount: 12, status: "inProgress", createdAt: "2025-03-12" },
]

const STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string }> = {
  open: { label: "Offen", color: "bg-muted text-muted-foreground" },
  inProgress: { label: "In Bearbeitung", color: "bg-primary/10 text-primary" },
  completed: { label: "Abgeschlossen", color: "bg-secondary/10 text-secondary" },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function ProgressBar({ total, open }: { total: number; open: number }) {
  const done = total - open
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{done}/{total}</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────
export default function CommissionsPage() {
  const t = useTranslations("commissions")
  const tc = useTranslations("common")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading] = useState(false)

  const filtered = useMemo(() => {
    return MOCK_COMMISSIONS.filter((c) => {
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.number.toLowerCase().includes(search.toLowerCase()) ||
        (c.customer ?? "").toLowerCase().includes(search.toLowerCase()) ||
        c.responsible.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || c.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter])

  const totalOpen = MOCK_COMMISSIONS.reduce((s, c) => s + c.openCount, 0)
  const totalEntries = MOCK_COMMISSIONS.reduce((s, c) => s + c.entryCount, 0)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {MOCK_COMMISSIONS.length} Kommissionen · {totalOpen} von {totalEntries} Einträgen offen
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
          const count = MOCK_COMMISSIONS.filter((c) => c.status === s).length
          const cfg = STATUS_CONFIG[s]
          return (
            <Card
              key={s}
              className={`border-0 cursor-pointer transition-all hover:shadow-md ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
            >
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{count}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
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
                <EmptyTitle>Keine Kommissionen gefunden</EmptyTitle>
                <EmptyDescription>
                  {search ? "Passen Sie Ihre Suche an." : "Erstellen Sie Ihre erste Kommission."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">{t("number")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("name")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[170px]">{t("targetLocation")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("customer")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">{t("responsible")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[150px]">Fortschritt</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((commission) => {
                  const statusCfg = STATUS_CONFIG[commission.status]
                  return (
                    <TableRow key={commission.id} className="group hover:bg-muted/80 border-b border-border">
                      <TableCell>
                        <div>
                          <p className="font-mono text-sm font-medium text-foreground">{commission.number}</p>
                          {commission.manualNumber && (
                            <p className="text-xs text-muted-foreground">{commission.manualNumber}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground text-sm">{commission.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(commission.createdAt)}</p>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-md ${statusCfg.color}`}>
                          {statusCfg.label}
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
                        <div className="flex items-center gap-1.5">
                          <IconUser className="size-3.5 text-muted-foreground/60 flex-shrink-0" />
                          <span className="text-sm text-foreground">{commission.responsible}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ProgressBar total={commission.entryCount} open={commission.openCount} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <IconDotsVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2"><IconEye className="size-4" /> {t("showDetails")}</DropdownMenuItem>
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
