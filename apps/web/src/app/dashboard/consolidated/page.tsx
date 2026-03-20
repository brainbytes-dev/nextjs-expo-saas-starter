"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  IconBuilding,
  IconPackage,
  IconTool,
  IconKey,
  IconMapPin,
  IconArrowRight,
  IconChartBar,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OrgStat {
  id: string
  name: string
  slug: string
  industry: string | null
  logo: string | null
  role: string | null
  counts: {
    locations: number
    materials: number
    tools: number
    keys: number
  }
}

interface ConsolidatedStats {
  orgs: OrgStat[]
  totals: {
    locations: number
    materials: number
    tools: number
    keys: number
  }
  membershipCount: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ROLE_LABELS: Record<string, string> = {
  owner: "Inhaber",
  admin: "Admin",
  member: "Mitglied",
}

const INDUSTRY_LABELS: Record<string, string> = {
  handwerk: "Handwerk",
  rettungsdienst: "Rettungsdienst",
  arztpraxis: "Arztpraxis",
  spital: "Spital",
}

function roleBadgeClass(role: string | null): string {
  if (role === "owner") return "bg-primary/10 text-primary border-border"
  if (role === "admin") return "bg-secondary/10 text-secondary border-secondary/30"
  return "bg-muted text-muted-foreground border-border"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ConsolidatedPage() {
  const [stats, setStats] = useState<ConsolidatedStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/consolidated/stats")
        if (!res.ok) throw new Error("Fehler beim Laden")
        const data: ConsolidatedStats = await res.json()
        setStats(data)
      } catch {
        setError("Die konsolidierten Statistiken konnten nicht geladen werden.")
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
        <div>
          <Skeleton className="h-8 w-72" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 lg:px-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Erneut versuchen
          </Button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Single-org state: redirect hint
  // ---------------------------------------------------------------------------
  if (!stats || stats.membershipCount <= 1) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6 lg:px-6">
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
            <IconChartBar className="size-6 text-muted-foreground" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-lg font-medium">Nur eine Organisation</h3>
            <p className="text-sm text-muted-foreground">
              Die konsolidierte Ansicht ist verf&uuml;gbar, sobald Sie Mitglied
              in mehr als einer Organisation sind.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard">Zum Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const { orgs, totals } = stats

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Konsolidierter Bericht
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orgs.length} Organisationen &bull; Gesamtbestand im Überblick
        </p>
      </div>

      {/* Totals KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Standorte gesamt"
          value={totals.locations}
          icon={IconMapPin}
          colorClass="bg-blue-100 text-blue-700"
        />
        <KpiCard
          label="Materialien gesamt"
          value={totals.materials}
          icon={IconPackage}
          colorClass="bg-orange-100 text-orange-700"
        />
        <KpiCard
          label="Werkzeuge gesamt"
          value={totals.tools}
          icon={IconTool}
          colorClass="bg-green-100 text-green-700"
        />
        <KpiCard
          label="Schlüssel gesamt"
          value={totals.keys}
          icon={IconKey}
          colorClass="bg-purple-100 text-purple-700"
        />
      </div>

      {/* Per-org cards */}
      <div>
        <h2 className="mb-4 text-base font-semibold">Nach Organisation</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function KpiCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className={`flex size-8 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

function OrgCard({ org }: { org: OrgStat }) {
  const industryLabel = org.industry ? (INDUSTRY_LABELS[org.industry] ?? org.industry) : null
  const roleLabel = org.role ? (ROLE_LABELS[org.role] ?? org.role) : null

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
        {org.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logo}
            alt={org.name}
            className="size-10 rounded-lg object-contain"
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            <IconBuilding className="size-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-none">{org.name}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {roleLabel && (
              <Badge
                variant="outline"
                className={`text-xs ${roleBadgeClass(org.role)}`}
              >
                {roleLabel}
              </Badge>
            )}
            {industryLabel && (
              <Badge variant="outline" className="text-xs">
                {industryLabel}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        {/* Count grid */}
        <div className="grid grid-cols-2 gap-2">
          <CountItem icon={IconMapPin} label="Standorte" value={org.counts.locations} />
          <CountItem icon={IconPackage} label="Materialien" value={org.counts.materials} />
          <CountItem icon={IconTool} label="Werkzeuge" value={org.counts.tools} />
          <CountItem icon={IconKey} label="Schlüssel" value={org.counts.keys} />
        </div>

        {/* Switch link */}
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href={`/dashboard?org=${org.slug}`}>
            Zur Organisation wechseln
            <IconArrowRight className="ml-1 size-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function CountItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  )
}
