import { NextResponse } from "next/server";
import { getSession } from "@/app/api/_helpers/auth";
import { sessions } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// DELETE /api/sessions/[id] — revoke a specific session
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSession();
    if (result.error) return result.error;
    const { session, db } = result;
    const { id } = await params;

    // Find the session to delete
    const [target] = await db
      .select({ id: sessions.id, token: sessions.token, userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, session.user.id)))
      .limit(1);

    if (!target) {
      return NextResponse.json(
        { error: "Sitzung nicht gefunden" },
        { status: 404 }
      );
    }

    // Cannot revoke current session
    const currentToken = (session.session as { token?: string })?.token;
    if (target.token === currentToken) {
      return NextResponse.json(
        { error: "Die aktuelle Sitzung kann nicht beendet werden" },
        { status: 400 }
      );
    }

    await db.delete(sessions).where(eq(sessions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sessions/[id] error:", error);
    return NextResponse.json(
      { error: "Sitzung konnte nicht beendet werden" },
      { status: 500 }
    );
  }
}
