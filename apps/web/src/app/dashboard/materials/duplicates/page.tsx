"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  IconArrowLeft,
  IconCopy,
  IconCheck,
  IconAlertTriangle,
  IconRefresh,
  IconPackage,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DuplicateItem {
  id: string
  number: string | null
  name: string
  barcode: string | null
  manufacturer: string | null
  groupName: string | null
  mainLocationName: string | null
  totalStock: number
  unit: string | null
}

interface DuplicateGroup {
  id: string
  reason: "exact_barcode" | "similar_name" | "same_manufacturer"
  similarityScore: number
  items: DuplicateItem[]
}

interface DuplicatesResponse {
  groups: DuplicateGroup[]
  total: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const reasonLabel: Record<DuplicateGroup["reason"], { label: string; className: string }> = {
  exact_barcode: {
    label: "Gleicher Barcode",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  similar_name: {
    label: "Ähnlicher Name",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  same_manufacturer: {
    label: "Gleicher Hersteller",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score))
  const color =
    pct >= 90 ? "bg-destructive" : pct >= 60 ? "bg-amber-500" : "bg-secondary"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DuplicatesPage() {
  const router = useRouter()

  const [groups, setGroups] = useState<DuplicateGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Merge dialog
  const [mergeTarget, setMergeTarget] = useState<DuplicateGroup | null>(null)
  const [keepId, setKeepId] = useState("")
  const [merging, setMerging] = useState(false)
  const [mergeSuccess, setMergeSuccess] = useState(false)

  // ── Fetch duplicates ─────────────────────────────────────────────────────
  const fetchDuplicates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/materials/duplicates")
      if (res.ok) {
        const json: DuplicatesResponse = await res.json()
        setGroups(json.groups ?? [])
      }
    } catch {
      // TODO: toast error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDuplicates()
  }, [fetchDuplicates])

  // Pre-select first item whenever merge dialog opens
  useEffect(() => {
    if (mergeTarget && mergeTarget.items.length > 0) {
      setKeepId(mergeTarget.items[0].id)
      setMergeSuccess(false)
    }
  }, [mergeTarget])

  // ── Actions ───────────────────────────────────────────────────────────────
  function dismissGroup(groupId: string) {
    setDismissedIds((prev) => new Set([...prev, groupId]))
  }

  async function handleMerge() {
    if (!mergeTarget || !keepId) return
    const mergeIds = mergeTarget.items
      .map((i) => i.id)
      .filter((id) => id !== keepId)

    setMerging(true)
    try {
      const res = await fetch("/api/materials/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepId, mergeIds }),
      })
      if (res.ok) {
        setMergeSuccess(true)
        // Remove the group from the list after a short delay
        setTimeout(() => {
          setGroups((prev) => prev.filter((g) => g.id !== mergeTarget.id))
          setMergeTarget(null)
        }, 1200)
      }
    } catch {
      // TODO: toast error
    } finally {
      setMerging(false)
    }
  }

