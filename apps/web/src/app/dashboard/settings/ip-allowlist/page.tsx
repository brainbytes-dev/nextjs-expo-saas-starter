"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  IconShieldLock,
  IconPlus,
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconNetwork,
} from "@tabler/icons-react"

// ── Main Page ──────────────────────────────────────────────────────────────

export default function IpAllowlistPage() {
  const [allowlist, setAllowlist] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIp, setCurrentIp] = useState<string | null>(null)
  const [newIp, setNewIp] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadAllowlist = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ip-allowlist")
      if (!res.ok) throw new Error("Fehler")
      const data = await res.json()
      setAllowlist(data.allowlist ?? [])
    } catch {
      setError("IP-Liste konnte nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Detect current IP via external service
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((data) => setCurrentIp(data.ip))
      .catch(() => setCurrentIp(null))
  }, [])

  useEffect(() => {
    loadAllowlist()
  }, [loadAllowlist])

  const addIp = async () => {
    const trimmed = newIp.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/admin/ip-allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Fehler")
      setAllowlist(data.allowlist)
      setNewIp("")
      setDialogOpen(false)
      setSuccess("IP-Adresse wurde hinzugefügt.")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "IP konnte nicht hinzugefügt werden.")
    } finally {
      setSaving(false)
    }
  }

  const removeIp = async (ip: string) => {
    setDeleting(ip)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/admin/ip-allowlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Fehler")
      setAllowlist(data.allowlist)
      setSuccess("IP-Adresse wurde entfernt.")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "IP konnte nicht entfernt werden.")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          IP-Zugriffsbeschränkung
        </h1>
        <p className="mt-2 text-muted-foreground">
          Zugriff auf die Organisation auf bestimmte IP-Adressen beschränken.
        </p>
      </div>

      {/* Warning */}
      <Alert variant="destructive">
        <IconAlertTriangle className="size-4" />
        <AlertTitle>Achtung</AlertTitle>
        <AlertDescription>
          Falsche Konfiguration kann Sie und Ihr Team aussperren! Stellen Sie
          sicher, dass Ihre aktuelle IP-Adresse in der Liste enthalten ist,
          bevor Sie die Beschränkung aktivieren.
        </AlertDescription>
      </Alert>

      {/* Current IP */}
      {currentIp && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-3">
          <IconNetwork className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Ihre aktuelle IP:
          </span>
          <code className="rounded bg-background px-2 py-0.5 text-sm font-mono font-medium">
            {currentIp}
          </code>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setNewIp(currentIp)
              setDialogOpen(true)
            }}
          >
            <IconPlus className="mr-1 size-4" />
            Diese IP hinzufügen
          </Button>
        </div>
      )}

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <IconAlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          <IconCheck className="size-4 shrink-0" />
          {success}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconShieldLock className="size-5" />
              Erlaubte IP-Adressen
            </CardTitle>
            <CardDescription className="mt-1.5">
              {loading
                ? "Wird geladen…"
                : allowlist.length === 0
                  ? "Keine Einschränkungen — alle IPs erlaubt"
                  : `${allowlist.length} IP-Adresse(n) konfiguriert`}
            </CardDescription>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <IconPlus className="mr-1.5 size-4" />
                IP hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>IP-Adresse hinzufügen</DialogTitle>
                <DialogDescription>
                  Geben Sie eine einzelne IPv4-Adresse oder einen CIDR-Bereich
                  ein (z.B. 192.168.1.0/24).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ip-input">IP-Adresse / CIDR</Label>
                  <Input
                    id="ip-input"
                    placeholder="z.B. 203.0.113.0/24"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addIp()
                      }
                    }}
                  />
                </div>
                {currentIp && (
                  <p className="text-xs text-muted-foreground">
                    Tipp: Ihre aktuelle IP ist{" "}
                    <button
                      type="button"
                      className="font-mono font-medium text-primary hover:underline"
                      onClick={() => setNewIp(currentIp)}
                    >
                      {currentIp}
                    </button>
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button onClick={addIp} disabled={saving || !newIp.trim()}>
                  {saving ? "Wird hinzugefügt…" : "Hinzufügen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : allowlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IconShieldLock className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Keine IP-Einschränkungen konfiguriert.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Alle IP-Adressen haben Zugriff.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP-Adresse / CIDR</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allowlist.map((ip) => (
                  <TableRow key={ip}>
                    <TableCell className="font-mono text-sm font-medium">
                      {ip}
                      {ip === currentIp && (
                        <Badge
                          variant="secondary"
                          className="ml-2"
                        >
                          Ihre IP
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ip.includes("/") ? "CIDR-Bereich" : "Einzelne IP"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeIp(ip)}
                        disabled={deleting === ip}
                      >
                        <IconTrash className="mr-1 size-4" />
                        {deleting === ip ? "…" : "Entfernen"}
                      </Button>
                    </TableCell>
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
