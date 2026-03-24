import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { users, notifications, organizationMembers } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/lib/inngest";

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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.zentory.ch";
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      const fmtDate = deletionDate.toLocaleDateString("de-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@zentory.ch",
        to: session.user.email,
        subject: "Ihre Löschanfrage wurde registriert",
        html: `
          <h2>Löschanfrage bestätigt</h2>
          <p>Hallo ${session.user.name || ""},</p>
          <p>Ihre Anfrage zur Kontolöschung wurde erfolgreich registriert.</p>
          <p><strong>Löschdatum:</strong> ${fmtDate}</p>
          <p>Sie haben <strong>30 Tage</strong> Zeit, diese Anfrage zu widerrufen. Nach Ablauf dieser Frist werden alle Ihre Daten unwiderruflich gelöscht.</p>
          <p>
            <a href="${appUrl}/dashboard/settings"
               style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
              Löschung widerrufen
            </a>
          </p>
          <p style="color:#999;font-size:12px;">
            Falls Sie diese Anfrage nicht gestellt haben, widerrufen Sie die Löschung umgehend und ändern Sie Ihr Passwort.
          </p>
        `,
      });

      // Send notification email to admin
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@zentory.ch",
        to: process.env.ADMIN_NOTIFICATION_EMAIL || "support@zentory.ch",
        subject: `Kontolöschung beantragt: ${session.user.email}`,
        html: `
          <h2>Kontolöschung beantragt</h2>
          <p>Ein Benutzer hat die Löschung seines Kontos beantragt.</p>
          <table style="border-collapse:collapse;width:100%;max-width:480px;font-size:14px;">
            <tr>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Name</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">${session.user.name || "—"}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">E-Mail</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">${session.user.email}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Benutzer-ID</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">${userId}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Beantragt am</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">${now.toLocaleDateString("de-CH")} ${now.toLocaleTimeString("de-CH")}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:bold;">Löschung am</td>
              <td style="padding:8px 12px;border:1px solid #e2e8f0;">${fmtDate}</td>
            </tr>
          </table>
        `,
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
