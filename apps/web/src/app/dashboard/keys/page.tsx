"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import {
  IconPlus,
  IconSearch,
  IconKey,
  IconCheck,
  IconX,
  IconDotsVertical,
  IconEye,
  IconEdit,
  IconTrash,
  IconBuilding,
  IconCar,
  IconLock,
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
type KeyType = "building" | "vehicle" | "safe" | "cabinet" | "other"

interface KeyItem {
  id: string
  number: string | null
  name: string
  keyType: KeyType
  homeLocation: string | null
  assignedTo: string | null
  assignedLocation: string | null
  isHome: boolean
  quantity: number
  address: string | null
  notes: string | null
}

// ── Mock Data ──────────────────────────────────────────────────────────
const MOCK_KEYS: KeyItem[] = [
  {
    id: "1",
    number: "SCH-001",
    name: "Haupteingang Lager A",
    keyType: "building",
    homeLocation: "Büro Schlüsselkasten",
    assignedTo: null,
    assignedLocation: null,
    isHome: true,
    quantity: 3,
    address: "Industriestrasse 12, 8005 Zürich",
    notes: null,
  },
  {
    id: "2",
    number: "SCH-002",
    name: "Fahrzeug VW Transporter ZH-123",
    keyType: "vehicle",
    homeLocation: "Büro Schlüsselkasten",
    assignedTo: "Thomas Müller",
    assignedLocation: "Baustelle Oerlikon",
    isHome: false,
    quantity: 2,
    address: null,
    notes: "Reserveschlüssel im Safe",
  },
  {
    id: "3",
    number: "SCH-003",
    name: "Werkzeugkammer",
    keyType: "cabinet",
    homeLocation: "Büro Schlüsselkasten",
    assignedTo: null,
    assignedLocation: null,
    isHome: true,
    quantity: 2,
    address: null,
    notes: null,
  },
  {
    id: "4",
    number: "SCH-004",
    name: "Safe Buchhaltung",
    keyType: "safe",
    homeLocation: "Büro Schlüsselkasten",
    assignedTo: "Anna Weber",
    assignedLocation: "Büro 2. OG",
    isHome: false,
    quantity: 1,
    address: null,
    notes: null,
  },
  {
    id: "5",
    number: "SCH-005",
    name: "Ford Transit SH-456",
    keyType: "vehicle",
    homeLocation: "Büro Schlüsselkasten",
    assignedTo: null,
    assignedLocation: null,
    isHome: true,
    quantity: 2,
    address: null,
    notes: null,
  },
  {
    id: "6",
    number: "SCH-006",
    name: "Nebeneingang Baustelle Nord",
    keyType: "building",
    homeLocation: "Büro Schlüsselkasten",
    assignedTo: "Peter Keller",
    assignedLocation: "Baustelle Winterthur",
    isHome: false,
    quantity: 1,
    address: "Technikumstrasse 3, 8400 Winterthur",
    notes: "Läuft ab: 31.12.2025",
  },
]

const KEY_TYPE_ICONS: Record<KeyType, React.ComponentType<{ className?: string }>> = {
  building: IconBuilding,
  vehicle: IconCar,
  safe: IconLock,
  cabinet: IconLock,
  other: IconKey,
}

const KEY_TYPE_COLORS: Record<KeyType, string> = {
  building: "bg-primary/10 text-primary",
  vehicle: "bg-muted text-muted-foreground",
  safe: "bg-primary/10 text-primary",
  cabinet: "bg-primary/10 text-primary",
  other: "bg-muted text-muted-foreground",
}

// ── Page ───────────────────────────────────────────────────────────────
export default function KeysPage() {
  const t = useTranslations("keys")
  const tc = useTranslations("common")

  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [isHomeFilter, setIsHomeFilter] = useState<string>("all")
  const [loading] = useState(false)

  const filtered = useMemo(() => {
    return MOCK_KEYS.filter((k) => {
      const matchSearch =
        !search ||
        k.name.toLowerCase().includes(search.toLowerCase()) ||
        (k.number ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (k.assignedTo ?? "").toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === "all" || k.keyType === typeFilter
      const matchHome =
        isHomeFilter === "all" ||
        (isHomeFilter === "home" && k.isHome) ||
        (isHomeFilter === "away" && !k.isHome)
      return matchSearch && matchType && matchHome
    })
  }, [search, typeFilter, isHomeFilter])

  const stats = useMemo(() => ({
    total: MOCK_KEYS.reduce((s, k) => s + k.quantity, 0),
    home: MOCK_KEYS.filter((k) => k.isHome).reduce((s, k) => s + k.quantity, 0),
    away: MOCK_KEYS.filter((k) => !k.isHome).reduce((s, k) => s + k.quantity, 0),
  }), [])

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {MOCK_KEYS.length} Schlüssel · {stats.away} vergeben
          </p>
        </div>
        <Button className="gap-2">
          <IconPlus className="size-4" />
          {t("addKey")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Gesamt", value: stats.total, color: "text-foreground" },
          { label: "Zuhause", value: stats.home, color: "text-secondary" },
          { label: "Vergeben", value: stats.away, color: "text-primary" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-0 bg-muted">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder={tc("search") + "…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tc("all")} Typen</SelectItem>
            <SelectItem value="building">{t("types.building")}</SelectItem>
            <SelectItem value="vehicle">{t("types.vehicle")}</SelectItem>
            <SelectItem value="safe">{t("types.safe")}</SelectItem>
            <SelectItem value="cabinet">{t("types.cabinet")}</SelectItem>
            <SelectItem value="other">{t("types.other")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={isHomeFilter} onValueChange={setIsHomeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="home">Zuhause</SelectItem>
            <SelectItem value="away">Vergeben</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty className="py-16">
              <EmptyMedia>
                <IconKey className="size-12 text-muted-foreground/40" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>Keine Schlüssel gefunden</EmptyTitle>
                <EmptyDescription>
                  {search ? "Passen Sie Ihre Suche an." : "Fügen Sie Ihren ersten Schlüssel hinzu."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px]">{t("number")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("name")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("keyType")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("home")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("assignedTo")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[70px] text-right">{t("quantity")}</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-[80px] text-center">{t("isHome")}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((key) => {
                  const TypeIcon = KEY_TYPE_ICONS[key.keyType]
                  return (
                    <TableRow key={key.id} className="group hover:bg-muted/80 border-b border-border">
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {key.number ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{key.name}</p>
                          {key.address && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[240px]">{key.address}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${KEY_TYPE_COLORS[key.keyType]}`}>
                          <TypeIcon className="size-3" />
                          {t(`types.${key.keyType}`)}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">
                        {key.homeLocation ?? "—"}
                      </TableCell>
                      <TableCell>
                        {key.assignedTo ? (
                          <div>
                            <p className="text-sm font-medium text-foreground">{key.assignedTo}</p>
                            {key.assignedLocation && (
                              <p className="text-xs text-muted-foreground">{key.assignedLocation}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {key.quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        {key.isHome ? (
                          <span className="inline-flex items-center justify-center size-6 rounded-full bg-secondary/10">
                            <IconCheck className="size-3.5 text-secondary" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary/10">
                            <IconX className="size-3.5 text-primary" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <IconDotsVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <IconEye className="size-4" /> Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <IconEdit className="size-4" /> {tc("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                              <IconTrash className="size-4" /> {tc("delete")}
                            </DropdownMenuItem>
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
