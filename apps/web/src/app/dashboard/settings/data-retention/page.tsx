"use client"

import { useTranslations } from "next-intl"

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

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DataRetentionPage() {
  const ts = useTranslations("settings")

  const PERIOD_OPTIONS = [
    { value: "3", label: ts("months3") },
    { value: "6", label: ts("months6") },
    { value: "12", label: ts("months12") },
    { value: "24", label: ts("months24") },
    { value: "36", label: ts("months36") },
    { value: "0", label: ts("unlimited") },
  ]

  const ENTITIES = [
    {
      key: "stockChangesMonths" as const,
      label: ts("stockChangesLabel"),
      description: ts("stockChangesDesc"),
    },
    {
      key: "toolBookingsMonths" as const,
      label: ts("toolBookingsLabel"),
      description: ts("toolBookingsDesc"),
    },
    {
      key: "auditLogMonths" as const,
      label: ts("auditLogLabel"),
      description: ts("auditLogDesc"),
    },
    {
      key: "commentsMonths" as const,
      label: ts("commentsLabel"),
      description: ts("commentsDesc"),
    },
  ]
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
      if (!res.ok) throw new Error("Error")
      const data = await res.json()
      setConfig({ ...DEFAULT_CONFIG, ...data })
    } catch {
      setError(ts("settingsLoadError"))
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
        throw new Error(data.error || "Error")
      }
      setSuccess(ts("settingsSaved"))
      setDirty(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : ts("settingsSaveError")
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
        throw new Error(data.error || "Error")
      }
      const data = await res.json()
      setSuccess(
        ts("cleanupComplete", { count: data.deleted })
      )
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : ts("cleanupFailed")
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
        <h1 className="text-3xl font-bold tracking-tight">{ts("dataRetentionTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          {ts("dataRetentionDesc")}
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
                {ts("retentionPeriodsDesc")}
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
                      {ts("entriesOlderThan", { count: config[entity.key] })}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Auto-cleanup toggle */}
          <Card>
            <CardHeader>
              <CardTitle>{ts("autoCleanup")}</CardTitle>
              <CardDescription>
                {ts("autoCleanupDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{ts("autoCleanupToggle")}</p>
                  <p className="text-xs text-muted-foreground">
                    {ts("autoCleanupToggleDesc")}
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
              {saving ? ts("savingSettings") : ts("saveSettings2")}
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
                      ? ts("cleanupRunning")
                      : ts("startCleanup")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Bereinigung jetzt starten?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {ts("cleanupConfirmDesc", { count: activePolicies })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{ts("cancelBtn")}</AlertDialogCancel>
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
              {ts("noRetentionConfigured")}
            </p>
          )}
        </>
      )}
    </div>
  )
}
