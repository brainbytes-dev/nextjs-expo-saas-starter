"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  IconPackage,
  IconTool,
  IconKey,
  IconUsers,
  IconArrowRight,
} from "@tabler/icons-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { WidgetType } from "./index"

interface DashboardStats {
  materials: number
  tools: number
  keys: number
  users: number
  maxUsers: number
}

type KpiWidgetType = "kpi-materials" | "kpi-tools" | "kpi-keys" | "kpi-users"

const KPI_CONFIG: Record<
  KpiWidgetType,
  {
    icon: React.ElementType
    iconBg: string
    iconColor: string
    label: string
    href: string
    getValue: (s: DashboardStats) => string | number
    getSuffix?: (s: DashboardStats) => string | undefined
  }
> = {
  "kpi-materials": {
    icon: IconPackage,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    label: "Materialien",
    href: "/dashboard/materials",
    getValue: (s) => s.materials.toLocaleString("de-CH"),
  },
  "kpi-tools": {
    icon: IconTool,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    label: "Werkzeuge",
    href: "/dashboard/tools",
    getValue: (s) => s.tools.toLocaleString("de-CH"),
  },
  "kpi-keys": {
    icon: IconKey,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    label: "Schlüssel",
    href: "/dashboard/keys",
    getValue: (s) => s.keys.toLocaleString("de-CH"),
  },
  "kpi-users": {
    icon: IconUsers,
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    label: "Nutzer",
    href: "/dashboard/settings/users",
    getValue: (s) => s.users,
    getSuffix: (s) => `/ ${s.maxUsers}`,
  },
}

export function KpiWidget({ type }: { type: WidgetType }) {
  const kpiType = type as KpiWidgetType
  const cfg = KPI_CONFIG[kpiType]
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const run = async () => {
      try {
        const r = await fetch("/api/dashboard/stats")
        const data = await r.json() as DashboardStats
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

  if (!cfg) return null

  const Icon = cfg.icon

  return (
    <Card className="@container/card group transition-shadow hover:shadow-md h-full">
      <CardContent className="flex items-center gap-4 pt-6 pb-5 h-full">
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
          <Icon className={`size-6 ${cfg.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : stats ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums tracking-tight @[200px]/card:text-3xl">
                  {cfg.getValue(stats)}
                </span>
                {cfg.getSuffix && (
                  <span className="text-sm text-muted-foreground">{cfg.getSuffix(stats)}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{cfg.label}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">–</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href={cfg.href} aria-label={`Zu ${cfg.label}`}>
            <IconArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
