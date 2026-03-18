import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { approvalRequests, users, organizationMembers } from "@repo/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { resolveApproval } from "@/lib/approval-engine";

// ─── GET /api/approvals/[id] ──────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [row] = await db
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
      .where(
        and(
          eq(approvalRequests.id, id),
          eq(approvalRequests.organizationId, orgId)
        )
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Genehmigung nicht gefunden" }, { status: 404 });
    }

    const userIds = [row.requesterId, ...(row.approverId ? [row.approverId] : [])];
    const userRows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, userIds));

    const userMap: Record<string, { name: string | null; email: string }> = {};
    for (const u of userRows) {
      userMap[u.id] = { name: u.name, email: u.email };
    }

    return NextResponse.json({
      ...row,
      requesterName: userMap[row.requesterId]?.name ?? null,
      requesterEmail: userMap[row.requesterId]?.email ?? null,
      approverName: row.approverId ? (userMap[row.approverId]?.name ?? null) : null,
    });
  } catch (error) {
    console.error("GET /api/approvals/[id] error:", error);
    return NextResponse.json(
      { error: "Genehmigung konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/approvals/[id] ────────────────────────────────────────────────
// Body: { status: "approved" | "rejected", notes?: string }
// Only admins/owners may approve or reject.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    // Verify caller is admin or owner
    const [membership] = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership || !["admin", "owner"].includes(membership.role ?? "")) {
      return NextResponse.json(
        { error: "Nur Administratoren und Inhaber können Genehmigungen erteilen" },
        { status: 403 }
      );
    }

    // Validate body
    const body = await request.json();
    const { status, notes } = body as { status?: string; notes?: string };

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: 'status muss "approved" oder "rejected" sein' },
        { status: 400 }
      );
    }

    const updated = await resolveApproval(
      id,
      orgId,
      session.user.id,
      status as "approved" | "rejected",
      notes
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Genehmigung nicht gefunden oder bereits entschieden" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/approvals/[id] error:", error);
    return NextResponse.json(
      { error: "Genehmigung konnte nicht aktualisiert werden" },
      { status: 500 }
    );
  }
}
