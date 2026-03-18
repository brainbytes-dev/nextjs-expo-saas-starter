"use client"

import { useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { WidgetType } from "./index"

interface ChartDataPoint {
  month: string
  materials: number
  tools: number
  keys: number
}

const PLACEHOLDER_CHART: ChartDataPoint[] = [
  { month: "Apr 25", materials: 42, tools: 18, keys: 5 },
  { month: "Mai 25", materials: 56, tools: 24, keys: 8 },
  { month: "Jun 25", materials: 38, tools: 15, keys: 3 },
  { month: "Jul 25", materials: 64, tools: 32, keys: 12 },
  { month: "Aug 25", materials: 48, tools: 22, keys: 6 },
  { month: "Sep 25", materials: 72, tools: 28, keys: 9 },
  { month: "Okt 25", materials: 55, tools: 20, keys: 7 },
  { month: "Nov 25", materials: 61, tools: 35, keys: 11 },
  { month: "Dez 25", materials: 45, tools: 19, keys: 4 },
  { month: "Jan 26", materials: 68, tools: 30, keys: 10 },
  { month: "Feb 26", materials: 52, tools: 26, keys: 8 },
  { month: "Mär 26", materials: 74, tools: 38, keys: 14 },
]

const areaChartConfig = {
  materials: { label: "Materialien", color: "hsl(var(--chart-1))" },
  tools:     { label: "Werkzeuge",   color: "hsl(var(--chart-2))" },
  keys:      { label: "Schlüssel",   color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

export function ChartWidget({ type }: { type: WidgetType }) {
  const [chartData] = useState<ChartDataPoint[]>(PLACEHOLDER_CHART)
  const isCategories = type === "chart-categories"

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="shrink-0">
        <CardTitle>
          {isCategories ? "Verteilung nach Kategorie" : "Buchungen — letzte 12 Monate"}
        </CardTitle>
        <CardDescription>
          {isCategories
            ? "Materialien, Werkzeuge und Schlüssel"
            : "Materialien / Werkzeuge / Schlüssel (Platzhalterdaten)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ChartContainer config={areaChartConfig} className="h-full w-full min-h-[160px]">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="cw-gradMaterials" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--chart-1))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="cw-gradTools" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--chart-2))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="cw-gradKeys" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--chart-3))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              width={30}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey="materials" type="monotone" fill="url(#cw-gradMaterials)" stroke="hsl(var(--chart-1))" strokeWidth={2} />
            <Area dataKey="tools"     type="monotone" fill="url(#cw-gradTools)"     stroke="hsl(var(--chart-2))" strokeWidth={2} />
            <Area dataKey="keys"      type="monotone" fill="url(#cw-gradKeys)"      stroke="hsl(var(--chart-3))" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
