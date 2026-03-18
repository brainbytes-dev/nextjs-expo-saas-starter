"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconBuildingWarehouse,
  IconTruck,
  IconBuildingFactory,
  IconAmbulance,
  IconStethoscope,
  IconHeartbeat,
  IconUser,
  IconPlus,
  IconLayoutGrid,
  IconLayoutList,
  IconMapPin,
  IconPackage,
  IconTool,
  IconKey,
  IconSearch,
  IconDownload,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// ─── Type config ─────────────────────────────────────────────────────
const LOCATION_TYPES = {
  warehouse: {
    icon: IconBuildingWarehouse,
    color: "bg-primary/10 text-primary",
    badgeBg: "bg-primary/10 text-primary border-border",
  },
  vehicle: {
    icon: IconTruck,
    color: "bg-primary/10 text-primary",
    badgeBg: "bg-primary/10 text-primary border-border",
  },
  site: {
    icon: IconBuildingFactory,
    color: "bg-primary/10 text-primary",
    badgeBg: "bg-primary/10 text-primary border-border",
  },
  station: {
    icon: IconAmbulance,
    color: "bg-destructive/10 text-destructive",
    badgeBg: "bg-destructive/10 text-destructive border-destructive/30",
  },
  practice: {
    icon: IconStethoscope,
    color: "bg-secondary/10 text-secondary",
    badgeBg: "bg-secondary/10 text-secondary border-secondary/30",
  },
  operating_room: {
    icon: IconHeartbeat,
    color: "bg-muted text-muted-foreground",
    badgeBg: "bg-muted text-muted-foreground border-border",
  },
  user: {
    icon: IconUser,
    color: "bg-muted text-muted-foreground",
    badgeBg: "bg-muted text-muted-foreground border-border",
  },
} as const

type LocationType = keyof typeof LOCATION_TYPES
type LocationSortKey = "name" | "type" | "category" | "materialCount" | "toolCount"

// ─── Mock data (replace with real API call) ──────────────────────────
interface LocationItem {
  id: string
  name: string
  type: LocationType
  category: string | null
  materialCount: number
  toolCount: number
  keyCount: number
}

const MOCK_LOCATIONS: LocationItem[] = [
  { id: "1", name: "Hauptlager Zürich", type: "warehouse", category: "Zentral", materialCount: 245, toolCount: 38, keyCount: 12 },
  { id: "2", name: "Fahrzeug A-01", type: "vehicle", category: "Transporter", materialCount: 56, toolCount: 12, keyCount: 3 },
  { id: "3", name: "Baustelle Bern Mitte", type: "site", category: "Hochbau", materialCount: 89, toolCount: 24, keyCount: 5 },
  { id: "4", name: "Rettungsstation Nord", type: "station", category: "Notfall", materialCount: 134, toolCount: 8, keyCount: 2 },
  { id: "5", name: "Praxis Dr. Müller", type: "practice", category: "Allgemeinmedizin", materialCount: 67, toolCount: 5, keyCount: 1 },
  { id: "6", name: "OP-Saal 3", type: "operating_room", category: "Chirurgie", materialCount: 312, toolCount: 42, keyCount: 0 },
  { id: "7", name: "Max Mustermann", type: "user", category: null, materialCount: 12, toolCount: 3, keyCount: 2 },
]

// ─── Helper: type label key mapping ─────────────────────────────────
const TYPE_I18N_MAP: Record<LocationType, string> = {
  warehouse: "warehouse",
  vehicle: "vehicle",
  site: "site",
  station: "station",
  practice: "practice",
  operating_room: "operatingRoom",
  user: "user",
}

// ─── CSV helper ───────────────────────────────────────────────────────
function downloadCsv(headers: string[], rows: (string | number | null | undefined)[][], filename: string) {
  const lines = [
    headers.join(";"),
    ...rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";"))
  ]
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function cmpStr(a: string | null | undefined, b: string | null | undefined): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return a.toLowerCase().localeCompare(b.toLowerCase(), "de")
}

