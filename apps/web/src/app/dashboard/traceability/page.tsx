"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  IconSearch,
  IconArrowDown,
  IconArrowUp,
  IconTransfer,
  IconAdjustmentsAlt,
  IconPackage,
  IconTruck,
  IconClipboardList,
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleDashed,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TraceCommission {
  id: string
  name: string
  number: number | null
  manualNumber: string | null
  status: string
}

interface TraceOrder {
  id: string
  orderNumber: string | null
  ownOrderNumber: string | null
  status: string
  orderDate: string | null
  supplierId: string
  supplierName: string | null
}

interface TraceChange {
  id: string
  materialId: string
  materialName: string | null
  materialNumber: string | null
  materialUnit: string | null
  locationId: string
  locationName: string | null
  userId: string | null
  userName: string | null
  changeType: string
  quantity: number
  previousQuantity: number | null
  newQuantity: number | null
  batchNumber: string | null
  serialNumber: string | null
  commissionId: string | null
  orderId: string | null
  notes: string | null
  createdAt: string
  commission: TraceCommission | null
  order: TraceOrder | null
}

interface TraceCurrentStock {
  id: string
  materialId: string
  materialName: string | null
  locationId: string
  locationName: string | null
  quantity: number
  batchNumber: string | null
  serialNumber: string | null
  expiryDate: string | null
}

interface TraceSummary {
  batchNumber: string | null
  serialNumber: string | null
  materialId: string | null
  materialName: string | null
  materialNumber: string | null
  materialUnit: string | null
  firstSeen: string | null
  lastSeen: string | null
  totalIn: number
  totalOut: number
  currentQuantity: number
  locationCount: number
}

interface TraceResult {
  summary: TraceSummary
  changes: TraceChange[]
  currentStock: TraceCurrentStock[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

function isExpiringSoon(dateStr: string | null): boolean {
  if (!dateStr) return false
  const diff = (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 30
}

// ---------------------------------------------------------------------------
// Timeline event icon + colors
// ---------------------------------------------------------------------------
function ChangeTypeIcon({ changeType }: { changeType: string }) {
  switch (changeType) {
    case "in":
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-white dark:bg-emerald-900/40 dark:text-emerald-400 dark:ring-background">
          <IconArrowDown className="size-4" />
        </span>
      )
    case "out":
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 ring-4 ring-white dark:bg-orange-900/40 dark:text-orange-400 dark:ring-background">
          <IconArrowUp className="size-4" />
        </span>
      )
    case "transfer":
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 ring-4 ring-white dark:bg-blue-900/40 dark:text-blue-400 dark:ring-background">
          <IconTransfer className="size-4" />
        </span>
      )
    case "correction":
    case "inventory":
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-4 ring-white dark:bg-slate-900/40 dark:text-slate-400 dark:ring-background">
          <IconAdjustmentsAlt className="size-4" />
        </span>
      )
    default:
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground ring-4 ring-white dark:ring-background">
          <IconPackage className="size-4" />
        </span>
      )
  }
}

function changeTypeLabel(changeType: string): string {
  switch (changeType) {
    case "in": return "Wareneingang"
    case "out": return "Warenausgang"
    case "transfer": return "Umbuchung"
    case "correction": return "Korrektur"
    case "inventory": return "Inventur"
    default: return changeType
  }
}

function commissionStatusLabel(status: string): string {
  switch (status) {
    case "open": return "Offen"
    case "in_progress": return "In Bearbeitung"
    case "completed": return "Abgeschlossen"
    case "cancelled": return "Storniert"
    default: return status
  }
}

