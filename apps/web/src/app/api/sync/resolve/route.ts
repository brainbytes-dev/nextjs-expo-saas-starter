import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  materials,
  tools,
  commissions,
} from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClientChange {
  /** Client-generated queue item id */
  queueId: string;
  path: string;
  method: "POST" | "PATCH";
  body: Record<string, unknown>;
  /** Unix timestamp (ms) when the action was enqueued on the client */
  clientTimestamp: number;
}

export interface ResolvedChange {
  queueId: string;
  /** Actual HTTP status returned when the change was applied */
  status: number;
}

export interface ConflictInfo {
  queueId: string;
  clientChange: ClientChange;
  serverState: Record<string, unknown>;
  /** Field names that differ between client intent and current server state */
  conflictFields: string[];
}

export interface SyncResolveResponse {
  resolved: ResolvedChange[];
  conflicts: ConflictInfo[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the entity type and id from a path such as
 *   /api/materials/abc123
 *   /api/commissions/abc123
 *   /api/tools/abc123/booking  (← POST — not a state conflict)
 *   /api/stock-changes          (← POST — not a state conflict)
 */
function parseEntityFromPath(
  path: string
): { type: "material" | "commission" | "tool"; id: string } | null {
  const materialMatch = path.match(/^\/api\/materials\/([^/]+)$/);
  if (materialMatch) return { type: "material", id: materialMatch[1]! };

  const commissionMatch = path.match(/^\/api\/commissions\/([^/]+)$/);
  if (commissionMatch) return { type: "commission", id: commissionMatch[1]! };

  const toolMatch = path.match(/^\/api\/tools\/([^/]+)$/);
  if (toolMatch) return { type: "tool", id: toolMatch[1]! };

  return null;
}

async function fetchServerState(
  db: ReturnType<typeof import("@repo/db").getDb>,
  orgId: string,
  entity: { type: "material" | "commission" | "tool"; id: string }
): Promise<Record<string, unknown> | null> {
  if (entity.type === "material") {
    const [row] = await db
      .select()
      .from(materials)
      .where(and(eq(materials.id, entity.id), eq(materials.organizationId, orgId)))
      .limit(1);
    return row ? (row as Record<string, unknown>) : null;
  }

  if (entity.type === "commission") {
    const [row] = await db
      .select()
      .from(commissions)
      .where(and(eq(commissions.id, entity.id), eq(commissions.organizationId, orgId)))
      .limit(1);
    return row ? (row as Record<string, unknown>) : null;
  }

  if (entity.type === "tool") {
    const [row] = await db
      .select()
      .from(tools)
      .where(and(eq(tools.id, entity.id), eq(tools.organizationId, orgId)))
      .limit(1);
    return row ? (row as Record<string, unknown>) : null;
  }

  return null;
}

/** Return field names from the client body that have diverged on the server */
function detectConflictFields(
  clientBody: Record<string, unknown>,
  serverState: Record<string, unknown>,
  clientTimestamp: number
): string[] {
  const serverUpdatedAt = serverState.updatedAt;
  if (!serverUpdatedAt) return [];

  // If the server record was last touched before the client enqueued its change,
  // there is no conflict — the server is still at the version the client knew.
  const serverTs =
    serverUpdatedAt instanceof Date
      ? serverUpdatedAt.getTime()
      : new Date(serverUpdatedAt as string).getTime();

  if (serverTs <= clientTimestamp) return [];

  // Server is newer — find which fields the client intended to change that
  // now differ from the current server state.
  const fields: string[] = [];
  for (const [key, clientValue] of Object.entries(clientBody)) {
    if (key === "updatedAt" || key === "createdAt") continue;
    const serverValue = serverState[key];
    // Loose equality is intentional: "1" and 1 should not trigger a conflict.
    // eslint-disable-next-line eqeqeq
    if (serverValue != clientValue) {
      fields.push(key);
    }
  }
  return fields;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const authResult = await getSessionAndOrg(request);
    if (authResult.error) return authResult.error;
    const { db, orgId } = authResult;

    const body = await request.json();
    const changes: ClientChange[] = body?.changes ?? [];

    if (!Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json({ resolved: [], conflicts: [] });
    }

    if (changes.length > 100) {
      return NextResponse.json(
        { error: "Too many changes — max 100 per batch" },
        { status: 400 }
      );
    }

    const resolved: ResolvedChange[] = [];
    const conflicts: ConflictInfo[] = [];

    for (const change of changes) {
      const { queueId, path, method, body: changeBody, clientTimestamp } = change;

      // Only PATCH operations on known entity paths can produce field conflicts.
      // POST operations (stock-changes, tool-bookings, commission entries) are
      // append-only and should always be applied — they cannot conflict.
      const entity = method === "PATCH" ? parseEntityFromPath(path) : null;

      if (entity) {
        const serverState = await fetchServerState(db, orgId, entity);

        if (serverState) {
          const conflictFields = detectConflictFields(
            changeBody,
            serverState,
            clientTimestamp
          );

          if (conflictFields.length > 0) {
            conflicts.push({
              queueId,
              clientChange: change,
              serverState,
              conflictFields,
            });
            continue; // Do NOT apply — caller decides
          }
        }
      }

      // No conflict detected (or non-conflictable operation) — apply it.
      try {
        const applyRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"}${path}`,
          {
            method,
            headers: {
              "Content-Type": "application/json",
              // Forward the original auth + org headers
              ...Object.fromEntries(
                ["authorization", "x-organization-id"]
                  .map((h) => [h, request.headers.get(h)])
                  .filter(([, v]) => v != null) as [string, string][]
              ),
            },
            body: JSON.stringify(changeBody),
          }
        );
        resolved.push({ queueId, status: applyRes.status });
      } catch {
        // Network error applying the change — leave it in the queue for retry
        // by not adding it to resolved or conflicts.
      }
    }

    return NextResponse.json({ resolved, conflicts } satisfies SyncResolveResponse);
  } catch (error) {
    console.error("POST /api/sync/resolve error:", error);
    return NextResponse.json(
      { error: "Failed to process sync batch" },
      { status: 500 }
    );
  }
}
