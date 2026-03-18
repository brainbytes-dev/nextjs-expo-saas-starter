import { getDb } from "@repo/db";
import { eanCache } from "@repo/db/schema";
import { eq } from "drizzle-orm";

export interface EanResult {
  barcode: string;
  name: string | null;
  manufacturer: string | null;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  source: string;
}

/**
 * Look up product data for any scannable barcode (EAN, GTIN, UPC, PZN, etc.)
 *
 * Fallback chain — tries each source in order, stops on first hit:
 *   1. Local ean_cache (instant, free)
 *   2. Open Food Facts — food, drinks, cosmetics (free, no key)
 *   3. Open Beauty Facts — cosmetics, hygiene (free, no key)
 *   4. Open Pet Food Facts — pet products (free, no key)
 *   5. Open Products Facts — general products (free, no key)
 *   6. Open GTIN DB — general consumer goods DACH (free key)
 *   7. UPC ItemDB — US/global consumer products (free, no key)
 *   8. Wikidata SPARQL — anything with a GTIN in Wikidata (free)
 *
 * All external calls have a 5-second timeout and fail silently.
 */
export async function lookupEan(barcode: string): Promise<EanResult | null> {
  // 1. Cache
  const cached = await checkCache(barcode);
  if (cached) return cached;

  // 2-5. Open *Facts family (same API, different subdomain)
  for (const source of OPEN_FACTS_SOURCES) {
    const result = await queryOpenFacts(barcode, source.host, source.name);
    if (result) { await saveToCache(barcode, result); return result; }
  }

  // 6. Open GTIN DB (DACH focus)
  const gtindb = await queryOpenGtinDb(barcode);
  if (gtindb) { await saveToCache(barcode, gtindb); return gtindb; }

  // 7. UPC ItemDB
  const upc = await queryUpcItemDb(barcode);
  if (upc) { await saveToCache(barcode, upc); return upc; }

  // 8. Wikidata
  const wiki = await queryWikidata(barcode);
  if (wiki) { await saveToCache(barcode, wiki); return wiki; }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Cache ───────────────────────────────────────────────────────────

async function checkCache(barcode: string): Promise<EanResult | null> {
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(eanCache)
      .where(eq(eanCache.barcode, barcode))
      .limit(1);
    if (!row) return null;
    return {
      barcode: row.barcode,
      name: row.name,
      manufacturer: row.manufacturer,
      description: row.description,
      imageUrl: row.imageUrl,
      category: row.category,
      source: "cache",
    };
  } catch {
    return null;
  }
}

async function saveToCache(barcode: string, result: EanResult): Promise<void> {
  try {
    const db = getDb();
    await db
      .insert(eanCache)
      .values({
        barcode,
        name: result.name,
        manufacturer: result.manufacturer,
        description: result.description,
        imageUrl: result.imageUrl,
        category: result.category,
        source: result.source,
      })
      .onConflictDoUpdate({
        target: eanCache.barcode,
        set: {
          name: result.name,
          manufacturer: result.manufacturer,
          description: result.description,
          imageUrl: result.imageUrl,
          category: result.category,
          source: result.source,
          updatedAt: new Date(),
        },
      });
  } catch {}
}

// ─── Open *Facts Family ──────────────────────────────────────────────
// All 4 databases use the same API format, just different subdomains.
// Covers: food, beverages, cosmetics, hygiene, pet food, and general products.

const OPEN_FACTS_SOURCES = [
  { host: "world.openfoodfacts.org", name: "openfoodfacts" },
  { host: "world.openbeautyfacts.org", name: "openbeautyfacts" },
  { host: "world.openpetfoodfacts.org", name: "openpetfoodfacts" },
  { host: "world.openproductsfacts.org", name: "openproductsfacts" },
] as const;