// ─── Sort Icon ────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <IconSelector className="ml-1 size-3.5 text-muted-foreground/50" />
  return dir === "asc"
    ? <IconChevronUp className="ml-1 size-3.5" />
    : <IconChevronDown className="ml-1 size-3.5" />
}

export default function LocationsPage() {
  const t = useTranslations("locations")
  const tCommon = useTranslations("common")
  const router = useRouter()

  const [view, setView] = React.useState<string>("table")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [search, setSearch] = React.useState("")
  const [sortKey, setSortKey] = React.useState<LocationSortKey | null>(null)
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc")

  function handleSort(key: LocationSortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filteredLocations = React.useMemo(() => {
    return MOCK_LOCATIONS.filter((loc) => {
      const matchesType = typeFilter === "all" || loc.type === typeFilter
      const matchesSearch =
        search === "" ||
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        (loc.category?.toLowerCase().includes(search.toLowerCase()) ?? false)
      return matchesType && matchesSearch
    })
  }, [typeFilter, search])

  const sortedLocations = React.useMemo(() => {
    if (!sortKey) return filteredLocations
    return [...filteredLocations].sort((a, b) => {
      let result = 0
      switch (sortKey) {
        case "name":
          result = cmpStr(a.name, b.name)
          break
        case "type":
          result = cmpStr(a.type, b.type)
          break
        case "category":
          result = cmpStr(a.category, b.category)
          break
        case "materialCount":
          result = a.materialCount - b.materialCount
          break
        case "toolCount":
          result = a.toolCount - b.toolCount
          break
      }
      return sortDir === "asc" ? result : -result
    })
  }, [filteredLocations, sortKey, sortDir])

  function handleExportCsv() {
    const headers = ["Name", "Typ", "Kategorie", "Adresse", "Materialien", "Werkzeuge", "Schlüssel"]
    const rows = sortedLocations.map(loc => [
      loc.name,
      loc.type,
      loc.category,
      null,
      loc.materialCount,
      loc.toolCount,
      loc.keyCount,
    ])
    downloadCsv(headers, rows, "lagerorte.csv")
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {filteredLocations.length} {t("title")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleExportCsv} title="CSV exportieren">
            <IconDownload className="size-4" />
          </Button>
          <Button onClick={() => router.push("/dashboard/locations/new")}>
            <IconPlus className="size-4" />
            {t("addLocation")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center lg:px-6">
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tCommon("search") + "..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tCommon("all")}</SelectItem>
            {(Object.keys(LOCATION_TYPES) as LocationType[]).map((type) => {
              const config = LOCATION_TYPES[type]
              const Icon = config.icon
              return (
                <SelectItem key={type} value={type}>
                  <Icon className="size-4" />
                  {t(`types.${TYPE_I18N_MAP[type]}`)}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => { if (v) setView(v) }}
          className="ml-auto"
        >
          <ToggleGroupItem value="table" aria-label="Tabellenansicht">
            <IconLayoutList className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Kachelansicht">
            <IconLayoutGrid className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-6">
        {filteredLocations.length === 0 ? (
          <EmptyState
            onAdd={() => router.push("/dashboard/locations/new")}
            addLabel={t("addLocation")}
          />
        ) : view === "table" ? (
          <LocationTable
            locations={sortedLocations}
            t={t}
            onRowClick={(id) => router.push(`/dashboard/locations/${id}`)}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        ) : (
          <LocationGrid
            locations={filteredLocations}
            t={t}
            onCardClick={(id) => router.push(`/dashboard/locations/${id}`)}
          />
        )}
      </div>
    </div>
  )
}

// ─── Table View ──────────────────────────────────────────────────────
function LocationSortableHead({ label, sk, className, onSort, sortKey, sortDir }: { label: string; sk: LocationSortKey; className?: string; onSort: (key: LocationSortKey) => void; sortKey: LocationSortKey | null; sortDir: "asc" | "desc" }) {
  return (
    <TableHead
      className={`cursor-pointer select-none ${className ?? ""}`}
      onClick={() => onSort(sk)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon active={sortKey === sk} dir={sortDir} />
      </span>
    </TableHead>
  )
}

function LocationTable({
  locations,
  t,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
}: {
  locations: LocationItem[]
  t: ReturnType<typeof useTranslations<"locations">>
  onRowClick: (id: string) => void
  sortKey: LocationSortKey | null
  sortDir: "asc" | "desc"
  onSort: (key: LocationSortKey) => void
}) {

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <LocationSortableHead label={t("name")} sk="name" onSort={onSort} sortKey={sortKey} sortDir={sortDir} />
            <LocationSortableHead label={t("type")} sk="type" onSort={onSort} sortKey={sortKey} sortDir={sortDir} />
            <LocationSortableHead label={t("category")} sk="category" onSort={onSort} sortKey={sortKey} sortDir={sortDir} />
            <LocationSortableHead label={t("materialCount")} sk="materialCount" className="text-right" onSort={onSort} sortKey={sortKey} sortDir={sortDir} />
            <LocationSortableHead label={t("toolCount")} sk="toolCount" className="text-right" onSort={onSort} sortKey={sortKey} sortDir={sortDir} />
            <TableHead className="text-right">{t("keyCount")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.map((loc) => {
            const config = LOCATION_TYPES[loc.type]
            const Icon = config.icon
            return (
              <TableRow
                key={loc.id}
                className="cursor-pointer"
                onClick={() => onRowClick(loc.id)}
              >
                <TableCell className="font-medium">{loc.name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={config.badgeBg}
                  >
                    <Icon className="size-3.5" />
                    {t(`types.${TYPE_I18N_MAP[loc.type]}`)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {loc.category ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {loc.materialCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {loc.toolCount}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {loc.keyCount}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── Grid View ───────────────────────────────────────────────────────
function LocationGrid({
  locations,
  t,
  onCardClick,
}: {
  locations: LocationItem[]
  t: ReturnType<typeof useTranslations<"locations">>
  onCardClick: (id: string) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {locations.map((loc) => {
        const config = LOCATION_TYPES[loc.type]
        const Icon = config.icon
        return (
          <Card
            key={loc.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => onCardClick(loc.id)}
          >
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
              <div className={`flex size-10 items-center justify-center rounded-lg ${config.color}`}>
                <Icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="truncate text-base">{loc.name}</CardTitle>
                <Badge
                  variant="outline"
                  className={`mt-1 ${config.badgeBg}`}
                >
                  {t(`types.${TYPE_I18N_MAP[loc.type]}`)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loc.category && (
                <p className="mb-3 text-sm text-muted-foreground">{loc.category}</p>
              )}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 p-2">
                  <IconPackage className="size-4 text-muted-foreground" />
                  <span className="text-lg font-semibold tabular-nums">{loc.materialCount}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">Material</span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 p-2">
                  <IconTool className="size-4 text-muted-foreground" />
                  <span className="text-lg font-semibold tabular-nums">{loc.toolCount}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">Werkzeuge</span>
                </div>
                <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 p-2">
                  <IconKey className="size-4 text-muted-foreground" />
                  <span className="text-lg font-semibold tabular-nums">{loc.keyCount}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">Schlüssel</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────
function EmptyState({ onAdd, addLabel }: { onAdd: () => void; addLabel: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
        <IconMapPin className="size-6 text-muted-foreground" />
      </div>
      <div className="max-w-sm space-y-1">
        <h3 className="text-lg font-medium">Keine Lagerorte vorhanden</h3>
        <p className="text-sm text-muted-foreground">
          Erstellen Sie Ihren ersten Lagerort, um Materialien, Werkzeuge und Schlüssel zu verwalten.
        </p>
      </div>
      <Button onClick={onAdd}>
        <IconPlus className="size-4" />
        {addLabel}
      </Button>
    </div>
  )
}
