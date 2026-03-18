"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  IconAlertTriangle,
  IconClock,
  IconTool,
  IconArrowRight,
} from "@tabler/icons-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Stats {
  lowStockCount: number
  expiringCount: number
  overdueToolsCount: number
}

interface AlertRow {
  icon: React.ElementType
  borderColor: string
  iconColor: string
  bgColor: string
  badgeVariant: "destructive" | "secondary" | "default" | "outline"
  label: string
  sublabel: string
  count: number
  href: string
}

export function AlertsWidget() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const run = async () => {
      try {
        const r = await fetch("/api/dashboard/stats")
        const data = await r.json() as Stats
        if (mounted.current) setStats(data)
      } catch {
        // stay null
      } finally {
        if (mounted.current) setLoading(false)
      }
    }
    void run()
    return () => { mounted.current = false }
  }, [])

  const rows: AlertRow[] = stats
    ? [
        {
          icon: IconAlertTriangle,
          borderColor: "border-l-destructive",
          iconColor: "text-destructive",
          bgColor: "bg-destructive/10",
          badgeVariant: stats.lowStockCount > 0 ? "destructive" : "secondary",
          label: "Unter Meldebestand",
          sublabel: "Materialien mit zu wenig Bestand",
          count: stats.lowStockCount,
          href: "/dashboard/materials?filter=lowStock",
        },
        {
          icon: IconClock,
          borderColor: "border-l-amber-500",
          iconColor: "text-amber-600",
          bgColor: "bg-amber-500/10",
          badgeVariant: stats.expiringCount > 0 ? "default" : "secondary",
          label: "Bald ablaufend",
          sublabel: "Ablaufdatum in 30 Tagen",
          count: stats.expiringCount,
          href: "/dashboard/materials?filter=expiring",
        },
        {
          icon: IconTool,
          borderColor: "border-l-orange-500",
          iconColor: "text-orange-600",
          bgColor: "bg-orange-500/10",
          badgeVariant: stats.overdueToolsCount > 0 ? "default" : "secondary",
          label: "Überfällige Werkzeuge",
          sublabel: "Seit mehr als 7 Tagen ausgecheckt",
          count: stats.overdueToolsCount,
          href: "/dashboard/tools?filter=overdue",
        },
      ]
    : []

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>Warnmeldungen</CardTitle>
        <CardDescription>Handlungsbedarf im Überblick</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-9 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          ))
        ) : (
          rows.map((row) => {
            const Icon = row.icon
            return (
              <Link key={row.label} href={row.href} className="block group">
                <div className={`flex items-center gap-3 rounded-lg border border-l-4 px-3 py-2.5 transition-shadow group-hover:shadow-sm ${row.borderColor}`}>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${row.bgColor}`}>
                    <Icon className={`size-4.5 ${row.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{row.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{row.sublabel}</p>
                  </div>
                  <Badge variant={row.badgeVariant} className="ml-auto tabular-nums shrink-0 text-sm px-2.5 py-0.5">
                    {row.count}
                  </Badge>
                  <IconArrowRight className="size-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
