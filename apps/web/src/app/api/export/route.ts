import { NextResponse } from "next/server";
import { withPermission } from "@/lib/rbac";
import {
  materials,
  tools,
  suppliers,
  locations,
  commissions,
  materialGroups,
  toolGroups,
} from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { toCSV } from "@/lib/csv-parser";
import { trackFeature } from "@/lib/track-feature";

type ExportEntity = "materials" | "tools" | "suppliers" | "locations" | "commissions";
type ExportFormat = "csv" | "json";

// ─── GET /api/export ────────────────────────────────────────────────────────

export const GET = withPermission("materials", "read")(async (request, { db, orgId }) => {
  try {

    const url = new URL(request.url);
    const entity = url.searchParams.get("entity") as ExportEntity | null;
    const format = (url.searchParams.get("format") || "csv") as ExportFormat;

    if (!entity) {
      return NextResponse.json(
        { error: "entity parameter is required" },
        { status: 400 }
      );
    }

    const { headers: csvHeaders, rows, filename } = await fetchEntityData(db, orgId, entity);
    trackFeature(db, orgId, "exports");

    if (format === "json") {
      // Convert to array of objects
      const jsonData = rows.map((row: string[]) => {
        const obj: Record<string, string> = {};
        csvHeaders.forEach((header: string, i: number) => {
          obj[header] = row[i] ?? "";
        });
        return obj;
      });

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.json"`,
        },
      });
    }

    // CSV (default)
    const csvContent = toCSV(csvHeaders, rows);
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json(
      { error: "Export fehlgeschlagen" },
      { status: 500 }
    );
  }
});

// ─── Data fetchers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchEntityData(db: any, orgId: string, entity: ExportEntity) {
  const dateStr = new Date().toISOString().slice(0, 10);

  switch (entity) {
    case "materials": {
      const items = await db
        .select({
          name: materials.name,
          number: materials.number,
          unit: materials.unit,
          barcode: materials.barcode,
          reorderLevel: materials.reorderLevel,
          groupName: materialGroups.name,
          manufacturer: materials.manufacturer,
          notes: materials.notes,
          createdAt: materials.createdAt,
        })
        .from(materials)
        .leftJoin(materialGroups, eq(materials.groupId, materialGroups.id))
        .where(and(eq(materials.organizationId, orgId), eq(materials.isActive, true)))
        .orderBy(materials.name);

      return {
        headers: ["Name", "Nummer", "Einheit", "Barcode", "Mindestbestand", "Gruppe", "Hersteller", "Notizen", "Erstellt"],
        rows: items.map((m: Record<string, unknown>) => [
          str(m.name), str(m.number), str(m.unit), str(m.barcode),
          str(m.reorderLevel), str(m.groupName), str(m.manufacturer),
          str(m.notes), formatDate(m.createdAt),
        ]),
        filename: `materialien_${dateStr}`,
      };
    }

    case "tools": {
      const items = await db
        .select({
          name: tools.name,
          number: tools.number,
          condition: tools.condition,
          barcode: tools.barcode,
          serialNumber: tools.serialNumber,
          groupName: toolGroups.name,
          manufacturer: tools.manufacturer,
          notes: tools.notes,
          createdAt: tools.createdAt,
        })
        .from(tools)
        .leftJoin(toolGroups, eq(tools.groupId, toolGroups.id))
        .where(and(eq(tools.organizationId, orgId), eq(tools.isActive, true)))
        .orderBy(tools.name);

      return {
        headers: ["Name", "Nummer", "Zustand", "Barcode", "Seriennummer", "Gruppe", "Hersteller", "Notizen", "Erstellt"],
        rows: items.map((t: Record<string, unknown>) => [
          str(t.name), str(t.number), str(t.condition), str(t.barcode),
          str(t.serialNumber), str(t.groupName), str(t.manufacturer),
          str(t.notes), formatDate(t.createdAt),
        ]),
        filename: `werkzeuge_${dateStr}`,
      };
    }

    case "suppliers": {
      const items = await db
        .select()
        .from(suppliers)
        .where(eq(suppliers.organizationId, orgId))
        .orderBy(suppliers.name);

      return {
        headers: ["Name", "Lieferantennummer", "Kundennummer", "Kontaktperson", "E-Mail", "Telefon", "Adresse", "PLZ", "Ort", "Land", "Notizen"],
        rows: items.map((s: Record<string, unknown>) => [
          str(s.name), str(s.supplierNumber), str(s.customerNumber),
          str(s.contactPerson), str(s.email), str(s.phone),
          str(s.address), str(s.zip), str(s.city), str(s.country),
          str(s.notes),
        ]),
        filename: `lieferanten_${dateStr}`,
      };
    }

    case "locations": {
      const items = await db
        .select()
        .from(locations)
        .where(and(eq(locations.organizationId, orgId), eq(locations.isActive, true)))
        .orderBy(locations.name);

      return {
        headers: ["Name", "Typ", "Kategorie", "Adresse"],
        rows: items.map((l: Record<string, unknown>) => [
          str(l.name), str(l.type), str(l.category), str(l.address),
        ]),
        filename: `standorte_${dateStr}`,
      };
    }

    case "commissions": {
      const items = await db
        .select({
          name: commissions.name,
          number: commissions.number,
          manualNumber: commissions.manualNumber,
          status: commissions.status,
          notes: commissions.notes,
          createdAt: commissions.createdAt,
        })
        .from(commissions)
        .where(eq(commissions.organizationId, orgId))
        .orderBy(commissions.createdAt);

      return {
        headers: ["Name", "Nummer", "Manuelle Nummer", "Status", "Notizen", "Erstellt"],
        rows: items.map((c: Record<string, unknown>) => [
          str(c.name), str(c.number), str(c.manualNumber),
          str(c.status), str(c.notes), formatDate(c.createdAt),
        ]),
        filename: `kommissionen_${dateStr}`,
      };
    }

    default:
      throw new Error(`Unbekannter Entity-Typ: ${entity}`);
  }
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

function formatDate(val: unknown): string {
  if (!val) return "";
  try {
    const d = new Date(val as string);
    return d.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(val);
  }
}
