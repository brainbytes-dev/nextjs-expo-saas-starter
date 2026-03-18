// bexio ERP integration — bidirectional material/article sync.
//
// bexio API v2: https://docs.bexio.com/
// Token endpoint: https://idp.bexio.com/auth/realms/bexio/protocol/openid-connect/token
// Articles endpoint: https://api.bexio.com/2.0/article

import { getDb, eq, and } from "@repo/db";
import {
  integrationTokens,
  materials,
  type IntegrationToken,
} from "@repo/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BexioArticle {
  id?: number;
  intern_code?: string; // maps to materials.number
  intern_name?: string; // maps to materials.name
  stock_nr?: string;    // maps to materials.barcode
  stock_management?: boolean;
  unit_id?: number;
  purchase_price?: string;
  sale_price?: string;
  is_stock?: boolean;
}

export interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  direction: "import" | "export" | "both";
  durationMs: number;
}

// ─── Token management ─────────────────────────────────────────────────────────

async function getToken(orgId: string): Promise<IntegrationToken | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(integrationTokens)
    .where(
      and(
        eq(integrationTokens.organizationId, orgId),
        eq(integrationTokens.provider, "bexio")
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Refresh the bexio access token using the stored refresh token.
 * Updates the DB row in place and returns the new access token.
 */
async function refreshAccessToken(row: IntegrationToken): Promise<string> {
  if (!row.refreshToken) {
    throw new Error("Kein Refresh-Token vorhanden. Bitte bexio neu verbinden.");
  }

  const res = await fetch(
    "https://idp.bexio.com/auth/realms/bexio/protocol/openid-connect/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.BEXIO_CLIENT_ID ?? "",
        client_secret: process.env.BEXIO_CLIENT_SECRET ?? "",
        refresh_token: row.refreshToken,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Token-Refresh fehlgeschlagen: ${res.status} ${await res.text().catch(() => "")}`
    );
  }

  const token = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const db = getDb();
  await db
    .update(integrationTokens)
    .set({
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? row.refreshToken,
      expiresAt: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(integrationTokens.id, row.id));

  return token.access_token;
}

/**
 * Returns a valid access token, refreshing if it has expired.
 */
async function getValidAccessToken(orgId: string): Promise<string> {
  const row = await getToken(orgId);
  if (!row) {
    throw new Error("bexio ist nicht verbunden.");
  }

  const isExpired =
    row.expiresAt != null && row.expiresAt.getTime() < Date.now() + 60_000;

  if (isExpired) {
    return refreshAccessToken(row);
  }

  return row.accessToken;
}

// ─── bexio API helpers ────────────────────────────────────────────────────────

async function bexioGet<T>(
  path: string,
  accessToken: string
): Promise<T> {
  const res = await fetch(`https://api.bexio.com/2.0${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(
      `bexio GET ${path} fehlgeschlagen: ${res.status} ${await res.text().catch(() => "")}`
    );
  }
  return res.json() as Promise<T>;
}

async function bexioPost<T>(
  path: string,
  body: unknown,
  accessToken: string
): Promise<T> {
  const res = await fetch(`https://api.bexio.com/2.0${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => String(res.status));
    throw new Error(`bexio POST ${path}: ${res.status} ${text}`.slice(0, 200));
  }
  return res.json() as Promise<T>;
}

// bexio search articles by intern_code to check for existence
async function findBexioArticleByCode(
  code: string,
  accessToken: string
): Promise<BexioArticle | null> {
  const results = await bexioPost<BexioArticle[]>(
    "/article/search",
    [{ field: "intern_code", value: code, criteria: "=" }],
    accessToken
  ).catch(() => null);
  return results?.[0] ?? null;
}

// ─── Import: bexio → LogistikApp ─────────────────────────────────────────────

export async function syncArticlesFromBexio(orgId: string): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    direction: "import",
    durationMs: 0,
  };

  const accessToken = await getValidAccessToken(orgId);
  const db = getDb();

  // Fetch all bexio articles (max 2000 per call; pagination not required for typical SME)
  let articles: BexioArticle[] = [];
  try {
    articles = await bexioGet<BexioArticle[]>("/article", accessToken);
  } catch (err) {
    result.errors.push(
      `Fehler beim Laden der bexio-Artikel: ${(err as Error).message}`
    );
    result.durationMs = Date.now() - start;
    return result;
  }

  // Load existing materials for this org indexed by number (intern_code)
  const existingMaterials = await db
    .select({ id: materials.id, number: materials.number, name: materials.name })
    .from(materials)
    .where(eq(materials.organizationId, orgId));

  const byNumber = new Map(
    existingMaterials
      .filter((m) => m.number != null)
      .map((m) => [m.number!, m])
  );

  for (const article of articles) {
    const name = article.intern_name?.trim();
    if (!name) {
      result.skipped++;
      continue;
    }

    const number = article.intern_code?.trim() ?? null;
    const barcode = article.stock_nr?.trim() ?? null;

    try {
      const existing = number ? byNumber.get(number) : undefined;

      if (existing) {
        // Update name + barcode if they differ
        await db
          .update(materials)
          .set({
            name,
            barcode: barcode ?? undefined,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(materials.id, existing.id),
              eq(materials.organizationId, orgId)
            )
          );
        result.updated++;
      } else {
        await db.insert(materials).values({
          organizationId: orgId,
          name,
          number: number ?? undefined,
          barcode: barcode ?? undefined,
          unit: "Stk",
          isActive: true,
        });
        result.created++;
      }
    } catch (err) {
      result.errors.push(
        `${name}: ${(err as Error).message}`.slice(0, 120)
      );
    }
  }

  result.durationMs = Date.now() - start;
  await persistSyncResult(orgId, result);
  return result;
}

// ─── Export: LogistikApp → bexio ─────────────────────────────────────────────

export async function syncArticlesToBexio(orgId: string): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    direction: "export",
    durationMs: 0,
  };

  const accessToken = await getValidAccessToken(orgId);
  const db = getDb();

  const localMaterials = await db
    .select()
    .from(materials)
    .where(and(eq(materials.organizationId, orgId), eq(materials.isActive, true)));

  for (const mat of localMaterials) {
    const internCode = mat.number ?? mat.id;

    try {
      const existing = await findBexioArticleByCode(internCode, accessToken);

      const payload: BexioArticle = {
        intern_code: internCode,
        intern_name: mat.name,
        stock_management: true,
        stock_nr: mat.barcode ?? mat.number ?? "",
        unit_id: 1, // default unit; configurable per-org in the future
        is_stock: true,
      };

      if (existing?.id) {
        // bexio article exists — skip (read-only sync for now; update not needed)
        result.skipped++;
      } else {
        await bexioPost("/article", payload, accessToken);
        result.created++;
      }
    } catch (err) {
      result.errors.push(
        `${mat.name}: ${(err as Error).message}`.slice(0, 120)
      );
    }
  }

  result.durationMs = Date.now() - start;
  await persistSyncResult(orgId, result);
  return result;
}

// ─── Full bidirectional sync ──────────────────────────────────────────────────

export async function syncBexio(
  orgId: string,
  direction: "import" | "export" | "both"
): Promise<SyncResult> {
  if (direction === "import") return syncArticlesFromBexio(orgId);
  if (direction === "export") return syncArticlesToBexio(orgId);

  // Both: import first (authoritative ERP data), then push new local materials
  const importResult = await syncArticlesFromBexio(orgId);
  const exportResult = await syncArticlesToBexio(orgId);

  const combined: SyncResult = {
    created: importResult.created + exportResult.created,
    updated: importResult.updated + exportResult.updated,
    skipped: importResult.skipped + exportResult.skipped,
    errors: [...importResult.errors, ...exportResult.errors],
    direction: "both",
    durationMs: importResult.durationMs + exportResult.durationMs,
  };

  await persistSyncResult(orgId, combined);
  return combined;
}

// ─── Persist result ───────────────────────────────────────────────────────────

async function persistSyncResult(orgId: string, result: SyncResult) {
  const db = getDb();
  await db
    .update(integrationTokens)
    .set({
      lastSyncAt: new Date(),
      lastSyncResult: result as unknown as Record<string, unknown>,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrationTokens.organizationId, orgId),
        eq(integrationTokens.provider, "bexio")
      )
    );
}

// ─── Connection status ────────────────────────────────────────────────────────

export interface BexioConnectionStatus {
  connected: boolean;
  lastSyncAt: string | null;
  lastSyncResult: SyncResult | null;
  syncDirection: string;
}

export async function getBexioStatus(orgId: string): Promise<BexioConnectionStatus> {
  const row = await getToken(orgId);
  if (!row) {
    return { connected: false, lastSyncAt: null, lastSyncResult: null, syncDirection: "both" };
  }

  return {
    connected: true,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastSyncResult: row.lastSyncResult as SyncResult | null,
    syncDirection: row.syncDirection ?? "both",
  };
}

// ─── Store token (called from OAuth callback) ─────────────────────────────────

export async function storeBexioToken(
  orgId: string,
  tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  }
) {
  const db = getDb();
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await db
    .insert(integrationTokens)
    .values({
      organizationId: orgId,
      provider: "bexio",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      scope: tokenData.scope ?? null,
      syncDirection: "both",
    })
    .onConflictDoUpdate({
      target: [integrationTokens.organizationId, integrationTokens.provider],
      set: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt,
        scope: tokenData.scope ?? null,
        updatedAt: new Date(),
      },
    });
}

export async function deleteBexioToken(orgId: string) {
  const db = getDb();
  await db
    .delete(integrationTokens)
    .where(
      and(
        eq(integrationTokens.organizationId, orgId),
        eq(integrationTokens.provider, "bexio")
      )
    );
}

export async function updateBexioSyncDirection(
  orgId: string,
  direction: "import" | "export" | "both"
) {
  const db = getDb();
  await db
    .update(integrationTokens)
    .set({ syncDirection: direction, updatedAt: new Date() })
    .where(
      and(
        eq(integrationTokens.organizationId, orgId),
        eq(integrationTokens.provider, "bexio")
      )
    );
}
