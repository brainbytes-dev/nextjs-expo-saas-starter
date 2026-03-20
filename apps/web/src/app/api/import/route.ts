import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  materials,
  tools,
  suppliers,
  locations,
} from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import type { EntityType } from "@/lib/migration/templates";

// ─── Field-to-column mapping per entity ─────────────────────────────────────

const MATERIAL_FIELD_MAP: Record<string, string> = {
  name: "name",
  nummer: "number",
  einheit: "unit",
  barcode: "barcode",
  mindestbestand: "reorderLevel",
  hersteller: "manufacturer",
  notizen: "notes",
}

const TOOL_FIELD_MAP: Record<string, string> = {
  name: "name",
  nummer: "number",
  zustand: "condition",
  seriennummer: "serialNumber",
  hersteller: "manufacturer",
  barcode: "barcode",
  notizen: "notes",
}

const SUPPLIER_FIELD_MAP: Record<string, string> = {
  name: "name",
  lieferantennummer: "supplierNumber",
  kundennummer: "customerNumber",
  kontaktperson: "contactPerson",
  e_mail: "email",
  telefon: "phone",
  adresse: "address",
  plz: "zip",
  ort: "city",
  land: "country",
  notizen: "notes",
}

const LOCATION_FIELD_MAP: Record<string, string> = {
  name: "name",
  typ: "type",
  adresse: "address",
}

function getFieldMap(entityType: EntityType): Record<string, string> {
  switch (entityType) {
    case "materials": return MATERIAL_FIELD_MAP
    case "tools": return TOOL_FIELD_MAP
    case "suppliers": return SUPPLIER_FIELD_MAP
    case "locations": return LOCATION_FIELD_MAP
  }
}

// ─── POST /api/import ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const {
      entityType,
      rows,
      mapping,
      duplicateAction = "skip",
    }: {
      entityType: EntityType
      rows: Record<string, string>[]
      mapping: Record<string, string>
      duplicateAction: "skip" | "update"
    } = body;

    if (!entityType || !rows || !mapping) {
      return NextResponse.json(
        { error: "entityType, rows, and mapping are required" },
        { status: 400 }
      );
    }

    const fieldMap = getFieldMap(entityType);
    let imported = 0;
    let skipped = 0;
    const errors: { row: number; error: string }[] = [];

    // Process in batches of 50
    const BATCH_SIZE = 50;

    for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
      const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);

      for (let i = 0; i < batch.length; i++) {
        const row = batch[i]!;
        const rowIndex = batchStart + i;

        try {
          // Map CSV columns to DB columns using the user's mapping
          const mapped: Record<string, string | number | null> = {};
          for (const [csvCol, targetKey] of Object.entries(mapping)) {
            const dbCol = fieldMap[targetKey];
            if (dbCol && row[csvCol] !== undefined) {
              mapped[dbCol] = row[csvCol]!.trim() || null;
            }
          }

          // Validate required field: name
          if (!mapped.name) {
            errors.push({ row: rowIndex + 1, error: "Name fehlt" });
            continue;
          }

          // Convert numeric fields
          if (entityType === "materials" && mapped.reorderLevel) {
            const num = parseInt(String(mapped.reorderLevel));
            mapped.reorderLevel = isNaN(num) ? null : num;
          }

          // Duplicate check: name + number
          const isDuplicate = await checkDuplicate(
            db,
            entityType,
            orgId,
            String(mapped.name),
            mapped.number ? String(mapped.number) : null
          );

          if (isDuplicate) {
            if (duplicateAction === "skip") {
              skipped++;
              continue;
            }
            // "update" — update existing record
            await updateExisting(db, entityType, orgId, mapped);
            imported++;
            continue;
          }

          // Insert new record
          await insertRecord(db, entityType, orgId, mapped);
          imported++;
        } catch (err) {
          errors.push({
            row: rowIndex + 1,
            error: err instanceof Error ? err.message : "Unbekannter Fehler",
          });
        }
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch (error) {
    console.error("POST /api/import error:", error);
    return NextResponse.json(
      { error: "Import fehlgeschlagen" },
      { status: 500 }
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkDuplicate(db: any, entityType: EntityType, orgId: string, name: string, number: string | null): Promise<boolean> {
  const table = getTable(entityType);
  const conditions = [
    eq(table.organizationId, orgId),
    eq(table.name, name),
  ];
  if (number && "number" in table) {
    conditions.push(eq(table.number, number));
  }
  const existing = await db.select({ id: table.id }).from(table).where(and(...conditions)).limit(1);
  return existing.length > 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateExisting(db: any, entityType: EntityType, orgId: string, mapped: Record<string, any>): Promise<void> {
  const table = getTable(entityType);
  const name = mapped.name;
  const number = mapped.number;
  const conditions = [eq(table.organizationId, orgId), eq(table.name, name)];
  if (number && "number" in table) {
    conditions.push(eq(table.number, number));
  }
  // Remove name from update set since it's the match key
  const updateData = Object.fromEntries(Object.entries(mapped).filter(([k]) => k !== "name" && k !== "number"));
  if (Object.keys(updateData).length > 0) {
    await db.update(table).set(updateData).where(and(...conditions));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertRecord(db: any, entityType: EntityType, orgId: string, mapped: Record<string, any>): Promise<void> {
  const table = getTable(entityType);

  const values: Record<string, unknown> = {
    organizationId: orgId,
    ...mapped,
  };

  // Set defaults for locations
  if (entityType === "locations" && !values.type) {
    values.type = "warehouse";
  }

  await db.insert(table).values(values);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTable(entityType: EntityType): any {
  switch (entityType) {
    case "materials": return materials;
    case "tools": return tools;
    case "suppliers": return suppliers;
    case "locations": return locations;
  }
}
