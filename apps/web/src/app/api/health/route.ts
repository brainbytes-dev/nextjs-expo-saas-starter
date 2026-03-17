import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { DEMO_MODE } from "@/lib/demo-mode";

export async function GET() {
  if (DEMO_MODE) {
    return NextResponse.json({
      status: "healthy",
      checks: { database: "demo_mode", env: process.env.NODE_ENV || "unknown", timestamp: new Date().toISOString() },
    });
  }
  const checks: Record<string, string> = {};

  // Database check
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      checks.database = "ok";
    } else {
      checks.database = "not_configured";
    }
  } catch {
    checks.database = "error";
  }

  // Environment check
  checks.env = process.env.NODE_ENV || "unknown";
  checks.timestamp = new Date().toISOString();

  const allOk = checks.database !== "error";

  return NextResponse.json(
    { status: allOk ? "healthy" : "degraded", checks },
    { status: allOk ? 200 : 503 }
  );
}
