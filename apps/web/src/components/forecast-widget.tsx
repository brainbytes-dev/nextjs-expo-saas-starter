"use client"

/**
 * ForecastWidget
 * Dashboard widget: Top-5 materials approaching stockout.
 * Used on the main dashboard page.
 */

import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import {
  IconLoader2,
  IconAlertTriangle,
  IconShoppingCart,
  IconArrowRight,
  IconCheck,
} from "@tabler/icons-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ForecastEntry {
  materialId: string
  materialName: string
  unit: string
  currentStock: number
  daysUntilStockout: number
  reorderQuantity: number
  confidence: number
  status: "critical" | "warning" | "ok" | "no-data"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowStatus(days: number, consumption: number): ForecastEntry["status"] {
  if (consumption === 0) return "no-data"
  if (days <= 7) return "critical"
  if (days <= 30) return "warning"
  return "ok"
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ForecastWidget() {
  const [entries, setEntries] = useState<ForecastEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [orderingId, setOrderingId] = useState<string | null>(null)
  const [orderedIds, setOrderedIds] = useState<Set<string>>(new Set())
  const isMounted = useRef(false)

  const orgId =
    typeof window !== "undefined" ? (localStorage.getItem("organizationId") ?? undefined) : undefined
  const authHeaders: Record<string, string> = {}
  if (orgId) authHeaders["x-organization-id"] = orgId

  useEffect(() => {
    isMounted.current = true

    async function load() {
      setLoading(true)
      try {
        // Fetch up to 50 materials and their forecasts, then take the 5 most critical
        const matRes = await fetch("/api/materials?limit=50&page=1", { headers: authHeaders })
        if (!matRes.ok) return

        const matJson = await matRes.json()
        const mats: Array<{ id: string; name: string; unit: string }> = (
          Array.isArray(matJson) ? matJson : matJson.data ?? []
        ).map((m: Record<string, unknown>) => ({
          id: m.id as string,
          name: m.name as string,
          unit: (m.unit as string | null) ?? "Stk",
        }))

        // Fan-out forecast requests concurrently
        const settled = await Promise.allSettled(
          mats.map((mat) =>
            fetch(`/api/materials/${mat.id}/forecast?days=30&leadTime=7`, {
              headers: authHeaders,
            }).then((r) => (r.ok ? r.json() : null))
          )
        )

        const results: ForecastEntry[] = []
        for (let i = 0; i < mats.length; i++) {
          const mat = mats[i]!
          const res = settled[i]
          if (res?.status !== "fulfilled" || !res.value) continue

          const f = res.value
          const days: number = f.reorder?.daysUntilStockout ?? Infinity
          const consumption: number = f.avgDailyConsumption ?? 0
          const status = rowStatus(days, consumption)

          if (status === "no-data" || status === "ok") continue

          results.push({
            materialId: mat.id,
            materialName: mat.name,
            unit: mat.unit,
            currentStock: f.currentStock ?? 0,
            daysUntilStockout: days,
            reorderQuantity: f.reorder?.reorderQuantity ?? 0,
            confidence: f.reorder?.confidence ?? 0,
            status,
          })
        }

        // Sort by days ascending, take top 5
        results.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
        if (isMounted.current) setEntries(results.slice(0, 5))
      } catch {
        // fail silently — widget is non-critical
      } finally {
        if (isMounted.current) setLoading(false)
      }
    }

    void load()
    return () => { isMounted.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleQuickOrder = async (entry: ForecastEntry) => {
    setOrderingId(entry.materialId)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
      await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          orderNumber: `PROG-${today}-${rand}`,
          status: "draft",
          orderDate: today,
          currency: "CHF",
          notes: `Prognose-Nachbestellung: ${entry.materialName} (${entry.daysUntilStockout} Tage bis Nullbestand)`,
          items: [{ materialId: entry.materialId, quantity: entry.reorderQuantity }],
        }),
      })
      setOrderedIds((prev) => new Set(prev).add(entry.materialId))
    } finally {
      setOrderingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Nachbestellvorschläge</CardTitle>
          <CardDescription>Materialien mit baldiger Erschöpfung</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-2 w-28" />
                </div>
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Nachbestellvorschläge</CardTitle>
          <CardDescription>Top 5 Materialien mit dem nächsten Bestandsende</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard/forecasting">
            Alle anzeigen
            <IconArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {entries.map((entry) => {
            const isCritical = entry.status === "critical"
            const isOrdering = orderingId === entry.materialId
            const isOrdered = orderedIds.has(entry.materialId)

            return (
              <div
                key={entry.materialId}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                {/* Status indicator */}
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                    isCritical ? "bg-destructive/10" : "bg-yellow-500/10"
                  }`}
                >
                  <IconAlertTriangle
                    className={`size-4 ${
                      isCritical ? "text-destructive" : "text-yellow-600"
                    }`}
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/materials/${entry.materialId}?tab=prognose`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {entry.materialName}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress
                      value={Math.min(100, entry.confidence * 100)}
                      className="h-1 w-16"
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {entry.daysUntilStockout === Infinity ? "—" : (
                        <Badge
                          variant={isCritical ? "destructive" : "outline"}
                          className={`text-[10px] px-1.5 py-0 ${
                            !isCritical
                              ? "border-yellow-400/40 text-yellow-700 dark:text-yellow-400"
                              : ""
                          }`}
                        >
                          {entry.daysUntilStockout}d
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Bestand: {entry.currentStock} {entry.unit}
                    </span>
                  </div>
                </div>

                {/* Quick order */}
                <Button
                  variant={isCritical ? "destructive" : "outline"}
                  size="sm"
                  className="h-7 gap-1 text-xs shrink-0"
                  disabled={isOrdering || isOrdered}
                  onClick={() => handleQuickOrder(entry)}
                >
                  {isOrdered ? (
                    <>
                      <IconCheck className="size-3" />
                      Erstellt
                    </>
                  ) : isOrdering ? (
                    <IconLoader2 className="size-3 animate-spin" />
                  ) : (
                    <>
                      <IconShoppingCart className="size-3" />
                      {entry.reorderQuantity} {entry.unit}
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
