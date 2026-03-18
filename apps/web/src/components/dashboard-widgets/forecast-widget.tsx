"use client"

// Re-exports the existing ForecastWidget from src/components/forecast-widget.tsx
// wrapped in a Card shell matching the other dashboard widgets.

import { ForecastWidget as BaseForecastWidget } from "@/components/forecast-widget"

export function ForecastWidgetCard() {
  return <BaseForecastWidget />
}
