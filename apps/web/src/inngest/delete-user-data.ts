import { inngest } from "@/lib/inngest";
import { getDb } from "@repo/db";
import {
  users,
  sessions,
  organizationMembers,
  stockChanges,
  toolBookings,
  timeEntries,
  comments,
  commissions,
  commissionEntries,
  notifications,
  auditLog,
  approvalRequests,
  reservations,
} from "@repo/db/schema";
import { eq } from "drizzle-orm";

/**
 * DSGVO Art. 17 — Recht auf Loeschung
 *
 * This function runs 30 days after a user requests account deletion.
 * It verifies the deletion is still pending (not cancelled), then:
 * 1. Deletes all user-related data across tables
 * 2. Anonymizes audit log entries (sets userId to null)
 * 3. Deletes the user account itself
 * 4. Sends a final confirmation email
 */
export const deleteUserDataFn = inngest.createFunction(
  {
    id: "dsgvo-delete-user-data",
    retries: 3,
  },
  { event: "dsgvo/deletion.requested" },
  async ({ event, step }) => {
    const { userId, email, name, orgId } = event.data;

    // Wait 30 days before executing
    await step.sleep("wait-30-days", "30d");

    // Check if deletion is still pending (user may have cancelled)
    const stillPending = await step.run("check-still-pending", async () => {
      const db = getDb();
      const [user] = await db
        .select({ banReason: users.banReason })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return { shouldDelete: false, reason: "user_not_found" };
      }

      if (!user.banReason?.startsWith("DELETION_REQUESTED:")) {
        return { shouldDelete: false, reason: "deletion_cancelled" };
      }

      return { shouldDelete: true, reason: "proceed" };
    });

    if (!stillPending.shouldDelete) {
      return {
        deleted: false,
        reason: stillPending.reason,
        userId,
      };
    }

    // Delete user data across all tables
    await step.run("delete-user-data", async () => {
      const db = getDb();

      // Delete in dependency order (children first)
      // Commission entries for commissions where user is responsible
      const userCommissions = await db
        .select({ id: commissions.id })
        .from(commissions)
        .where(eq(commissions.responsibleId, userId));

      for (const c of userCommissions) {
        await db.delete(commissionEntries).where(eq(commissionEntries.commissionId, c.id));
      }

      // Delete main data tables
      await db.delete(commissions).where(eq(commissions.responsibleId, userId));
      await db.delete(stockChanges).where(eq(stockChanges.userId, userId));
      await db.delete(toolBookings).where(eq(toolBookings.userId, userId));
      await db.delete(timeEntries).where(eq(timeEntries.userId, userId));
      await db.delete(comments).where(eq(comments.userId, userId));
      await db.delete(notifications).where(eq(notifications.userId, userId));
      await db.delete(approvalRequests).where(eq(approvalRequests.requesterId, userId));
      await db.delete(reservations).where(eq(reservations.userId, userId));

      // Anonymize audit logs — keep the log entry but remove user reference
      await db
        .update(auditLog)
        .set({ userId: null })
        .where(eq(auditLog.userId, userId));

      // Remove org memberships
      await db
        .delete(organizationMembers)
        .where(eq(organizationMembers.userId, userId));

      // Delete sessions
      await db.delete(sessions).where(eq(sessions.userId, userId));

      // Finally delete the user
      await db.delete(users).where(eq(users.id, userId));
    });

    // Send final confirmation email
    await step.run("send-final-email", async () => {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@zentory.ch",
          to: email,
          subject: "Ihr Konto wurde geloescht",
          html: `
            <h2>Kontolöschung abgeschlossen</h2>
            <p>Hallo ${name || ""},</p>
            <p>Ihr Konto und alle zugehörigen Daten wurden gemäss Ihrer Anfrage dauerhaft gelöscht.</p>
            <p>Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <p>Falls Sie Zentory in Zukunft wieder nutzen möchten, können Sie sich jederzeit neu registrieren.</p>
            <p style="color:#999;font-size:12px;">
              Diese E-Mail wurde automatisch versendet. Bei Fragen kontaktieren Sie uns unter
              <a href="mailto:support@zentory.ch">support@zentory.ch</a>.
            </p>
          `,
        });

        // Notify admin
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "noreply@zentory.ch",
          to: process.env.ADMIN_NOTIFICATION_EMAIL || "support@zentory.ch",
          subject: `Konto geloescht: ${email}`,
          html: `
            <h2>Kontolöschung durchgeführt</h2>
            <p>Das Konto von <strong>${name || "—"}</strong> (${email}) wurde nach Ablauf der 30-tägigen Frist dauerhaft gelöscht.</p>
            <p>Benutzer-ID: ${userId}</p>
            <p>Organisation-ID: ${orgId}</p>
          `,
        });
      } catch (emailError) {
        console.error("[DSGVO Delete] Final email fehlgeschlagen:", emailError);
        // Non-critical — deletion is already complete
      }
    });

    return {
      deleted: true,
      userId,
      email,
      deletedAt: new Date().toISOString(),
    };
  }
);
