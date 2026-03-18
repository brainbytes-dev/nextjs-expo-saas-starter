"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { IconAlertTriangle, IconArrowRight } from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface ExpiringItem {
  stockId: string
  materialName: string
  materialNumber: string | null
  locationName: string | null
  expiryDate: string
  quantity: number
  unit: string | null
  batchNumber: string | null
  daysUntil: number
}

export function ExpiryWidget() {
  const [items, setItems] = useState<ExpiringItem[]>([])
  const [loading, setLoading] = useState(true)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const run = async () => {
      try {
        const r = await fetch("/api/materials/expiring?days=30")
        const data = await r.json() as { data: ExpiringItem[] }
        if (mounted.current) setItems(data.data ?? [])
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
          <CardTitle>Ablaufende Materialien</CardTitle>
          <CardDescription>Chargen mit Ablaufdatum in 30 Tagen (FEFO)</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard/materials">
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
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Keine ablaufenden Materialien in den nächsten 30 Tagen.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {items.slice(0, 8).map((item) => {
              const isExpired  = item.daysUntil < 0
              const isUrgent   = item.daysUntil >= 0 && item.daysUntil < 7
              const isWarning  = item.daysUntil >= 7 && item.daysUntil < 30
              return (
                <div key={item.stockId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl
                    ${isExpired || isUrgent ? "bg-destructive/10" : isWarning ? "bg-amber-500/10" : "bg-yellow-500/10"}`}>
                    <IconAlertTriangle className={`size-4
                      ${isExpired || isUrgent ? "text-destructive" : isWarning ? "text-amber-600" : "text-yellow-600"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.materialName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.locationName ?? "Kein Lagerort"}
                      {item.batchNumber ? ` · Charge: ${item.batchNumber}` : ""}
                      {" · "}{item.quantity} {item.unit ?? "Stk."}
                    </p>
                  </div>
                  <Badge
                    variant={isExpired || isUrgent ? "destructive" : "outline"}
                    className={`shrink-0 text-xs tabular-nums ${isWarning ? "border-amber-500 text-amber-600" : ""}`}
                  >
                    {isExpired
                      ? `${Math.abs(item.daysUntil)}d abgelaufen`
                      : item.daysUntil === 0
                        ? "Heute"
                        : `${item.daysUntil}d`}
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
