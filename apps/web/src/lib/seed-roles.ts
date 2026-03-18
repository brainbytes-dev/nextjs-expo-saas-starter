import { getDb } from "@repo/db";
import { roles, permissions } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { type Resource, type Action, RESOURCES, ACTIONS } from "./rbac";

// ─── Role Definitions ────────────────────────────────────────────────────────

interface RoleDefinition {
  name: string;
  slug: string;
  isSystem: boolean;
  /** Explicitly granted permission pairs. Omitted pairs default to false. */
  grants: Array<{ resource: Resource; actions: Action[] }>;
}

function allActions(...resources: Resource[]): Array<{ resource: Resource; actions: Action[] }> {
  return resources.map((r) => ({ resource: r, actions: ["read", "create", "update", "delete"] as Action[] }));
}

function readOnly(...resources: Resource[]): Array<{ resource: Resource; actions: Action[] }> {
  return resources.map((r) => ({ resource: r, actions: ["read"] as Action[] }));
}

const DEFAULT_ROLES: RoleDefinition[] = [
  {
    name: "Inhaber",
    slug: "inhaber",
    isSystem: true,
    // Owner: everything — the engine short-circuits on this slug, but we
    // still write explicit permissions so the matrix renders correctly.
    grants: RESOURCES.map((r) => ({ resource: r, actions: ACTIONS as Action[] })),
  },
  {
    name: "Administrator",
    slug: "administrator",
    isSystem: true,
    // All permissions except delete-team and delete-settings (org destructive ops)
    grants: RESOURCES.map((r) => ({
      resource: r,
      actions:
        r === "team" || r === "settings"
          ? (["read", "create", "update"] as Action[])
          : (["read", "create", "update", "delete"] as Action[]),
    })),
  },
  {
    name: "Lagerverwalter",
    slug: "lagerverwalter",
    isSystem: true,
    grants: [
      ...allActions("materials", "tools", "keys", "locations", "commissions"),
      ...readOnly("reports"),
      ...readOnly("orders"),     // can view orders
      ...readOnly("suppliers"),  // can view suppliers
      ...readOnly("customers"),  // can view customers
    ],
  },
  {
    name: "Mitarbeiter",
    slug: "mitarbeiter",
    isSystem: true,
    grants: [
      ...readOnly("materials", "tools", "keys"),
      { resource: "commissions", actions: ["read", "create"] as Action[] },
    ],
  },
  {
    name: "Betrachter",
    slug: "betrachter",
    isSystem: true,
    grants: readOnly(...RESOURCES),
  },
];

// ─── Seed Function ───────────────────────────────────────────────────────────

/**
 * Create the 5 default RBAC roles for an organisation.
 * Called from the onboarding wizard when an org is created.
 * Safe to call multiple times — skips roles that already exist by slug.
 */
export async function seedDefaultRoles(orgId: string): Promise<void> {
  const db = getDb();

  for (const roleDef of DEFAULT_ROLES) {
    // Upsert-safe: check if role already exists
    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.organizationId, orgId), eq(roles.slug, roleDef.slug)))
      .limit(1);

    let roleId: string;

    if (existing.length > 0) {
      roleId = existing[0]!.id;
    } else {
      const [inserted] = await db
        .insert(roles)
        .values({
          organizationId: orgId,
          name: roleDef.name,
          slug: roleDef.slug,
          isSystem: roleDef.isSystem,
        })
        .returning({ id: roles.id });

      if (!inserted) continue;
      roleId = inserted.id;
    }

    // Build the full permission matrix for this role (all resource×action combinations)
    const permRows: Array<{ roleId: string; resource: string; action: string; allowed: boolean }> = [];

    for (const res of RESOURCES) {
      for (const act of ACTIONS) {
        const grant = roleDef.grants.find((g) => g.resource === res);
        const allowed = grant ? grant.actions.includes(act) : false;
        permRows.push({ roleId, resource: res, action: act, allowed });
      }
    }

    // Delete old permissions for this role and re-insert (idempotent re-seed)
    if (existing.length > 0) {
      await db.delete(permissions).where(eq(permissions.roleId, roleId));
    }

    await db.insert(permissions).values(permRows);
  }
}

/**
 * Get the ID of the "Inhaber" role for a given org.
 * Useful for auto-assigning the owner role when creating an org.
 */
export async function getOwnerRoleId(orgId: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.organizationId, orgId), eq(roles.slug, "inhaber")))
    .limit(1);
  return row?.id ?? null;
}
