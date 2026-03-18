import { NextResponse } from "next/server";
import { getDb } from "@repo/db";
import { tools, users, locations, organizationMembers } from "@repo/db/schema";
import { eq, and, isNotNull, gte } from "drizzle-orm";

// ── iCal helpers ──────────────────────────────────────────────────────────

function icalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0]! + "Z";
}

function icalEscape(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line: string): string {
  const chunks: string[] = [];
  let remaining = line;
  // RFC 5545: fold lines > 75 octets
  while (remaining.length > 75) {
    chunks.push(remaining.slice(0, 75));
    remaining = " " + remaining.slice(75);
  }
  chunks.push(remaining);
  return chunks.join("\r\n");
}

function buildIcal(orgName: string, events: Array<{
  id: string;
  name: string;
  number: string | null;
  nextMaintenanceDate: string;
  assignedUserName: string | null;
  homeLocationName: string | null;
  maintenanceIntervalDays: number | null;
}>): string {
  const now = icalDate(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//LogistikApp//Wartungskalender//DE`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icalEscape(orgName)} – Wartungen`,
    "X-WR-TIMEZONE:Europe/Zurich",
    "X-WR-CALDESC:Wartungskalender aus LogistikApp",
  ];

  for (const ev of events) {
    // Parse as local date (YYYY-MM-DD)
    const [year, month, day] = ev.nextMaintenanceDate.split("-").map(Number) as [number, number, number];
    const dueDate = new Date(Date.UTC(year!, month! - 1, day!));
    const dueDateStr = ev.nextMaintenanceDate.replace(/-/g, ""); // YYYYMMDD

    const uid = `maint-${ev.id}-${ev.nextMaintenanceDate}@logistikapp`;
    const summary = `Wartung: ${ev.name}${ev.number ? ` (${ev.number})` : ""}`;
    const descParts: string[] = [];
    if (ev.assignedUserName) descParts.push(`Zugewiesen: ${ev.assignedUserName}`);
    if (ev.homeLocationName) descParts.push(`Standort: ${ev.homeLocationName}`);
    if (ev.maintenanceIntervalDays) descParts.push(`Intervall: ${ev.maintenanceIntervalDays} Tage`);

    // Add alarm 2 days before
    const alarmTrigger = "-P2D"; // 2 days before

    lines.push(
      "BEGIN:VEVENT",
      foldLine(`UID:${uid}`),
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dueDateStr}`,
      `DTEND;VALUE=DATE:${dueDateStr}`,
      foldLine(`SUMMARY:${icalEscape(summary)}`),
      ...(descParts.length > 0
        ? [foldLine(`DESCRIPTION:${icalEscape(descParts.join("\\n"))}`)]
        : []),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      foldLine(`DESCRIPTION:Erinnerung: ${icalEscape(summary)}`),
      `TRIGGER:${alarmTrigger}`,
      "END:VALARM",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// ── Route handler ─────────────────────────────────────────────────────────

// GET /api/maintenance/ical?token=<ical_token>
// Returns an .ics file with all upcoming maintenance events for the org
// associated with the token stored in the org's metadata (or organizationMembers).
// We store the token in the organizations.metadata jsonb (if available), or
// fall back to a simple SHA-256 of the orgId + a server secret.
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token || token.length < 16) {
      return new Response("Token fehlt oder ungültig", { status: 401 });
    }

    const db = getDb();

    // Look up the org whose ical_token matches.
    // We store tokens as `ical_<orgId>` hashed with HMAC-SHA256.
    // Here we store the token directly in the organizations table metadata JSON
    // OR as a dedicated org-level setting. Since we control the schema, we
    // use a simple approach: token = first 32 hex chars of sha256(secret + orgId).
    // The token is generated on demand by the /api/maintenance/ical-token endpoint
    // and stored nowhere — it IS derived deterministically, so we can validate it
    // by iterating member orgs. But that's expensive.
    //
    // Simpler approach used here: token encodes the orgId as the first segment,
    // split by a dot: "<orgId>.<hmac>". This way we can look up the org directly.
    //
    // Token format: "<orgId>.<hex-hmac-sha256>"

    const dotIdx = token.indexOf(".");
    if (dotIdx === -1) {
      return new Response("Token ungültig", { status: 401 });
    }

    const orgId = token.slice(0, dotIdx);
    const suppliedHmac = token.slice(dotIdx + 1);

    // Validate HMAC
    const secret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? "fallback-secret";
    const expectedHmac = await computeHmac(secret, orgId);

    if (!timingSafeEqual(suppliedHmac, expectedHmac)) {
      return new Response("Token ungültig", { status: 401 });
    }

    // Fetch org name
    const { organizations } = await import("@repo/db/schema");
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!org) {
      return new Response("Organisation nicht gefunden", { status: 404 });
    }

    // Fetch upcoming + overdue maintenance (no upper date limit — show all)
    const today = new Date().toISOString().split("T")[0]!;
    // We want overdue too, so we don't use gte — we want everything with a date set.
    // But limit to reasonable window: overdue + next 365 days.
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 365);
    const cutoffStr = cutoff.toISOString().split("T")[0]!;

    const rows = await db
      .select({
        id: tools.id,
        name: tools.name,
        number: tools.number,
        nextMaintenanceDate: tools.nextMaintenanceDate,
        assignedUserName: users.name,
        homeLocationName: locations.name,
        maintenanceIntervalDays: tools.maintenanceIntervalDays,
      })
      .from(tools)
      .leftJoin(users, eq(tools.assignedToId, users.id))
      .leftJoin(locations, eq(tools.homeLocationId, locations.id))
      .where(
        and(
          eq(tools.organizationId, orgId),
          eq(tools.isActive, true),
          isNotNull(tools.nextMaintenanceDate)
        )
      )
      .orderBy(tools.nextMaintenanceDate)
      .limit(500);

    const events = rows
      .filter((r) => r.nextMaintenanceDate !== null)
      .map((r) => ({ ...r, nextMaintenanceDate: r.nextMaintenanceDate! }));

    const ical = buildIcal(org.name, events);

    return new Response(ical, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="wartungskalender.ics"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/maintenance/ical error:", error);
    return new Response("Fehler beim Generieren des Kalenders", { status: 500 });
  }
}

// ── Token utilities ───────────────────────────────────────────────────────

async function computeHmac(secret: string, orgId: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(orgId));
  return Buffer.from(sig).toString("hex").slice(0, 32);
}

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ── Token generation endpoint (POST) ─────────────────────────────────────
// Returns the iCal feed URL for the current user's org.
export async function POST(request: Request) {
  try {
    const { getSessionAndOrg } = await import("@/app/api/_helpers/auth");
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { orgId } = result;

    const secret = process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET ?? "fallback-secret";
    const hmac = await computeHmac(secret, orgId);
    const token = `${orgId}.${hmac}`;

    const appUrl =
      process.env.BETTER_AUTH_URL ??
      process.env.NEXTAUTH_URL ??
      "https://app.logistikapp.ch";

    const feedUrl = `${appUrl}/api/maintenance/ical?token=${token}`;

    return NextResponse.json({ token, feedUrl });
  } catch (error) {
    console.error("POST /api/maintenance/ical error:", error);
    return NextResponse.json(
      { error: "Token konnte nicht generiert werden" },
      { status: 500 }
    );
  }
}
