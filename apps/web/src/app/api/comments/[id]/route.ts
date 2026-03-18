import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { comments, users } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// ---------------------------------------------------------------------------
// PATCH /api/comments/:id  — edit body (own comment only)
// Body: { body: string }
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const [existing] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own comments" },
        { status: 403 }
      );
    }

    const { body } = await request.json();
    if (!body?.trim()) {
      return NextResponse.json(
        { error: "Comment body cannot be empty" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(comments)
      .set({ body: body.trim(), updatedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();

    // Return with user info
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
      .where(eq(comments.id, updated.id))
      .limit(1);

    return NextResponse.json(withUser);
  } catch (error) {
    console.error("PATCH /api/comments/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/comments/:id  — own comment, or admin
// ---------------------------------------------------------------------------
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session, membership } = result;

    const [existing] = await db
      .select()
      .from(comments)
      .where(and(eq(comments.id, id), eq(comments.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const isOwner = existing.userId === session.user.id;
    const isAdmin =
      membership.role === "owner" ||
      membership.role === "admin" ||
      session.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    await db.delete(comments).where(eq(comments.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/comments/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
