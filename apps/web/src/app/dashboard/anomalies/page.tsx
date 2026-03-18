"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import {
  IconAlertTriangle,
  IconAlertCircle,
  IconInfoCircle,
  IconClock,
  IconArrowLeft,
  IconRefresh,
  IconCheck,
  IconX,
  IconFilter,
  IconShieldCheck,
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AnomalyEvent } from "@/lib/anomaly-detection"

// ── Types ──────────────────────────────────────────────────────────────────

type AnomalyStatus = "open" | "reviewed" | "false_alarm" | "confirmed"

interface AnomalyWithStatus extends AnomalyEvent {
  status: AnomalyStatus
}

// ── Helpers ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AnomalyEvent["type"], string> = {
  unusual_quantity: "Ungewöhnliche Menge",
  off_hours: "Ausserhalb Geschäftszeit",
  unusual_location: "Ungewöhnlicher Lagerort",
  consumption_spike: "Verbrauchsspitze",
  bulk_withdrawal: "Massenentnahme",
}

const SEVERITY_CONFIG = {
  high: {
    label: "Kritisch",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
    borderClass: "border-l-destructive",
    iconColor: "text-destructive",
    bgColor: "bg-destructive/10",
    Icon: IconAlertCircle,
  },
  medium: {
    label: "Mittel",
    badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    borderClass: "border-l-amber-500",
    iconColor: "text-amber-600",
    bgColor: "bg-amber-500/10",
    Icon: IconAlertTriangle,
  },
  low: {
    label: "Niedrig",
    badgeClass: "bg-blue-500/10 text-blue-700 border-blue-500/30",
    borderClass: "border-l-blue-400",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
    Icon: IconInfoCircle,
  },
}

const STATUS_CONFIG: Record<
  AnomalyStatus,
  { label: string; badgeClass: string }
> = {
  open: {
    label: "Offen",
    badgeClass: "bg-muted text-muted-foreground",
  },
  reviewed: {
    label: "Geprüft",
    badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  },
  false_alarm: {
    label: "Falschalarm",
    badgeClass: "bg-slate-100 text-slate-500",
  },
  confirmed: {
    label: "Bestätigt",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
  },
}

