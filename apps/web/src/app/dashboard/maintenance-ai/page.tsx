"use client"

import { useState, useEffect, useCallback } from "react"
import {
  IconBrain,
  IconAlertTriangle,
  IconAlertCircle,
  IconCircleCheck,
  IconTool,
  IconLoader2,
  IconInfoCircle,
  IconCalendarEvent,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconQuestionMark,
} from "@tabler/icons-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// ── Types ───────────────────────────────────────────────────────────────────────
interface ToolPrediction {
  id: string
  name: string
  number: string | null
  condition: string | null
  lastMaintenanceDate: string | null
  nextMaintenanceDate: string | null
  predictedMaintenanceDate: string | null
  avgDaysBetweenBookings: number | null
  totalBookings: number
  conditionTrend: "improving" | "stable" | "declining" | "unknown"
  riskScore: number
  riskLevel: "critical" | "warning" | "normal"
  reasons: string[]
}

interface PredictionData {
  predictions: ToolPrediction[]
  summary: { critical: number; warning: number; normal: number }
}

// ── Helpers ─────────────────────────────────────────────────────────────────────
function getRiskColor(score: number): string {
  if (score > 80) return "hsl(0, 72%, 51%)"    // red
  if (score > 50) return "hsl(45, 93%, 47%)"   // yellow
  return "hsl(142, 76%, 36%)"                    // green
}

function conditionBadge(condition: string | null) {
  switch (condition) {
    case "good":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Gut</Badge>
    case "damaged":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Beschädigt</Badge>
    case "repair":
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Reparatur</Badge>
    case "decommissioned":
      return <Badge variant="destructive">Ausgemustert</Badge>
    default:
      return <Badge variant="outline">Unbekannt</Badge>
  }
}

function trendIcon(trend: ToolPrediction["conditionTrend"]) {
  switch (trend) {
    case "improving":
      return <IconTrendingUp className="size-4 text-green-500" />
    case "declining":
      return <IconTrendingDown className="size-4 text-red-500" />
    case "stable":
      return <IconMinus className="size-4 text-muted-foreground" />
    default:
      return <IconQuestionMark className="size-4 text-muted-foreground" />
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014"
  return new Date(dateStr).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

const PIE_COLORS = ["hsl(0, 72%, 51%)", "hsl(45, 93%, 47%)", "hsl(142, 76%, 36%)"]

// ── Page ────────────────────────────────────────────────────────────────────────
export default function MaintenanceAIPage() {
  const [data, setData] = useState<PredictionData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/maintenance-prediction")
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const pieData = data
    ? [
        { name: "Kritisch (>80)", value: data.summary.critical },
        { name: "Warnung (50-80)", value: data.summary.warning },
        { name: "Normal (<50)", value: data.summary.normal },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <IconBrain className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            KI-Wartungsprognose
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Vorausschauende Wartungsanalyse basierend auf Buchungshistorie und
          Zustandsdaten
        </p>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <IconLoader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.predictions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <IconTool className="mb-4 size-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-muted-foreground">
              Keine Werkzeugdaten vorhanden
            </p>
            <p className="text-sm text-muted-foreground">
              Erstellen Sie Werkzeuge und erfassen Sie Buchungen, um
              Wartungsprognosen zu erhalten.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Risk overview cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Kritisch</CardTitle>
                <IconAlertTriangle className="size-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {data.summary.critical}
                </div>
                <p className="text-xs text-muted-foreground">
                  Risiko-Score &gt; 80
                </p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 dark:border-yellow-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Warnung</CardTitle>
                <IconAlertCircle className="size-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {data.summary.warning}
                </div>
                <p className="text-xs text-muted-foreground">
                  Risiko-Score 50 &ndash; 80
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 dark:border-green-900">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Normal</CardTitle>
                <IconCircleCheck className="size-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {data.summary.normal}
                </div>
                <p className="text-xs text-muted-foreground">
                  Risiko-Score &lt; 50
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Chart + Info */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Pie chart */}
            {pieData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Risikoverteilung</CardTitle>
                  <CardDescription>
                    Verteilung der Werkzeuge nach Risiko-Score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {pieData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Callout */}
            <Card className="flex flex-col justify-center">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                  <IconInfoCircle className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Wie funktioniert die KI-Prognose?
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Die KI-Prognose basiert auf historischen Buchungsdaten und
                      Zustandsberichten. Folgende Faktoren fliessen in die
                      Bewertung ein:
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <li>Aktueller Zustand des Werkzeugs</li>
                      <li>Wartungsintervalle und überfällige Wartungen</li>
                      <li>
                        Zustandstrend aus Checklisten-Ergebnissen (lineare
                        Regression)
                      </li>
                      <li>Nutzungshäufigkeit (Buchungsfrequenz)</li>
                      <li>Alter und erwartete Lebensdauer</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Alle Werkzeuge nach Risiko
              </CardTitle>
              <CardDescription>
                Sortiert nach Risiko-Score (höchster zuerst)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Werkzeug</TableHead>
                      <TableHead>Zustand</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Letzte Wartung</TableHead>
                      <TableHead>Nächste Wartung (geplant)</TableHead>
                      <TableHead>KI-Prognose</TableHead>
                      <TableHead className="text-right">Risiko-Score</TableHead>
                      <TableHead>Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.predictions.map((tool) => (
                      <TableRow key={tool.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{tool.name}</span>
                            {tool.number && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                #{tool.number}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {tool.totalBookings} Buchungen
                            {tool.avgDaysBetweenBookings != null && (
                              <> &middot; &oslash; {tool.avgDaysBetweenBookings}d</>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{conditionBadge(tool.condition)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {trendIcon(tool.conditionTrend)}
                            <span className="text-xs capitalize text-muted-foreground">
                              {tool.conditionTrend === "improving"
                                ? "Besser"
                                : tool.conditionTrend === "declining"
                                  ? "Schlechter"
                                  : tool.conditionTrend === "stable"
                                    ? "Stabil"
                                    : "Unbekannt"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(tool.lastMaintenanceDate)}</TableCell>
                        <TableCell>{formatDate(tool.nextMaintenanceDate)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              tool.riskLevel === "critical"
                                ? "font-semibold text-red-600 dark:text-red-400"
                                : tool.riskLevel === "warning"
                                  ? "font-medium text-yellow-600 dark:text-yellow-400"
                                  : ""
                            }
                          >
                            {formatDate(tool.predictedMaintenanceDate)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(tool.riskScore, 100)}%`,
                                  backgroundColor: getRiskColor(tool.riskScore),
                                }}
                              />
                            </div>
                            <span
                              className="min-w-[2.5rem] text-right text-sm font-semibold"
                              style={{ color: getRiskColor(tool.riskScore) }}
                            >
                              {tool.riskScore}
                            </span>
                          </div>
                          {tool.reasons.length > 0 && (
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {tool.reasons.slice(0, 2).join(", ")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a
                              href={`/dashboard/tools?maintain=${tool.id}`}
                              className="flex items-center gap-1.5"
                            >
                              <IconCalendarEvent className="size-3.5" />
                              <span className="hidden sm:inline">Wartung planen</span>
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
