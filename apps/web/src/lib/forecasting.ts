/**
 * forecasting.ts
 * Pure TypeScript demand-forecasting engine — no external ML dependencies.
 *
 * Algorithms:
 *  - Simple Moving Average (SMA)
 *  - Single Exponential Smoothing (Holt-Winters level only)
 *  - Weekly / monthly seasonal decomposition
 *  - Combined forecast with confidence intervals
 *  - Reorder-point & reorder-quantity suggester
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DailyQuantity {
  date: string    // ISO date "YYYY-MM-DD"
  quantity: number
}

export interface ForecastPoint {
  date: string
  predicted: number
  lower: number
  upper: number
}

export interface SeasonalityResult {
  /** 7 = weekly pattern detected, 30 = monthly, 1 = no seasonality */
  period: number
  /** seasonal factors, one per period slot (length === period) */
  seasonal: number[]
  /** linear trend (units per day, can be negative) */
  trend: number
}

export interface ReorderSuggestion {
  reorderPoint: number
  reorderQuantity: number
  daysUntilStockout: number
  confidence: number          // 0–1
}

// ── 1. Simple Moving Average ──────────────────────────────────────────────────

/**
 * Returns SMA for each position i where i >= window-1.
 * Positions i < window-1 are filled with the first computable value.
 */
export function movingAverage(data: number[], window: number): number[] {
  if (data.length === 0) return []
  const w = Math.max(1, Math.min(window, data.length))
  const result: number[] = new Array(data.length).fill(0)

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - w + 1)
    let sum = 0
    let count = 0
    for (let j = start; j <= i; j++) {
      sum += data[j]!
      count++
    }
    result[i] = sum / count
  }
  return result
}

// ── 2. Single Exponential Smoothing ─────────────────────────────────────────

/**
 * Holt-Winters level-only (no trend/seasonal).
 * alpha: smoothing factor, 0 < alpha < 1.
 * Higher alpha = more weight on recent observations.
 */
export function exponentialSmoothing(data: number[], alpha: number): number[] {
  if (data.length === 0) return []
  const a = Math.max(0.01, Math.min(0.99, alpha))
  const result: number[] = new Array(data.length).fill(0)
  result[0] = data[0]!

  for (let i = 1; i < data.length; i++) {
    result[i] = a * (data[i]!) + (1 - a) * result[i - 1]!
  }
  return result
}

// ── 3. Seasonal Decomposition ────────────────────────────────────────────────

/**
 * Tests whether the history shows a statistically relevant weekly (7-day)
 * or monthly (30-day) pattern using ratio-to-moving-average.
 *
 * Returns period, per-slot seasonal factors (centred at 1.0), and a
 * simple linear trend (units/day, OLS slope on the de-seasonalised series).
 */
export function detectSeasonality(dailyData: DailyQuantity[]): SeasonalityResult {
  if (dailyData.length < 14) {
    return { period: 1, seasonal: [1], trend: 0 }
  }

  const values = dailyData.map((d) => d.quantity)

  // Helper: compute seasonal strength for a given period
  function seasonalStrength(period: number): { factors: number[]; strength: number } {
    if (dailyData.length < period * 2) return { factors: Array(period).fill(1), strength: 0 }

    const sma = movingAverage(values, period)
    const ratios: number[][] = Array.from({ length: period }, () => [])

    for (let i = Math.floor(period / 2); i < values.length - Math.floor(period / 2); i++) {
      const slot = i % period
      const ratio = sma[i]! > 0 ? values[i]! / sma[i]! : 1
      ratios[slot]!.push(ratio)
    }

    // Average ratio per slot
    const factors = ratios.map((r) => {
      if (r.length === 0) return 1
      const avg = r.reduce((a, b) => a + b, 0) / r.length
      return avg
    })

    // Normalise so the average factor === 1
    const mean = factors.reduce((a, b) => a + b, 0) / factors.length
    const normFactors = factors.map((f) => f / (mean || 1))

    // Strength = variance of factors (higher = more seasonality)
    const fMean = normFactors.reduce((a, b) => a + b, 0) / normFactors.length
    const variance = normFactors.reduce((a, b) => a + (b - fMean) ** 2, 0) / normFactors.length
    return { factors: normFactors, strength: variance }
  }

  const weekly = seasonalStrength(7)
  const monthly = seasonalStrength(30)

  // Pick strongest seasonal pattern (threshold: variance > 0.005)
  let period = 1
  let seasonal: number[] = [1]

  if (weekly.strength > monthly.strength && weekly.strength > 0.005) {
    period = 7
    seasonal = weekly.factors
  } else if (monthly.strength > 0.005 && dailyData.length >= 60) {
    period = 30
    seasonal = monthly.factors
  }

  // OLS trend on the raw values
  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i]! - yMean)
    den += (i - xMean) ** 2
  }
  const trend = den > 0 ? num / den : 0

  return { period, seasonal, trend }
}

// ── 4. Demand Forecast ───────────────────────────────────────────────────────

/**
 * Combines exponential smoothing + seasonal decomposition to forecast
 * daysAhead days of daily consumption.
 *
 * Returns predicted values + 80 % prediction interval (lower/upper).
 */
