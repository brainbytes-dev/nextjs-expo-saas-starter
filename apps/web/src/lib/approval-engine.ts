import { getDb } from "@repo/db";
import {
  approvalRequests,
  organizationMembers,
  users,
} from "@repo/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { sendApprovalRequestEmail, sendApprovalDecisionEmail } from "@/lib/email";
import { DEMO_MODE } from "@/lib/demo-mode";

// ─── Request types ────────────────────────────────────────────────────────────

export type ApprovalRequestType = "tool_checkout" | "order" | "stock_change";

export interface ApprovalContext {
  /** For "order" type — total value in CHF (minor units: Rappen) */
  orderValueChf?: number;
}

// ─── Static rule config ───────────────────────────────────────────────────────
// Rules are currently static. Extend to DB-driven config (workflowRules table)
// when org-level customisation is required.

interface ApprovalRule {
  requestType: ApprovalRequestType;
  /** Return true when this rule should trigger approval */
  condition: (ctx: ApprovalContext) => boolean;
  reason: string;
}

const DEFAULT_RULES: ApprovalRule[] = [
  {
    requestType: "tool_checkout",
    condition: () => true, // every tool checkout requires approval
    reason: "Werkzeug-Ausleihe benötigt Genehmigung",
  },
  {
    requestType: "order",
    // Orders above CHF 500 need approval
    condition: (ctx) => (ctx.orderValueChf ?? 0) > 500,
    reason: "Bestellung über CHF 500 benötigt Genehmigung",
  },
];

// ─── needsApproval ────────────────────────────────────────────────────────────

/**
 * Determine whether an action in an organisation requires approval.
 *
 * Returns the matching rule reason string when approval is needed, or null
 * when the action can proceed immediately.
 */
export function needsApproval(
  _orgId: string,
  requestType: ApprovalRequestType,
  context: ApprovalContext = {}
): string | null {
  for (const rule of DEFAULT_RULES) {
    if (rule.requestType === requestType && rule.condition(context)) {
      return rule.reason;
    }
  }
  return null;
}

// ─── createApprovalAndNotify ──────────────────────────────────────────────────

/**
 * Create an approval request row and email all org admins/owners.
 *
 * Returns the newly created approval request.
 */
export async function createApprovalAndNotify(
  orgId: string,
  requesterId: string,
  requestType: ApprovalRequestType,
  entityType: string,
  entityId: string,
  notes?: string
) {
  const db = getDb();

  // Insert approval request
  const [approval] = await db
    .insert(approvalRequests)
    .values({
      organizationId: orgId,
      requestType,
      entityType,
      entityId,
      requesterId,
      status: "pending",
      notes: notes ?? null,
    })
    .returning();

  if (!approval) {
    throw new Error("Failed to create approval request");
  }

  // Fire-and-forget email — do not block the API response
  void notifyAdmins(orgId, requesterId, approval.id, requestType, entityType, entityId).catch(
    (err) => console.error("[approval-engine] notifyAdmins failed:", err)
  );

  return approval;
}

// ─── resolveApproval ─────────────────────────────────────────────────────────

/**
 * Mark an approval request approved or rejected.
 * Caller is responsible for verifying the approver has admin/owner role.
 */
export async function resolveApproval(
  approvalId: string,
  orgId: string,
  approverId: string,
  status: "approved" | "rejected",
  notes?: string
) {
  const db = getDb();

  const [updated] = await db
    .update(approvalRequests)
    .set({
      approverId,
      status,
      resolvedAt: new Date(),
      ...(notes !== undefined ? { notes } : {}),
    })
    .where(
      and(
        eq(approvalRequests.id, approvalId),
        eq(approvalRequests.organizationId, orgId),
        eq(approvalRequests.status, "pending")
      )
    )
    .returning();

  if (!updated) return null;

  // Notify requester — fire-and-forget
  void notifyRequester(updated.requesterId, approverId, status, updated.requestType).catch(
    (err) => console.error("[approval-engine] notifyRequester failed:", err)
  );

  return updated;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function notifyAdmins(
  orgId: string,
  requesterId: string,
  approvalId: string,
  requestType: string,
  entityType: string,
  entityId: string
) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would email admins for approval ${approvalId}`);
    return;
  }

  const db = getDb();

  // Load requester name
  const [requester] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, requesterId))
    .limit(1);

  // Find all admin + owner members of the org
  const adminMembers = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        inArray(organizationMembers.role, ["admin", "owner"])
      )
    );

  if (!adminMembers.length) return;

  const adminUserIds = adminMembers.map((m) => m.userId);
  const adminUsers = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(inArray(users.id, adminUserIds));

  const emailPromises = adminUsers
    .filter((u) => !!u.email)
    .map((admin) =>
      sendApprovalRequestEmail(
        admin.name ?? "Administrator",
        admin.email,
        requester?.name ?? "Unbekannt",
        requestType,
        entityType,
        entityId,
        approvalId
      )
    );

  await Promise.allSettled(emailPromises);
}

async function notifyRequester(
  requesterId: string,
  approverId: string,
  status: "approved" | "rejected",
  requestType: string
) {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would email requester ${requesterId} about ${status}`);
    return;
  }

  const db = getDb();

  const [[requester], [approver]] = await Promise.all([
    db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, requesterId)).limit(1),
    db.select({ name: users.name }).from(users).where(eq(users.id, approverId)).limit(1),
  ]);

  if (!requester?.email) return;

  await sendApprovalDecisionEmail(
    requester.name ?? "Nutzer",
    requester.email,
    approver?.name ?? "Administrator",
    requestType,
    status
  );
}
