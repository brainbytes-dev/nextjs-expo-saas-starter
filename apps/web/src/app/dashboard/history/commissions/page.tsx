"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { IconSearch, IconClipboardList, IconCheck, IconMapPin, IconUser, IconDownload } from "@tabler/icons-react"
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

export default function HistoryCommissionsPage() {
  const t = useTranslations("history")
  const [search, setSearch] = useState("")
  const [loading] = useState(false)

  const filtered = useMemo(() => MOCK.filter(c =>
    !search ||
    c.commissionName.toLowerCase().includes(search.toLowerCase()) ||
    c.commissionNumber.toLowerCase().includes(search.toLowerCase()) ||
    (c.customer ?? "").toLowerCase().includes(search.toLowerCase())
  ), [search])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("title")}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("commissions")}</h1>
        </div>
        <Button variant="outline" className="gap-2 text-sm">
          <IconDownload className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="relative max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Kommission oder Kunde suchen…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px]">Nummer</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kommission</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[140px]">Kunde</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[150px]">Ziel Lagerort</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[130px]">Verantwortlich</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px] text-center">Einträge</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[110px]">Abgeschlossen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
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
    </div>
  )
}
