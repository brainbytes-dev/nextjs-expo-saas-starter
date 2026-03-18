import { NextResponse } from "next/server";
import { getDb } from "@repo/db";
import { ssoConfigs, organizations } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/auth/sso-lookup?domain=firma.ch
// Public endpoint — returns only the provider name and org name if an active
// SSO config exists for that email domain. Never returns credentials.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain")?.toLowerCase().replace(/^@/, "");

    if (!domain) {
      return NextResponse.json({ sso: null });
    }

    const db = getDb();
    const [row] = await db
      .select({
        provider: ssoConfigs.provider,
        orgName: organizations.name,
        orgId: organizations.id,
      })
      .from(ssoConfigs)
      .innerJoin(organizations, eq(ssoConfigs.organizationId, organizations.id))
      .where(and(eq(ssoConfigs.domain, domain), eq(ssoConfigs.isActive, true)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ sso: null });
    }

    return NextResponse.json({
      sso: {
        provider: row.provider,
        orgName: row.orgName,
        orgId: row.orgId,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/sso-lookup error:", error);
    // Fail open — return null so login page degrades gracefully
    return NextResponse.json({ sso: null });
  }
}
