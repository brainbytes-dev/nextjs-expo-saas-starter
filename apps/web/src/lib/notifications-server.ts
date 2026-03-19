/**
 * notifications-server.ts
 *
 * Server-side helper for creating in-app notifications.
 * Import this ONLY in server components, API routes, and Inngest functions.
 * Never import in client components — it depends on @repo/db.
 */

import { getDb } from "@repo/db";
import { notifications, organizationMembers } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export type NotificationType =
  | "low_stock"
  | "maintenance_due"
  | "approval_request"
  | "approval_resolved"
  | "comment_mention"
  | "tool_overdue"
  | "expiry_warning";

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Inserts a single notification row.
 * Silently swallows errors so callers never have to worry about this
 * blocking the main flow (fail-open pattern consistent with the rest of the app).
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<void> {
  try {
    const db = getDb();
    await db.insert(notifications).values({
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      isRead: false,
    });
  } catch (err) {
    console.error("[notifications-server] createNotification failed:", err);
  }
}

/**
 * Create a notification for every admin/owner in an organisation.
 * Useful for approval requests and org-wide alerts.
 */
export async function createNotificationForAdmins(
  input: Omit<CreateNotificationInput, "userId">
): Promise<void> {
  try {
    const db = getDb();

    const adminMembers = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, input.organizationId),
          // role is stored as "owner" | "admin" | "member" in the members table
          eq(organizationMembers.role, "owner")
        )
      );

    // Also fetch admin-role members
    const adminRoleMembers = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, input.organizationId),
          eq(organizationMembers.role, "admin")
        )
      );

    const allAdminIds = [
      ...new Set([
        ...adminMembers.map((r) => r.userId),
        ...adminRoleMembers.map((r) => r.userId),
      ]),
    ];

    if (allAdminIds.length === 0) return;

    await Promise.allSettled(
      allAdminIds.map((userId) =>
        createNotification({ ...input, userId })
      )
    );
  } catch (err) {
    console.error(
      "[notifications-server] createNotificationForAdmins failed:",
      err
    );
  }
}

/**
 * Create a notification for every member in an organisation (e.g. low-stock
 * alerts that every team member should see).
 */
export async function createNotificationForAllMembers(
  input: Omit<CreateNotificationInput, "userId">
): Promise<void> {
  try {
    const db = getDb();

    const members = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, input.organizationId));

    if (members.length === 0) return;

    await Promise.allSettled(
      members.map((m) =>
        createNotification({ ...input, userId: m.userId })
      )
    );
  } catch (err) {
    console.error(
      "[notifications-server] createNotificationForAllMembers failed:",
      err
    );
  }
}
