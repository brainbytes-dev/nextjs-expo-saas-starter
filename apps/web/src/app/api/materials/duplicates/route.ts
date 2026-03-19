import { NextResponse } from "next/server";
import { materials, materialGroups, locations } from "@repo/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { withPermission } from "@/lib/rbac";

// ─── Levenshtein distance (pure JS, no deps) ─────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function normalise(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

// ─── GET /api/materials/duplicates ───────────────────────────────────────────

export const GET = withPermission("materials", "read")(async (_request, { db, orgId }) => {
  try {
    // Fetch all active materials with stock totals
    const rows = await db
      .select({
        id: materials.id,
        number: materials.number,
        name: materials.name,
        barcode: materials.barcode,
        manufacturer: materials.manufacturer,
        groupId: materials.groupId,
        groupName: materialGroups.name,
        mainLocationId: materials.mainLocationId,
        mainLocationName: locations.name,
        unit: materials.unit,
        totalStock: sql<number>`COALESCE((
          SELECT SUM(ms.quantity) FROM material_stocks ms WHERE ms.material_id = ${materials.id}
        ), 0)`.as("total_stock"),
      })
      .from(materials)
      .leftJoin(materialGroups, eq(materials.groupId, materialGroups.id))
      .leftJoin(locations, eq(materials.mainLocationId, locations.id))
      .where(and(eq(materials.organizationId, orgId), eq(materials.isActive, true)))
      .orderBy(materials.name);

    type Row = typeof rows[number];

    // ── Step 1: exact barcode duplicates ─────────────────────────────────────
    const barcodeMap = new Map<string, Row[]>();
    for (const row of rows) {
      if (!row.barcode) continue;
      const existing = barcodeMap.get(row.barcode) ?? [];
      existing.push(row);
      barcodeMap.set(row.barcode, existing);
    }

    // ── Step 2: name similarity groups ───────────────────────────────────────
    // O(n²) — acceptable for typical inventory sizes (< 10 000 items).
    // Groups items whose normalised names are within Levenshtein distance 3 of
    // each other, OR share the same manufacturer and are within distance 5.
    const visited = new Set<string>();
    const similarityGroups: { ids: Set<string>; reason: string; score: number }[] = [];

    for (let i = 0; i < rows.length; i++) {
      if (visited.has(rows[i].id)) continue;
      const group: Row[] = [rows[i]];
      const nameA = normalise(rows[i].name);

      for (let j = i + 1; j < rows.length; j++) {
        if (visited.has(rows[j].id)) continue;
        const nameB = normalise(rows[j].name);
        const dist = levenshtein(nameA, nameB);
        const sameManufacturer =
          rows[i].manufacturer &&
          rows[j].manufacturer &&
          normalise(rows[i].manufacturer as string) === normalise(rows[j].manufacturer as string);

        const threshold = sameManufacturer ? 5 : 3;
        if (dist <= threshold && dist > 0) {
          group.push(rows[j]);
          visited.add(rows[j].id);
        }
      }

      if (group.length > 1) {
        visited.add(rows[i].id);
        const minDist = Math.min(
          ...group.slice(1).map((r) => levenshtein(normalise(rows[i].name), normalise(r.name)))
        );
        similarityGroups.push({
          ids: new Set(group.map((r) => r.id)),
          reason: "similar_name",
          score: Math.max(0, 100 - minDist * 20),
        });
      }
    }

    // ── Step 3: Combine results into duplicate groups ─────────────────────────
    interface DuplicateGroup {
      id: string;
      reason: "exact_barcode" | "similar_name" | "same_manufacturer";
      similarityScore: number;
      items: {
        id: string;
        number: string | null;
        name: string;
        barcode: string | null;
        manufacturer: string | null;
        groupName: string | null;
        mainLocationName: string | null;
        totalStock: number;
        unit: string | null;
      }[];
    }

    const idMap = new Map<string, Row>(rows.map((r) => [r.id, r]));
    const result: DuplicateGroup[] = [];

    // Barcode groups (score 100)
    for (const [barcode, dupes] of barcodeMap.entries()) {
      if (dupes.length < 2) continue;
      result.push({
        id: `barcode-${barcode}`,
        reason: "exact_barcode",
        similarityScore: 100,
        items: dupes.map((r) => ({
          id: r.id,
          number: r.number,
          name: r.name,
          barcode: r.barcode,
          manufacturer: r.manufacturer,
          groupName: r.groupName,
          mainLocationName: r.mainLocationName,
          totalStock: Number(r.totalStock),
          unit: r.unit,
        })),
      });
    }

    // Similarity groups
    for (const grp of similarityGroups) {
      const items = [...grp.ids]
        .map((id) => idMap.get(id))
        .filter((r): r is Row => r !== undefined);

      // Skip if this group was already covered by an exact barcode match
      const alreadyCovered = result.some(
        (g) =>
          g.reason === "exact_barcode" &&
          g.items.every((i) => grp.ids.has(i.id))
      );
      if (alreadyCovered) continue;

      const sameManufacturer =
        items.length >= 2 &&
        items[0].manufacturer &&
        items.every(
          (r) =>
            r.manufacturer &&
            normalise(r.manufacturer) === normalise(items[0].manufacturer!)
        );

      result.push({
        id: `similarity-${[...grp.ids].sort().join("-")}`,
        reason: sameManufacturer ? "same_manufacturer" : "similar_name",
        similarityScore: grp.score,
        items: items.map((r) => ({
          id: r.id,
          number: r.number,
          name: r.name,
          barcode: r.barcode,
          manufacturer: r.manufacturer,
          groupName: r.groupName,
          mainLocationName: r.mainLocationName,
          totalStock: Number(r.totalStock),
          unit: r.unit,
        })),
      });
    }

    // Sort by score descending, then by barcode first
    result.sort((a, b) => {
      if (a.reason === "exact_barcode" && b.reason !== "exact_barcode") return -1;
      if (b.reason === "exact_barcode" && a.reason !== "exact_barcode") return 1;
      return b.similarityScore - a.similarityScore;
    });

    return NextResponse.json({ groups: result, total: result.length });
  } catch (error) {
    console.error("GET /api/materials/duplicates error:", error);
    return NextResponse.json({ error: "Failed to detect duplicates" }, { status: 500 });
  }
});
