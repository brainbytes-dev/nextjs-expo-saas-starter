// bexio sync endpoint.
//
// GET  — returns connection status, last sync timestamp, and last sync result.
// POST — triggers a sync. Body: { direction?: "import" | "export" | "both" }
// PATCH — update sync direction preference.

import { NextRequest, NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import {
  syncBexio,
  getBexioStatus,
  updateBexioSyncDirection,
} from "@/lib/integrations/bexio";

export async function GET(req: NextRequest) {
  const result = await getSessionAndOrg(req);
  if (result.error) return result.error;
  const { orgId } = result;

  const status = await getBexioStatus(orgId);
  if (!status.connected) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }
  return NextResponse.json(status);
}

export async function POST(req: NextRequest) {
  const result = await getSessionAndOrg(req);
  if (result.error) return result.error;
  const { orgId } = result;

  const body = await req.json().catch(() => ({})) as { direction?: string };
  const direction = (body.direction ?? "both") as "import" | "export" | "both";

  if (!["import", "export", "both"].includes(direction)) {
    return NextResponse.json(
      { error: "Ungültige Sync-Richtung. Erlaubt: import | export | both" },
      { status: 400 }
    );
  }

  try {
    const syncResult = await syncBexio(orgId, direction);
    return NextResponse.json(syncResult);
  } catch (err) {
    console.error("bexio sync error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Synchronisation fehlgeschlagen" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const result = await getSessionAndOrg(req);
  if (result.error) return result.error;
  const { orgId } = result;

  const body = await req.json().catch(() => ({})) as { direction?: string };
  const direction = body.direction as "import" | "export" | "both";

  if (!["import", "export", "both"].includes(direction)) {
    return NextResponse.json(
      { error: "Ungültige Sync-Richtung" },
      { status: 400 }
    );
  }

  await updateBexioSyncDirection(orgId, direction);
  return NextResponse.json({ ok: true, direction });
}
