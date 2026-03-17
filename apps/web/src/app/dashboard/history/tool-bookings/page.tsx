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

export default function HistoryToolBookingsPage() {
  const t = useTranslations("history")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading] = useState(false)

  const filtered = useMemo(() => MOCK.filter(b => {
    const ms = !search || b.toolName.toLowerCase().includes(search.toLowerCase()) || b.assignedTo.toLowerCase().includes(search.toLowerCase())
    const mst = statusFilter === "all" || b.status === statusFilter
    return ms && mst
  }), [search, statusFilter])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("title")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("toolBookings")}</h1>
        </div>
        <Button variant="outline" className="gap-2 text-sm">
          <IconDownload className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Werkzeug oder Person…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Werkzeug</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px]">{t("assignedTo")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[160px]">Standort</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">Ausgecheckt</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">{t("returnedAt")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px] text-right">Tage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(b => {
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
    </div>
  )
}
