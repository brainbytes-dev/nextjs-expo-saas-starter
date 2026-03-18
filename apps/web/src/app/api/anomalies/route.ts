import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { runAnomalyDetection } from "@/lib/anomaly-detection";
import { DEMO_MODE } from "@/lib/demo-mode";
import type { AnomalyEvent } from "@/lib/anomaly-detection";

// ── Demo fixtures ──────────────────────────────────────────────────────────

const DEMO_ANOMALIES: AnomalyEvent[] = [
  {
    id: "demo-001",
    type: "bulk_withdrawal",
    severity: "high",
    description:
      "Massenentnahme erkannt: 500 Stk. Kabel NYM 3x1.5 auf einmal ausgebucht (normal: ~20 Stk.)",
    materialId: "demo-mat-1",
    materialName: "Kabel NYM 3x1.5",
    userId: "demo-user-1",
    userName: "Max Müller",
    locationName: "Hauptlager",
    quantity: 500,
    expectedRange: { min: 0, max: 40 },
    detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "demo-002",
    type: "off_hours",
    severity: "high",
    description:
      "Buchung nachts um 02:34 Uhr: 80 Stk. Schrauben M8x40 von Unbekannt",
    materialId: "demo-mat-2",
    materialName: "Schrauben M8x40",
    userId: "demo-user-2",
    userName: "Anna Schmidt",
    locationName: "Lager B",
    quantity: 80,
    detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
  },
  {
    id: "demo-003",
    type: "consumption_spike",
    severity: "medium",
    description:
      "Verbrauchsspitze erkannt: 340 Stk. ausgebucht (normaler Tagesdurchschnitt: 45 Stk.)",
    quantity: 340,
    expectedRange: { min: 0, max: 60 },
    detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
  },
  {
    id: "demo-004",
    type: "unusual_quantity",
    severity: "medium",
    description:
      "Ungewöhnliche Ausbuchungsmenge: 150 Stk. von Dübel 10mm Fischer (normal: 10–30 Stk.)",
    materialId: "demo-mat-3",
    materialName: "Dübel 10mm Fischer",
    userId: "demo-user-3",
    userName: "Peter Keller",
    locationName: "Aussenlager",
    quantity: 150,
    expectedRange: { min: 10, max: 30 },
    detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
    stockChangeId: "demo-sc-1",
  },
  {
    id: "demo-005",
    type: "unusual_location",
    severity: "low",
    description:
      'Ungewöhnlicher Transferlagerort für Handschuhe Nitril L: "Baustelle Nord" wurde bisher nicht verwendet',
    materialId: "demo-mat-4",
    materialName: "Handschuhe Nitril L",
    userId: "demo-user-1",
    userName: "Max Müller",
    locationName: "Baustelle Nord",
    quantity: 50,
    detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    stockChangeId: "demo-sc-2",
  },
];

// ── GET /api/anomalies ─────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { orgId } = result;

    if (DEMO_MODE) {
      return NextResponse.json({ data: DEMO_ANOMALIES, total: DEMO_ANOMALIES.length });
    }

    const anomalies = await runAnomalyDetection(orgId);

    return NextResponse.json({
      data: anomalies,
      total: anomalies.length,
      highCount: anomalies.filter((a) => a.severity === "high").length,
      mediumCount: anomalies.filter((a) => a.severity === "medium").length,
      lowCount: anomalies.filter((a) => a.severity === "low").length,
    });
  } catch (error) {
    console.error("GET /api/anomalies error:", error);
    return NextResponse.json(
      { error: "Anomalieerkennung fehlgeschlagen" },
      { status: 500 }
    );
  }
}
