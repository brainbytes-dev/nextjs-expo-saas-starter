// ── Widget Types ───────────────────────────────────────────────────────────────
export type WidgetType =
  | "kpi-materials"
  | "kpi-tools"
  | "kpi-keys"
  | "kpi-users"
  | "alerts"
  | "activity"
  | "chart-movements"
  | "chart-categories"
  | "expiring"
  | "maintenance"
  | "forecast"
  | "anomalies"
  | "quick-actions"
  | "recent-commissions"

// ── Widget metadata for the "add widget" catalog ──────────────────────────────
export interface WidgetMeta {
  type: WidgetType
  label: string
  description: string
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
}

export const WIDGET_CATALOG: WidgetMeta[] = [
  {
    type: "kpi-materials",
    label: "Materialien KPI",
    description: "Anzahl aktiver Materialien",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  {
    type: "kpi-tools",
    label: "Werkzeuge KPI",
    description: "Anzahl aktiver Werkzeuge",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  {
    type: "kpi-keys",
    label: "Schlüssel KPI",
    description: "Anzahl aktiver Schlüssel",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  {
    type: "kpi-users",
    label: "Nutzer KPI",
    description: "Aktive Nutzer und Limit",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  {
    type: "alerts",
    label: "Warnmeldungen",
    description: "Meldebestand, Ablaufdaten, überfällige Werkzeuge",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: "activity",
    label: "Letzte Aktivitäten",
    description: "Buchungen und Bestandsänderungen",
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 4 },
  },
  {
    type: "chart-movements",
    label: "Buchungen Chart",
    description: "Lagerbewegungen der letzten 12 Monate",
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: "chart-categories",
    label: "Kategorien Chart",
    description: "Verteilung nach Kategorie",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: "expiring",
    label: "Ablaufende Materialien",
    description: "Chargen mit Ablaufdatum in 30 Tagen (FEFO)",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: "maintenance",
    label: "Anstehende Wartungen",
    description: "Werkzeuge mit Wartungsfälligkeit",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: "forecast",
    label: "Nachbestellvorschläge",
    description: "Materialien kurz vor dem Stockout",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: "anomalies",
    label: "Erkannte Anomalien",
    description: "Ungewöhnliche Lagerbewegungen",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: "quick-actions",
    label: "Schnellaktionen",
    description: "Häufig verwendete Funktionen",
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 4 },
  },
  {
    type: "recent-commissions",
    label: "Letzte Lieferscheine",
    description: "Zuletzt erstellte Lieferscheine",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
]

// Default layout for new users (12-column grid)
export const DEFAULT_LAYOUT: Array<{
  type: WidgetType
  position: { x: number; y: number }
  size: { w: number; h: number }
}> = [
  { type: "kpi-materials",  position: { x: 0, y: 0  }, size: { w: 3, h: 2 } },
  { type: "kpi-tools",      position: { x: 3, y: 0  }, size: { w: 3, h: 2 } },
  { type: "kpi-keys",       position: { x: 6, y: 0  }, size: { w: 3, h: 2 } },
  { type: "kpi-users",      position: { x: 9, y: 0  }, size: { w: 3, h: 2 } },
  { type: "alerts",         position: { x: 0, y: 2  }, size: { w: 12, h: 3 } },
  { type: "activity",       position: { x: 0, y: 5  }, size: { w: 8, h: 5 } },
  { type: "quick-actions",  position: { x: 8, y: 5  }, size: { w: 4, h: 5 } },
  { type: "forecast",       position: { x: 0, y: 10 }, size: { w: 6, h: 4 } },
  { type: "maintenance",    position: { x: 6, y: 10 }, size: { w: 6, h: 4 } },
]

// Re-export all widget components
export { KpiWidget } from "./kpi-widget"
export { AlertsWidget } from "./alerts-widget"
export { ActivityWidget } from "./activity-widget"
export { ChartWidget } from "./chart-widget"
export { ExpiryWidget } from "./expiry-widget"
export { ForecastWidgetCard } from "./forecast-widget"
export { MaintenanceWidget } from "./maintenance-widget"
export { AnomaliesWidget } from "./anomalies-widget"
export { QuickActionsWidget } from "./quick-actions-widget"
export { RecentCommissionsWidget } from "./recent-commissions-widget"
export { WidgetRenderer } from "./widget-renderer"
