import { NextResponse } from "next/server";
import { getSession } from "@/app/api/_helpers/auth";
import { ssoConfigs, organizationMembers } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/organizations/[id]/sso ─────────────────────────────────
// Returns the current SSO config for an org (clientSecret is masked).
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id: orgId } = await params;
    const result = await getSession();
    if (result.error) return result.error;
    const { session, db } = result;

    // Verify membership
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    const [config] = await db
      .select()
      .from(ssoConfigs)
      .where(eq(ssoConfigs.organizationId, orgId))
      .limit(1);

    if (!config) {
      return NextResponse.json(null);
    }

    // Mask the client secret — never expose it to the browser after save
    return NextResponse.json({
      ...config,
      clientSecret: config.clientSecret ? "••••••••" : "",
    });
  } catch (error) {
    console.error("GET /api/organizations/[id]/sso error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SSO config" },
      { status: 500 }
    );
  }
}

// ── PUT /api/organizations/[id]/sso ─────────────────────────────────
// Upserts the SSO config for an org. Only owners/admins may write.
export async function PUT(req: Request, { params }: Params) {
  try {
    const { id: orgId } = await params;
    const result = await getSession();
    if (result.error) return result.error;
    const { session, db } = result;

    // Verify membership and role
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    if (!["owner", "admin"].includes(member.role ?? "")) {
      return NextResponse.json(
        { error: "Only owners and admins may update SSO settings" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as {
      provider: string;
      clientId: string;
      clientSecret?: string;
      issuerUrl?: string;
      domain?: string;
      isActive?: boolean;
    };

    const { provider, clientId, clientSecret, issuerUrl, domain, isActive } =
      body;

    if (!provider || !clientId) {
      return NextResponse.json(
        { error: "provider and clientId are required" },
        { status: 400 }
      );
    }

    const allowedProviders = [
      "azure_ad",
      "google_workspace",
      "okta",
      "custom_oidc",
    ];
    if (!allowedProviders.includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    // Fetch existing to preserve secret when the UI sends the masked placeholder
    const [existing] = await db
      .select()
      .from(ssoConfigs)
      .where(eq(ssoConfigs.organizationId, orgId))
      .limit(1);

    const resolvedSecret =
      clientSecret && clientSecret !== "••••••••"
        ? clientSecret
        : (existing?.clientSecret ?? "");

    if (!resolvedSecret) {
      return NextResponse.json(
        { error: "clientSecret is required" },
        { status: 400 }
      );
    }

    const values = {
      organizationId: orgId,
      provider,
      clientId,
      clientSecret: resolvedSecret,
      issuerUrl: issuerUrl ?? null,
      domain: domain ? domain.toLowerCase().replace(/^@/, "") : null,
      isActive: isActive ?? false,
      updatedAt: new Date(),
    };

    let saved;
    if (existing) {
      [saved] = await db
        .update(ssoConfigs)
        .set(values)
        .where(eq(ssoConfigs.id, existing.id))
        .returning();
    } else {
      [saved] = await db.insert(ssoConfigs).values(values).returning();
    }

    return NextResponse.json({
      ...saved,
      clientSecret: "••••••••",
    });
  } catch (error) {
    console.error("PUT /api/organizations/[id]/sso error:", error);
    return NextResponse.json(
      { error: "Failed to save SSO config" },
      { status: 500 }
    );
  }
}
