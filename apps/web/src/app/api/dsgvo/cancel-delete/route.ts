import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { users, notifications, organizationMembers } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { session, orgId, db } = result;

    const userId = session.user.id;

    // Check if deletion is actually pending
    const [currentUser] = await db
      .select({ banReason: users.banReason })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser?.banReason?.startsWith("DELETION_REQUESTED:")) {
      return NextResponse.json(
        { error: "Es besteht keine aktive Löschanfrage." },
        { status: 400 }
      );
    }

    // Clear the deletion marker
    await db
      .update(users)
      .set({
        banReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Send confirmation email to user
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@logistikapp.ch",
        to: session.user.email,
        subject: "Ihre Löschanfrage wurde widerrufen",
        html: `
          <h2>Löschanfrage widerrufen</h2>
          <p>Hallo ${session.user.name || ""},</p>
          <p>Ihre Anfrage zur Kontolöschung wurde erfolgreich widerrufen. Ihr Konto und alle Daten bleiben bestehen.</p>
          <p>Falls Sie Fragen haben, kontaktieren Sie uns unter <a href="mailto:support@logistikapp.ch">support@logistikapp.ch</a>.</p>
        `,
      });

      // Notify admin
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@logistikapp.ch",
        to: "support@logistikapp.ch",
        subject: `Kontolöschung widerrufen: ${session.user.email}`,
        html: `
          <h2>Kontolöschung widerrufen</h2>
          <p>Der Benutzer <strong>${session.user.name || "—"}</strong> (${session.user.email}) hat seine Löschanfrage widerrufen.</p>
          <p>Benutzer-ID: ${userId}</p>
        `,
      });
    } catch (emailError) {
      console.error("[DSGVO Cancel] Email senden fehlgeschlagen:", emailError);
    }

    // Create notification for org owners
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
        if (admin.userId === userId) continue;
        await db.insert(notifications).values({
          organizationId: orgId,
          userId: admin.userId,
          type: "account_deletion_cancelled",
          title: "Kontolöschung widerrufen",
          body: `${session.user.name || session.user.email} hat die Löschanfrage widerrufen.`,
          entityType: "user",
          entityId: userId,
        });
      }
    } catch (notifError) {
      console.error("[DSGVO Cancel] Benachrichtigung fehlgeschlagen:", notifError);
    }

    return NextResponse.json({
      success: true,
      message: "Ihre Löschanfrage wurde erfolgreich widerrufen. Ihr Konto bleibt bestehen.",
    });
  } catch (error) {
    console.error("[DSGVO Cancel Delete]", error);
    return NextResponse.json(
      { error: "Widerruf fehlgeschlagen. Bitte versuchen Sie es später erneut." },
      { status: 500 }
    );
  }
}
