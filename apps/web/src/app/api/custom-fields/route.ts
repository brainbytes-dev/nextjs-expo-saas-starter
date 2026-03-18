import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { customFieldDefinitions } from "@repo/db/schema";
import { eq, and, asc } from "drizzle-orm";

const VALID_ENTITY_TYPES = ["material", "tool", "key", "location"] as const;
const VALID_FIELD_TYPES = ["text", "number", "date", "select", "boolean"] as const;

type EntityType = (typeof VALID_ENTITY_TYPES)[number];
type FieldType = (typeof VALID_FIELD_TYPES)[number];

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType") as EntityType | null;

    const conditions = [eq(customFieldDefinitions.organizationId, orgId)];
    if (entityType && VALID_ENTITY_TYPES.includes(entityType)) {
      conditions.push(eq(customFieldDefinitions.entityType, entityType));
    }

    const definitions = await db
      .select()
      .from(customFieldDefinitions)
      .where(and(...conditions))
      .orderBy(asc(customFieldDefinitions.sortOrder), asc(customFieldDefinitions.createdAt));

    return NextResponse.json(definitions);
  } catch (error) {
    console.error("GET /api/custom-fields error:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom field definitions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { entityType, name, fieldType, options, sortOrder } = body;

    if (!entityType || !VALID_ENTITY_TYPES.includes(entityType as EntityType)) {
      return NextResponse.json(
        { error: "Ungültiger entityType. Erlaubt: material, tool, key, location" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name ist erforderlich" },
        { status: 400 }
      );
    }

    if (!fieldType || !VALID_FIELD_TYPES.includes(fieldType as FieldType)) {
      return NextResponse.json(
        { error: "Ungültiger fieldType. Erlaubt: text, number, date, select, boolean" },
        { status: 400 }
      );
    }

    if (fieldType === "select" && options !== undefined && !Array.isArray(options)) {
      return NextResponse.json(
        { error: "options muss ein Array sein" },
        { status: 400 }
      );
    }

    const [definition] = await db
      .insert(customFieldDefinitions)
      .values({
        organizationId: orgId,
        entityType: entityType as string,
        name: name.trim(),
        fieldType: fieldType as string,
        options: options ?? null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      })
      .returning();

    return NextResponse.json(definition, { status: 201 });
  } catch (error) {
    console.error("POST /api/custom-fields error:", error);
    return NextResponse.json(
      { error: "Failed to create custom field definition" },
      { status: 500 }
    );
  }
}
