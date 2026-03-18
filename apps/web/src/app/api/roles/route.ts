import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { roles, permissions } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { hasPermission } from "@/lib/rbac";
import { RESOURCES, ACTIONS } from "@/lib/rbac";

// ─── GET /api/roles — list roles for the org ─────────────────────────────────

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // Any member may view roles (needed to populate dropdowns)
    const rows = await db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        isSystem: roles.isSystem,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .where(eq(roles.organizationId, orgId))
      .orderBy(roles.createdAt);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/roles error:", error);
    return NextResponse.json({ error: "Rollen konnten nicht geladen werden" }, { status: 500 });
  }
}

// ─── POST /api/roles — create a custom role ───────────────────────────────────

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const allowed = await hasPermission(session.user.id, orgId, "team", "create");
    if (!allowed) {
      return NextResponse.json({ error: "Keine Berechtigung zum Erstellen von Rollen" }, { status: 403 });
    }

    const body = await request.json() as { name?: string; permissions?: Record<string, Record<string, boolean>> };
    const { name, permissions: permMap } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Rollenname ist erforderlich" }, { status: 400 });
    }

    // Derive slug from name
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 50);

    // Check uniqueness
    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.organizationId, orgId), eq(roles.slug, slug)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: "Eine Rolle mit diesem Namen existiert bereits" }, { status: 409 });
    }

    const [role] = await db
      .insert(roles)
      .values({
        organizationId: orgId,
        name: name.trim(),
        slug,
        isSystem: false,
      })
      .returning();

    if (!role) throw new Error("Insert failed");

    // Insert permissions if provided
    if (permMap) {
      const rows = [];
      for (const res of RESOURCES) {
        for (const act of ACTIONS) {
          rows.push({
            roleId: role.id,
            resource: res as string,
            action: act as string,
            allowed: permMap[res]?.[act] ?? false,
          });
        }
      }
      await db.insert(permissions).values(rows);
    } else {
      // Default: no permissions (explicit deny-all for custom roles)
      const rows = RESOURCES.flatMap((res) =>
        ACTIONS.map((act) => ({ roleId: role.id, resource: res as string, action: act as string, allowed: false }))
      );
      await db.insert(permissions).values(rows);
    }

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("POST /api/roles error:", error);
    return NextResponse.json({ error: "Rolle konnte nicht erstellt werden" }, { status: 500 });
  }
}
