import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { tools, toolBookings } from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";

// ── Types ───────────────────────────────────────────────────────────────────────
interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  notes?: string;
}

interface ToolPrediction {
  id: string;
  name: string;
  number: string | null;
  condition: string | null;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  predictedMaintenanceDate: string | null;
  avgDaysBetweenBookings: number | null;
  totalBookings: number;
  conditionTrend: "improving" | "stable" | "declining" | "unknown";
  riskScore: number;
  riskLevel: "critical" | "warning" | "normal";
  reasons: string[];
}

// ── Simple linear regression helper ─────────────────────────────────────────────
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number } | null {
  const n = xs.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i]!;
    sumY += ys[i]!;
    sumXY += xs[i]! * ys[i]!;
    sumXX += xs[i]! * xs[i]!;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ── Condition score mapping ─────────────────────────────────────────────────────
function conditionToScore(condition: string | null): number {
  switch (condition) {
    case "good": return 100;
    case "damaged": return 40;
    case "repair": return 20;
    case "decommissioned": return 0;
    default: return 70; // unknown → assume OK
  }
}

// ── Checklist pass rate ─────────────────────────────────────────────────────────
function checklistPassRate(result: unknown): number | null {
  if (!Array.isArray(result)) return null;
  const items = result as ChecklistItem[];
  if (items.length === 0) return null;
  const passed = items.filter((i) => i.checked).length;
  return passed / items.length;
}

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // 1. Get all active tools
    const allTools = await db
      .select({
        id: tools.id,
        name: tools.name,
        number: tools.number,
        condition: tools.condition,
        lastMaintenanceDate: tools.lastMaintenanceDate,
        nextMaintenanceDate: tools.nextMaintenanceDate,
        maintenanceIntervalDays: tools.maintenanceIntervalDays,
        purchaseDate: tools.purchaseDate,
        expectedLifeYears: tools.expectedLifeYears,
      })
      .from(tools)
      .where(and(eq(tools.organizationId, orgId), eq(tools.isActive, true)));

    if (allTools.length === 0) {
      return NextResponse.json({ predictions: [], summary: { critical: 0, warning: 0, normal: 0 } });
    }

    // 2. Get all bookings for these tools (last 365 days)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);

    const allBookings = await db
      .select({
        toolId: toolBookings.toolId,
        bookingType: toolBookings.bookingType,
        checklistResult: toolBookings.checklistResult,
        createdAt: toolBookings.createdAt,
      })
      .from(toolBookings)
      .where(eq(toolBookings.organizationId, orgId))
      .orderBy(desc(toolBookings.createdAt));

    // Group bookings by tool
    const bookingsByTool = new Map<string, typeof allBookings>();
    for (const b of allBookings) {
      if (!bookingsByTool.has(b.toolId)) bookingsByTool.set(b.toolId, []);
      bookingsByTool.get(b.toolId)!.push(b);
    }

    const now = Date.now();
    const DAY_MS = 86_400_000;

    // 3. Calculate predictions for each tool
    const predictions: ToolPrediction[] = allTools.map((tool) => {
      const bookings = bookingsByTool.get(tool.id) ?? [];
      const totalBookings = bookings.length;
      const reasons: string[] = [];
      let riskScore = 0;

      // ── Average days between bookings ─────────────────────────────────
      let avgDaysBetweenBookings: number | null = null;
      if (totalBookings >= 2) {
        const sortedDates = bookings
          .map((b) => b.createdAt.getTime())
          .sort((a, b) => a - b);
        const totalSpanDays = (sortedDates[sortedDates.length - 1]! - sortedDates[0]!) / DAY_MS;
        avgDaysBetweenBookings = Math.round((totalSpanDays / (totalBookings - 1)) * 10) / 10;
      }

      // ── Condition trend from checklist results ────────────────────────
      let conditionTrend: ToolPrediction["conditionTrend"] = "unknown";
      const passRates = bookings
        .filter((b) => b.checklistResult != null)
        .map((b) => ({
          time: b.createdAt.getTime(),
          rate: checklistPassRate(b.checklistResult),
        }))
        .filter((x): x is { time: number; rate: number } => x.rate !== null)
        .sort((a, b) => a.time - b.time);

      if (passRates.length >= 3) {
        const reg = linearRegression(
          passRates.map((p) => p.time),
          passRates.map((p) => p.rate)
        );
        if (reg) {
          if (reg.slope > 0.0000000001) conditionTrend = "improving";
          else if (reg.slope < -0.0000000001) conditionTrend = "declining";
          else conditionTrend = "stable";
        }
      } else if (passRates.length > 0) {
        conditionTrend = "stable";
      }

      // ── Days since last maintenance ───────────────────────────────────
      const lastMaint = tool.lastMaintenanceDate ? new Date(tool.lastMaintenanceDate).getTime() : null;
      const nextMaint = tool.nextMaintenanceDate ? new Date(tool.nextMaintenanceDate).getTime() : null;
      const daysSinceLastMaintenance = lastMaint ? Math.floor((now - lastMaint) / DAY_MS) : null;
      const daysUntilNextMaintenance = nextMaint ? Math.floor((nextMaint - now) / DAY_MS) : null;

      // ── Predicted maintenance date (linear regression on booking frequency) ─
      let predictedMaintenanceDate: string | null = null;

      if (totalBookings >= 3 && avgDaysBetweenBookings != null) {
        // Use booking frequency trend: if tool is being used more frequently,
        // it will need maintenance sooner
        const sortedDates = bookings
          .map((b) => b.createdAt.getTime())
          .sort((a, b) => a - b);

        // Calculate inter-booking intervals
        const intervals: number[] = [];
        for (let i = 1; i < sortedDates.length; i++) {
          intervals.push((sortedDates[i]! - sortedDates[i - 1]!) / DAY_MS);
        }

        // Use regression on intervals to predict trend
        const xs = intervals.map((_, i) => i);
        const reg = linearRegression(xs, intervals);

        // Estimate remaining "useful bookings" before maintenance needed
        const maintenanceInterval = tool.maintenanceIntervalDays ?? 90;
        const daysSinceMaint = daysSinceLastMaintenance ?? maintenanceInterval;
        const remainingDays = Math.max(maintenanceInterval - daysSinceMaint, 0);

        if (reg && reg.slope < 0) {
          // Usage is increasing (intervals shrinking) → needs maintenance sooner
          const adjustedDays = Math.max(Math.floor(remainingDays * 0.7), 1);
          const predictedDate = new Date(now + adjustedDays * DAY_MS);
          predictedMaintenanceDate = predictedDate.toISOString().split("T")[0]!;
        } else {
          const predictedDate = new Date(now + remainingDays * DAY_MS);
          predictedMaintenanceDate = predictedDate.toISOString().split("T")[0]!;
        }
      } else if (nextMaint) {
        // Fall back to planned maintenance date
        predictedMaintenanceDate = tool.nextMaintenanceDate;
      }

      // ── Risk score calculation (0-100) ────────────────────────────────
      // Factor 1: Condition (0-30 points)
      const condScore = conditionToScore(tool.condition);
      const conditionRisk = Math.round((1 - condScore / 100) * 30);
      riskScore += conditionRisk;
      if (condScore <= 40) reasons.push("Schlechter Zustand");

      // Factor 2: Overdue maintenance (0-35 points)
      if (daysUntilNextMaintenance !== null) {
        if (daysUntilNextMaintenance < 0) {
          // Overdue
          const overdueDays = Math.abs(daysUntilNextMaintenance);
          riskScore += Math.min(35, Math.round(overdueDays / 7) * 5 + 15);
          reasons.push(`Wartung ${overdueDays} Tage überfällig`);
        } else if (daysUntilNextMaintenance < 14) {
          riskScore += Math.round(15 - daysUntilNextMaintenance);
          reasons.push(`Wartung in ${daysUntilNextMaintenance} Tagen fällig`);
        }
      } else if (daysSinceLastMaintenance !== null && tool.maintenanceIntervalDays) {
        if (daysSinceLastMaintenance > tool.maintenanceIntervalDays) {
          const overdue = daysSinceLastMaintenance - tool.maintenanceIntervalDays;
          riskScore += Math.min(35, Math.round(overdue / 7) * 5 + 10);
          reasons.push(`Wartungsintervall um ${overdue} Tage überschritten`);
        }
      }

      // Factor 3: Condition trend (0-15 points)
      if (conditionTrend === "declining") {
        riskScore += 15;
        reasons.push("Zustandstrend verschlechtert sich");
      } else if (conditionTrend === "improving") {
        riskScore = Math.max(0, riskScore - 5);
      }

      // Factor 4: Heavy usage (0-20 points)
      if (avgDaysBetweenBookings !== null && avgDaysBetweenBookings < 3) {
        riskScore += 15;
        reasons.push("Sehr häufige Nutzung (< 3 Tage Intervall)");
      } else if (avgDaysBetweenBookings !== null && avgDaysBetweenBookings < 7) {
        riskScore += 8;
        reasons.push("Hohe Nutzungshäufigkeit");
      }

      // Factor 5: Age of tool
      if (tool.purchaseDate && tool.expectedLifeYears) {
        const ageYears = (now - new Date(tool.purchaseDate).getTime()) / (DAY_MS * 365);
        const lifeRatio = ageYears / tool.expectedLifeYears;
        if (lifeRatio > 0.9) {
          riskScore += 20;
          reasons.push("Nahe am Ende der erwarteten Lebensdauer");
        } else if (lifeRatio > 0.7) {
          riskScore += 10;
          reasons.push("Über 70% der Lebensdauer erreicht");
        }
      }

      // Clamp
      riskScore = Math.min(100, Math.max(0, riskScore));

      if (reasons.length === 0) reasons.push("Keine Auffälligkeiten");

      const riskLevel: ToolPrediction["riskLevel"] =
        riskScore > 80 ? "critical" : riskScore > 50 ? "warning" : "normal";

      return {
        id: tool.id,
        name: tool.name,
        number: tool.number,
        condition: tool.condition,
        lastMaintenanceDate: tool.lastMaintenanceDate,
        nextMaintenanceDate: tool.nextMaintenanceDate,
        predictedMaintenanceDate,
        avgDaysBetweenBookings,
        totalBookings,
        conditionTrend,
        riskScore,
        riskLevel,
        reasons,
      };
    });

    // Sort by risk (highest first)
    predictions.sort((a, b) => b.riskScore - a.riskScore);

    const summary = {
      critical: predictions.filter((p) => p.riskLevel === "critical").length,
      warning: predictions.filter((p) => p.riskLevel === "warning").length,
      normal: predictions.filter((p) => p.riskLevel === "normal").length,
    };

    return NextResponse.json({ predictions, summary });
  } catch (error) {
    console.error("Maintenance prediction error:", error);
    return NextResponse.json(
      { error: "Interner Serverfehler" },
      { status: 500 }
    );
  }
}
