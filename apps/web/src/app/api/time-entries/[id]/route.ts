import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { timeEntries } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// ─── PATCH /api/time-entries/[id] ────────────────────────────────────────────
// Stop a running timer OR update fields on an existing entry.
// To stop: { action: "stop" } — sets endTime=now, calculates durationMinutes.
// To update: { description?, billable?, hourlyRate?, commissionId?, projectId?,
//              startTime?, endTime?, status? }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;
    const { id } = await params;

    const body = (await request.json()) as {
      action?: "stop";
      description?: string | null;
      billable?: boolean;
      hourlyRate?: number | null;
      commissionId?: string | null;
      projectId?: string | null;
      startTime?: string;
      endTime?: string;
      status?: string;
    };

    // Verify the entry belongs to this org
    const [existing] = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.id, id), eq(timeEntries.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Zeiteintrag nicht gefunden" },
        { status: 404 }
      );
    }

    // Stop action
    if (body.action === "stop") {
      if (existing.status !== "running") {
        return NextResponse.json(
          { error: "Timer läuft nicht" },
          { status: 400 }
        );
      }

      const endTime = new Date();
      const durationMinutes = Math.round(
        (endTime.getTime() - existing.startTime.getTime()) / 60000
      );

      const [updated] = await db
        .update(timeEntries)
        .set({
          endTime,
          durationMinutes,
          status: "stopped",
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, id))
        .returning();

      return NextResponse.json(updated);
    }

    // General update
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.description !== undefined)
      updates.description = body.description?.trim() || null;
    if (body.billable !== undefined) updates.billable = body.billable;
    if (body.hourlyRate !== undefined) updates.hourlyRate = body.hourlyRate;
    if (body.commissionId !== undefined)
      updates.commissionId = body.commissionId || null;
    if (body.projectId !== undefined)
      updates.projectId = body.projectId || null;
    if (body.status !== undefined) updates.status = body.status;

    // Manual time editing
    if (body.startTime !== undefined) {
      updates.startTime = new Date(body.startTime);
    }
    if (body.endTime !== undefined) {
      updates.endTime = new Date(body.endTime);
    }

    // Recalculate duration if both start and end are known
    const finalStart = body.startTime
      ? new Date(body.startTime)
      : existing.startTime;
    const finalEnd = body.endTime
      ? new Date(body.endTime)
      : existing.endTime;

    if (finalStart && finalEnd) {
      updates.durationMinutes = Math.round(
        (finalEnd.getTime() - finalStart.getTime()) / 60000
      );
    }

    const [updated] = await db
      .update(timeEntries)
      .set(updates)
      .where(eq(timeEntries.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/time-entries/[id] error:", error);
    return NextResponse.json(
      { error: "Zeiteintrag konnte nicht aktualisiert werden" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/time-entries/[id] ───────────────────────────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;
    const { id } = await params;

    const [deleted] = await db
      .delete(timeEntries)
      .where(and(eq(timeEntries.id, id), eq(timeEntries.organizationId, orgId)))
      .returning({ id: timeEntries.id });

    if (!deleted) {
      return NextResponse.json(
        { error: "Zeiteintrag nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/time-entries/[id] error:", error);
    return NextResponse.json(
      { error: "Zeiteintrag konnte nicht gelöscht werden" },
      { status: 500 }
    );
  }
}
