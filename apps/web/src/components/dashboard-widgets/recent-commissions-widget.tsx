"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { IconClipboardList, IconArrowRight } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Commission {
  id: string
  number: string
  status: string
  recipientName: string | null
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  draft:     "Entwurf",
  pending:   "Ausstehend",
  completed: "Abgeschlossen",
  cancelled: "Abgebrochen",
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft:     "secondary",
  pending:   "default",
  completed: "outline",
  cancelled: "destructive",
}

export function RecentCommissionsWidget() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const run = async () => {
      try {
        const r = await fetch("/api/commissions?limit=8")
        if (!r.ok) throw new Error("fetch failed")
        const data = await r.json() as { data: Commission[] } | Commission[]
        const rows = Array.isArray(data) ? data : (data.data ?? [])
        if (mounted.current) setCommissions(rows)
      } catch {
        if (mounted.current) setCommissions([])
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
          <CardTitle>Letzte Lieferscheine</CardTitle>
          <CardDescription>Zuletzt erstellte Lieferscheine</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard/commissions">
            Alle anzeigen <IconArrowRight className="size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : commissions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Noch keine Lieferscheine vorhanden.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {commissions.map((c) => (
              <Link key={c.id} href={`/dashboard/commissions/${c.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group hover:bg-muted/30 rounded transition-colors -mx-1 px-1">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <IconClipboardList className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.number}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.recipientName ?? "Kein Empfänger"} ·{" "}
                    {new Date(c.createdAt).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[c.status] ?? "outline"} className="shrink-0 text-xs">
                  {STATUS_LABELS[c.status] ?? c.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
