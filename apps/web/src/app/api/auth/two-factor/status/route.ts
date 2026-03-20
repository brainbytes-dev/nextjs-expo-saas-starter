import { NextResponse } from "next/server";
import { getSession } from "@/app/api/_helpers/auth";
import { twoFactorSecrets } from "@repo/db/schema";
import { eq } from "drizzle-orm";

// ─── GET /api/auth/two-factor/status ─────────────────────────────────────────

export async function GET() {
  try {
    const result = await getSession();
    if ("error" in result && result.error instanceof Response) return result.error;
    const { session, db } = result as { session: NonNullable<typeof result.session>; db: NonNullable<typeof result.db> };
    const userId = session.user.id;

    const [record] = await db
      .select({
        enabled: twoFactorSecrets.enabled,
        verifiedAt: twoFactorSecrets.verifiedAt,
        recoveryCodes: twoFactorSecrets.recoveryCodes,
        usedRecoveryCodes: twoFactorSecrets.usedRecoveryCodes,
      })
      .from(twoFactorSecrets)
      .where(eq(twoFactorSecrets.userId, userId))
      .limit(1);

    if (!record || !record.enabled) {
      return NextResponse.json({ enabled: false });
    }

    const totalCodes = (record.recoveryCodes as string[])?.length ?? 0;
    const usedCodes = (record.usedRecoveryCodes as string[])?.length ?? 0;

    return NextResponse.json({
      enabled: true,
      verifiedAt: record.verifiedAt,
      remainingRecoveryCodes: totalCodes - usedCodes,
    });
  } catch (error) {
    console.error("2FA status error:", error);
    return NextResponse.json({ enabled: false });
  }
}