// ---------------------------------------------------------------------------
// Stock status badge
// ---------------------------------------------------------------------------
function StockStatusBadge({
  quantity,
  expiryDate,
}: {
  quantity: number
  expiryDate: string | null
}) {
  if (isExpired(expiryDate)) {
    return (
      <Badge variant="destructive" className="text-xs">
        Abgelaufen
      </Badge>
    )
  }
  if (quantity === 0) {
    return (
      <Badge variant="secondary" className="text-xs text-muted-foreground">
        Leer
      </Badge>
    )
  }
  if (isExpiringSoon(expiryDate)) {
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-300 text-xs dark:bg-orange-900/40 dark:text-orange-400">
        Ablaufend
      </Badge>
    )
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs dark:bg-emerald-900/40 dark:text-emerald-400">
      Aktiv
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TraceabilityPage() {
  const router = useRouter()
  const [searchBatch, setSearchBatch] = useState("")
  const [searchSerial, setSearchSerial] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TraceResult | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    const batch = searchBatch.trim()
    const serial = searchSerial.trim()

    if (!batch && !serial) return

    setLoading(true)
    setError(null)
    setResult(null)
    setSearched(true)

    try {
      const params = new URLSearchParams()
      if (batch) params.set("batch", batch)
      if (serial) params.set("serial", serial)

      const res = await fetch(`/api/traceability?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Fehler beim Laden der Daten")
        return
      }

      const data: TraceResult = await res.json()
      setResult(data)
    } catch {
      setError("Verbindungsfehler. Bitte versuchen Sie es erneut.")
    } finally {
      setLoading(false)
    }
  }, [searchBatch, searchSerial])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleSearch()
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Rückverfolgung
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chargennummer oder Seriennummer eingeben, um die vollständige
          Bewegungshistorie eines Artikels zu sehen.
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="batch-search">Chargennummer</Label>
              <Input
                id="batch-search"
                placeholder="z.B. CH-2026-001"
                value={searchBatch}
                onChange={(e) => setSearchBatch(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial-search">Seriennummer</Label>
              <Input
                id="serial-search"
                placeholder="z.B. SN-00812345"
                value={searchSerial}
                onChange={(e) => setSearchSerial(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={loading || (!searchBatch.trim() && !searchSerial.trim())}
                className="w-full sm:w-auto"
              >
                <IconSearch className="size-4" />
                {loading ? "Suche..." : "Suchen"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
            <IconAlertTriangle className="size-5 shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* No results */}
      {searched && !loading && !error && result && result.changes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-2">
            <IconSearch className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-medium">
              Keine Einträge gefunden
            </p>
            <p className="text-xs text-muted-foreground">
              Für{" "}
              {[
                searchBatch && `Charge "${searchBatch}"`,
                searchSerial && `Serie "${searchSerial}"`,
              ]
                .filter(Boolean)
                .join(" / ")}{" "}
              wurden keine Buchungen gefunden.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && result.changes.length > 0 && (
        <div className="flex flex-col gap-6">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {result.summary.batchNumber && (
                  <span>
                    Charge{" "}
                    <span className="font-mono text-primary">
                      {result.summary.batchNumber}
                    </span>
                  </span>
                )}
                {result.summary.batchNumber && result.summary.serialNumber && (
                  <span className="mx-2 text-muted-foreground">&middot;</span>
                )}
                {result.summary.serialNumber && (
                  <span>
                    Serie{" "}
                    <span className="font-mono text-primary">
                      {result.summary.serialNumber}
                    </span>
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-4">
                {result.summary.materialName}
                {result.summary.materialNumber && (
                  <span className="ml-2 font-mono text-xs">
                    ({result.summary.materialNumber})
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Ersterfassung
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatDate(result.summary.firstSeen)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Letzte Bewegung
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatDate(result.summary.lastSeen)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Gesamt eingeh.
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    +{result.summary.totalIn}{" "}
                    <span className="font-normal text-muted-foreground">
                      {result.summary.materialUnit}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Aktueller Bestand
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {result.summary.currentQuantity}{" "}
                    <span className="font-normal text-muted-foreground">
                      {result.summary.materialUnit}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Stock Positions */}
          {result.currentStock.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Aktueller Bestand ({result.currentStock.length}{" "}
                  {result.currentStock.length === 1 ? "Standort" : "Standorte"})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y">
                  {result.currentStock.map((stock) => (
                    <div
                      key={stock.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <IconPackage className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {stock.locationName ?? "\u2014"}
                          </p>
                          {stock.expiryDate && (
                            <p className="text-xs text-muted-foreground">
                              Ablauf: {formatDate(stock.expiryDate)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">
                          {stock.quantity}{" "}
                          <span className="font-normal text-muted-foreground text-xs">
                            {result.summary.materialUnit}
                          </span>
                        </span>
                        <StockStatusBadge
                          quantity={stock.quantity}
                          expiryDate={stock.expiryDate}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Bewegungshistorie ({result.changes.length}{" "}
                {result.changes.length === 1 ? "Eintrag" : "Einträge"})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative pl-4">
                {/* Vertical line */}
                <span
                  className="absolute left-8 top-0 bottom-0 w-px bg-border"
                  aria-hidden="true"
                />

                <ol className="space-y-0">
                  {result.changes.map((change, idx) => (
                    <li key={change.id} className="relative flex gap-4 pb-8 last:pb-0">
                      {/* Icon */}
                      <div className="relative z-10 flex-shrink-0">
                        <ChangeTypeIcon changeType={change.changeType} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold leading-tight">
                              {changeTypeLabel(change.changeType)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDateTime(change.createdAt)}
                              {change.userName && (
                                <span className="ml-2">&middot; {change.userName}</span>
                              )}
                            </p>
                          </div>

                          {/* Quantity badge */}
                          <div className="flex items-center gap-2 mt-1 sm:mt-0">
                            <span
                              className={`text-sm font-bold ${
                                change.quantity > 0
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-orange-700 dark:text-orange-400"
                              }`}
                            >
                              {change.quantity > 0 ? "+" : ""}
                              {change.quantity}{" "}
                              <span className="font-normal text-muted-foreground text-xs">
                                {result.summary.materialUnit}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {change.locationName && (
                            <span className="flex items-center gap-1">
                              <IconPackage className="size-3" />
                              {change.locationName}
                            </span>
                          )}

                          {change.order && (
                            <span className="flex items-center gap-1">
                              <IconTruck className="size-3" />
                              Bestellung{" "}
                              {change.order.ownOrderNumber ??
                                change.order.orderNumber ??
                                change.order.id.slice(0, 8)}
                              {change.order.supplierName && (
                                <span className="ml-1">
                                  von {change.order.supplierName}
                                </span>
                              )}
                            </span>
                          )}

                          {change.commission && (
                            <span className="flex items-center gap-1">
                              <IconClipboardList className="size-3" />
                              Kommission{" "}
                              {change.commission.manualNumber ??
                                (change.commission.number
                                  ? `K-${String(change.commission.number).padStart(4, "0")}`
                                  : change.commission.name)}
                              <Badge
                                variant="outline"
                                className="ml-1 h-4 px-1 py-0 text-[10px]"
                              >
                                {commissionStatusLabel(change.commission.status)}
                              </Badge>
                            </span>
                          )}

                          {change.notes && (
                            <span className="italic">{change.notes}</span>
                          )}

                          {change.previousQuantity != null &&
                            change.newQuantity != null && (
                              <span>
                                Bestand: {change.previousQuantity} &rarr;{" "}
                                {change.newQuantity}{" "}
                                {result.summary.materialUnit}
                              </span>
                            )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
