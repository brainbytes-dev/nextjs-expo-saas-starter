import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { customFieldDefinitions, customFieldValues } from "@repo/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const entityId = url.searchParams.get("entityId");

    if (!entityId) {
      return NextResponse.json(
        { error: "entityId ist erforderlich" },
        { status: 400 }
      );
    }

    const values = await db
      .select({
        id: customFieldValues.id,
        definitionId: customFieldValues.definitionId,
        entityId: customFieldValues.entityId,
        value: customFieldValues.value,
        fieldName: customFieldDefinitions.name,
        fieldType: customFieldDefinitions.fieldType,
        sortOrder: customFieldDefinitions.sortOrder,
        options: customFieldDefinitions.options,
      })
      .from(customFieldValues)
      .innerJoin(
        customFieldDefinitions,
        and(
          eq(customFieldValues.definitionId, customFieldDefinitions.id),
          eq(customFieldDefinitions.organizationId, orgId)
        )
      )
      .where(eq(customFieldValues.entityId, entityId))
      .orderBy(customFieldDefinitions.sortOrder, customFieldDefinitions.createdAt);

    return NextResponse.json(values);
  } catch (error) {
    console.error("GET /api/custom-fields/values error:", error);
    return NextResponse.json(
      { error: "Failed to fetch custom field values" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { entityId, fields } = body as {
      entityId: string;
      fields: { definitionId: string; value: string | null }[];
    };

    if (!entityId || typeof entityId !== "string") {
      return NextResponse.json(
        { error: "entityId ist erforderlich" },
        { status: 400 }
      );
    }

    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: "fields muss ein nicht-leeres Array sein" },
        { status: 400 }
      );
    }

    const definitionIds = fields.map((f) => f.definitionId);

    // Verify all definitions belong to this org
    const ownedDefs = await db
      .select({ id: customFieldDefinitions.id })
      .from(customFieldDefinitions)
      .where(
        and(
          eq(customFieldDefinitions.organizationId, orgId),
          inArray(customFieldDefinitions.id, definitionIds)
        )
      );

    const ownedIds = new Set(ownedDefs.map((d) => d.id));
    for (const field of fields) {
      if (!ownedIds.has(field.definitionId)) {
        return NextResponse.json(
          { error: `Felddefinition ${field.definitionId} nicht gefunden oder kein Zugriff` },
          { status: 403 }
        );
      }
    }

    // Upsert each field value
    const now = new Date();
    for (const field of fields) {
      const [existing] = await db
        .select({ id: customFieldValues.id })
        .from(customFieldValues)
        .where(
          and(
            eq(customFieldValues.definitionId, field.definitionId),
            eq(customFieldValues.entityId, entityId)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(customFieldValues)
          .set({ value: field.value ?? null, updatedAt: now })
          .where(eq(customFieldValues.id, existing.id));
      } else {
        await db.insert(customFieldValues).values({
          definitionId: field.definitionId,
          entityId,
          value: field.value ?? null,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/custom-fields/values error:", error);
    return NextResponse.json(
      { error: "Failed to upsert custom field values" },
      { status: 500 }
    );
  }
}
