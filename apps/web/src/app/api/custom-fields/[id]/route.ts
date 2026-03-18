import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { customFieldDefinitions, customFieldValues } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

const VALID_FIELD_TYPES = ["text", "number", "date", "select", "boolean"] as const;
type FieldType = (typeof VALID_FIELD_TYPES)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // Verify ownership
    const [existing] = await db
      .select()
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.id, id),
          eq(customFieldDefinitions.organizationId, orgId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Felddefinition nicht gefunden" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json({ error: "Name darf nicht leer sein" }, { status: 400 });
      }
      updates.name = body.name.trim();
    }

    if (body.fieldType !== undefined) {
      if (!VALID_FIELD_TYPES.includes(body.fieldType as FieldType)) {
        return NextResponse.json({ error: "Ungültiger fieldType" }, { status: 400 });
      }
      updates.fieldType = body.fieldType;
    }

    if (body.options !== undefined) {
      if (body.options !== null && !Array.isArray(body.options)) {
        return NextResponse.json({ error: "options muss ein Array oder null sein" }, { status: 400 });
      }
      updates.options = body.options;
    }

    if (typeof body.sortOrder === "number") {
      updates.sortOrder = body.sortOrder;
    }

    const [updated] = await db
      .update(customFieldDefinitions)
      .set(updates)
      .where(eq(customFieldDefinitions.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/custom-fields/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update custom field definition" },
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

    // Verify ownership
    const [existing] = await db
      .select()
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.id, id),
          eq(customFieldDefinitions.organizationId, orgId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Felddefinition nicht gefunden" },
        { status: 404 }
      );
    }

    // Delete values first (cascade also handles this via FK, but being explicit)
    await db
      .delete(customFieldValues)
      .where(eq(customFieldValues.definitionId, id));

    await db
      .delete(customFieldDefinitions)
      .where(eq(customFieldDefinitions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/custom-fields/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete custom field definition" },
      { status: 500 }
    );
  }
}
