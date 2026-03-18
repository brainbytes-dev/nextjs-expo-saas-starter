import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { tools, maintenanceEvents, auditLog } from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";

// POST /api/tools/[id]/maintenance
// Records a maintenance event and updates the tool's maintenance dates.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    // Verify tool belongs to org
    const [tool] = await db
      .select()
      .from(tools)
      .where(and(eq(tools.id, id), eq(tools.organizationId, orgId)))
      .limit(1);

    if (!tool) {
      return NextResponse.json({ error: "Werkzeug nicht gefunden" }, { status: 404 });
    }

    const body = await request.json() as {
      notes?: string;
      performedBy?: string; // user id
      performedAt?: string; // ISO date string
    };

    const performedAt = body.performedAt ? new Date(body.performedAt) : new Date();

    // Calculate next maintenance date
    let nextMaintenanceDate: string | null = null;
    if (tool.maintenanceIntervalDays) {
      const next = new Date(performedAt);
      next.setDate(next.getDate() + tool.maintenanceIntervalDays);
      nextMaintenanceDate = next.toISOString().split("T")[0]!;
    }

    const performedAtDateStr = performedAt.toISOString().split("T")[0]!;

    // Insert maintenance event record
    const [event] = await db
      .insert(maintenanceEvents)
      .values({
        organizationId: orgId,
        toolId: id,
        performedById: body.performedBy ?? session.user.id,
        performedAt,
        notes: body.notes ?? null,
        createdAt: new Date(),
      })
      .returning();

    // Update tool dates
    const [updatedTool] = await db
      .update(tools)
      .set({
        lastMaintenanceDate: performedAtDateStr,
        nextMaintenanceDate,
        updatedAt: new Date(),
      })
      .where(eq(tools.id, id))
      .returning();

    // Audit log
    await db.insert(auditLog).values([
      {
        organizationId: orgId,
        objectType: "tool",
        objectId: id,
        userId: session.user.id,
        field: "lastMaintenanceDate",
        oldValue: tool.lastMaintenanceDate ?? "",
        newValue: performedAtDateStr,
      },
      ...(nextMaintenanceDate
        ? [
            {
              organizationId: orgId,
              objectType: "tool",
              objectId: id,
              userId: session.user.id,
              field: "nextMaintenanceDate",
              oldValue: tool.nextMaintenanceDate ?? "",
              newValue: nextMaintenanceDate,
            },
          ]
        : []),
    ]);

    return NextResponse.json({ tool: updatedTool, event });
  } catch (error) {
    console.error("POST /api/tools/[id]/maintenance error:", error);
    return NextResponse.json(
      { error: "Wartung konnte nicht gespeichert werden" },
      { status: 500 }
    );
  }
}

// GET /api/tools/[id]/maintenance — list maintenance history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // Verify tool belongs to org
    const [tool] = await db
      .select({ id: tools.id })
      .from(tools)
      .where(and(eq(tools.id, id), eq(tools.organizationId, orgId)))
      .limit(1);

    if (!tool) {
      return NextResponse.json({ error: "Werkzeug nicht gefunden" }, { status: 404 });
    }

    const events = await db
      .select()
      .from(maintenanceEvents)
      .where(eq(maintenanceEvents.toolId, id))
      .orderBy(desc(maintenanceEvents.performedAt))
      .limit(50);

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET /api/tools/[id]/maintenance error:", error);
    return NextResponse.json(
      { error: "Wartungshistorie konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}
