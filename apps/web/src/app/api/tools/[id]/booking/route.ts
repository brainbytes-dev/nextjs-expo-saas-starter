import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { tools, toolBookings } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { needsApproval, createApprovalAndNotify } from "@/lib/approval-engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: toolId } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    // Verify tool belongs to org
    const [tool] = await db
      .select()
      .from(tools)
      .where(and(eq(tools.id, toolId), eq(tools.organizationId, orgId)))
      .limit(1);

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const body = await request.json();
    const { bookingType, fromLocationId, toLocationId, notes, checklistResult } = body;

    if (!bookingType) {
      return NextResponse.json(
        { error: "bookingType is required" },
        { status: 400 }
      );
    }

    if (!["checkout", "checkin", "transfer"].includes(bookingType)) {
      return NextResponse.json(
        { error: "Invalid bookingType. Must be checkout, checkin, or transfer" },
        { status: 400 }
      );
    }

    // ── Approval gate (checkout only) ────────────────────────────────────────
    if (bookingType === "checkout") {
      const reason = needsApproval(orgId, "tool_checkout", {});
      if (reason) {
        const approval = await createApprovalAndNotify(
          orgId,
          session.user.id,
          "tool_checkout",
          "tool",
          toolId,
          notes
        );
        return NextResponse.json(
          {
            requiresApproval: true,
            reason,
            approvalId: approval.id,
          },
          { status: 202 }
        );
      }
    }

    // Create booking entry
    const [booking] = await db
      .insert(toolBookings)
      .values({
        organizationId: orgId,
        toolId,
        userId: session.user.id,
        bookingType,
        fromLocationId,
        toLocationId,
        notes,
        checklistResult: checklistResult ?? null,
      })
      .returning();

    // Update tool assignment based on booking type
    const toolUpdates: Record<string, unknown> = { updatedAt: new Date() };

    switch (bookingType) {
      case "checkout":
        toolUpdates.assignedToId = session.user.id;
        toolUpdates.assignedLocationId = toLocationId || null;
        break;
      case "checkin":
        toolUpdates.assignedToId = null;
        toolUpdates.assignedLocationId = toLocationId || tool.homeLocationId;
        break;
      case "transfer":
        toolUpdates.assignedLocationId = toLocationId;
        break;
    }

    await db.update(tools).set(toolUpdates).where(eq(tools.id, toolId));

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("POST /api/tools/[id]/booking error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
