import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { apiKeys } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { generateApiKey } from "@/lib/api-key-auth";

// ─── Allowed scopes catalogue ─────────────────────────────────────────────────

export const VALID_SCOPES = [
  "materials:read",
  "materials:write",
  "tools:read",
  "tools:write",
  "keys:read",
  "locations:read",
  "stock:read",
  "*",
] as const;

// ─── GET /api/api-keys ────────────────────────────────────────────────────────
// List all API keys for the current organisation (never returns full key).

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const rows = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, orgId))
      .orderBy(apiKeys.createdAt);

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("GET /api/api-keys error:", error);
    return NextResponse.json({ error: "Fehler beim Laden der API-Schlüssel" }, { status: 500 });
  }
}

// ─── POST /api/api-keys ───────────────────────────────────────────────────────
// Create a new API key. Returns the raw key ONCE in keyOnCreate.

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { name, scopes } = body as { name?: string; scopes?: string[] };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name ist erforderlich" }, { status: 400 });
    }

    const sanitizedScopes = (scopes ?? []).filter((s) =>
      VALID_SCOPES.includes(s as (typeof VALID_SCOPES)[number])
    );

    if (sanitizedScopes.length === 0) {
      return NextResponse.json(
        { error: "Mindestens ein Scope muss ausgewählt werden" },
        { status: 400 }
      );
    }

    const { raw, hash, prefix } = generateApiKey();

    const [created] = await db
      .insert(apiKeys)
      .values({
        organizationId: orgId,
        name: name.trim(),
        keyHash: hash,
        prefix,
        scopes: sanitizedScopes,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        prefix: apiKeys.prefix,
        scopes: apiKeys.scopes,
        createdAt: apiKeys.createdAt,
      });

    return NextResponse.json(
      { ...created, keyOnCreate: raw },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/api-keys error:", error);
    return NextResponse.json({ error: "Fehler beim Erstellen des API-Schlüssels" }, { status: 500 });
  }
}

// ─── DELETE /api/api-keys?id=<uuid> ──────────────────────────────────────────
// Revoke (delete) an API key.

export async function DELETE(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id ist erforderlich" }, { status: 400 });
    }

    const deleted = await db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, orgId)))
      .returning({ id: apiKeys.id });

    if (!deleted.length) {
      return NextResponse.json({ error: "API-Schlüssel nicht gefunden" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/api-keys error:", error);
    return NextResponse.json({ error: "Fehler beim Löschen des API-Schlüssels" }, { status: 500 });
  }
}
