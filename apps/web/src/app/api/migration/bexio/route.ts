import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { materials, suppliers } from "@repo/db/schema";
import {
  mapBexioArticle,
  mapBexioContact,
  type BexioArticle,
  type BexioContact,
} from "@/lib/migration/bexio-mapper";
import { eq, and } from "drizzle-orm";

// ─── POST /api/migration/bexio ──────────────────────────────────────────────
// Accepts: { apiToken: string, importTypes: ("articles" | "contacts")[], action: "preview" | "import" }

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const {
      apiToken,
      importTypes = ["articles"],
      action = "preview",
    }: {
      apiToken: string
      importTypes: ("articles" | "contacts")[]
      action: "preview" | "import"
    } = body;

    if (!apiToken) {
      return NextResponse.json(
        { error: "bexio API-Token ist erforderlich" },
        { status: 400 }
      );
    }

    // Fetch data from bexio
    const preview: Record<string, unknown[]> = {};
    const importResult: Record<string, { imported: number; skipped: number }> = {};

    if (importTypes.includes("articles")) {
      const articles = await fetchBexio<BexioArticle>(apiToken, "/2.0/article");
      const mapped = articles.map(mapBexioArticle);
      preview.articles = mapped.slice(0, 20);

      if (action === "import") {
        let imported = 0;
        let skipped = 0;

        for (const item of mapped) {
          // Check duplicate by name
          const existing = await db
            .select({ id: materials.id })
            .from(materials)
            .where(and(eq(materials.organizationId, orgId), eq(materials.name, item.name)))
            .limit(1);

          if (existing.length > 0) {
            skipped++;
            continue;
          }

          await db.insert(materials).values({
            organizationId: orgId,
            name: item.name,
            number: item.number,
            unit: item.unit,
            barcode: item.barcode,
            manufacturer: item.manufacturer,
            notes: item.notes,
          });
          imported++;
        }

        importResult.articles = { imported, skipped };
      }
    }

    if (importTypes.includes("contacts")) {
      const contacts = await fetchBexio<BexioContact>(apiToken, "/2.0/contact");
      const mapped = contacts.map(mapBexioContact);
      preview.contacts = mapped.slice(0, 20);

      if (action === "import") {
        let imported = 0;
        let skipped = 0;

        for (const item of mapped) {
          const existing = await db
            .select({ id: suppliers.id })
            .from(suppliers)
            .where(and(eq(suppliers.organizationId, orgId), eq(suppliers.name, item.name)))
            .limit(1);

          if (existing.length > 0) {
            skipped++;
            continue;
          }

          await db.insert(suppliers).values({
            organizationId: orgId,
            name: item.name,
            supplierNumber: item.supplierNumber,
            email: item.email,
            phone: item.phone,
            address: item.address,
            zip: item.zip,
            city: item.city,
            country: item.country,
            notes: item.notes,
          });
          imported++;
        }

        importResult.contacts = { imported, skipped };
      }
    }

    return NextResponse.json({
      preview,
      ...(action === "import" ? { result: importResult } : {}),
    });
  } catch (error) {
    console.error("POST /api/migration/bexio error:", error);

    const message =
      error instanceof Error && error.message.includes("401")
        ? "Ungültiger bexio API-Token"
        : "bexio-Import fehlgeschlagen";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── bexio API helper ───────────────────────────────────────────────────────

async function fetchBexio<T>(apiToken: string, path: string): Promise<T[]> {
  const response = await fetch(`https://api.bexio.com${path}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`bexio API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
