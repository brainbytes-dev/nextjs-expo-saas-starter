import { NextResponse } from "next/server";
import { getDb, sql } from "@repo/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CheckResult {
  status: "up" | "down";
  latency?: number;
}

export async function GET() {
  const checks: Record<string, CheckResult> = {};
  let overallStatus: "operational" | "degraded" | "outage" = "operational";

  // API check (implicitly up if this handler runs)
  const apiStart = Date.now();
  checks.api = { status: "up", latency: 0 };

  // Database check
  try {
    const dbStart = Date.now();
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    checks.database = { status: "up", latency: Date.now() - dbStart };
  } catch {
    checks.database = { status: "down" };
    overallStatus = "degraded";
  }

  // Auth check (verify the auth endpoint is reachable)
  try {
    const authStart = Date.now();
    const baseUrl =
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/auth/ok`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    checks.auth = {
      status: res.ok ? "up" : "down",
      latency: Date.now() - authStart,
    };
    if (!res.ok) overallStatus = "degraded";
  } catch {
    checks.auth = { status: "down" };
    overallStatus = "degraded";
  }

  // Finalize API latency
  checks.api.latency = Date.now() - apiStart;

  // If both DB and auth are down, it's an outage
  if (checks.database.status === "down" && checks.auth.status === "down") {
    overallStatus = "outage";
  }

  return NextResponse.json(
    {
      status: overallStatus,
      checks,
      uptime: "99.9%",
      lastChecked: new Date().toISOString(),
      incidents: [],
    },
    {
      status: overallStatus === "outage" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