  const visibleGroups = groups.filter((g) => !dismissedIds.has(g.id))

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/materials")}
            className="gap-1.5"
          >
            <IconArrowLeft className="size-4" />
            Zurück
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Duplikate prüfen
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading
                ? "Analysiere…"
                : `${visibleGroups.length} mögliche Duplikatgruppen gefunden`}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchDuplicates}
          disabled={loading}
          className="gap-1.5"
        >
          <IconRefresh className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Neu analysieren
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-28 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      ) : visibleGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <IconPackage className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Keine Duplikate gefunden</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Alle Materialien scheinen eindeutig zu sein.
          </p>
          <Button
            className="mt-6"
            variant="outline"
            onClick={() => router.push("/dashboard/materials")}
          >
            <IconArrowLeft className="size-4" />
            Zurück zur Übersicht
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleGroups.map((group) => {
            const cfg = reasonLabel[group.reason]
            return (
              <Card key={group.id} className="overflow-hidden">
                {/* Group header */}
                <div className="flex items-center justify-between border-b px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                      {cfg.label}
                    </Badge>
                    <ScoreBar score={group.similarityScore} />
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} Einträge
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setMergeTarget(group)}
                    >
                      <IconCopy className="size-3.5" />
                      Zusammenführen
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => dismissGroup(group.id)}
                    >
                      <IconCheck className="size-3.5" />
                      Kein Duplikat
                    </Button>
                  </div>
                </div>

                {/* Item comparison grid */}
                <div
                  className="grid divide-x"
                  style={{ gridTemplateColumns: `repeat(${group.items.length}, 1fr)` }}
                >
                  {group.items.map((item, idx) => (
                    <div key={item.id} className="p-4">
                      {idx === 0 && (
                        <Badge variant="secondary" className="mb-2 text-xs">
                          Primär
                        </Badge>
                      )}
                      <button
                        className="block text-left font-medium text-foreground hover:underline"
                        onClick={() =>
                          router.push(`/dashboard/materials/${item.id}`)
                        }
                      >
                        {item.name}
                      </button>
                      <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {item.number && (
                          <div className="flex gap-1.5">
                            <dt className="font-medium text-foreground/60">Nr.</dt>
                            <dd className="font-mono">{item.number}</dd>
                          </div>
                        )}
                        {item.barcode && (
                          <div className="flex gap-1.5">
                            <dt className="font-medium text-foreground/60">Barcode</dt>
                            <dd className="font-mono">{item.barcode}</dd>
                          </div>
                        )}
                        {item.manufacturer && (
                          <div className="flex gap-1.5">
                            <dt className="font-medium text-foreground/60">Hersteller</dt>
                            <dd>{item.manufacturer}</dd>
                          </div>
                        )}
                        <div className="flex gap-1.5">
                          <dt className="font-medium text-foreground/60">Bestand</dt>
                          <dd
                            className={
                              item.totalStock === 0 ? "text-muted-foreground/50" : ""
                            }
                          >
                            {item.totalStock} {item.unit ?? "Stk"}
                          </dd>
                        </div>
                        {item.groupName && (
                          <div className="flex gap-1.5">
                            <dt className="font-medium text-foreground/60">Gruppe</dt>
                            <dd>{item.groupName}</dd>
                          </div>
                        )}
                        {item.mainLocationName && (
                          <div className="flex gap-1.5">
                            <dt className="font-medium text-foreground/60">Standort</dt>
                            <dd>{item.mainLocationName}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Merge dialog ──────────────────────────────────────────────────────── */}
      <Dialog
        open={!!mergeTarget}
        onOpenChange={(open) => {
          if (!open && !merging) setMergeTarget(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Materialien zusammenführen</DialogTitle>
            <DialogDescription>
              Wählen Sie das Material, das beibehalten werden soll. Alle
              Bestände, Buchungen und Kommissionseinträge der anderen werden
              übertragen. Die Duplikate werden danach gelöscht.
            </DialogDescription>
          </DialogHeader>

          {mergeSuccess ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                <IconCheck className="size-6 text-secondary" />
              </div>
              <p className="text-sm font-medium">Zusammenführung erfolgreich</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Material behalten</label>
                <Select value={keepId} onValueChange={setKeepId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Material auswählen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {mergeTarget?.items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <span className="font-medium">{item.name}</span>
                        {item.number && (
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            #{item.number}
                          </span>
                        )}
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({item.totalStock} {item.unit ?? "Stk"})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {keepId && mergeTarget && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600">
                  <div className="flex gap-2">
                    <IconAlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <p>
                      {mergeTarget.items.length - 1} Material
                      {mergeTarget.items.length - 1 !== 1 ? "ien" : ""} werden
                      gelöscht und deren Daten in &laquo;
                      {mergeTarget.items.find((i) => i.id === keepId)?.name}
                      &raquo; überführt.
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setMergeTarget(null)}
                  disabled={merging}
                >
                  Abbrechen
                </Button>
                <Button onClick={handleMerge} disabled={!keepId || merging}>
                  {merging ? "Wird zusammengeführt…" : "Zusammenführen"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
