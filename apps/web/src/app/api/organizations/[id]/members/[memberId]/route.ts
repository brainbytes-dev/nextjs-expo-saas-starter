import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { organizationMembers } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const headers = new Headers(request.headers);
    headers.set("x-organization-id", id);

    const result = await getSessionAndOrg(new Request(request.url, { headers }));
    if (result.error) return result.error;
    const { db, orgId, session, membership } = result;

    // Fetch the member record to be deleted
    const [target] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organizationId, orgId)
        )
      )
      .limit(1);

    if (!target) {
      return NextResponse.json(
        { error: "Mitglied nicht gefunden" },
        { status: 404 }
      );
    }

    // Cannot remove the owner
    if (target.role === "owner") {
      return NextResponse.json(
        { error: "Der Eigentümer kann nicht entfernt werden" },
        { status: 403 }
      );
    }

    // Only owner/admin can remove others; any member can remove themselves
    const isSelf = target.userId === session.user.id;
    const isPrivileged =
      membership.role === "owner" || membership.role === "admin";

    if (!isSelf && !isPrivileged) {
      return NextResponse.json(
        { error: "Keine Berechtigung" },
        { status: 403 }
      );
    }

    await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/organizations/[id]/members/[memberId] error:", error);
    return NextResponse.json(
      { error: "Mitglied konnte nicht entfernt werden" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const headers = new Headers(request.headers);
    headers.set("x-organization-id", id);

    const result = await getSessionAndOrg(new Request(request.url, { headers }));
    if (result.error) return result.error;
    const { db, orgId, membership } = result;

    // Only owner/admin may change role assignments
    const isPrivileged =
      membership.role === "owner" || membership.role === "admin";

    if (!isPrivileged) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const [target] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.id, memberId),
          eq(organizationMembers.organizationId, orgId)
        )
      )
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 });
    }

    // Cannot reassign the owner's role
    if (target.role === "owner") {
      return NextResponse.json(
        { error: "Die Rolle des Eigentümers kann nicht geändert werden" },
        { status: 403 }
      );
    }

    const body = await request.json() as { rbacRoleId?: string | null };

    await db
      .update(organizationMembers)
      .set({ rbacRoleId: body.rbacRoleId ?? null, updatedAt: new Date() })
      .where(eq(organizationMembers.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/organizations/[id]/members/[memberId] error:", error);
    return NextResponse.json(
      { error: "Rolle konnte nicht zugewiesen werden" },
      { status: 500 }
    );
  }
}
