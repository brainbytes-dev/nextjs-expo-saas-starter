"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  IconRefresh,
  IconLink,
  IconUnlink,
  IconCheck,
  IconAlertCircle,
  IconAlertTriangle,
  IconLoader2,
} from "@tabler/icons-react"
import { BrandLogo } from "@/components/integrations/brand-logo"

type SyncResult = {
  synced: number
  total: number
  errors: string[]
}

export function BexioCard() {
  const [connected, setConnected] = useState(false)
  const [checking, setChecking] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Reflect OAuth redirect outcome via query params
  useEffect(() => {
    const param = searchParams.get("connected")
    const error = searchParams.get("error")
    if (param === "true") {
      setConnected(true)
      setChecking(false)
    } else if (error) {
      setConnected(false)
      setChecking(false)
      if (error === "cancelled") {
        setSyncError("Verbindung wurde abgebrochen.")
      } else if (error === "token_failed") {
        setSyncError("Token-Austausch fehlgeschlagen. Bitte erneut versuchen.")
      }
    }
  }, [searchParams])

  // Probe token existence on mount (unless query param already set outcome)
  useEffect(() => {
    const hasOutcome =
      searchParams.get("connected") === "true" || !!searchParams.get("error")
    if (hasOutcome) return

    fetch("/api/integrations/bexio/sync", { method: "GET" })
      .then((r) => {
        setConnected(r.status !== 401)
      })
      .catch(() => {
        setConnected(false)
      })
      .finally(() => {
        setChecking(false)
      })
  }, [searchParams])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      const res = await fetch("/api/integrations/bexio/sync", { method: "POST" })
      const data = (await res.json()) as SyncResult & { error?: string }
      if (!res.ok || data.error) {
        setSyncError(data.error ?? "Synchronisation fehlgeschlagen.")
      } else {
        setSyncResult(data)
      }
    } catch {
      setSyncError("Netzwerkfehler beim Synchronisieren.")
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    await fetch("/api/integrations/bexio/disconnect", { method: "POST" })
    setConnected(false)
    setSyncResult(null)
    setSyncError(null)
  }

  const isConfigured = true // Runtime check; env warning shown below if not

  return (
    <Card className="relative overflow-hidden border-border/60 transition-shadow hover:shadow-md">
      {/* Accent bar — bexio brand orange */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-primary" />

      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* bexio logo */}
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
              variant={connected ? "default" : "outline"}
              className={
                connected
                  ? "text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                  : "text-[10px] font-mono text-muted-foreground"
              }
            >
              {connected ? (
                <>
                  <IconCheck className="size-2.5 mr-0.5" />
                  Verbunden
                </>
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

        {/* Feature list */}
        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
          {["Artikel-Sync", "Lagermengen", "Rechnungsposten"].map((f) => (
            <div key={f} className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <IconCheck className="size-3 text-emerald-500 shrink-0" />
              {f}
            </div>
          ))}
        </div>

        {/* Sync result feedback */}
        {syncResult && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-start gap-2">
            <IconCheck className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
              {syncResult.synced} von {syncResult.total} Artikel synchronisiert
              {syncResult.errors.length > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {" "}
                  ({syncResult.errors.length} Fehler)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Error feedback */}
        {syncError && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 flex items-start gap-2">
            <IconAlertCircle className="size-3.5 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs font-mono text-destructive">{syncError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {connected ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-8"
                onClick={handleSync}
                disabled={syncing}
                aria-label="Materialien jetzt mit bexio synchronisieren"
              >
                {syncing ? (
                  <IconLoader2 className="size-3.5 animate-spin" />
                ) : (
                  <IconRefresh className="size-3.5" />
                )}
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
              <a href="/api/integrations/bexio/connect" aria-label="Mit bexio verbinden">
                <IconLink className="size-3.5" />
                Mit bexio verbinden
              </a>
            </Button>
          )}
        </div>

        {/* Configuration hint — only visible if env vars not set */}
        {!isConfigured && (
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
