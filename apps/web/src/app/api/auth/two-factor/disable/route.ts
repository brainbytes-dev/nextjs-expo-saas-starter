import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/app/api/_helpers/auth";
import { twoFactorSecrets } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

// ─── POST /api/auth/two-factor/disable ───────────────────────────────────────
// Requires password verification before disabling 2FA.

export async function POST(request: Request) {
  try {
    const result = await getSession();
    if ("error" in result && result.error instanceof Response) return result.error;
    const { session, db } = result as { session: NonNullable<typeof result.session>; db: NonNullable<typeof result.db> };
    const userId = session.user.id;

    const body = await request.json();
    const { password } = body as { password?: string };

    if (!password) {
      return NextResponse.json(
        { error: "Passwort ist erforderlich." },
        { status: 400 }
      );
    }

    // Verify password using Better-Auth's changePassword API with same password
    // If currentPassword is wrong, it throws an error
    try {
      await auth.api.changePassword({
        body: {
          currentPassword: password,
          newPassword: password,
          revokeOtherSessions: false,
        },
        headers: await headers(),
      });
    } catch {
      return NextResponse.json(
        { error: "Falsches Passwort." },
        { status: 400 }
      );
    }

    // Delete 2FA record
    await db
      .delete(twoFactorSecrets)
      .where(eq(twoFactorSecrets.userId, userId));

    return NextResponse.json({ disabled: true });
  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json(
      { error: "Fehler beim Deaktivieren der Zwei-Faktor-Authentifizierung." },
      { status: 500 }
    );
  }
}