function formatRelativeTime(iso: string): string {
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

// ── Sub-components ─────────────────────────────────────────────────────────

function AnomalyCard({
  anomaly,
  onStatusChange,
}: {
  anomaly: AnomalyWithStatus
  onStatusChange: (id: string, status: AnomalyStatus) => void
}) {
  const cfg = SEVERITY_CONFIG[anomaly.severity]
  const statusCfg = STATUS_CONFIG[anomaly.status]
  const Icon = cfg.Icon

  return (
    <Card className={`border-l-4 ${cfg.borderClass} transition-shadow hover:shadow-md`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${cfg.bgColor}`}
          >
            <Icon className={`size-4.5 ${cfg.iconColor}`} />
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Header row */}
            <div className="flex flex-wrap items-start gap-2">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cfg.badgeClass}`}
              >
                {cfg.label}
              </span>
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {TYPE_LABELS[anomaly.type]}
              </span>
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${statusCfg.badgeClass}`}
              >
                {statusCfg.label}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm font-medium leading-snug">{anomaly.description}</p>

            {/* Meta: material, user, location, expected range */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {anomaly.materialName && (
                <span>
                  <span className="font-medium text-foreground/70">Material:</span>{" "}
                  {anomaly.materialName}
                </span>
              )}
              {anomaly.userName && (
                <span>
                  <span className="font-medium text-foreground/70">Nutzer:</span>{" "}
                  {anomaly.userName}
                </span>
              )}
              {anomaly.locationName && (
                <span>
                  <span className="font-medium text-foreground/70">Lagerort:</span>{" "}
                  {anomaly.locationName}
                </span>
              )}
              {anomaly.expectedRange && (
                <span>
                  <span className="font-medium text-foreground/70">Erwarteter Bereich:</span>{" "}
                  {anomaly.expectedRange.min}–{anomaly.expectedRange.max} Stk.
                </span>
              )}
              {anomaly.quantity !== undefined && (
                <span>
                  <span className="font-medium text-foreground/70">Tatsächliche Menge:</span>{" "}
                  <span className={anomaly.severity === "high" ? "text-destructive font-semibold" : ""}>
                    {anomaly.quantity} Stk.
                  </span>
                </span>
              )}
            </div>

            {/* Time */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconClock className="size-3" />
              <time dateTime={anomaly.detectedAt} title={new Date(anomaly.detectedAt).toLocaleString("de-CH")}>
                Erkannt {formatRelativeTime(anomaly.detectedAt)}
              </time>
            </div>
          </div>

          {/* Status action buttons */}
          <div className="flex shrink-0 flex-col gap-1.5 items-end">
            {anomaly.status === "open" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  onClick={() => onStatusChange(anomaly.id, "reviewed")}
                >
                  <IconCheck className="size-3" />
                  Geprüft
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => onStatusChange(anomaly.id, "false_alarm")}
                >
                  <IconX className="size-3" />
                  Falschalarm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => onStatusChange(anomaly.id, "confirmed")}
                >
                  <IconAlertCircle className="size-3" />
                  Bestätigen
                </Button>
              </>
            )}
            {anomaly.status !== "open" && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={() => onStatusChange(anomaly.id, "open")}
              >
                Zurücksetzen
              </Button>
            )}
            {anomaly.stockChangeId && (
              <Link
                href={`/dashboard/history/stock-changes`}
                className="text-xs text-primary hover:underline"
              >
                Details anzeigen
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<AnomalyWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filterSeverity, setFilterSeverity] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const isMounted = useRef(false)

  // Persist status changes in local state (in a real app, these would go to a DB table)
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, AnomalyStatus>
  >({})

  useEffect(() => {
    isMounted.current = true
    const run = async () => {
      setLoading(true)
      try {
        const r = await fetch("/api/anomalies")
        const data: { data: AnomalyEvent[] } = await r.json()
        if (isMounted.current) {
          setAnomalies(
            (data.data ?? []).map((a) => ({ ...a, status: "open" as AnomalyStatus }))
          )
        }
      } catch {
        if (isMounted.current) setAnomalies([])
      } finally {
        if (isMounted.current) setLoading(false)
      }
    }
    void run()
    return () => {
      isMounted.current = false
    }
  }, [refreshKey])

  const handleStatusChange = useCallback(
    (id: string, status: AnomalyStatus) => {
      setStatusOverrides((prev) => ({ ...prev, [id]: status }))
    },
    []
  )

  const handleMarkAllReviewed = useCallback(() => {
    const overrides: Record<string, AnomalyStatus> = {}
    for (const a of anomalies) {
      overrides[a.id] = "reviewed"
    }
    setStatusOverrides(overrides)
  }, [anomalies])

  // Merge status overrides
  const anomaliesWithStatus: AnomalyWithStatus[] = anomalies.map((a) => ({
    ...a,
    status: statusOverrides[a.id] ?? "open",
  }))

  // Apply filters
  const filtered = anomaliesWithStatus.filter((a) => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false
    if (filterType !== "all" && a.type !== filterType) return false
    if (filterStatus !== "all" && a.status !== filterStatus) return false
    return true
  })

  const highCount = anomaliesWithStatus.filter((a) => a.severity === "high").length
  const mediumCount = anomaliesWithStatus.filter((a) => a.severity === "medium").length
  const lowCount = anomaliesWithStatus.filter((a) => a.severity === "low").length
  const openCount = anomaliesWithStatus.filter((a) => a.status === "open").length

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 px-4 lg:px-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 h-7 text-muted-foreground">
              <Link href="/dashboard">
                <IconArrowLeft className="size-3.5" />
                Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconAlertTriangle className="size-6 text-amber-500" />
            Anomalieerkennung
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Statistische Analyse der Lagerbewegungen der letzten 7 Tage
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {openCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllReviewed}
              className="gap-1.5"
            >
              <IconShieldCheck className="size-3.5" />
              Alle als geprüft
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="gap-1.5"
          >
            <IconRefresh className="size-3.5" />
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* ── Summary KPI row ──────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="flex items-center gap-3 py-4">
              <IconAlertCircle className="size-5 text-destructive shrink-0" />
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-8 mb-1" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-destructive">{highCount}</p>
                )}
                <p className="text-xs text-muted-foreground">Kritisch</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="flex items-center gap-3 py-4">
              <IconAlertTriangle className="size-5 text-amber-600 shrink-0" />
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-8 mb-1" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-amber-600">{mediumCount}</p>
                )}
                <p className="text-xs text-muted-foreground">Mittel</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="flex items-center gap-3 py-4">
              <IconInfoCircle className="size-5 text-blue-500 shrink-0" />
              <div>
                {loading ? (
                  <Skeleton className="h-7 w-8 mb-1" />
                ) : (
                  <p className="text-2xl font-bold tabular-nums text-blue-600">{lowCount}</p>
                )}
                <p className="text-xs text-muted-foreground">Niedrig</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <IconFilter className="size-4 text-muted-foreground shrink-0" />
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Schweregrad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Schweregrade</SelectItem>
              <SelectItem value="high">Kritisch</SelectItem>
              <SelectItem value="medium">Mittel</SelectItem>
              <SelectItem value="low">Niedrig</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="unusual_quantity">Ungewöhnliche Menge</SelectItem>
              <SelectItem value="off_hours">Ausserhalb Geschäftszeit</SelectItem>
              <SelectItem value="unusual_location">Ungewöhnlicher Lagerort</SelectItem>
              <SelectItem value="consumption_spike">Verbrauchsspitze</SelectItem>
              <SelectItem value="bulk_withdrawal">Massenentnahme</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="reviewed">Geprüft</SelectItem>
              <SelectItem value="false_alarm">Falschalarm</SelectItem>
              <SelectItem value="confirmed">Bestätigt</SelectItem>
            </SelectContent>
          </Select>
          {(filterSeverity !== "all" || filterType !== "all" || filterStatus !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => {
                setFilterSeverity("all")
                setFilterType("all")
                setFilterStatus("all")
              }}
            >
              <IconX className="size-3" />
              Filter zurücksetzen
            </Button>
          )}
          {!loading && (
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} von {anomaliesWithStatus.length} Anomali{anomaliesWithStatus.length !== 1 ? "en" : "e"}
            </span>
          )}
        </div>
      </section>

      {/* ── Anomaly list ─────────────────────────────────────────────── */}
      <section className="px-4 lg:px-6 space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                <IconShieldCheck className="size-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {anomaliesWithStatus.length === 0
                    ? "Keine Anomalien erkannt"
                    : "Keine Anomalien für diesen Filter"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {anomaliesWithStatus.length === 0
                    ? "Die Lagerbewegungen der letzten 7 Tage sind unauffällig."
                    : "Versuche die Filter anzupassen."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filtered.map((anomaly) => (
            <AnomalyCard
              key={anomaly.id}
              anomaly={anomaly}
              onStatusChange={handleStatusChange}
            />
          ))
        )}
      </section>

      {/* ── Methodology note ────────────────────────────────────────── */}
      {!loading && (
        <section className="px-4 lg:px-6">
          <Card className="bg-muted/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Erkennungsmethodik</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>
                <span className="font-medium text-foreground/70">Z-Score:</span> Mengen die mehr als 2.5 Standardabweichungen vom Mittelwert abweichen werden als anomal markiert.
              </p>
              <p>
                <span className="font-medium text-foreground/70">Ausserhalb Geschäftszeit:</span> Buchungen vor 06:00, nach 22:00 oder am Wochenende.
              </p>
              <p>
                <span className="font-medium text-foreground/70">Verbrauchsspitze:</span> Tagesverbrauch grösser als das 3-fache des gleitenden Durchschnitts (letzte 7 Tage).
              </p>
              <p>
                <span className="font-medium text-foreground/70">Massenentnahme:</span> Einzeltransaktion grösser als das 5-fache des mittleren Einzelentnahme-Werts.
              </p>
              <p className="pt-1">
                Basiszeitraum für Statistiken: letzte 30 Tage. Diese Erkennung kann Fehlalarme enthalten.
              </p>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
