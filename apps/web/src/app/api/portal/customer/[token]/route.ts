import { NextResponse } from "next/server";
import { getDb } from "@repo/db";
import { customerPortalTokens, customers, commissions, commissionEntries, materials, tools, organizations, locations, users, comments } from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function validateCustomerToken(token: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: customerPortalTokens.id, organizationId: customerPortalTokens.organizationId,
      customerId: customerPortalTokens.customerId, email: customerPortalTokens.email,
      isActive: customerPortalTokens.isActive, expiresAt: customerPortalTokens.expiresAt,
      customerName: customers.name, orgName: organizations.name,
      orgLogo: organizations.logo, orgPrimaryColor: organizations.primaryColor,
    })
    .from(customerPortalTokens)
    .innerJoin(customers, eq(customerPortalTokens.customerId, customers.id))
    .innerJoin(organizations, eq(customerPortalTokens.organizationId, organizations.id))
    .where(eq(customerPortalTokens.token, token))
    .limit(1);

  if (!row || !row.isActive) return null;
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return null;

  await db.update(customerPortalTokens).set({ lastAccessedAt: new Date() }).where(eq(customerPortalTokens.id, row.id));
  return { db, ...row };
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ctx = await validateCustomerToken(token);
    if (!ctx) return NextResponse.json({ error: "Ungültiger oder abgelaufener Token" }, { status: 401 });

    const { db, customerId, customerName, orgName, orgLogo, orgPrimaryColor, organizationId } = ctx;

    const customerCommissions = await db
      .select({
        id: commissions.id, name: commissions.name, number: commissions.number,
        manualNumber: commissions.manualNumber, status: commissions.status, notes: commissions.notes,
        targetLocationName: locations.name, responsibleName: users.name,
        createdAt: commissions.createdAt, updatedAt: commissions.updatedAt,
      })
      .from(commissions)
      .leftJoin(locations, eq(commissions.targetLocationId, locations.id))
      .leftJoin(users, eq(commissions.responsibleId, users.id))
      .where(and(eq(commissions.customerId, customerId), eq(commissions.organizationId, organizationId)))
      .orderBy(desc(commissions.createdAt));

    const commissionsWithDetails = [];
    for (const comm of customerCommissions) {
      const entries = await db
        .select({
          id: commissionEntries.id, quantity: commissionEntries.quantity,
          pickedQuantity: commissionEntries.pickedQuantity, status: commissionEntries.status,
          materialName: materials.name, materialNumber: materials.number,
          toolName: tools.name, toolNumber: tools.number,
        })
        .from(commissionEntries)
        .leftJoin(materials, eq(commissionEntries.materialId, materials.id))
        .leftJoin(tools, eq(commissionEntries.toolId, tools.id))
        .where(eq(commissionEntries.commissionId, comm.id));

      const commComments = await db
        .select({ id: comments.id, body: comments.body, createdAt: comments.createdAt })
        .from(comments)
        .where(and(eq(comments.entityType, "commission"), eq(comments.entityId, comm.id)))
        .orderBy(desc(comments.createdAt));

      commissionsWithDetails.push({ ...comm, entries, comments: commComments });
    }

    return NextResponse.json({
      customer: { name: customerName },
      org: { name: orgName, logo: orgLogo, primaryColor: orgPrimaryColor },
      commissions: commissionsWithDetails,
    });
  } catch (error) {
    console.error("GET /api/portal/customer/[token] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const ctx = await validateCustomerToken(token);
    if (!ctx) return NextResponse.json({ error: "Ungültiger oder abgelaufener Token" }, { status: 401 });

    const { db, organizationId, customerId, customerName, email } = ctx;
    const body = await request.json();
    const { commissionId, body: commentBody } = body;

    if (!commissionId || !commentBody) return NextResponse.json({ error: "commissionId and body are required" }, { status: 400 });

    const [comm] = await db.select().from(commissions)
      .where(and(eq(commissions.id, commissionId), eq(commissions.customerId, customerId), eq(commissions.organizationId, organizationId)))
      .limit(1);

    if (!comm) return NextResponse.json({ error: "Commission not found" }, { status: 404 });

    const userId = comm.responsibleId;
    if (!userId) return NextResponse.json({ error: "No responsible user found" }, { status: 400 });

    const [comment] = await db
      .insert(comments)
      .values({
        organizationId,
        entityType: "commission",
        entityId: commissionId,
        userId,
        body: `[Kunden-Portal: ${customerName} <${email}>] ${commentBody}`,
      })
      .returning();

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("POST /api/portal/customer/[token] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
