import { getDb } from "@repo/db";
import {
  stockChanges,
  materials,
  locations,
  users,
} from "@repo/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AnomalyEvent {
  id: string;
  type:
    | "unusual_quantity"
    | "off_hours"
    | "unusual_location"
    | "consumption_spike"
    | "bulk_withdrawal";
  severity: "low" | "medium" | "high";
  description: string;
  materialId?: string;
  materialName?: string;
  toolId?: string;
  toolName?: string;
  userId?: string;
  userName?: string;
  locationName?: string;
  quantity?: number;
  expectedRange?: { min: number; max: number };
  detectedAt: string;
  stockChangeId?: string;
}

export interface StockChangeRow {
  id: string;
  materialId: string;
  materialName: string | null;
  locationId: string;
  locationName: string | null;
  userId: string | null;
  userName: string | null;
  changeType: string;
  quantity: number;
  createdAt: Date;
}

// ── Statistical helpers ────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[], mu?: number): number {
  if (values.length < 2) return 0;
  const m = mu ?? mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function zScore(value: number, mu: number, sigma: number): number {
  if (sigma === 0) return 0;
  return Math.abs((value - mu) / sigma);
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ── Detector 1: Unusual quantity (Z-score >= 2.5) ─────────────────────────

export function detectQuantityAnomalies(
  recentChanges: StockChangeRow[],
  historicalStats: { mean: number; stddev: number }
): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];
  const { mean: mu, stddev: sigma } = historicalStats;

  for (const change of recentChanges) {
    if (change.changeType !== "out") continue;

    const absQty = Math.abs(change.quantity);
    const z = zScore(absQty, mu, sigma);

    if (z < 2.5) continue;

    const expectedMin = Math.max(0, Math.round(mu - sigma));
    const expectedMax = Math.round(mu + sigma * 2);

    let severity: AnomalyEvent["severity"] = "low";
    if (z >= 4) severity = "high";
    else if (z >= 3) severity = "medium";

    events.push({
      id: nanoid(),
      type: "unusual_quantity",
      severity,
      description: `Ungewöhnliche Ausbuchungsmenge: ${absQty} Stk. von ${change.materialName ?? "Unbekannt"} (normal: ${expectedMin}–${expectedMax} Stk.)`,
      materialId: change.materialId,
      materialName: change.materialName ?? undefined,
      userId: change.userId ?? undefined,
      userName: change.userName ?? undefined,
      locationName: change.locationName ?? undefined,
      quantity: absQty,
      expectedRange: { min: expectedMin, max: expectedMax },
      detectedAt: change.createdAt.toISOString(),
      stockChangeId: change.id,
    });
  }

  return events;
}

// ── Detector 2: Off-hours activity (before 06:00, after 22:00, weekends) ──

export function detectOffHoursActivity(
  recentChanges: StockChangeRow[]
): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];

  for (const change of recentChanges) {
    if (change.changeType !== "out" && change.changeType !== "transfer") {
      continue;
    }

    const d = change.createdAt;
    const hour = d.getHours();
    const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isEarlyMorning = hour < 6;
    const isLateEvening = hour >= 22;

    if (!isWeekend && !isEarlyMorning && !isLateEvening) continue;

    let reason = "";
    let severity: AnomalyEvent["severity"] = "medium";

    if (isWeekend) {
      reason = "am Wochenende";
      severity = "medium";
    } else if (isEarlyMorning) {
      reason = `nachts um ${hour.toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} Uhr`;
      severity = "high";
    } else {
      reason = `spät abends um ${hour.toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")} Uhr`;
      severity = "medium";
    }

    events.push({
      id: nanoid(),
      type: "off_hours",
      severity,
      description: `Buchung ${reason}: ${Math.abs(change.quantity)} Stk. ${change.materialName ?? "Material"} von ${change.userName ?? "Unbekannt"}`,
      materialId: change.materialId,
      materialName: change.materialName ?? undefined,
      userId: change.userId ?? undefined,
      userName: change.userName ?? undefined,
      locationName: change.locationName ?? undefined,
      quantity: Math.abs(change.quantity),
      detectedAt: change.createdAt.toISOString(),
      stockChangeId: change.id,
    });
  }

  return events;
}

