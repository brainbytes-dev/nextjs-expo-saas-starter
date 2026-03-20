import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { users } from "@repo/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { session, db } = result;

    const userId = session.user.id;

    // Store deletion request timestamp in the user's updatedAt + banReason field
    // (reusing existing columns to avoid schema changes)
    await db
      .update(users)
      .set({
        banReason: `DELETION_REQUESTED:${new Date().toISOString()}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

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
      { error: "Löschanfrage fehlgeschlagen. Bitte versuchen Sie es später erneut." },
      { status: 500 }
    );
  }
}
