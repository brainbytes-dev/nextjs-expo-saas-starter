import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { dryRunRule, TRIGGER_EVENTS } from "@/lib/rules-engine";

// ─── POST /api/workflow-rules/[id]/test ───────────────────────────────────────
//
// Dry-run a rule against a provided (or auto-generated) sample context.
// No side effects — returns which conditions match and what actions would fire.

const SAMPLE_CONTEXTS: Record<string, Record<string, unknown>> = {
  "stock.changed": {
    materialId: "sample-material-id",
    materialName: "Schrauben M6",
    materialNumber: "MAT-001",
    locationId: "sample-location-id",
    locationName: "Hauptlager",
    changeType: "out",
    quantity: -50,
    previousQuantity: 100,
    newQuantity: 50,
  },
  "stock.below_reorder": {
    materialId: "sample-material-id",
    materialName: "Schrauben M6",
    materialNumber: "MAT-001",
    locationName: "Hauptlager",
    newQuantity: 5,
    reorderPoint: 20,
  },
  "tool.checked_out": {
    toolId: "sample-tool-id",
    toolName: "Bohrmaschine Bosch",
    checkedOutToName: "Hans Muster",
    checkedOutAt: new Date().toISOString(),
    toolCondition: "good",
  },
  "tool.overdue": {
    toolId: "sample-tool-id",
    toolName: "Bohrmaschine Bosch",
    checkedOutToName: "Hans Muster",
    daysOverdue: 10,
    toolCondition: "good",
  },
  "maintenance.due": {
    toolId: "sample-tool-id",
    toolName: "Bohrmaschine Bosch",
    daysUntilMaintenance: -2,
    lastMaintenanceAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  "commission.created": {
    commissionId: "sample-commission-id",
    commissionNumber: "KOM-2026-001",
    customerName: "Muster AG",
    totalItems: 5,
  },
  "commission.completed": {
    commissionId: "sample-commission-id",
    commissionNumber: "KOM-2026-001",
    customerName: "Muster AG",
    completedAt: new Date().toISOString(),
  },
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { orgId } = result;
    const { id } = await params;

    let userContext: Record<string, unknown> = {};
    try {
      const body = await request.json();
      if (body && typeof body === "object" && !Array.isArray(body)) {
        userContext = body as Record<string, unknown>;
      }
    } catch {
      // Body is optional — use sample data if not provided
    }

    const dryRun = await dryRunRule(orgId, id, userContext);

    if (!dryRun) {
      return NextResponse.json({ error: "Regel nicht gefunden" }, { status: 404 });
    }

    // Resolve the trigger event to provide a sample context hint
    const sampleContext =
      SAMPLE_CONTEXTS[dryRun.ruleId] ??
      SAMPLE_CONTEXTS[Object.keys(SAMPLE_CONTEXTS)[0]!] ??
      {};

    return NextResponse.json({
      ruleId: dryRun.ruleId,
      ruleName: dryRun.ruleName,
      conditionsMatched: dryRun.conditionsMatched,
      matchedConditions: dryRun.matchedConditions,
      failedConditions: dryRun.failedConditions,
      actionsWouldFire: dryRun.actionsWouldFire,
      contextUsed: Object.keys(userContext).length > 0 ? userContext : sampleContext,
    });
  } catch (error) {
    console.error("POST /api/workflow-rules/[id]/test error:", error);
    return NextResponse.json(
      { error: "Test konnte nicht ausgeführt werden" },
      { status: 500 }
    );
  }
}