// ── Detector 3: Unusual location transfers ─────────────────────────────────

export function detectUnusualLocations(
  recentChanges: StockChangeRow[],
  normalPatterns: Map<string, Set<string>> // materialId → usual locationIds
): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];

  for (const change of recentChanges) {
    if (change.changeType !== "transfer") continue;

    const usualLocations = normalPatterns.get(change.materialId);
    if (!usualLocations || usualLocations.size === 0) continue;

    if (usualLocations.has(change.locationId)) continue;

    events.push({
      id: nanoid(),
      type: "unusual_location",
      severity: "medium",
      description: `Ungewöhnlicher Transferlagerort für ${change.materialName ?? "Material"}: "${change.locationName ?? "Unbekannt"}" wurde bisher nicht verwendet`,
      materialId: change.materialId,
      materialName: change.materialName ?? undefined,
      userId: change.userId ?? undefined,
      userName: change.userName ?? undefined,
      locationName: change.locationName ?? undefined,
      quantity: Math.abs(change.quantity),
      detectedAt: change.createdAt.toISOString(),
      stockChangeId: change.id,
    });
  }

  return events;
}

// ── Detector 4: Consumption spike (>3x the rolling daily average) ──────────

export function detectConsumptionSpikes(
  dailyTotals: { date: string; quantity: number }[],
  windowDays: number
): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];

  if (dailyTotals.length < 3) return events;

  // Use all but the last data point as the baseline window
  const baseline = dailyTotals.slice(0, -1).slice(-windowDays);
  const today = dailyTotals[dailyTotals.length - 1];

  if (!today) return events;

  const quantities = baseline.map((d) => d.quantity);
  const mu = mean(quantities);
  const sigma = stddev(quantities, mu);

  if (mu === 0) return events;

  const todayQty = today.quantity;
  const threshold = Math.max(mu * 3, mu + sigma * 3);

  if (todayQty <= threshold) return events;

  const severity: AnomalyEvent["severity"] =
    todayQty > mu * 5 ? "high" : "medium";

  events.push({
    id: nanoid(),
    type: "consumption_spike",
    severity,
    description: `Verbrauchsspitze erkannt: ${todayQty} Stk. ausgebucht (normaler Tagesdurchschnitt: ${Math.round(mu)} Stk.)`,
    quantity: todayQty,
    expectedRange: {
      min: 0,
      max: Math.round(mu + sigma),
    },
    detectedAt: new Date(`${today.date}T12:00:00`).toISOString(),
  });

  return events;
}

// ── Detector 5: Bulk withdrawal (single transaction > 5x mean per material) ─

function detectBulkWithdrawals(
  recentChanges: StockChangeRow[],
  materialMeans: Map<string, number>
): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];

  for (const change of recentChanges) {
    if (change.changeType !== "out") continue;

    const absQty = Math.abs(change.quantity);
    const mu = materialMeans.get(change.materialId);

    if (!mu || mu === 0) continue;

    if (absQty <= mu * 5) continue;

    events.push({
      id: nanoid(),
      type: "bulk_withdrawal",
      severity: "high",
      description: `Massenentnahme erkannt: ${absQty} Stk. ${change.materialName ?? "Material"} auf einmal ausgebucht (normal: ~${Math.round(mu)} Stk.)`,
      materialId: change.materialId,
      materialName: change.materialName ?? undefined,
      userId: change.userId ?? undefined,
      userName: change.userName ?? undefined,
      locationName: change.locationName ?? undefined,
      quantity: absQty,
      expectedRange: { min: 0, max: Math.round(mu * 2) },
      detectedAt: change.createdAt.toISOString(),
      stockChangeId: change.id,
    });
  }

  return events;
}

// ── Main runner ────────────────────────────────────────────────────────────

