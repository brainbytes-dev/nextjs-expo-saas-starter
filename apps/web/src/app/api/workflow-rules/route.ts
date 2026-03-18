import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { workflowRules } from "@repo/db/schema";
import { eq, asc } from "drizzle-orm";

// ─── GET /api/workflow-rules ──────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const rules = await db
      .select()
      .from(workflowRules)
      .where(eq(workflowRules.organizationId, orgId))
      .orderBy(asc(workflowRules.priority), asc(workflowRules.createdAt));

    return NextResponse.json({ data: rules });
  } catch (error) {
    console.error("GET /api/workflow-rules error:", error);
    return NextResponse.json(
      { error: "Regeln konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

// ─── POST /api/workflow-rules ─────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { name, triggerEvent, conditions, actions, priority, isActive } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name ist erforderlich" },
        { status: 400 }
      );
    }

    if (!triggerEvent || typeof triggerEvent !== "string") {
      return NextResponse.json(
        { error: "triggerEvent ist erforderlich" },
        { status: 400 }
      );
    }

    if (!Array.isArray(conditions)) {
      return NextResponse.json(
        { error: "conditions muss ein Array sein" },
        { status: 400 }
      );
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: "actions muss ein nicht-leeres Array sein" },
        { status: 400 }
      );
    }

    const [rule] = await db
      .insert(workflowRules)
      .values({
        organizationId: orgId,
        name: name.trim(),
        triggerEvent,
        conditions,
        actions,
        priority: typeof priority === "number" ? priority : 0,
        isActive: typeof isActive === "boolean" ? isActive : true,
      })
      .returning();

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error("POST /api/workflow-rules error:", error);
    return NextResponse.json(
      { error: "Regel konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
