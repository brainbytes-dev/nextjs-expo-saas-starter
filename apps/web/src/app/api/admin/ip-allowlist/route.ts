import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { orgSettings } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

const SETTING_KEY = "ip_allowlist";

function isValidIPOrCIDR(value: string): boolean {
  // IPv4
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
  if (ipv4.test(value)) {
    const parts = value.split("/");
    const octets = parts[0].split(".").map(Number);
    if (octets.some((o) => o > 255)) return false;
    if (parts[1] !== undefined) {
      const prefix = Number(parts[1]);
      if (prefix < 0 || prefix > 32) return false;
    }
    return true;
  }
  // IPv6 basic check
  const ipv6 = /^[0-9a-fA-F:]+(\/.+)?$/;
  return ipv6.test(value);
}

// GET /api/admin/ip-allowlist
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [row] = await db
      .select()
      .from(orgSettings)
      .where(
        and(eq(orgSettings.organizationId, orgId), eq(orgSettings.key, SETTING_KEY))
      )
      .limit(1);

    const allowlist: string[] = row ? (row.value as string[]) : [];

    return NextResponse.json({ allowlist });
  } catch (error) {
    console.error("GET /api/admin/ip-allowlist error:", error);
    return NextResponse.json(
      { error: "IP-Allowlist konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}

// POST /api/admin/ip-allowlist — add IP/CIDR
export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, membership } = result;

    // Only owner/admin can modify
    if (!["owner", "admin"].includes(membership.role ?? "")) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const body = await request.json();
    const ip = (body.ip as string)?.trim();

    if (!ip || !isValidIPOrCIDR(ip)) {
      return NextResponse.json(
        { error: "Ungültige IP-Adresse oder CIDR-Notation" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(orgSettings)
      .where(
        and(eq(orgSettings.organizationId, orgId), eq(orgSettings.key, SETTING_KEY))
      )
      .limit(1);

    let allowlist: string[] = existing ? (existing.value as string[]) : [];

    if (allowlist.includes(ip)) {
      return NextResponse.json(
        { error: "IP bereits vorhanden" },
        { status: 409 }
      );
    }

    allowlist = [...allowlist, ip];

    if (existing) {
      await db
        .update(orgSettings)
        .set({ value: allowlist, updatedAt: new Date() })
        .where(eq(orgSettings.id, existing.id));
    } else {
      await db.insert(orgSettings).values({
        organizationId: orgId,
        key: SETTING_KEY,
        value: allowlist,
      });
    }

    return NextResponse.json({ allowlist });
  } catch (error) {
    console.error("POST /api/admin/ip-allowlist error:", error);
    return NextResponse.json(
      { error: "IP konnte nicht hinzugefügt werden" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/ip-allowlist — remove IP/CIDR
export async function DELETE(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, membership } = result;

    if (!["owner", "admin"].includes(membership.role ?? "")) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const body = await request.json();
    const ip = (body.ip as string)?.trim();

    if (!ip) {
      return NextResponse.json(
        { error: "IP-Adresse fehlt" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(orgSettings)
      .where(
        and(eq(orgSettings.organizationId, orgId), eq(orgSettings.key, SETTING_KEY))
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ allowlist: [] });
    }

    const allowlist = ((existing.value as string[]) ?? []).filter(
      (entry) => entry !== ip
    );

    await db
      .update(orgSettings)
      .set({ value: allowlist, updatedAt: new Date() })
      .where(eq(orgSettings.id, existing.id));

    return NextResponse.json({ allowlist });
  } catch (error) {
    console.error("DELETE /api/admin/ip-allowlist error:", error);
    return NextResponse.json(
      { error: "IP konnte nicht entfernt werden" },
      { status: 500 }
    );
  }
}
