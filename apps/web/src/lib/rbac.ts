import { NextResponse } from "next/server";
import { getDb } from "@repo/db";
import { roles, permissions, organizationMembers } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";

// ─── Types ───────────────────────────────────────────────────────────────────

export type Resource =
  | "materials"
  | "tools"
  | "keys"
  | "locations"
  | "commissions"
  | "orders"
  | "suppliers"
  | "customers"
  | "reports"
  | "settings"
  | "team"
  | "integrations";

export type Action = "read" | "create" | "update" | "delete";

export type PermissionMap = Record<Resource, Record<Action, boolean>>;

// Context passed to wrapped handlers after permission check
export interface PermissionContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  orgId: string;
  db: ReturnType<typeof getDb>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const RESOURCES: Resource[] = [
  "materials",
  "tools",
  "keys",
  "locations",
  "commissions",
  "orders",
  "suppliers",
  "customers",
  "reports",
  "settings",
  "team",
  "integrations",
];

export const ACTIONS: Action[] = ["read", "create", "update", "delete"];

export const RESOURCE_LABELS: Record<Resource, string> = {
  materials: "Materialien",
  tools: "Werkzeuge",
  keys: "Schlüssel",
  locations: "Lagerorte",
  commissions: "Kommissionen",
  orders: "Bestellungen",
  suppliers: "Lieferanten",
  customers: "Kunden",
  reports: "Berichte",
  settings: "Einstellungen",
  team: "Team",
  integrations: "Integrationen",
};

export const ACTION_LABELS: Record<Action, string> = {
  read: "Lesen",
  create: "Erstellen",
  update: "Bearbeiten",
  delete: "Löschen",
};

// ─── Owner role slug — always full access ────────────────────────────────────

const OWNER_ROLE_SLUG = "inhaber";

// ─── Permission Engine ────────────────────────────────────────────────────────

/**
 * Check whether a user has a specific permission in an organisation.
 *
 * Resolution order:
 *  1. org_member.role === "owner" → always true (safety net)
 *  2. member has an rbacRoleId → look up that role's permissions
 *  3. fall back to legacy role string ("admin" → broad access, "member" → read-only)
 */
export async function hasPermission(
  userId: string,
  orgId: string,
  resource: Resource,
  action: Action
): Promise<boolean> {
  const db = getDb();

  const [membership] = await db
    .select({
      legacyRole: organizationMembers.role,
      rbacRoleId: organizationMembers.rbacRoleId,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, userId)
      )
    )
    .limit(1);

  if (!membership) return false;

  // Legacy owner is always allowed — final safety net
  if (membership.legacyRole === "owner") return true;

  if (membership.rbacRoleId) {
    return checkRbacPermission(membership.rbacRoleId, resource, action, db);
  }

  // Legacy role fallback
  return legacyRoleFallback(membership.legacyRole, resource, action);
}

async function checkRbacPermission(
  roleId: string,
  resource: Resource,
  action: Action,
  db: ReturnType<typeof getDb>
): Promise<boolean> {
  // Fetch role slug (to detect system owner/admin) + the specific permission row
  const [role] = await db
    .select({ slug: roles.slug })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  if (!role) return false;

  // System owner always has full access
  if (role.slug === OWNER_ROLE_SLUG) return true;

  const [perm] = await db
    .select({ allowed: permissions.allowed })
    .from(permissions)
    .where(
      and(
        eq(permissions.roleId, roleId),
        eq(permissions.resource, resource),
        eq(permissions.action, action)
      )
    )
    .limit(1);

  return perm?.allowed ?? false;
}

function legacyRoleFallback(
  legacyRole: string | null,
  resource: Resource,
  action: Action
): boolean {
  if (legacyRole === "admin") {
    // Admins can do everything except delete team members / settings
    if (resource === "team" && action === "delete") return false;
    if (resource === "settings" && action === "delete") return false;
    return true;
  }
  // Plain members: read-only on everything
  if (legacyRole === "member") {
    return action === "read";
  }
  return false;
}

/**
 * Get the full permission map for a user in an organisation.
 * Returns a nested Record<resource, Record<action, boolean>>.
 */
export async function getUserPermissions(
  userId: string,
  orgId: string
): Promise<PermissionMap> {
  // Build empty map
  const map = {} as PermissionMap;
  for (const r of RESOURCES) {
    map[r] = {} as Record<Action, boolean>;
    for (const a of ACTIONS) {
      map[r][a] = false;
    }
  }

  const db = getDb();

  const [membership] = await db
    .select({
      legacyRole: organizationMembers.role,
      rbacRoleId: organizationMembers.rbacRoleId,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, userId)
      )
    )
    .limit(1);

  if (!membership) return map;

  if (membership.legacyRole === "owner") {
    // Grant everything
    for (const r of RESOURCES) {
      for (const a of ACTIONS) {
        map[r][a] = true;
      }
    }
    return map;
  }

  if (membership.rbacRoleId) {
    const [role] = await db
      .select({ slug: roles.slug })
      .from(roles)
      .where(eq(roles.id, membership.rbacRoleId))
      .limit(1);

    if (role?.slug === OWNER_ROLE_SLUG) {
      for (const r of RESOURCES) {
        for (const a of ACTIONS) {
          map[r][a] = true;
        }
      }
      return map;
    }

    const perms = await db
      .select({
        resource: permissions.resource,
        action: permissions.action,
        allowed: permissions.allowed,
      })
      .from(permissions)
      .where(eq(permissions.roleId, membership.rbacRoleId));

    for (const p of perms) {
      const r = p.resource as Resource;
      const a = p.action as Action;
      if (RESOURCES.includes(r) && ACTIONS.includes(a)) {
        map[r][a] = p.allowed;
      }
    }
    return map;
  }

  // Legacy role fallback — populate map
  for (const r of RESOURCES) {
    for (const a of ACTIONS) {
      map[r][a] = legacyRoleFallback(membership.legacyRole, r, a);
    }
  }
  return map;
}

// ─── withPermission middleware wrapper ───────────────────────────────────────

type RouteHandler = (
  request: Request,
  ctx: PermissionContext
) => Promise<Response>;

/**
 * Higher-order function that checks RBAC permission before running the handler.
 *
 * Usage:
 * ```ts
 * export const GET = withPermission("materials", "read")(async (request, { session, orgId, db }) => {
 *   // handler
 * });
 * ```
 */
export function withPermission(resource: Resource, action: Action) {
  return function wrap(handler: RouteHandler) {
    return async function (request: Request): Promise<Response> {
      try {
        const result = await getSessionAndOrg(request);
        if (result.error) return result.error;

        const { session, orgId, db } = result;

        const allowed = await hasPermission(session.user.id, orgId, resource, action);
        if (!allowed) {
          return NextResponse.json(
            { error: "Keine Berechtigung für diese Aktion" },
            { status: 403 }
          );
        }

        return handler(request, { session, orgId, db });
      } catch (error) {
        console.error(`[withPermission] ${resource}:${action} error:`, error);
        return NextResponse.json(
          { error: "Interner Serverfehler" },
          { status: 500 }
        );
      }
    };
  };
}
