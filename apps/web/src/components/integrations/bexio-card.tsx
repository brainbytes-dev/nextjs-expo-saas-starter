"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  IconRefresh,
  IconLink,
  IconUnlink,
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconLoader2,
  IconArrowsLeftRight,
  IconArrowDown,
  IconArrowUp,
  IconClock,
} from "@tabler/icons-react"
import { BrandLogo } from "@/components/integrations/brand-logo"
import { useOrganization } from "@/hooks/use-organization"

// ─── Types ────────────────────────────────────────────────────────────────────

type SyncDirection = "import" | "export" | "both"

type SyncResult = {
  created: number
  updated: number
  skipped: number
  errors: string[]
  direction: SyncDirection
  durationMs: number
}

type ConnectionStatus = {
  connected: boolean
  lastSyncAt: string | null
  lastSyncResult: SyncResult | null
  syncDirection: SyncDirection
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "Noch nie"
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return "Gerade eben"
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  return `vor ${days} Tag${days !== 1 ? "en" : ""}`
}

const DIRECTION_OPTIONS: { value: SyncDirection; label: string; icon: React.ReactNode }[] = [
  { value: "import", label: "Import", icon: <IconArrowDown className="size-3" /> },
  { value: "export", label: "Export", icon: <IconArrowUp className="size-3" /> },
  { value: "both",   label: "Beides", icon: <IconArrowsLeftRight className="size-3" /> },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function BexioCard() {
  const { orgId } = useOrganization()

  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    lastSyncAt: null,
    lastSyncResult: null,
    syncDirection: "both",
  })
  const [checking, setChecking] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [direction, setDirection] = useState<SyncDirection>("both")
  const [updatingDirection, setUpdatingDirection] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()

  // Build headers with orgId for authenticated API calls
  const authHeaders = useCallback((): HeadersInit => {
    const h: HeadersInit = { "Content-Type": "application/json" }
    if (orgId) h["x-organization-id"] = orgId
    return h
  }, [orgId])

  const loadStatus = useCallback(async () => {
    if (!orgId) return
    setChecking(true)
    try {
      const res = await fetch("/api/integrations/bexio/sync", {
        method: "GET",
        headers: orgId ? { "x-organization-id": orgId } : {},
      })
      if (res.ok) {
        const data = (await res.json()) as ConnectionStatus
        setStatus(data)
        setDirection((data.syncDirection ?? "both") as SyncDirection)
        if (data.lastSyncResult) setSyncResult(data.lastSyncResult)
      } else {
        setStatus((prev) => ({ ...prev, connected: false }))
      }
    } catch {
      setStatus((prev) => ({ ...prev, connected: false }))
    } finally {
      setChecking(false)
    }
  }, [orgId])

  // Handle OAuth redirect outcome
  useEffect(() => {
    const connected = searchParams.get("connected")
    const error = searchParams.get("error")

    if (connected === "bexio") {
      router.replace("/dashboard/settings/integrations")
      void loadStatus()
    } else if (error) {
      setChecking(false)
      const messages: Record<string, string> = {
        cancelled: "Verbindung wurde abgebrochen.",
        token_failed: "Token-Austausch fehlgeschlagen. Bitte erneut versuchen.",
        db_error: "Datenbankfehler beim Speichern des Tokens.",
        invalid_state: "Ungültiger OAuth-State. Bitte erneut versuchen.",
      }
      setSyncError(messages[error] ?? `Verbindungsfehler: ${error}`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Load status when orgId becomes available
  useEffect(() => {
    if (!orgId) return
    const hasOutcome =
      searchParams.get("connected") === "bexio" || !!searchParams.get("error")
    if (!hasOutcome) void loadStatus()
  }, [orgId, loadStatus, searchParams])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      const res = await fetch("/api/integrations/bexio/sync", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ direction }),
      })
      const data = (await res.json()) as SyncResult & { error?: string }
      if (!res.ok || data.error) {
        setSyncError(data.error ?? "Synchronisation fehlgeschlagen.")
      } else {
        setSyncResult(data)
        setStatus((prev) => ({
          ...prev,
          lastSyncAt: new Date().toISOString(),
          lastSyncResult: data,
        }))
      }
    } catch {
      setSyncError("Netzwerkfehler beim Synchronisieren.")
    } finally {
      setSyncing(false)
    }
  }

  async function handleDirectionChange(newDir: SyncDirection) {
    setDirection(newDir)
    setUpdatingDirection(true)
    try {
      await fetch("/api/integrations/bexio/sync", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ direction: newDir }),
      })
    } catch {
      // Non-critical
    } finally {
      setUpdatingDirection(false)
    }
  }

  async function handleDisconnect() {
    await fetch("/api/integrations/bexio/disconnect", {
      method: "POST",
      headers: orgId ? { "x-organization-id": orgId } : {},
    })
    setStatus({ connected: false, lastSyncAt: null, lastSyncResult: null, syncDirection: "both" })
    setSyncResult(null)
    setSyncError(null)
  }

  // The connect link passes orgId as a query param so the server-side route
  // can identify the organization before redirecting to bexio OAuth.
  const connectHref = orgId
    ? `/api/integrations/bexio/connect?orgId=${encodeURIComponent(orgId)}`
    : "/api/integrations/bexio/connect"

  return (
    <Card className="relative overflow-hidden border-border/60 transition-shadow hover:shadow-md">
      <div className="absolute top-0 inset-x-0 h-[3px] bg-[#FF6900]" />

      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo name="bexio" fallbackColor="#FF6900" fallbackShort="bx" />
            <div>
              <CardTitle className="text-sm font-semibold leading-none">bexio</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Buchhaltung &amp; ERP für Schweizer KMU
              </CardDescription>
            </div>
          </div>

          {checking ? (
            <Badge variant="outline" className="text-[10px] font-mono gap-1">
              <IconLoader2 className="size-3 animate-spin" />
              Prüfe…
            </Badge>
          ) : (
            <Badge
              variant={status.connected ? "default" : "outline"}
              className={
                status.connected
                  ? "text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                  : "text-[10px] font-mono text-muted-foreground"
              }
            >
              {status.connected ? (
                <><IconCheck className="size-2.5 mr-0.5" />Verbunden</>
              ) : (
                "Nicht verbunden"
              )}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Materialien automatisch als bexio-Artikel synchronisieren. Lagerabbuchungen fliessen
          direkt in Offerten und Rechnungen.
        </p>

        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
          {["Artikel-Sync", "Lagermengen", "Rechnungsposten"].map((f) => (
            <div key={f} className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <IconCheck className="size-3 text-emerald-500 shrink-0" />
              {f}
            </div>
          ))}
        </div>

        {/* Sync direction toggle */}
        {status.connected && (
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Sync-Richtung
            </p>
            <div className="flex gap-1">
              {DIRECTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleDirectionChange(opt.value)}
                  disabled={updatingDirection}
                  className={[
                    "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border transition-colors",
                    direction === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/50",
                  ].join(" ")}
                  aria-pressed={direction === opt.value}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Last sync */}
        {status.connected && status.lastSyncAt && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <IconClock className="size-3 shrink-0" />
            Letzte Synchronisation: {formatRelativeTime(status.lastSyncAt)}
            {status.lastSyncResult && (
              <span className="text-muted-foreground/60">
                &nbsp;(+{status.lastSyncResult.created} neu,&nbsp;
                ~{status.lastSyncResult.updated} akt.)
              </span>
            )}
          </div>
        )}

        {/* Sync result */}
        {syncResult && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 space-y-0.5">
            <div className="flex items-center gap-2">
              <IconCheck className="size-3.5 text-emerald-500 shrink-0" />
              <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                +{syncResult.created} neu &nbsp;·&nbsp; ~{syncResult.updated} aktualisiert &nbsp;·&nbsp; {syncResult.skipped} übersprungen
              </p>
            </div>
            {syncResult.errors.length > 0 && (
              <p className="text-[10px] font-mono text-amber-600 dark:text-amber-400 pl-5">
                {syncResult.errors.length} Fehler — {syncResult.errors[0]}
                {syncResult.errors.length > 1 && ` (+${syncResult.errors.length - 1} weitere)`}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {syncError && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 flex items-start gap-2">
            <IconAlertCircle className="size-3.5 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs font-mono text-destructive">{syncError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {status.connected ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8"
                onClick={handleSync}
                disabled={syncing}
                aria-label="Materialien jetzt mit bexio synchronisieren"
              >
                {syncing
                  ? <IconLoader2 className="size-3.5 animate-spin" />
                  : <IconRefresh className="size-3.5" />}
                {syncing ? "Synchronisiert…" : "Jetzt synchronisieren"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-destructive"
                onClick={handleDisconnect}
                aria-label="bexio-Verbindung trennen"
              >
                <IconUnlink className="size-3.5" />
                Trennen
              </Button>
            </>
          ) : (
            <Button size="sm" className="gap-1.5 text-xs h-8" asChild>
              <a href={connectHref} aria-label="Mit bexio verbinden">
                <IconLink className="size-3.5" />
                Mit bexio verbinden
              </a>
            </Button>
          )}
        </div>

        {!process.env.NEXT_PUBLIC_BEXIO_CONFIGURED && !status.connected && (
          <div className="flex items-start gap-1.5 pt-1">
            <IconAlertTriangle className="size-3 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-[10px] font-mono text-muted-foreground/70">
              BEXIO_CLIENT_ID und BEXIO_CLIENT_SECRET in .env.local eintragen
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
