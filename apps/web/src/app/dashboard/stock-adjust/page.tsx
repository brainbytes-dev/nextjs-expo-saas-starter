"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  IconAdjustments,
  IconRefresh,
  IconCheck,
  IconAlertTriangle,
  IconArrowLeft,
  IconLoader2,
  IconSettings,
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ── Types ──────────────────────────────────────────────────────────────────

interface AutoAdjustRow {
  id: string
  materialId: string
  materialName: string
  materialNumber: string | null
  unit: string | null
  enabled: boolean
  lookbackDays: number | null
  safetyFactor: number | null
  lastCalculatedAt: string | null
  calculatedMin: number | null
  calculatedMax: number | null
  calculatedReorderPoint: number | null
  currentMinStock: number | null
  currentMaxStock: number | null
  currentStock: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Nie"
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "Gerade eben"
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`
  if (diff < 86400 * 7)
    return `vor ${Math.floor(diff / 86400)} Tag${Math.floor(diff / 86400) !== 1 ? "en" : ""}`
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function getDeltaPercent(current: number | null, calculated: number | null): number {
  if (current == null || calculated == null || current === 0) return calculated ? 100 : 0
  return Math.round(Math.abs(calculated - current) / current * 100)
}

function DeltaBadge({ current, calculated }: { current: number | null; calculated: number | null }) {
  const delta = getDeltaPercent(current, calculated)
  if (calculated == null) return <span className="text-xs text-muted-foreground">--</span>

  let className = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border "
  if (delta < 10) {
    className += "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
  } else if (delta < 30) {
    className += "bg-amber-500/10 text-amber-700 border-amber-500/30"
  } else {
    className += "bg-destructive/10 text-destructive border-destructive/30"
  }

  return (
    <span className={className}>
      {delta === 0 ? "=" : `${delta > 0 ? "+" : ""}${delta}%`}
    </span>
  )
}

// ── Skeleton loading rows ─────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-10" /></TableCell>
      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
    </TableRow>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function StockAutoAdjustPage() {
  const [rows, setRows] = useState<AutoAdjustRow[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [applyingAll, setApplyingAll] = useState(false)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Config dialog state
  const [configOpen, setConfigOpen] = useState(false)
  const [configLookback, setConfigLookback] = useState("90")
  const [configSafety, setConfigSafety] = useState("1.5")

  // ── Fetch data ──────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/stock-auto-adjust")
      const json = await res.json()
      setRows(json.data ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // ── Actions ─────────────────────────────────────────────────────────

  const handleRecalculateAll = useCallback(async () => {
    setCalculating(true)
    try {
      await fetch("/api/stock-auto-adjust", { method: "PUT" })
      await fetchData()
    } finally {
      setCalculating(false)
    }
  }, [fetchData])

  const handleToggle = useCallback(
    async (row: AutoAdjustRow) => {
      setTogglingId(row.id)
      try {
        await fetch("/api/stock-auto-adjust", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId: row.materialId,
            enabled: !row.enabled,
          }),
        })
        await fetchData()
      } finally {
        setTogglingId(null)
      }
    },
    [fetchData]
  )

  const handleApplySingle = useCallback(
    async (row: AutoAdjustRow) => {
      setApplyingId(row.id)
      try {
        await fetch("/api/stock-auto-adjust/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId: row.materialId,
            applyImmediately: true,
          }),
        })
        await fetchData()
      } finally {
        setApplyingId(null)
      }
    },
    [fetchData]
  )

  const handleApplyAll = useCallback(async () => {
    setApplyingAll(true)
    try {
      const enabledRows = rows.filter(
        (r) => r.enabled && r.calculatedMin != null
      )
      await Promise.all(
        enabledRows.map((r) =>
          fetch("/api/stock-auto-adjust/calculate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              materialId: r.materialId,
              applyImmediately: true,
            }),
          })
        )
      )
      await fetchData()
    } finally {
      setApplyingAll(false)
    }
  }, [rows, fetchData])

  const handleSaveConfig = useCallback(async () => {
    const lookbackDays = Math.max(7, Math.min(365, parseInt(configLookback) || 90))
    const safetyFactor = Math.max(100, Math.min(500, Math.round(parseFloat(configSafety) * 100) || 150))

    // Update all enabled settings with the new config
    const enabledRows = rows.filter((r) => r.enabled)
    await Promise.all(
      enabledRows.map((r) =>
        fetch("/api/stock-auto-adjust", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId: r.materialId,
            lookbackDays,
            safetyFactor,
          }),
        })
      )
    )
    setConfigOpen(false)
    await fetchData()
  }, [rows, configLookback, configSafety, fetchData])

  // ── Derived stats ───────────────────────────────────────────────────

  const enabledCount = rows.filter((r) => r.enabled).length
  const lastCalcTime = rows
    .filter((r) => r.lastCalculatedAt)
    .sort((a, b) =>
      new Date(b.lastCalculatedAt!).getTime() -
      new Date(a.lastCalculatedAt!).getTime()
    )[0]?.lastCalculatedAt ?? null

  const recommendedCount = rows.filter((r) => {
    if (r.calculatedMin == null) return false
    const deltaMin = getDeltaPercent(r.currentMinStock, r.calculatedMin)
    const deltaMax = getDeltaPercent(r.currentMaxStock, r.calculatedMax)
    return deltaMin > 10 || deltaMax > 10
  }).length

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-4 lg:px-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="gap-1.5 -ml-2 h-7 text-muted-foreground"
            >
              <Link href="/dashboard">
                <IconArrowLeft className="size-3.5" />
                Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconAdjustments className="size-6 text-primary" />
            Min/Max Auto-Adjust
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Automatische Berechnung optimaler Mindest- und Maximalbestande basierend auf Verbrauchsdaten
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <IconSettings className="size-3.5" />
                Konfiguration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Auto-Adjust Konfiguration</DialogTitle>
                <DialogDescription>
                  Einstellungen fur die automatische Berechnung. Gilt fur alle
                  aktivierten Materialien.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Betrachtungszeitraum (Tage)
                  </label>
                  <Input
                    type="number"
                    min={7}
                    max={365}
                    value={configLookback}
                    onChange={(e) => setConfigLookback(e.target.value)}
                    placeholder="90"
                  />
                  <p className="text-xs text-muted-foreground">
                    Anzahl Tage fur die Verbrauchsanalyse (7-365)
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Sicherheitsfaktor
                  </label>
                  <Input
                    type="number"
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    value={configSafety}
                    onChange={(e) => setConfigSafety(e.target.value)}
                    placeholder="1.5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Multiplikator fur den Sicherheitsbestand (1.0 = kein Puffer, 2.0 = doppelter Puffer)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfigOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleSaveConfig}>Speichern</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculateAll}
            disabled={calculating}
            className="gap-1.5"
          >
            {calculating ? (
              <IconLoader2 className="size-3.5 animate-spin" />
            ) : (
              <IconRefresh className="size-3.5" />
            )}
            Jetzt berechnen
          </Button>
          <Button
            size="sm"
            onClick={handleApplyAll}
            disabled={applyingAll || rows.filter((r) => r.enabled && r.calculatedMin != null).length === 0}
            className="gap-1.5"
          >
            {applyingAll ? (
              <IconLoader2 className="size-3.5 animate-spin" />
            ) : (
              <IconCheck className="size-3.5" />
            )}
            Alle ubernehmen
          </Button>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <IconAdjustments className="size-4.5 text-primary" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-8 mb-1" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums">
                    {enabledCount}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Auto-Adjust aktiv
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <IconRefresh className="size-4.5 text-muted-foreground" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-20 mb-1" />
                ) : (
                  <p className="text-lg font-semibold tabular-nums">
                    {formatRelativeTime(lastCalcTime)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Letzte Berechnung
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                <IconAlertTriangle className="size-4.5 text-amber-600" />
              </div>
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-8 mb-1" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-amber-600">
                    {recommendedCount}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Anpassungen empfohlen
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Materialien</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Material</TableHead>
                    <TableHead className="text-center">Einheit</TableHead>
                    <TableHead className="text-right">Akt. Min</TableHead>
                    <TableHead className="text-right">Akt. Max</TableHead>
                    <TableHead className="text-right">Empf. Min</TableHead>
                    <TableHead className="text-right">Empf. Max</TableHead>
                    <TableHead className="text-center">Delta</TableHead>
                    <TableHead className="text-center">Auto</TableHead>
                    <TableHead className="text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <>
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                      <SkeletonRow />
                    </>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <IconAdjustments className="size-8 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            Keine Auto-Adjust Einstellungen vorhanden
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Aktiviere Auto-Adjust fur Materialien uber die
                            Materialdetailseite.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium leading-tight">
                                {row.materialName}
                              </p>
                              {row.materialNumber && (
                                <p className="text-xs text-muted-foreground">
                                  {row.materialNumber}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {row.unit ?? "--"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {row.currentMinStock ?? "--"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {row.currentMaxStock ?? "--"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-medium">
                            {row.calculatedMin ?? "--"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-medium">
                            {row.calculatedMax ?? "--"}
                          </TableCell>
                          <TableCell className="text-center">
                            <DeltaBadge
                              current={row.currentMinStock}
                              calculated={row.calculatedMin}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={row.enabled}
                              disabled={togglingId === row.id}
                              onCheckedChange={() => handleToggle(row)}
                              aria-label={`Auto-Adjust fur ${row.materialName} ${row.enabled ? "deaktivieren" : "aktivieren"}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 text-xs"
                              disabled={
                                row.calculatedMin == null ||
                                applyingId === row.id
                              }
                              onClick={() => handleApplySingle(row)}
                            >
                              {applyingId === row.id ? (
                                <IconLoader2 className="size-3 animate-spin" />
                              ) : (
                                <IconCheck className="size-3" />
                              )}
                              Ubernehmen
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Info note ──────────────────────────────────────────────── */}
      {!loading && rows.length > 0 && (
        <section className="px-4 lg:px-6">
          <Card className="bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Berechnungsmethode</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-foreground/70">Mindestbestand:</span>{" "}
                Durchschn. Tagesverbrauch x Lieferzeit x Sicherheitsfaktor
              </p>
              <p>
                <span className="font-medium text-foreground/70">Maximalbestand:</span>{" "}
                Mindestbestand x 2
              </p>
              <p>
                <span className="font-medium text-foreground/70">Bestellpunkt:</span>{" "}
                Mindestbestand + (Durchschn. Tagesverbrauch x Lieferzeit)
              </p>
              <p className="pt-1">
                Die Lieferzeit wird automatisch aus den Lieferantenpreisen ubernommen (Fallback: 7 Tage).
                Der Verbrauch basiert auf Entnahmen (Typ &quot;out&quot;) im konfigurierten Betrachtungszeitraum.
              </p>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
