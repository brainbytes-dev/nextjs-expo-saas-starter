import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { approvalRequests, users } from "@repo/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { createApprovalAndNotify } from "@/lib/approval-engine";

// ─── GET /api/approvals ───────────────────────────────────────────────────────
// Query params:
//   status      = "pending" | "approved" | "rejected"  (optional)
//   requesterId = uuid  (optional)

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const requesterId = url.searchParams.get("requesterId");

    const conditions = [eq(approvalRequests.organizationId, orgId)];

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      conditions.push(eq(approvalRequests.status, status));
    }
    if (requesterId) {
      conditions.push(eq(approvalRequests.requesterId, requesterId));
    }

    const rows = await db
      .select({
        id: approvalRequests.id,
        requestType: approvalRequests.requestType,
        entityType: approvalRequests.entityType,
        entityId: approvalRequests.entityId,
        status: approvalRequests.status,
        requestedAt: approvalRequests.requestedAt,
        resolvedAt: approvalRequests.resolvedAt,
        notes: approvalRequests.notes,
        requesterId: approvalRequests.requesterId,
        approverId: approvalRequests.approverId,
      })
      .from(approvalRequests)
      .where(and(...conditions))
      .orderBy(desc(approvalRequests.requestedAt))
      .limit(200);

    if (rows.length === 0) {
      return NextResponse.json([]);
    }

    // Collect all referenced user IDs
    const userIdSet = new Set<string>();
    for (const row of rows) {
      userIdSet.add(row.requesterId);
      if (row.approverId) userIdSet.add(row.approverId);
    }
    const userIds = Array.from(userIdSet);

    const userRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, userIds));

    const userMap: Record<string, { name: string | null; email: string }> = {};
    for (const u of userRows) {
      userMap[u.id] = { name: u.name, email: u.email };
    }

    const enriched = rows.map((row) => ({
      ...row,
      requesterName: userMap[row.requesterId]?.name ?? null,
      requesterEmail: userMap[row.requesterId]?.email ?? null,
      approverName: row.approverId ? (userMap[row.approverId]?.name ?? null) : null,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET /api/approvals error:", error);
    return NextResponse.json(
      { error: "Genehmigungen konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

// ─── POST /api/approvals ──────────────────────────────────────────────────────
// Body: { requestType, entityType, entityId, notes? }

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { orgId, session } = result;

    const body = await request.json();
    const { requestType, entityType, entityId, notes } = body as {
      requestType?: string;
      entityType?: string;
      entityId?: string;
      notes?: string;
    };

    if (!requestType || !entityType || !entityId) {
      return NextResponse.json(
        { error: "requestType, entityType und entityId sind erforderlich" },
        { status: 400 }
      );
    }

    const VALID_TYPES = ["tool_checkout", "order", "stock_change"];
    if (!VALID_TYPES.includes(requestType)) {
      return NextResponse.json(
        { error: `Ungültiger requestType. Erlaubt: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const approval = await createApprovalAndNotify(
      orgId,
      session.user.id,
      requestType as "tool_checkout" | "order" | "stock_change",
      entityType,
      entityId,
      notes
    );

    return NextResponse.json(approval, { status: 201 });
  } catch (error) {
    console.error("POST /api/approvals error:", error);
    return NextResponse.json(
      { error: "Genehmigungsanfrage konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
