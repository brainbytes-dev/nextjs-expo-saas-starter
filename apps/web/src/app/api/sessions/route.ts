import { NextResponse } from "next/server";
import { getSession } from "@/app/api/_helpers/auth";
import { sessions } from "@repo/db/schema";
import { eq } from "drizzle-orm";

// GET /api/sessions — list all active sessions for the current user
export async function GET() {
  try {
    const result = await getSession();
    if (result.error) return result.error;
    const { session, db } = result;

    const allSessions = await db
      .select({
        id: sessions.id,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        token: sessions.token,
      })
      .from(sessions)
      .where(eq(sessions.userId, session.user.id));

    // Determine current session token from the session object
    const currentToken = (session.session as { token?: string })?.token;

    const mapped = allSessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.token === currentToken,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/sessions error:", error);
    return NextResponse.json(
      { error: "Sitzungen konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions — revoke all other sessions
export async function DELETE() {
  try {
    const result = await getSession();
    if (result.error) return result.error;
    const { session, db } = result;

    const currentToken = (session.session as { token?: string })?.token;
    if (!currentToken) {
      return NextResponse.json(
        { error: "Aktuelles Token nicht gefunden" },
        { status: 400 }
      );
    }

    // Get all sessions for user except current
    const allSessions = await db
      .select({ id: sessions.id, token: sessions.token })
      .from(sessions)
      .where(eq(sessions.userId, session.user.id));

    const otherSessions = allSessions.filter((s) => s.token !== currentToken);

    for (const s of otherSessions) {
      await db.delete(sessions).where(eq(sessions.id, s.id));
    }

    return NextResponse.json({ revoked: otherSessions.length });
  } catch (error) {
    console.error("DELETE /api/sessions error:", error);
    return NextResponse.json(
      { error: "Sitzungen konnten nicht beendet werden" },
      { status: 500 }
    );
  }
}
