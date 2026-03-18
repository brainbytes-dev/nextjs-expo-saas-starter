import { createHash, timingSafeEqual, randomBytes } from "crypto";
import { getDb } from "@repo/db";
import { apiKeys } from "@repo/db/schema";
import { eq } from "drizzle-orm";

// ─── Key Format ──────────────────────────────────────────────────────────────
// lapp_live_<32 random hex chars>
// Example: lapp_live_a3f7c2e1b8d94052...

const KEY_PREFIX = "lapp_live_";

// ─── Key Generation ───────────────────────────────────────────────────────────

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const randomPart = randomBytes(16).toString("hex"); // 32 hex chars
  const raw = `${KEY_PREFIX}${randomPart}`;
  const hash = hashKey(raw);
  const prefix = raw.slice(0, KEY_PREFIX.length + 8); // "lapp_live_" + 8 chars
  return { raw, hash, prefix };
}

// ─── Hashing ─────────────────────────────────────────────────────────────────

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// ─── Auth Result ─────────────────────────────────────────────────────────────

export interface ApiKeyAuthResult {
  orgId: string;
  scopes: string[];
  keyId: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates the Bearer API key from the Authorization header.
 * Uses timing-safe comparison to prevent timing attacks.
 * Returns { orgId, scopes } on success, null on failure.
 */
export async function validateApiKey(
  request: Request
): Promise<ApiKeyAuthResult | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const raw = authHeader.slice(7).trim();
  if (!raw.startsWith(KEY_PREFIX)) return null;

  const incomingHash = hashKey(raw);

  const db = getDb();

  // Look up by prefix first to narrow the scan; still hash-compare for safety
  const prefix = raw.slice(0, KEY_PREFIX.length + 8);
  const candidates = await db
    .select({
      id: apiKeys.id,
      keyHash: apiKeys.keyHash,
      organizationId: apiKeys.organizationId,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.prefix, prefix))
    .limit(5);

  for (const candidate of candidates) {
    // Check expiry
    if (candidate.expiresAt && candidate.expiresAt < new Date()) continue;

    // Timing-safe comparison
    const storedBuf = Buffer.from(candidate.keyHash, "hex");
    const incomingBuf = Buffer.from(incomingHash, "hex");

    if (storedBuf.length !== incomingBuf.length) continue;

    const match = timingSafeEqual(storedBuf, incomingBuf);
    if (!match) continue;

    // Update lastUsedAt fire-and-forget
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, candidate.id))
      .catch(() => {});

    return {
      orgId: candidate.organizationId,
      scopes: candidate.scopes ?? [],
      keyId: candidate.id,
    };
  }

  return null;
}

// ─── Scope Check ─────────────────────────────────────────────────────────────

export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes(required) || scopes.includes("*");
}
