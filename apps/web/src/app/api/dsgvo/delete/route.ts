import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { users, notifications, organizationMembers } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/lib/inngest";
import { sendAccountDeletionEmail, sendAccountDeletionAdminEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { session, orgId, db } = result;

    const userId = session.user.id;
    const now = new Date();
    const deletionDate = new Date(now);
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Check if deletion is already pending
    const [currentUser] = await db
      .select({ banReason: users.banReason })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (currentUser?.banReason?.startsWith("DELETION_REQUESTED:")) {
      return NextResponse.json(
        { error: "Es besteht bereits eine Löschanfrage." },
        { status: 409 }
      );
    }

    // Mark user with deletion request timestamp
    await db
      .update(users)
      .set({
        banReason: `DELETION_REQUESTED:${now.toISOString()}`,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    // Send confirmation email to user
    try {
      const fmtDate = deletionDate.toLocaleDateString("de-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const requestedAtFormatted = `${now.toLocaleDateString("de-CH")} ${now.toLocaleTimeString("de-CH")}`;

      await sendAccountDeletionEmail({
        userEmail: session.user.email,
        userName: session.user.name || "",
        deletionDateFormatted: fmtDate,
      });

      await sendAccountDeletionAdminEmail({
        adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL || "support@zentory.ch",
        userName: session.user.name || "",
        userEmail: session.user.email,
        userId,
        requestedAtFormatted,
        deletionDateFormatted: fmtDate,
      });
    } catch (emailError) {
      console.error("[DSGVO Delete] Email senden fehlgeschlagen:", emailError);
      // Continue — email failure should not block the deletion request
    }

    // Create notification for admin users in the same org
    try {
      const adminMembers = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.role, "owner")
          )
        );

      for (const admin of adminMembers) {
        if (admin.userId === userId) continue; // Don't notify the user themselves
        await db.insert(notifications).values({
          organizationId: orgId,
          userId: admin.userId,
          type: "account_deletion",
          title: "Kontolöschung beantragt",
          body: `${session.user.name || session.user.email} hat die Löschung des Kontos beantragt. Löschung am: ${deletionDate.toLocaleDateString("de-CH")}`,
          entityType: "user",
          entityId: userId,
        });
      }
    } catch (notifError) {
      console.error("[DSGVO Delete] Benachrichtigung fehlgeschlagen:", notifError);
    }

    // Schedule Inngest job for actual deletion after 30 days
    try {
      await inngest.send({
        name: "dsgvo/deletion.requested",
        data: {
          userId,
          email: session.user.email,
          name: session.user.name || "",
          orgId,
          requestedAt: now.toISOString(),
          deletionDate: deletionDate.toISOString(),
        },
      });
    } catch (inngestError) {
      console.error("[DSGVO Delete] Inngest Event fehlgeschlagen:", inngestError);
      // Non-critical — the cron cleanup will catch it
    }

    return NextResponse.json({
      success: true,
      message:
        "Ihre Löschanfrage wurde erfasst. Ihr Konto und alle zugehörigen Daten werden nach 30 Tagen dauerhaft gelöscht.",
      deletionDate: deletionDate.toISOString(),
      gracePeriodDays: 30,
    });
  } catch (error) {
    console.error("[DSGVO Delete]", error);
    return NextResponse.json(
      {
        error:
          "Löschanfrage fehlgeschlagen. Bitte versuchen Sie es später erneut.",
      },
      { status: 500 }
    );
  }
}

// GET: Check if deletion is pending
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { session, db } = result;

    const [currentUser] = await db
      .select({ banReason: users.banReason })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const banReason = currentUser?.banReason;
    if (banReason?.startsWith("DELETION_REQUESTED:")) {
      const requestedAt = banReason.replace("DELETION_REQUESTED:", "");
      const requestDate = new Date(requestedAt);
      const deletionDate = new Date(requestDate);
      deletionDate.setDate(deletionDate.getDate() + 30);

      return NextResponse.json({
        pending: true,
        requestedAt,
        deletionDate: deletionDate.toISOString(),
      });
    }

    return NextResponse.json({ pending: false });
  } catch (error) {
    console.error("[DSGVO Delete Status]", error);
    return NextResponse.json(
      { error: "Status konnte nicht abgerufen werden." },
      { status: 500 }
    );
  }
}