async function queryOpenFacts(
  barcode: string,
  host: string,
  sourceName: string
): Promise<EanResult | null> {
  try {
    const res = await fetchWithTimeout(
      `https://${host}/api/v2/product/${barcode}.json`
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      status: number;
      product?: {
        product_name?: string;
        product_name_de?: string;
        product_name_fr?: string;
        brands?: string;
        generic_name?: string;
        generic_name_de?: string;
        image_url?: string;
        image_front_url?: string;
        categories?: string;
        categories_tags?: string[];
      };
    };

    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const name = p.product_name_de || p.product_name || p.product_name_fr || null;
    if (!name) return null;

    return {
      barcode,
      name,
      manufacturer: p.brands || null,
      description: p.generic_name_de || p.generic_name || null,
      imageUrl: p.image_url || p.image_front_url || null,
      category: p.categories || null,
      source: sourceName,
    };
  } catch {
    return null;
  }
}

// ─── Open GTIN DB (DACH focus) ───────────────────────────────────────
// Returns plaintext key=value format, NOT JSON.
// See: http://opengtindb.org/?ean=[ean]&cmd=query&queryid=[userid]

function parseOpenGtinResponse(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split("\n")) {
    if (line === "---" || !line.trim()) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return result;
}

async function queryOpenGtinDb(barcode: string): Promise<EanResult | null> {
  const queryId = process.env.OPENGTINDB_API_KEY;
  if (!queryId) return null;

  try {
    const res = await fetchWithTimeout(
      `http://opengtindb.org/?ean=${barcode}&cmd=query&queryid=${queryId}`
    );
    if (!res.ok) return null;

    const text = await res.text();
    const data = parseOpenGtinResponse(text);

    // error=0 means success, anything else is a miss
    if (data.error !== "0" || !data.name) return null;

    return {
      barcode,
      name: data.detailname || data.name,
      manufacturer: data.vendor || null,
      description: data.descr || null,
      imageUrl: null,
      category: data.maincat || null,
      source: "opengtindb",
    };
  } catch {
    return null;
  }
}

// ─── UPC ItemDB ──────────────────────────────────────────────────────
// Free API, no key needed. Covers US/global consumer products.

async function queryUpcItemDb(barcode: string): Promise<EanResult | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      code: string;
      items?: Array<{
        title?: string;
        brand?: string;
        description?: string;
        category?: string;
        images?: string[];
      }>;
    };

    const item = data.items?.[0];
    if (!item?.title) return null;

    return {
      barcode,
      name: item.title,
      manufacturer: item.brand || null,
      description: item.description || null,
      imageUrl: item.images?.[0] || null,
      category: item.category || null,
      source: "upcitemdb",
    };
  } catch {
    return null;
  }
}

// ─── Wikidata SPARQL ─────────────────────────────────────────────────
// Searches Wikidata for items with matching GTIN (P3962) or EAN (P1065).
// Covers: any product, medication, chemical, etc. that has a GTIN in Wikidata.

async function queryWikidata(barcode: string): Promise<EanResult | null> {
  try {
    const sparql = `
      SELECT ?item ?itemLabel ?itemDescription ?manufacturerLabel ?image WHERE {
        { ?item wdt:P3962 "${barcode}" . }
        UNION
        { ?item wdt:P1065 "${barcode}" . }
        OPTIONAL { ?item wdt:P176 ?manufacturer . }
        OPTIONAL { ?item wdt:P18 ?image . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en,fr" . }
      }
      LIMIT 1
    `;

    const res = await fetchWithTimeout(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: {
        bindings?: Array<{
          itemLabel?: { value?: string };
          itemDescription?: { value?: string };
          manufacturerLabel?: { value?: string };
          image?: { value?: string };
        }>;
      };
    };

    const binding = data.results?.bindings?.[0];
    if (!binding?.itemLabel?.value) return null;

    return {
      barcode,
      name: binding.itemLabel.value,
      manufacturer: binding.manufacturerLabel?.value || null,
      description: binding.itemDescription?.value || null,
      imageUrl: binding.image?.value || null,
      category: null,
      source: "wikidata",
    };
  } catch {
    return null;
  }
}