export function forecastDemand(
  history: DailyQuantity[],
  daysAhead: number
): ForecastPoint[] {
  if (history.length === 0) return []
  const days = Math.max(1, Math.min(daysAhead, 365))

  // Fill missing calendar days with 0 (consumption data may have gaps)
  const filled = fillGaps(history)
  const values = filled.map((d) => d.quantity)

  // Smoothing: fewer observations → more weight on recent data
  const alpha = filled.length < 30 ? 0.4 : 0.25
  const smoothed = exponentialSmoothing(values, alpha)
  const lastSmoothed = smoothed.at(-1) ?? 0

  const { period, seasonal, trend } = detectSeasonality(filled)
  const lastIdx = filled.length - 1

  // Residual std deviation (for CI)
  let residualSumSq = 0
  for (let i = 0; i < values.length; i++) {
    residualSumSq += (values[i]! - smoothed[i]!) ** 2
  }
  const residualStd = Math.sqrt(residualSumSq / Math.max(1, values.length))

  // Horizon uncertainty: grows as sqrt(h) — standard time-series practice
  const z80 = 1.28 // 80% PI

  const lastDate = new Date(filled.at(-1)!.date)
  const result: ForecastPoint[] = []

  for (let h = 1; h <= days; h++) {
    const forecastDate = new Date(lastDate)
    forecastDate.setDate(forecastDate.getDate() + h)
    const dateStr = forecastDate.toISOString().slice(0, 10)

    const slot = (lastIdx + h) % period
    const seasonFactor = seasonal[slot] ?? 1

    // Predicted = (level + trend * h) * seasonal factor
    const base = Math.max(0, lastSmoothed + trend * h)
    const predicted = Math.max(0, base * seasonFactor)

    // Uncertainty widens with forecast horizon
    const halfWidth = z80 * residualStd * Math.sqrt(h)
    const lower = Math.max(0, predicted - halfWidth)
    const upper = predicted + halfWidth

    result.push({
      date: dateStr,
      predicted: round2(predicted),
      lower: round2(lower),
      upper: round2(upper),
    })
  }

  return result
}

// ── 5. Reorder Suggestion ────────────────────────────────────────────────────

/**
 * Suggests when and how much to reorder based on:
 *  - Average daily consumption from history
 *  - Safety stock = 1 standard deviation of daily demand × lead time
 *  - EOQ-style quantity = max(7-day demand, 14-day demand if trend is up)
 */
export function suggestReorder(
  history: DailyQuantity[],
  currentStock: number,
  leadTimeDays: number
): ReorderSuggestion {
  if (history.length === 0) {
    return { reorderPoint: 0, reorderQuantity: 0, daysUntilStockout: Infinity, confidence: 0 }
  }

  const filled = fillGaps(history)
  const values = filled.map((d) => d.quantity)

  // Only count outbound (positive consumption values)
  const consumptionValues = values.filter((v) => v > 0)
  if (consumptionValues.length === 0) {
    return { reorderPoint: 0, reorderQuantity: 0, daysUntilStockout: Infinity, confidence: 0.5 }
  }

  const avgDaily = consumptionValues.reduce((a, b) => a + b, 0) / consumptionValues.length

  // Std dev of daily demand
  const variance = consumptionValues.reduce((a, b) => a + (b - avgDaily) ** 2, 0) / consumptionValues.length
  const stdDaily = Math.sqrt(variance)

  // Safety stock for 95% service level (z=1.65) over lead time
  const safetyStock = Math.ceil(1.65 * stdDaily * Math.sqrt(Math.max(1, leadTimeDays)))

  // Reorder point: demand during lead time + safety stock
  const demandDuringLeadTime = avgDaily * leadTimeDays
  const reorderPoint = Math.ceil(demandDuringLeadTime + safetyStock)

  // Days until stockout (at current avg consumption rate)
  const daysUntilStockout = avgDaily > 0 ? Math.floor(currentStock / avgDaily) : Infinity

  // Reorder quantity: cover 30 days (or more if upward trend detected)
  const { trend } = detectSeasonality(filled)
  const coverDays = trend > 0.05 ? 45 : 30
  const reorderQuantity = Math.ceil(avgDaily * coverDays + safetyStock)

  // Confidence: based on data volume and consistency
  const cvRatio = avgDaily > 0 ? stdDaily / avgDaily : 1
  const dataScore = Math.min(1, filled.length / 60)            // up to 1 at 60+ days
  const consistencyScore = Math.max(0, 1 - cvRatio)            // lower CV = higher score
  const confidence = round2(dataScore * 0.6 + consistencyScore * 0.4)

  return {
    reorderPoint: Math.max(0, reorderPoint),
    reorderQuantity: Math.max(1, reorderQuantity),
    daysUntilStockout,
    confidence: Math.min(1, Math.max(0, confidence)),
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Fill calendar gaps in the sorted daily series with 0s */
function fillGaps(sorted: DailyQuantity[]): DailyQuantity[] {
  if (sorted.length === 0) return []
  const result: DailyQuantity[] = []
  const start = new Date(sorted[0]!.date)
  const end = new Date(sorted.at(-1)!.date)

  // Build a lookup map
  const map = new Map<string, number>()
  for (const d of sorted) map.set(d.date, d.quantity)

  const cursor = new Date(start)
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    result.push({ date: key, quantity: map.get(key) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
