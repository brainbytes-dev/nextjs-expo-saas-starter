"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { IconAlertTriangle, IconAlertCircle, IconShieldCheck, IconArrowRight } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { AnomalyEvent } from "@/lib/anomaly-detection"

export function AnomaliesWidget() {
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const run = async () => {
      try {
        const r = await fetch("/api/anomalies")
        const data = await r.json() as { data: AnomalyEvent[] }
        if (mounted.current) setAnomalies(data.data ?? [])
      } catch {
        if (mounted.current) setAnomalies([])
      } finally {
        if (mounted.current) setLoading(false)
      }
    }
    void run()
    return () => { mounted.current = false }
  }, [])

  const highCount = anomalies.filter((a) => a.severity === "high").length

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <IconAlertTriangle className="size-5 text-amber-500" />
            Erkannte Anomalien
            {!loading && highCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                {highCount}
              </span>
            )}
          </CardTitle>
          <CardDescription>Ungewöhnliche Lagerbewegungen der letzten 7 Tage</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard/anomalies">
            Alle anzeigen <IconArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : anomalies.length === 0 ? (
          <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <IconShieldCheck className="size-4 text-emerald-600" />
            </div>
            Keine Anomalien erkannt — Lagerbewegungen sind unauffällig.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {anomalies.slice(0, 4).map((anomaly) => {
              const severityConfig = {
                high:   { bg: "bg-destructive/10", icon: "text-destructive", badge: "destructive" as const },
                medium: { bg: "bg-amber-500/10",   icon: "text-amber-600",   badge: "outline" as const },
                low:    { bg: "bg-blue-500/10",    icon: "text-blue-500",    badge: "outline" as const },
              }
              const cfg = severityConfig[anomaly.severity]
              return (
                <div key={anomaly.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                    <IconAlertCircle className={`size-4 ${cfg.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{anomaly.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {anomaly.materialName && `${anomaly.materialName} · `}
                      {anomaly.userName && `${anomaly.userName} · `}
                      {new Date(anomaly.detectedAt).toLocaleString("de-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge
                    variant={anomaly.severity === "high" ? "destructive" : "outline"}
                    className={`shrink-0 text-xs ${anomaly.severity === "medium" ? "border-amber-500 text-amber-700" : anomaly.severity === "low" ? "border-blue-400 text-blue-600" : ""}`}
                  >
                    {anomaly.severity === "high" ? "Kritisch" : anomaly.severity === "medium" ? "Mittel" : "Niedrig"}
                  </Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
