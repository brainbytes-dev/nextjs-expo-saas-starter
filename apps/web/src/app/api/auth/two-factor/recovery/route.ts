import { NextResponse } from "next/server";
import { getSession } from "@/app/api/_helpers/auth";
import { twoFactorSecrets } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// ─── POST /api/auth/two-factor/recovery ──────────────────────────────────────
// Verify a recovery code and mark it as used.

export async function POST(request: Request) {
  try {
    const result = await getSession();
    if ("error" in result && result.error instanceof Response) return result.error;
    const { session, db } = result as { session: NonNullable<typeof result.session>; db: NonNullable<typeof result.db> };
    const userId = session.user.id;

    const body = await request.json();
    const { recoveryCode } = body as { recoveryCode?: string };

    if (!recoveryCode || !/^[a-f0-9]{8}$/i.test(recoveryCode.trim())) {
      return NextResponse.json(
        { error: "Bitte einen gültigen Wiederherstellungscode eingeben." },
        { status: 400 }
      );
    }

    const code = recoveryCode.trim().toLowerCase();
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    // Get 2FA record
    const [record] = await db
      .select()
      .from(twoFactorSecrets)
      .where(eq(twoFactorSecrets.userId, userId))
      .limit(1);

    if (!record || !record.enabled) {
      return NextResponse.json(
        { error: "Zwei-Faktor-Authentifizierung ist nicht aktiviert." },
        { status: 400 }
      );
    }

    const storedCodes = (record.recoveryCodes as string[]) ?? [];
    const usedCodes = (record.usedRecoveryCodes as string[]) ?? [];

    // Check if code was already used
    if (usedCodes.includes(codeHash)) {
      return NextResponse.json(
        { error: "Dieser Wiederherstellungscode wurde bereits verwendet." },
        { status: 400 }
      );
    }

    // Check if code matches any stored hash
    if (!storedCodes.includes(codeHash)) {
      return NextResponse.json(
        { error: "Ungültiger Wiederherstellungscode." },
        { status: 400 }
      );
    }

    // Mark as used
    await db
      .update(twoFactorSecrets)
      .set({
        usedRecoveryCodes: [...usedCodes, codeHash],
        updatedAt: new Date(),
      })
      .where(eq(twoFactorSecrets.userId, userId));

    const remaining = storedCodes.length - usedCodes.length - 1;

    return NextResponse.json({
      verified: true,
      remainingCodes: remaining,
    });
  } catch (error) {
    console.error("2FA recovery error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Wiederherstellung." },
      { status: 500 }
    );
  }
}
