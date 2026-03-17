"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  IconRefresh,
  IconUnlink,
  IconCheck,
  IconLink,
  IconLoader2,
  IconAlertCircle,
} from "@tabler/icons-react"

type SyncResult = {
  synced: number
  total: number
  errors: string[]
}

export function VertecCard() {
  const [connected, setConnected] = useState(false)
  const [checking, setChecking] = useState(true)
  const [serverUrl, setServerUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Probe connection status on mount
  useEffect(() => {
    fetch("/api/integrations/vertec/sync", { method: "GET" })
      .then((r) => setConnected(r.ok))
      .catch(() => setConnected(false))
      .finally(() => setChecking(false))
  }, [])

  async function handleConnect() {
    setConnecting(true)
    setConnectError(null)
    try {
      const res = await fetch("/api/integrations/vertec/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverUrl, apiKey }),
      })
      if (res.ok) {
        setConnected(true)
      } else {
        const d = (await res.json()) as { error?: string }
        setConnectError(d.error ?? "Verbindung fehlgeschlagen")
      }
    } catch {
      setConnectError("Netzwerkfehler beim Verbinden")
    } finally {
      setConnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      const res = await fetch("/api/integrations/vertec/sync", { method: "POST" })
      const d = (await res.json()) as SyncResult & { error?: string }
      if (!res.ok || d.error) {
        setSyncError(d.error ?? "Synchronisation fehlgeschlagen")
      } else {
        setSyncResult(d)
      }
    } catch {
      setSyncError("Netzwerkfehler beim Synchronisieren")
    } finally {
      setSyncing(false)
    }
  }

  async function handleDisconnect() {
    await fetch("/api/integrations/vertec/disconnect", { method: "POST" })
    setConnected(false)
    setSyncResult(null)
    setSyncError(null)
  }

  return (
    <Card className="relative overflow-hidden border-border/60 transition-shadow hover:shadow-md">
      {/* Accent bar — Vertec brand red */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-[#E4312B]" />

      <CardHeader className="pb-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Vertec logo badge */}
            <div
              className="size-10 shrink-0 rounded-lg flex items-center justify-center text-white font-bold text-sm font-mono select-none"
              style={{ background: "#E4312B" }}
              aria-label="Vertec logo"
            >
              vt
            </div>
            <div>
              <CardTitle className="text-sm font-semibold leading-none">Vertec</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Projekt- &amp; Leistungserfassung
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
          Materialverbrauch direkt als Vertec-Aufwand buchen — automatisch auf Projekt und Phase.
        </p>

        {/* Feature list */}
        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
          {["Materialaufwand", "Projekt-Sync", "Leistungserfassung"].map((f) => (
            <div key={f} className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <IconCheck className="size-3 text-emerald-500 shrink-0" />
              {f}
            </div>
          ))}
        </div>

        {/* Connection form — shown when not connected */}
        {!connected && !checking && (
          <div className="space-y-3 pt-1 border-t border-border/50">
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs font-mono">Server-URL</Label>
              <Input
                placeholder="https://myfirm.vertec.cloud"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="text-xs h-8"
                autoComplete="url"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">API-Key</Label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="text-xs h-8"
                autoComplete="current-password"
              />
            </div>
            {connectError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 flex items-start gap-2">
                <IconAlertCircle className="size-3.5 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs font-mono text-destructive">{connectError}</p>
              </div>
            )}
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8 w-full"
              onClick={handleConnect}
              disabled={connecting || !serverUrl || !apiKey}
              aria-label="Mit Vertec verbinden"
            >
              {connecting ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                <IconLink className="size-3.5" />
              )}
              {connecting ? "Verbinde…" : "Verbinden"}
            </Button>
          </div>
        )}

        {/* Sync result feedback */}
        {syncResult && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex items-start gap-2">
            <IconCheck className="size-3.5 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
              {syncResult.synced} von {syncResult.total} Buchungen synchronisiert
              {syncResult.errors.length > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {" "}({syncResult.errors.length} Fehler)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Sync error feedback */}
        {syncError && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 flex items-start gap-2">
            <IconAlertCircle className="size-3.5 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs font-mono text-destructive">{syncError}</p>
          </div>
        )}

        {/* Actions — shown when connected */}
        {connected && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8"
              onClick={handleSync}
              disabled={syncing}
              aria-label="Lagerbewegungen jetzt mit Vertec synchronisieren"
            >
              {syncing ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                <IconRefresh className="size-3.5" />
              )}
              {syncing ? "Synchronisiert…" : "Buchungen sync"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-destructive"
              onClick={handleDisconnect}
              aria-label="Vertec-Verbindung trennen"
            >
              <IconUnlink className="size-3.5" />
              Trennen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
