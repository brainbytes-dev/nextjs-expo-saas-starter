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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
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
  IconClock,
  IconTrash,
  IconAlertTriangle,
  IconCheck,
  IconDeviceFloppy,
} from "@tabler/icons-react"

// ── Types ──────────────────────────────────────────────────────────────────

interface RetentionConfig {
  stockChangesMonths: number
  toolBookingsMonths: number
  auditLogMonths: number
  commentsMonths: number
  autoCleanup: boolean
}

const DEFAULT_CONFIG: RetentionConfig = {
  stockChangesMonths: 0,
  toolBookingsMonths: 0,
  auditLogMonths: 0,
  commentsMonths: 0,
  autoCleanup: false,
}

const PERIOD_OPTIONS = [
  { value: "3", label: "3 Monate" },
  { value: "6", label: "6 Monate" },
  { value: "12", label: "12 Monate" },
  { value: "24", label: "24 Monate" },
  { value: "36", label: "36 Monate" },
  { value: "0", label: "Unbegrenzt" },
]

const ENTITIES = [
  {
    key: "stockChangesMonths" as const,
    label: "Bestandsänderungen",
    description: "Einbuchungen, Ausbuchungen und Korrekturen",
  },
  {
    key: "toolBookingsMonths" as const,
    label: "Werkzeugbuchungen",
    description: "Ausleihen, Rückgaben und Reservierungen",
  },
  {
    key: "auditLogMonths" as const,
    label: "Aktivitätsprotokoll",
    description: "Änderungsverlauf und Benutzeraktionen",
  },
  {
    key: "commentsMonths" as const,
    label: "Kommentare",
    description: "Kommentare an Materialien, Werkzeugen und Aufträgen",
  },
]

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DataRetentionPage() {
  const [config, setConfig] = useState<RetentionConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/data-retention")
      if (!res.ok) throw new Error("Fehler")
      const data = await res.json()
      setConfig({ ...DEFAULT_CONFIG, ...data })
    } catch {
      setError("Einstellungen konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const updateField = <K extends keyof RetentionConfig>(
    key: K,
    value: RetentionConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const saveConfig = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/settings/data-retention", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Fehler")
      }
      setSuccess("Einstellungen wurden gespeichert.")
      setDirty(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Einstellungen konnten nicht gespeichert werden."
      )
    } finally {
      setSaving(false)
    }
  }

  const runCleanup = async () => {
    setCleaning(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch("/api/settings/data-retention", {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Fehler")
      }
      const data = await res.json()
      setSuccess(
        `Bereinigung abgeschlossen. ${data.deleted} Einträge wurden gelöscht.`
      )
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bereinigung fehlgeschlagen."
      )
    } finally {
      setCleaning(false)
    }
  }

  // Count configured policies
  const activePolicies = ENTITIES.filter(
    (e) => config[e.key] > 0
  ).length

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Datenhaltung</h1>
        <p className="mt-2 text-muted-foreground">
          Aufbewahrungsfristen für historische Daten konfigurieren.
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

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Retention settings per entity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconClock className="size-5" />
                Aufbewahrungsfristen
              </CardTitle>
              <CardDescription>
                Legen Sie fest, wie lange historische Daten aufbewahrt werden
                sollen. Ältere Einträge werden bei der Bereinigung automatisch
                gelöscht.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ENTITIES.map((entity, i) => (
                <div key={entity.key}>
                  {i > 0 && <Separator className="mb-6" />}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">
                        {entity.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {entity.description}
                      </p>
                    </div>
                    <Select
                      value={String(config[entity.key])}
                      onValueChange={(val) =>
                        updateField(entity.key, Number(val))
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {config[entity.key] > 0 && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Einträge älter als {config[entity.key]} Monate werden bei
                      der Bereinigung gelöscht.
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Auto-cleanup toggle */}
          <Card>
            <CardHeader>
              <CardTitle>Automatische Bereinigung</CardTitle>
              <CardDescription>
                Wenn aktiviert, werden alte Daten automatisch gemäss den
                konfigurierten Fristen bereinigt.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Auto-Bereinigung</p>
                  <p className="text-xs text-muted-foreground">
                    Alte Daten werden täglich automatisch gelöscht.
                  </p>
                </div>
                <Switch
                  checked={config.autoCleanup}
                  onCheckedChange={(checked) =>
                    updateField("autoCleanup", checked)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button onClick={saveConfig} disabled={saving || !dirty}>
              <IconDeviceFloppy className="mr-1.5 size-4" />
              {saving ? "Wird gespeichert…" : "Einstellungen speichern"}
            </Button>

            {activePolicies > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={cleaning}
                    className="text-destructive hover:text-destructive"
                  >
                    <IconTrash className="mr-1.5 size-4" />
                    {cleaning
                      ? "Bereinigung läuft…"
                      : "Bereinigung jetzt starten"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Bereinigung jetzt starten?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Alle Daten, die älter als die konfigurierten Fristen sind,
                      werden unwiderruflich gelöscht. Betroffen sind{" "}
                      {activePolicies} Datenkategorie(n). Diese Aktion kann
                      nicht rückgängig gemacht werden.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={runCleanup}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Bereinigung starten
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Info */}
          {activePolicies === 0 && (
            <p className="text-sm text-muted-foreground">
              Derzeit sind keine Aufbewahrungsfristen konfiguriert — alle Daten
              werden unbegrenzt aufbewahrt.
            </p>
          )}
        </>
      )}
    </div>
  )
}
