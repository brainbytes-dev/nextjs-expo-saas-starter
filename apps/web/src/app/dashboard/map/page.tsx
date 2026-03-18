"use client"

import dynamic from "next/dynamic"
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  IconMapPin,
  IconBuildingWarehouse,
  IconTruck,
  IconBuildingFactory,
  IconAmbulance,
  IconStethoscope,
  IconHeartbeat,
  IconUser,
  IconSearch,
  IconPackage,
  IconTool,
  IconKey,
  IconFilter,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { MapLocation } from "@/components/map-view"

// Dynamic import keeps Leaflet out of SSR
const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <Skeleton className="h-full w-full" />
    </div>
  ),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LocationRow {
  id: string
  name: string
  type: string
  category: string | null
  address: string | null
  latitude: string | null
  longitude: string | null
  isActive: boolean
  stockSummary?: {
    materials: number
    tools: number
    keys: number
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  warehouse: IconBuildingWarehouse,
  vehicle: IconTruck,
  site: IconBuildingFactory,
  station: IconAmbulance,
  practice: IconStethoscope,
  operating_room: IconHeartbeat,
  user: IconUser,
}

const TYPE_LABELS: Record<string, string> = {
  warehouse: "Lager",
  vehicle: "Fahrzeug",
  site: "Baustelle",
  station: "Station",
  practice: "Praxis",
  operating_room: "OP-Saal",
  user: "Nutzer",
}

const TYPE_COLOR_CLASSES: Record<string, string> = {
  warehouse: "bg-blue-100 text-blue-700 border-blue-200",
  vehicle: "bg-orange-100 text-orange-700 border-orange-200",
  site: "bg-green-100 text-green-700 border-green-200",
  station: "bg-red-100 text-red-700 border-red-200",
  practice: "bg-purple-100 text-purple-700 border-purple-200",
  operating_room: "bg-cyan-100 text-cyan-700 border-cyan-200",
  user: "bg-muted text-muted-foreground border-border",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MapPage() {
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [focusId, setFocusId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLocations() {
      setLoading(true)
      try {
        const res = await fetch("/api/locations")
        if (res.ok) {
          const data: LocationRow[] = await res.json()
          setLocations(Array.isArray(data) ? data : [])
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchLocations()
  }, [])

  const filtered = useMemo(() => {
    let list = locations
    if (typeFilter !== "all") list = list.filter((l) => l.type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.address?.toLowerCase().includes(q) ?? false)
      )
    }
    return list
  }, [locations, typeFilter, search])

  const mappable: MapLocation[] = useMemo(
    () =>
      filtered
        .filter((l) => l.latitude && l.longitude)
        .map((l) => ({
          id: l.id,
          name: l.name,
          type: l.type,
          lat: parseFloat(l.latitude!),
          lng: parseFloat(l.longitude!),
          address: l.address,
          itemCount: l.stockSummary
            ? l.stockSummary.materials + l.stockSummary.tools + l.stockSummary.keys
            : undefined,
        })),
    [filtered]
  )

  const withCoords = locations.filter((l) => l.latitude && l.longitude).length
  const withoutCoords = locations.length - withCoords

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="flex w-80 shrink-0 flex-col border-r bg-background">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h1 className="text-base font-semibold">Karte</h1>
            <p className="text-xs text-muted-foreground">
              {withCoords} von {locations.length} Standorten mit GPS
            </p>
          </div>
          <IconMapPin className="size-5 text-muted-foreground" />
        </div>

        {/* Filters */}
        <div className="space-y-2 border-b px-4 py-3">
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Standort suchen..."
              className="pl-9 text-sm"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="text-sm">
              <IconFilter className="mr-2 size-3.5" />
              <SelectValue placeholder="Alle Typen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <IconMapPin className="size-8 opacity-40" />
              <span>Keine Standorte gefunden</span>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((loc) => {
                const Icon = TYPE_ICONS[loc.type] ?? IconMapPin
                const colorClass =
                  TYPE_COLOR_CLASSES[loc.type] ??
                  "bg-muted text-muted-foreground border-border"
                const hasCords = !!(loc.latitude && loc.longitude)
                return (
                  <li key={loc.id}>
                    <button
                      className={`group w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                        focusId === loc.id ? "bg-muted/60" : ""
                      } ${!hasCords ? "opacity-60" : ""}`}
                      onClick={() => {
                        if (hasCords) setFocusId(loc.id)
                      }}
                      title={hasCords ? "Auf Karte anzeigen" : "Keine GPS-Koordinaten"}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border ${colorClass}`}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-none">
                            {loc.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${colorClass}`}
                            >
                              {TYPE_LABELS[loc.type] ?? loc.type}
                            </Badge>
                            {!hasCords && (
                              <span className="text-xs text-muted-foreground">
                                Kein GPS
                              </span>
                            )}
                          </div>
                          {loc.address && (
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {loc.address}
                            </p>
                          )}
                          {loc.stockSummary && (
                            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-0.5">
                                <IconPackage className="size-3" />
                                {loc.stockSummary.materials}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <IconTool className="size-3" />
                                {loc.stockSummary.tools}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <IconKey className="size-3" />
                                {loc.stockSummary.keys}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {withoutCoords > 0 && (
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            {withoutCoords} Standort{withoutCoords !== 1 ? "e" : ""} ohne
            GPS-Koordinaten.{" "}
            <Link
              href="/dashboard/locations"
              className="text-primary hover:underline"
            >
              Koordinaten hinzuf&uuml;gen
            </Link>
          </div>
        )}
      </aside>

      {/* ── Map ── */}
      <main className="relative flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">Karte wird geladen...</p>
          </div>
        ) : (
          <MapView
            locations={mappable}
            focusId={focusId}
            className="h-full w-full"
          />
        )}

        {/* No-GPS notice overlay */}
        {!loading && mappable.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto rounded-xl border bg-background/90 p-6 shadow-lg backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-center">
                <IconMapPin className="size-10 text-muted-foreground" />
                <h2 className="text-base font-semibold">
                  Keine GPS-Koordinaten
                </h2>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Tragen Sie Breitengrad und L&auml;ngengrad bei Ihren
                  Standorten ein, um diese auf der Karte anzuzeigen.
                </p>
                <Button asChild size="sm">
                  <Link href="/dashboard/locations">Zu den Standorten</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
