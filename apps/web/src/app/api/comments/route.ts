import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { comments, users } from "@repo/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { sendMentionNotification } from "@/lib/email";
import { getDb } from "@repo/db";

// ---------------------------------------------------------------------------
// GET /api/comments?entityType=material&entityId=<uuid>&orgId=<uuid>
// Returns top-level comments with nested replies.
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    // Fetch all comments for this entity (top-level + replies) in one query.
    const rows = await db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        body: comments.body,
        mentions: comments.mentions,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        userId: comments.userId,
        userName: users.name,
        userImage: users.image,
        userEmail: users.email,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(
        and(
          eq(comments.organizationId, orgId),
          eq(comments.entityType, entityType),
          eq(comments.entityId, entityId)
        )
      )
      .orderBy(comments.createdAt);

    // Build threaded structure: top-level items carry a `replies` array.
    const byId = new Map<string, (typeof rows)[number] & { replies: typeof rows }>();
    for (const row of rows) {
      byId.set(row.id, { ...row, replies: [] });
    }

    const threaded: ((typeof rows)[number] & { replies: typeof rows })[] = [];
    for (const row of rows) {
      const node = byId.get(row.id)!;
      if (row.parentId && byId.has(row.parentId)) {
        byId.get(row.parentId)!.replies.push(node);
      } else {
        threaded.push(node);
      }
    }

    return NextResponse.json(threaded);
  } catch (error) {
    console.error("GET /api/comments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/comments
// Body: { entityType, entityId, body, mentions?, parentId? }
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const body = await request.json();
    const { entityType, entityId, body: commentBody, mentions, parentId } = body as {
      entityType: string;
      entityId: string;
      body: string;
      mentions?: string[];
      parentId?: string;
    };

    if (!entityType || !entityId || !commentBody?.trim()) {
      return NextResponse.json(
        { error: "entityType, entityId, and body are required" },
        { status: 400 }
      );
    }

    // If replying, verify parent belongs to the same entity/org.
    if (parentId) {
      const [parent] = await db
        .select({ id: comments.id })
        .from(comments)
        .where(
          and(
            eq(comments.id, parentId),
            eq(comments.organizationId, orgId),
            eq(comments.entityType, entityType),
            eq(comments.entityId, entityId),
            isNull(comments.parentId) // only one level of nesting
          )
        )
        .limit(1);

      if (!parent) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    const [created] = await db
      .insert(comments)
      .values({
        organizationId: orgId,
        entityType,
        entityId,
        userId: session.user.id,
        body: commentBody.trim(),
        mentions: mentions?.length ? mentions : null,
        parentId: parentId ?? null,
      })
      .returning();

    // Fire-and-forget mention notifications.
    if (mentions?.length) {
      const mentionedUsers = await db
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(
          // users whose id is in the mentions array
          // Drizzle doesn't have inArray shorthand here — use raw SQL approach
          // by fetching all and filtering in JS (mentions list is small).
          eq(users.id, mentions[0]!) // placeholder; see loop below
        )
        .limit(0); // We'll do a proper loop instead

      // Fetch mentioned users individually (mention arrays are small).
      for (const mentionedUserId of mentions) {
        if (mentionedUserId === session.user.id) continue; // don't notify yourself

        try {
          const [mentionedUser] = await getDb()
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.id, mentionedUserId))
            .limit(1);

          if (mentionedUser?.email) {
            sendMentionNotification(
              mentionedUser.email,
              session.user.name ?? session.user.email,
              entityType,
              entityId,
              commentBody.trim()
            ).catch((err) =>
              console.error("Failed to send mention notification:", err)
            );
          }
        } catch {
          // Non-critical — skip silently
        }
      }
    }

    // Return the created comment with user info attached.
    const [withUser] = await db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        body: comments.body,
        mentions: comments.mentions,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        userId: comments.userId,
        userName: users.name,
        userImage: users.image,
        userEmail: users.email,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.id, created.id))
      .limit(1);

    return NextResponse.json({ ...withUser, replies: [] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/comments error:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}
