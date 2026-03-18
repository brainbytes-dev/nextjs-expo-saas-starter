import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { workflowRules } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// ─── PATCH /api/workflow-rules/[id] ──────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;
    const { id } = await params;

    // Verify rule belongs to org
    const [existing] = await db
      .select({ id: workflowRules.id })
      .from(workflowRules)
      .where(
        and(eq(workflowRules.id, id), eq(workflowRules.organizationId, orgId))
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Regel nicht gefunden" }, { status: 404 });
    }

    const body = await request.json();
    const { name, triggerEvent, conditions, actions, priority, isActive } = body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof name === "string" && name.trim().length > 0) {
      updates.name = name.trim();
    }
    if (typeof triggerEvent === "string") {
      updates.triggerEvent = triggerEvent;
    }
    if (Array.isArray(conditions)) {
      updates.conditions = conditions;
    }
    if (Array.isArray(actions)) {
      updates.actions = actions;
    }
    if (typeof priority === "number") {
      updates.priority = priority;
    }
    if (typeof isActive === "boolean") {
      updates.isActive = isActive;
    }

    const [updated] = await db
      .update(workflowRules)
      .set(updates)
      .where(
        and(eq(workflowRules.id, id), eq(workflowRules.organizationId, orgId))
      )
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/workflow-rules/[id] error:", error);
    return NextResponse.json(
      { error: "Regel konnte nicht aktualisiert werden" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/workflow-rules/[id] ─────────────────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;
    const { id } = await params;

    const deleted = await db
      .delete(workflowRules)
      .where(
        and(eq(workflowRules.id, id), eq(workflowRules.organizationId, orgId))
      )
      .returning({ id: workflowRules.id });

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Regel nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/workflow-rules/[id] error:", error);
    return NextResponse.json(
      { error: "Regel konnte nicht gelöscht werden" },
      { status: 500 }
    );
  }
}
