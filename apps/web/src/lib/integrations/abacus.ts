// Abacus / AbaNinja ERP integration — bidirectional material/article sync.
//
// AbaNinja REST API: https://abaninja.ch/api/
// The AbaNinja base URL is cloud-only. Self-hosted Abacus installations
// use a configurable base URL stored in integrationTokens.metadata.baseUrl.

import { getDb, eq, and } from "@repo/db";
import {
  integrationTokens,
  materials,
  type IntegrationToken,
} from "@repo/db/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AbacusArticle {
  id?: string;
  nr?: string;        // maps to materials.number
  name?: string;      // maps to materials.name
  unit?: { name: string };
  stock?: { enabled: boolean };
  salesPrice?: number;
  purchasePrice?: number;
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
        eq(integrationTokens.provider, "abacus")
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

function getBaseUrl(row: IntegrationToken): string {
  const meta = row.metadata as { baseUrl?: string } | null;
  return meta?.baseUrl?.replace(/\/$/, "") ?? "https://abaninja.ch";
}

async function refreshAccessToken(row: IntegrationToken): Promise<string> {
  if (!row.refreshToken) {
    throw new Error("Kein Refresh-Token vorhanden. Bitte Abacus neu verbinden.");
  }

  const baseUrl = getBaseUrl(row);
  const res = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ABACUS_CLIENT_ID ?? "",
      client_secret: process.env.ABACUS_CLIENT_SECRET ?? "",
      refresh_token: row.refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Abacus Token-Refresh fehlgeschlagen: ${res.status} ${await res.text().catch(() => "")}`
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

async function getValidAccessToken(orgId: string): Promise<{ token: string; row: IntegrationToken }> {
  const row = await getToken(orgId);
  if (!row) {
    throw new Error("Abacus ist nicht verbunden.");
  }

  const isExpired =
    row.expiresAt != null && row.expiresAt.getTime() < Date.now() + 60_000;

  if (isExpired) {
    const token = await refreshAccessToken(row);
    return { token, row };
  }

  return { token: row.accessToken, row };
}

// ─── Abacus API helpers ───────────────────────────────────────────────────────

async function abacusGet<T>(
  baseUrl: string,
  path: string,
  accessToken: string
): Promise<T> {
  const res = await fetch(`${baseUrl}/api/accounting/v1${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(
      `Abacus GET ${path}: ${res.status} ${await res.text().catch(() => "")}`
    );
  }
  return res.json() as Promise<T>;
}

async function abacusPost<T>(
  baseUrl: string,
  path: string,
  body: unknown,
  accessToken: string
): Promise<T> {
  const res = await fetch(`${baseUrl}/api/accounting/v1${path}`, {
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
    throw new Error(`Abacus POST ${path}: ${res.status} ${text}`.slice(0, 200));
  }
  return res.json() as Promise<T>;
}

// ─── Import: Abacus → LogistikApp ─────────────────────────────────────────────

export async function syncArticlesFromAbacus(orgId: string): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    direction: "import",
    durationMs: 0,
  };

  const { token: accessToken, row } = await getValidAccessToken(orgId);
  const baseUrl = getBaseUrl(row);
  const db = getDb();

  // Abacus returns paginated results; fetch first page (up to 500 articles)
  let articles: AbacusArticle[] = [];
  try {
    const responseData = await abacusGet<{ data?: AbacusArticle[] } | AbacusArticle[]>(
      baseUrl,
      "/articles?limit=500",
      accessToken
    );
    // Handle both array response and { data: [] } envelope
    articles = Array.isArray(responseData)
      ? responseData
      : (responseData as { data?: AbacusArticle[] }).data ?? [];
  } catch (err) {
    result.errors.push(
      `Fehler beim Laden der Abacus-Artikel: ${(err as Error).message}`
    );
    result.durationMs = Date.now() - start;
    return result;
  }

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
    const name = article.name?.trim();
    if (!name) {
      result.skipped++;
      continue;
    }

    const number = article.nr?.trim() ?? null;
    const unit = article.unit?.name ?? "Stk";

    try {
      const existing = number ? byNumber.get(number) : undefined;

      if (existing) {
        await db
          .update(materials)
          .set({ name, unit, updatedAt: new Date() })
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
          unit,
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

// ─── Export: LogistikApp → Abacus ─────────────────────────────────────────────

export async function syncArticlesToAbacus(orgId: string): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    direction: "export",
    durationMs: 0,
  };

  const { token: accessToken, row } = await getValidAccessToken(orgId);
  const baseUrl = getBaseUrl(row);
  const db = getDb();

  const localMaterials = await db
    .select()
    .from(materials)
    .where(and(eq(materials.organizationId, orgId), eq(materials.isActive, true)));

  for (const mat of localMaterials) {
    const nr = mat.number ?? mat.id;
    try {
      // Check if article already exists by nr
      let exists = false;
      try {
        const search = await abacusGet<{ data?: AbacusArticle[] } | AbacusArticle[]>(
          baseUrl,
          `/articles?nr=${encodeURIComponent(nr)}&limit=1`,
          accessToken
        );
        const items = Array.isArray(search)
          ? search
          : (search as { data?: AbacusArticle[] }).data ?? [];
        exists = items.length > 0;
      } catch {
        // If search fails we attempt creation anyway
      }

      if (exists) {
        result.skipped++;
        continue;
      }

      await abacusPost(
        baseUrl,
        "/articles",
        {
          nr,
          name: mat.name,
          unit: { name: mat.unit ?? "Stk" },
          stock: { enabled: true },
        },
        accessToken
      );
      result.created++;
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

export async function syncAbacus(
  orgId: string,
  direction: "import" | "export" | "both"
): Promise<SyncResult> {
  if (direction === "import") return syncArticlesFromAbacus(orgId);
  if (direction === "export") return syncArticlesToAbacus(orgId);

  const importResult = await syncArticlesFromAbacus(orgId);
  const exportResult = await syncArticlesToAbacus(orgId);

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
        eq(integrationTokens.provider, "abacus")
      )
    );
}

// ─── Connection status ────────────────────────────────────────────────────────

export interface AbacusConnectionStatus {
  connected: boolean;
  lastSyncAt: string | null;
  lastSyncResult: SyncResult | null;
  syncDirection: string;
}

export async function getAbacusStatus(orgId: string): Promise<AbacusConnectionStatus> {
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

// ─── Store token ──────────────────────────────────────────────────────────────

export async function storeAbacusToken(
  orgId: string,
  tokenData: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  },
  baseUrl?: string
) {
  const db = getDb();
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  const metadata = baseUrl ? { baseUrl } : null;

  await db
    .insert(integrationTokens)
    .values({
      organizationId: orgId,
      provider: "abacus",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
      scope: tokenData.scope ?? null,
      metadata,
      syncDirection: "both",
    })
    .onConflictDoUpdate({
      target: [integrationTokens.organizationId, integrationTokens.provider],
      set: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        expiresAt,
        scope: tokenData.scope ?? null,
        metadata,
        updatedAt: new Date(),
      },
    });
}

export async function deleteAbacusToken(orgId: string) {
  const db = getDb();
  await db
    .delete(integrationTokens)
    .where(
      and(
        eq(integrationTokens.organizationId, orgId),
        eq(integrationTokens.provider, "abacus")
      )
    );
}

export async function updateAbacusSyncDirection(
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
        eq(integrationTokens.provider, "abacus")
      )
    );
}
