"use client"

import type { WidgetType } from "./index"
import { KpiWidget } from "./kpi-widget"
import { AlertsWidget } from "./alerts-widget"
import { ActivityWidget } from "./activity-widget"
import { ChartWidget } from "./chart-widget"
import { ExpiryWidget } from "./expiry-widget"
import { MaintenanceWidget } from "./maintenance-widget"
import { ForecastWidgetCard } from "./forecast-widget"
import { AnomaliesWidget } from "./anomalies-widget"
import { QuickActionsWidget } from "./quick-actions-widget"
import { RecentCommissionsWidget } from "./recent-commissions-widget"

export function WidgetRenderer({ type }: { type: WidgetType }) {
  switch (type) {
    case "kpi-materials":
    case "kpi-tools":
    case "kpi-keys":
    case "kpi-users":
      return <KpiWidget type={type} />

    case "alerts":
      return <AlertsWidget />

    case "activity":
      return <ActivityWidget />

    case "chart-movements":
    case "chart-categories":
      return <ChartWidget type={type} />

    case "expiring":
      return <ExpiryWidget />

    case "maintenance":
      return <MaintenanceWidget />

    case "forecast":
      return <ForecastWidgetCard />

    case "anomalies":
      return <AnomaliesWidget />

    case "quick-actions":
      return <QuickActionsWidget />

    case "recent-commissions":
      return <RecentCommissionsWidget />

    default:
      return null
  }
}
