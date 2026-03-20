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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  IconDevices,
  IconLogout,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconBrandChrome,
  IconBrandFirefox,
  IconBrandSafari,
  IconBrandEdge,
  IconWorld,
  IconAlertTriangle,
  IconCheck,
} from "@tabler/icons-react"

// ── Types ──────────────────────────────────────────────────────────────────

interface SessionEntry {
  id: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

// ── User-Agent Parser ──────────────────────────────────────────────────────

function parseUserAgent(ua: string | null): { device: string; browser: string; icon: React.ReactNode } {
  if (!ua) return { device: "Unbekannt", browser: "Unbekannt", icon: <IconWorld className="size-4" /> }

  let browser = "Unbekannter Browser"
  let browserIcon: React.ReactNode = <IconWorld className="size-4" />

  if (ua.includes("Edg/") || ua.includes("Edge/")) {
    browser = "Microsoft Edge"
    browserIcon = <IconBrandEdge className="size-4" />
  } else if (ua.includes("Chrome/") && !ua.includes("Edg/")) {
    browser = "Google Chrome"
    browserIcon = <IconBrandChrome className="size-4" />
  } else if (ua.includes("Firefox/")) {
    browser = "Mozilla Firefox"
    browserIcon = <IconBrandFirefox className="size-4" />
  } else if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    browser = "Safari"
    browserIcon = <IconBrandSafari className="size-4" />
  }

  let device = "Desktop"
  let deviceIcon: React.ReactNode = <IconDeviceDesktop className="size-4 text-muted-foreground" />

  if (ua.includes("iPhone") || ua.includes("Android") || ua.includes("Mobile")) {
    device = "Mobilgerät"
    deviceIcon = <IconDeviceMobile className="size-4 text-muted-foreground" />
  }

  let os = ""
  if (ua.includes("Windows")) os = "Windows"
  else if (ua.includes("Mac OS") || ua.includes("Macintosh")) os = "macOS"
  else if (ua.includes("Linux")) os = "Linux"
  else if (ua.includes("Android")) os = "Android"
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS"

  const displayDevice = os ? `${device} (${os})` : device

  return {
    device: displayDevice,
    browser,
    icon: (
      <div className="flex items-center gap-1.5">
        {deviceIcon}
        {browserIcon}
      </div>
    ),
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr))
  } catch {
    return "—"
  }
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions")
      if (!res.ok) throw new Error("Fehler beim Laden")
      const data = await res.json()
      setSessions(data)
    } catch {
      setError("Sitzungen konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const revokeSession = async (id: string) => {
    setRevoking(id)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Fehler")
      }
      setSuccess("Sitzung wurde beendet.")
      setSessions((prev) => prev.filter((s) => s.id !== id))
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sitzung konnte nicht beendet werden.")
    } finally {
      setRevoking(null)
    }
  }

  const revokeAllOthers = async () => {
    setRevokingAll(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/sessions", { method: "DELETE" })
      if (!res.ok) throw new Error("Fehler")
      const data = await res.json()
      setSuccess(`${data.revoked} Sitzung(en) wurden beendet.`)
      setSessions((prev) => prev.filter((s) => s.isCurrent))
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError("Sitzungen konnten nicht beendet werden.")
    } finally {
      setRevokingAll(false)
    }
  }

  const otherCount = sessions.filter((s) => !s.isCurrent).length

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Aktive Sitzungen</h1>
        <p className="mt-2 text-muted-foreground">
          Alle angemeldeten Geräte und Browser verwalten.
        </p>
      </div>

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
              <IconDevices className="size-5" />
              Angemeldete Geräte
            </CardTitle>
            <CardDescription className="mt-1.5">
              {loading
                ? "Wird geladen…"
                : `${sessions.length} aktive Sitzung(en)`}
            </CardDescription>
          </div>
          {otherCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={revokingAll}>
                  <IconLogout className="mr-1.5 size-4" />
                  {revokingAll
                    ? "Wird beendet…"
                    : "Alle anderen Sitzungen beenden"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Alle anderen Sitzungen beenden?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {otherCount} andere Sitzung(en) werden sofort abgemeldet.
                    Nur Ihre aktuelle Sitzung bleibt aktiv.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={revokeAllOthers}>
                    Alle beenden
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine aktiven Sitzungen gefunden.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gerät / Browser</TableHead>
                  <TableHead>IP-Adresse</TableHead>
                  <TableHead>Angemeldet seit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions
                  .sort((a, b) => (a.isCurrent ? -1 : b.isCurrent ? 1 : 0))
                  .map((s) => {
                    const parsed = parseUserAgent(s.userAgent)
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {parsed.icon}
                            <div>
                              <p className="text-sm font-medium">
                                {parsed.browser}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {parsed.device}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {s.ipAddress || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(s.createdAt)}
                        </TableCell>
                        <TableCell>
                          {s.isCurrent ? (
                            <Badge
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Aktuelle Sitzung
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Aktiv</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.isCurrent ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeSession(s.id)}
                              disabled={revoking === s.id}
                            >
                              <IconLogout className="mr-1 size-4" />
                              {revoking === s.id ? "…" : "Abmelden"}
                            </Button>
                          )}
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
