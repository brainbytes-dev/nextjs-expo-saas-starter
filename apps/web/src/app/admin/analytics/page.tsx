"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { IconChartBar, IconAlertTriangle } from "@tabler/icons-react"

const FEATURE_LABELS: Record<string, string> = {
  orders: "Bestellungen",
  stock_changes: "Lagerbuchungen",
  tool_bookings: "Werkzeugbuchungen",
  commissions: "Aufträge",
  shift_handovers: "Schichtübergaben",
  exports: "Exporte",
  imports: "Importe",
  keys: "Schlüssel",
  materials: "Materialien",
  suppliers: "Lieferanten",
  vehicles: "Fahrzeuge",
}

interface FeatureAdoptionRow {
  feature: string
  totalCount: number
  orgCount: number
  adoptionPct: number
}

interface OrgMatrixRow {
  orgId: string
  orgName: string
  features: Record<string, number>
}

interface InactiveOrg {
  orgId: string
  orgName: string
}

interface AnalyticsData {
  period: { from: string; to: string }
  totalOrgs: number
  featureAdoption: FeatureAdoptionRow[]
  orgMatrix: OrgMatrixRow[]
  inactiveOrgs: InactiveOrg[]
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Fehler beim Laden der Analytics"))
      .finally(() => setLoading(false))
  }, [])

  const allFeatures = data
    ? Array.from(
        new Set([
          ...data.featureAdoption.map((r) => r.feature),
          ...data.orgMatrix.flatMap((o) => Object.keys(o.features)),
        ])
      ).sort()
    : []

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <IconAlertTriangle className="size-4" />
        <span>{error ?? "Keine Daten"}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Feature Analytics</h2>
        <p className="text-muted-foreground text-sm">
          Server-seitig, consent-unabhängig · Zeitraum: {data.period.from} – {data.period.to} ·{" "}
          {data.totalOrgs} Organisationen
        </p>
      </div>

      {/* Feature Adoption */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconChartBar className="size-5" />
            Feature-Adoption (letzte 30 Tage)
          </CardTitle>
          <CardDescription>Anteil der Organisationen, die jedes Feature aktiv nutzen</CardDescription>
        </CardHeader>
        <CardContent>
          {data.featureAdoption.length === 0 ? (
            <p className="text-muted-foreground text-sm">Noch keine Tracking-Daten vorhanden.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="w-40">Adoption</TableHead>
                  <TableHead className="text-right">Orgs</TableHead>
                  <TableHead className="text-right">Aktionen (Total)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.featureAdoption.map((row) => (
                  <TableRow key={row.feature}>
                    <TableCell className="font-medium">
                      {FEATURE_LABELS[row.feature] ?? row.feature}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={row.adoptionPct} className="h-2 flex-1" />
                        <span className="text-sm tabular-nums w-10 text-right">
                          {row.adoptionPct}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.orgCount} / {data.totalOrgs}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.totalCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Per-Org Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Nutzung pro Organisation</CardTitle>
          <CardDescription>Anzahl Aktionen pro Feature, letzte 30 Tage</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {allFeatures.length === 0 ? (
            <p className="text-muted-foreground text-sm">Noch keine Tracking-Daten vorhanden.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Organisation</TableHead>
                  {allFeatures.map((f) => (
                    <TableHead key={f} className="text-center text-xs min-w-[80px]">
                      {FEATURE_LABELS[f] ?? f}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.orgMatrix.map((org) => {
                  const total = Object.values(org.features).reduce((s, v) => s + v, 0)
                  return (
                    <TableRow key={org.orgId}>
                      <TableCell className="font-medium">
                        {org.orgName}
                      </TableCell>
                      {allFeatures.map((f) => {
                        const count = org.features[f] ?? 0
                        return (
                          <TableCell key={f} className="text-center tabular-nums">
                            {count > 0 ? (
                              <Badge
                                variant="secondary"
                                className={
                                  count >= 100
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                    : count >= 10
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                    : ""
                                }
                              >
                                {count}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                        )
                      })}
                      {total === 0 && (
                        <TableCell colSpan={allFeatures.length} className="text-muted-foreground text-sm italic">
                          Keine Aktivität
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Inactive Orgs */}
      {data.inactiveOrgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconAlertTriangle className="size-5 text-amber-500" />
              Inaktive Organisationen ({data.inactiveOrgs.length})
            </CardTitle>
            <CardDescription>
              Keine Aktivität in den letzten 30 Tagen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.inactiveOrgs.map((org) => (
                <Badge key={org.orgId} variant="outline" className="text-muted-foreground">
                  {org.orgName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
