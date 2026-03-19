import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { notifications } from "@repo/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

// ── helpers ──────────────────────────────────────────────────────────────────

async function getSessionUser(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user as { id: string } | undefined;
}

// ── GET /api/notifications ────────────────────────────────────────────────────
// Returns the 50 most-recent notifications for the authenticated user.

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return NextResponse.json(rows);
  } catch (err) {
    Sentry.captureException(err, { tags: { endpoint: "notifications/GET" } });
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/notifications ──────────────────────────────────────────────────
// Body: { ids?: string[], all?: boolean }
// Marks the given notification ids (or all) as read.

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: { ids?: string[]; all?: boolean } = await request.json();
    const db = getDb();

    if (body.all) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, user.id));
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.userId, user.id),
            inArray(notifications.id, body.ids)
          )
        );
    } else {
      return NextResponse.json(
        { error: "Provide ids[] or all: true" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { endpoint: "notifications/PATCH" } });
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/notifications ─────────────────────────────────────────────────
// Clears all notifications for the authenticated user.

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    await db
      .delete(notifications)
      .where(eq(notifications.userId, user.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    Sentry.captureException(err, { tags: { endpoint: "notifications/DELETE" } });
    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 }
    );
  }
}
