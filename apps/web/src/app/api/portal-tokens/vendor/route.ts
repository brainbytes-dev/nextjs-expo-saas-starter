import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { vendorPortalTokens, suppliers } from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const tokens = await db
      .select({
        id: vendorPortalTokens.id,
        token: vendorPortalTokens.token,
        email: vendorPortalTokens.email,
        isActive: vendorPortalTokens.isActive,
        lastAccessedAt: vendorPortalTokens.lastAccessedAt,
        expiresAt: vendorPortalTokens.expiresAt,
        createdAt: vendorPortalTokens.createdAt,
        supplierId: vendorPortalTokens.supplierId,
        supplierName: suppliers.name,
      })
      .from(vendorPortalTokens)
      .innerJoin(suppliers, eq(vendorPortalTokens.supplierId, suppliers.id))
      .where(eq(vendorPortalTokens.organizationId, orgId))
      .orderBy(desc(vendorPortalTokens.createdAt));

    return NextResponse.json(tokens);
  } catch (error) {
    console.error("GET /api/portal-tokens/vendor error:", error);
    return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { supplierId, email, expiresInDays } = body;

    if (!supplierId || !email) {
      return NextResponse.json({ error: "supplierId and email are required" }, { status: 400 });
    }

    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, supplierId), eq(suppliers.organizationId, orgId)))
      .limit(1);

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const token = randomUUID();
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

    const [created] = await db
      .insert(vendorPortalTokens)
      .values({ organizationId: orgId, supplierId, token, email, isActive: true, expiresAt })
      .returning();

    return NextResponse.json({ ...created, supplierName: supplier.name }, { status: 201 });
  } catch (error) {
    console.error("POST /api/portal-tokens/vendor error:", error);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const tokenId = url.searchParams.get("id");
    if (!tokenId) return NextResponse.json({ error: "Token ID required" }, { status: 400 });

    await db.update(vendorPortalTokens).set({ isActive: false }).where(and(eq(vendorPortalTokens.id, tokenId), eq(vendorPortalTokens.organizationId, orgId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/portal-tokens/vendor error:", error);
    return NextResponse.json({ error: "Failed to revoke token" }, { status: 500 });
  }
}