export async function runAnomalyDetection(
  orgId: string
): Promise<AnomalyEvent[]> {
  const db = getDb();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── Fetch recent changes (last 7 days) ─────────────────────────────────
  const recent = await db
    .select({
      id: stockChanges.id,
      materialId: stockChanges.materialId,
      materialName: materials.name,
      locationId: stockChanges.locationId,
      locationName: locations.name,
      userId: stockChanges.userId,
      userName: users.name,
      changeType: stockChanges.changeType,
      quantity: stockChanges.quantity,
      createdAt: stockChanges.createdAt,
    })
    .from(stockChanges)
    .leftJoin(materials, eq(stockChanges.materialId, materials.id))
    .leftJoin(locations, eq(stockChanges.locationId, locations.id))
    .leftJoin(users, eq(stockChanges.userId, users.id))
    .where(
      and(
        eq(stockChanges.organizationId, orgId),
        gte(stockChanges.createdAt, sevenDaysAgo)
      )
    )
    .orderBy(desc(stockChanges.createdAt))
    .limit(500);

  // ── Fetch historical changes (last 30 days) for baseline ───────────────
  const historical = await db
    .select({
      materialId: stockChanges.materialId,
      locationId: stockChanges.locationId,
      changeType: stockChanges.changeType,
      quantity: stockChanges.quantity,
      createdAt: stockChanges.createdAt,
    })
    .from(stockChanges)
    .where(
      and(
        eq(stockChanges.organizationId, orgId),
        gte(stockChanges.createdAt, thirtyDaysAgo)
      )
    )
    .limit(5000);

  // ── Build per-material statistics from historical "out" changes ────────
  const materialOutQuantities = new Map<string, number[]>();
  for (const row of historical) {
    if (row.changeType !== "out") continue;
    const absQty = Math.abs(row.quantity);
    const existing = materialOutQuantities.get(row.materialId) ?? [];
    existing.push(absQty);
    materialOutQuantities.set(row.materialId, existing);
  }

  // Global stats (across all materials)
  const allOutQtys = [...materialOutQuantities.values()].flat();
  const globalMean = mean(allOutQtys);
  const globalStddev = stddev(allOutQtys, globalMean);

  // Per-material means for bulk detection
  const materialMeans = new Map<string, number>();
  for (const [materialId, qtys] of materialOutQuantities.entries()) {
    materialMeans.set(materialId, mean(qtys));
  }

  // ── Build normal location patterns for transfers ────────────────────────
  const normalPatterns = new Map<string, Set<string>>();
  for (const row of historical) {
    if (row.changeType !== "transfer") continue;
    const existing = normalPatterns.get(row.materialId) ?? new Set<string>();
    existing.add(row.locationId);
    normalPatterns.set(row.materialId, existing);
  }

  // ── Build daily totals (last 14 days) for spike detection ──────────────
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const dailyMap = new Map<string, number>();
  for (const row of historical) {
    if (row.changeType !== "out") continue;
    if (row.createdAt < fourteenDaysAgo) continue;
    const dateStr = row.createdAt.toISOString().split("T")[0]!;
    dailyMap.set(dateStr, (dailyMap.get(dateStr) ?? 0) + Math.abs(row.quantity));
  }
  const dailyTotals = Array.from(dailyMap.entries())
    .map(([date, quantity]) => ({ date, quantity }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // ── Run all detectors ───────────────────────────────────────────────────
  const allAnomalies: AnomalyEvent[] = [
    ...detectQuantityAnomalies(recent, {
      mean: globalMean,
      stddev: globalStddev,
    }),
    ...detectOffHoursActivity(recent),
    ...detectUnusualLocations(recent, normalPatterns),
    ...detectConsumptionSpikes(dailyTotals, 7),
    ...detectBulkWithdrawals(recent, materialMeans),
  ];

  // Deduplicate by stockChangeId (a single transaction may trigger multiple detectors)
  const seen = new Set<string>();
  const deduplicated: AnomalyEvent[] = [];
  for (const event of allAnomalies) {
    const dedupeKey = event.stockChangeId
      ? `${event.type}:${event.stockChangeId}`
      : event.id;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    deduplicated.push(event);
  }

  // Sort: high severity first, then by detectedAt descending
  const severityOrder = { high: 0, medium: 1, low: 2 };
  deduplicated.sort((a, b) => {
    const sv = severityOrder[a.severity] - severityOrder[b.severity];
    if (sv !== 0) return sv;
    return b.detectedAt.localeCompare(a.detectedAt);
  });

  return deduplicated;
}
