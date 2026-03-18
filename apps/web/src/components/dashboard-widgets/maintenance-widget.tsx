"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { IconTool, IconArrowRight, IconCheck } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface MaintenanceItem {
  id: string
  name: string
  number: string | null
  nextMaintenanceDate: string
  assignedUserName: string | null
  status: "overdue" | "this-week" | "upcoming"
  daysUntil: number
}

export function MaintenanceWidget() {
  const [items, setItems] = useState<MaintenanceItem[]>([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const run = async () => {
      try {
        const r = await fetch("/api/maintenance?days=7")
        const data = await r.json() as MaintenanceItem[]
        if (mounted.current) setItems(Array.isArray(data) ? data : [])
      } catch {
        if (mounted.current) setItems([])
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
          <CardTitle>Anstehende Wartungen</CardTitle>
          <CardDescription>Werkzeuge mit Wartungsfälligkeit in den nächsten 7 Tagen</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard/calendar">
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
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-28" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Keine anstehenden Wartungen in den nächsten 7 Tagen.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {items.slice(0, 5).map((item) => {
              const isOverdue  = item.status === "overdue"
              const isThisWeek = item.status === "this-week"
              return (
                <div key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl
                    ${isOverdue ? "bg-destructive/10" : isThisWeek ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                    <IconTool className={`size-4
                      ${isOverdue ? "text-destructive" : isThisWeek ? "text-amber-600" : "text-emerald-600"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isOverdue
                        ? `${Math.abs(item.daysUntil)} Tag${Math.abs(item.daysUntil) !== 1 ? "e" : ""} überfällig`
                        : `Fällig: ${new Date(item.nextMaintenanceDate + "T00:00:00").toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}`}
                      {item.assignedUserName && ` — ${item.assignedUserName}`}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/tools/${item.id}`}>
                      <IconCheck className="size-3.5 mr-1" />Wartung
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
