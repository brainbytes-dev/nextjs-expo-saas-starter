"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  IconBoxSeam,
  IconTool,
  IconArrowRight,
  IconArrowUp,
  IconArrowDown,
  IconRepeat,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ActivityItem } from "@/app/api/dashboard/activity/route"

function formatRelativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "Gerade eben"
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`
  if (diff < 86400 * 7) {
    const d = Math.floor(diff / 86400)
    return `vor ${d} Tag${d !== 1 ? "en" : ""}`
  }
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function buildDescription(item: ActivityItem): string {
  const who = item.userName ?? "Unbekannt"
  const where = item.locationName ? ` (${item.locationName})` : ""
  if (item.source === "stock" && item.quantity !== null) {
    const sign = item.quantity > 0 ? `+${item.quantity}` : `${item.quantity}`
    return `${who} — ${sign}× ${item.itemName}${where}`
  }
  return `${who} — ${item.itemName}${where}`
}

function SourceIcon({ source }: { source: ActivityItem["source"] }) {
  if (source === "tool") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary/10">
        <IconTool className="size-4 text-secondary" />
      </div>
    )
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
      <IconBoxSeam className="size-4 text-primary" />
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  if (action === "Rückgabe" || action === "Wareneingang") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
        <IconArrowUp className="size-3" />{action}
      </span>
    )
  }
  if (action === "Entnahme" || action === "Ausbuchung") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600">
        <IconArrowDown className="size-3" />{action}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground">
      <IconRepeat className="size-3" />{action}
    </span>
  )
}

export function ActivityWidget() {
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const run = async () => {
      try {
        const r = await fetch("/api/dashboard/activity")
        const data = await r.json() as { data: ActivityItem[] }
        if (mounted.current) setActivity(data.data ?? [])
      } catch {
        if (mounted.current) setActivity([])
      } finally {
        if (mounted.current) setLoading(false)
      }
    }
    void run()
    return () => { mounted.current = false }
  }, [])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
        <div>
          <CardTitle>Letzte Aktivitäten</CardTitle>
          <CardDescription>Buchungen und Bestandsänderungen</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard/history/stock-changes">
            Alle anzeigen
            <IconArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="divide-y divide-border">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Noch keine Aktivitäten vorhanden.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {activity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <SourceIcon source={item.source} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium leading-tight">
                    {buildDescription(item)}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <ActionBadge action={item.action} />
                    {item.quantity !== null && (
                      <>
                        <span className="text-muted-foreground/50">·</span>
                        <span className={`text-xs tabular-nums font-medium ${item.quantity < 0 ? "text-destructive" : "text-emerald-600"}`}>
                          {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <time
                  dateTime={item.createdAt}
                  className="shrink-0 text-xs text-muted-foreground"
                  title={new Date(item.createdAt).toLocaleString("de-CH")}
                >
                  {formatRelativeTime(item.createdAt)}
                </time>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
