import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { tasks, users, auditLog } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        topic: tasks.topic,
        description: tasks.description,
        dueDate: tasks.dueDate,
        assignedToId: tasks.assignedToId,
        assignedToName: users.name,
        materialId: tasks.materialId,
        toolId: tasks.toolId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedToId, users.id))
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, orgId)))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("GET /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

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
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await request.json();
    const updatableFields = [
      "title",
      "status",
      "topic",
      "description",
      "dueDate",
      "assignedToId",
      "materialId",
      "toolId",
    ] as const;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const auditEntries: { field: string; oldValue: string; newValue: string }[] = [];

    for (const field of updatableFields) {
      if (body[field] !== undefined && body[field] !== existing[field]) {
        auditEntries.push({
          field,
          oldValue: String(existing[field] ?? ""),
          newValue: String(body[field] ?? ""),
        });
        updates[field] = body[field];
      }
    }

    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();

    if (auditEntries.length > 0) {
      await db.insert(auditLog).values(
        auditEntries.map((entry) => ({
          organizationId: orgId,
          objectType: "task",
          objectId: id,
          userId: session.user.id,
          field: entry.field,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
        }))
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [existing] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await db.delete(tasks).where(eq(tasks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
