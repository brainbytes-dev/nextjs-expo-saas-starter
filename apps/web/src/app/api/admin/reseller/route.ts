import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth } from "@/lib/auth";
import { getDb } from "@repo/db";
import { resellerBranding, organizations } from "@repo/db/schema";
import { eq } from "drizzle-orm";

type UserWithRole = { id: string; email: string; role?: string };

export async function GET(request: NextRequest) {
  try {
    if (!auth) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    const user = session?.user as UserWithRole | undefined;
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();

    const brandings = await db
      .select({
        id: resellerBranding.id,
        organizationId: resellerBranding.organizationId,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        appName: resellerBranding.appName,
        logoUrl: resellerBranding.logoUrl,
        faviconUrl: resellerBranding.faviconUrl,
        primaryColor: resellerBranding.primaryColor,
        accentColor: resellerBranding.accentColor,
        customDomain: resellerBranding.customDomain,
        hideLogistikAppBranding: resellerBranding.hideLogistikAppBranding,
        customFooterText: resellerBranding.customFooterText,
        createdAt: resellerBranding.createdAt,
        updatedAt: resellerBranding.updatedAt,
      })
      .from(resellerBranding)
      .innerJoin(organizations, eq(resellerBranding.organizationId, organizations.id));

    return NextResponse.json({ brandings });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "admin/reseller" } });
    return NextResponse.json({ error: "Fehler beim Laden der Reseller-Brandings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!auth) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    const user = session?.user as UserWithRole | undefined;
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      organizationId,
      appName,
      logoUrl,
      faviconUrl,
      primaryColor,
      accentColor,
      customDomain,
      hideLogistikAppBranding,
      customFooterText,
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID erforderlich" }, { status: 400 });
    }

    const db = getDb();

    // Check if branding already exists for this org
    const existing = await db
      .select({ id: resellerBranding.id })
      .from(resellerBranding)
      .where(eq(resellerBranding.organizationId, organizationId))
      .limit(1);

    const data = {
      appName: appName ?? null,
      logoUrl: logoUrl ?? null,
      faviconUrl: faviconUrl ?? null,
      primaryColor: primaryColor ?? null,
      accentColor: accentColor ?? null,
      customDomain: customDomain ?? null,
      hideLogistikAppBranding: hideLogistikAppBranding ?? false,
      customFooterText: customFooterText ?? null,
      updatedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(resellerBranding)
        .set(data)
        .where(eq(resellerBranding.organizationId, organizationId));
    } else {
      await db.insert(resellerBranding).values({
        organizationId,
        ...data,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { endpoint: "admin/reseller/post" } });
    return NextResponse.json({ error: "Fehler beim Speichern des Reseller-Brandings" }, { status: 500 });
  }
}
