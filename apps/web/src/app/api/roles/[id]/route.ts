import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { roles, permissions } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { hasPermission, RESOURCES, ACTIONS } from "@/lib/rbac";

// ─── GET /api/roles/[id] — role with permissions ──────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const { id } = await params;

    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, id), eq(roles.organizationId, orgId)))
      .limit(1);

    if (!role) {
      return NextResponse.json({ error: "Rolle nicht gefunden" }, { status: 404 });
    }

    const perms = await db
      .select({
        resource: permissions.resource,
        action: permissions.action,
        allowed: permissions.allowed,
      })
      .from(permissions)
      .where(eq(permissions.roleId, id));

    // Build a nested map for easy consumption by the frontend
    const permMap: Record<string, Record<string, boolean>> = {};
    for (const res of RESOURCES) {
      permMap[res] = {};
      for (const act of ACTIONS) {
        permMap[res][act] = false;
      }
    }
    for (const p of perms) {
      if (permMap[p.resource]) {
        permMap[p.resource]![p.action] = p.allowed;
      }
    }

    return NextResponse.json({ ...role, permissions: permMap });
  } catch (error) {
    console.error("GET /api/roles/[id] error:", error);
    return NextResponse.json({ error: "Rolle konnte nicht geladen werden" }, { status: 500 });
  }
}

// ─── PATCH /api/roles/[id] — update permissions ───────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const allowed = await hasPermission(session.user.id, orgId, "team", "update");
    if (!allowed) {
      return NextResponse.json({ error: "Keine Berechtigung zum Bearbeiten von Rollen" }, { status: 403 });
    }

    const { id } = await params;

    const [role] = await db
      .select({ id: roles.id, isSystem: roles.isSystem, slug: roles.slug })
      .from(roles)
      .where(and(eq(roles.id, id), eq(roles.organizationId, orgId)))
      .limit(1);

    if (!role) {
      return NextResponse.json({ error: "Rolle nicht gefunden" }, { status: 404 });
    }

    const body = await request.json() as {
      name?: string;
      permissions?: Record<string, Record<string, boolean>>;
    };

    // Update name if provided (system roles may still be renamed)
    if (body.name?.trim()) {
      await db
        .update(roles)
        .set({ name: body.name.trim(), updatedAt: new Date() })
        .where(eq(roles.id, id));
    }

    // System roles "inhaber" and "administrator" cannot have their permissions changed
    if (role.slug === "inhaber" || role.slug === "administrator") {
      return NextResponse.json(
        { error: "Berechtigungen von Systemrollen können nicht geändert werden" },
        { status: 403 }
      );
    }

    if (body.permissions) {
      // Delete + re-insert is safer than individual upserts for this matrix
      await db.delete(permissions).where(eq(permissions.roleId, id));

      const rows = [];
      for (const res of RESOURCES) {
        for (const act of ACTIONS) {
          rows.push({
            roleId: id,
            resource: res as string,
            action: act as string,
            allowed: body.permissions[res]?.[act] ?? false,
          });
        }
      }
      await db.insert(permissions).values(rows);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/roles/[id] error:", error);
    return NextResponse.json({ error: "Rolle konnte nicht aktualisiert werden" }, { status: 500 });
  }
}

// ─── DELETE /api/roles/[id] — remove custom roles only ───────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const allowed = await hasPermission(session.user.id, orgId, "team", "delete");
    if (!allowed) {
      return NextResponse.json({ error: "Keine Berechtigung zum Löschen von Rollen" }, { status: 403 });
    }

    const { id } = await params;

    const [role] = await db
      .select({ id: roles.id, isSystem: roles.isSystem })
      .from(roles)
      .where(and(eq(roles.id, id), eq(roles.organizationId, orgId)))
      .limit(1);

    if (!role) {
      return NextResponse.json({ error: "Rolle nicht gefunden" }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: "Systemrollen können nicht gelöscht werden" }, { status: 403 });
    }

    // Cascade deletes permissions via FK; also clear member assignments
    await db.delete(roles).where(eq(roles.id, id));

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/roles/[id] error:", error);
    return NextResponse.json({ error: "Rolle konnte nicht gelöscht werden" }, { status: 500 });
  }
}
