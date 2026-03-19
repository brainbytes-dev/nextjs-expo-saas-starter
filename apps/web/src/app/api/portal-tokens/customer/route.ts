import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { customerPortalTokens, customers } from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const tokens = await db
      .select({
        id: customerPortalTokens.id,
        token: customerPortalTokens.token,
        email: customerPortalTokens.email,
        isActive: customerPortalTokens.isActive,
        lastAccessedAt: customerPortalTokens.lastAccessedAt,
        expiresAt: customerPortalTokens.expiresAt,
        createdAt: customerPortalTokens.createdAt,
        customerId: customerPortalTokens.customerId,
        customerName: customers.name,
      })
      .from(customerPortalTokens)
      .innerJoin(customers, eq(customerPortalTokens.customerId, customers.id))
      .where(eq(customerPortalTokens.organizationId, orgId))
      .orderBy(desc(customerPortalTokens.createdAt));

    return NextResponse.json(tokens);
  } catch (error) {
    console.error("GET /api/portal-tokens/customer error:", error);
    return NextResponse.json({ error: "Failed to fetch tokens" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const body = await request.json();
    const { customerId, email, expiresInDays } = body;

    if (!customerId || !email) {
      return NextResponse.json({ error: "customerId and email are required" }, { status: 400 });
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, orgId)))
      .limit(1);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const token = randomUUID();
    const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

    const [created] = await db
      .insert(customerPortalTokens)
      .values({ organizationId: orgId, customerId, token, email, isActive: true, expiresAt })
      .returning();

    return NextResponse.json({ ...created, customerName: customer.name }, { status: 201 });
  } catch (error) {
    console.error("POST /api/portal-tokens/customer error:", error);
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

    await db.update(customerPortalTokens).set({ isActive: false }).where(and(eq(customerPortalTokens.id, tokenId), eq(customerPortalTokens.organizationId, orgId)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/portal-tokens/customer error:", error);
    return NextResponse.json({ error: "Failed to revoke token" }, { status: 500 });
  }
}
