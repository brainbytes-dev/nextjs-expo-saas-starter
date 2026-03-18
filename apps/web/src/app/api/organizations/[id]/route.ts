import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { organizations } from "@repo/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Override orgId with route param
    const headers = new Headers(request.headers);
    headers.set("x-organization-id", id);
    const modifiedRequest = new Request(request.url, { headers });

    const result = await getSessionAndOrg(modifiedRequest);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(org);
  } catch (error) {
    console.error("GET /api/organizations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headers = new Headers(request.headers);
    headers.set("x-organization-id", id);
    const url = request.url;
    const body = await request.json();

    const result = await getSessionAndOrg(new Request(url, { headers }));
    if (result.error) return result.error;
    const { db, orgId, membership } = result;

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only owners and admins can update the organization" },
        { status: 403 }
      );
    }

    const { name, slug, industry, address, zip, city, country, currency, logo, primaryColor, accentColor } = body;

    const [updated] = await db
      .update(organizations)
      .set({
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(industry !== undefined && { industry }),
        ...(address !== undefined && { address }),
        ...(zip !== undefined && { zip }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(currency !== undefined && { currency }),
        ...(logo !== undefined && { logo }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(accentColor !== undefined && { accentColor }),
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/organizations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headers = new Headers(request.headers);
    headers.set("x-organization-id", id);

    const result = await getSessionAndOrg(new Request(request.url, { headers }));
    if (result.error) return result.error;
    const { db, orgId, membership } = result;

    if (membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can delete the organization" },
        { status: 403 }
      );
    }

    await db.delete(organizations).where(eq(organizations.id, orgId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/organizations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
