import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import * as Sentry from "@sentry/nextjs";
import {
  getParsedEmails,
  updateParsedEmailStatus,
} from "@/app/api/email/inbound/route";

// ---------------------------------------------------------------------------
// GET — List parsed emails for the org
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json(
        { error: "Authentifizierung erforderlich" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // draft | accepted | rejected
    const type = searchParams.get("type"); // order | delivery | invoice
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50", 10),
      200
    );
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    let emails = getParsedEmails();

    // Filter by status
    if (status) {
      emails = emails.filter((e) => e.status === status);
    }

    // Filter by type
    if (type) {
      emails = emails.filter((e) => e.emailType === type);
    }

    // Sort by date descending
    emails.sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );

    // Paginate
    const total = emails.length;
    const paginated = emails.slice(offset, offset + limit);

    return NextResponse.json({
      data: paginated,
      total,
      limit,
      offset,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/email/parsed" },
    });

    return NextResponse.json(
      { error: "Fehler beim Laden der E-Mails" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH — Mark a parsed email as accepted or rejected
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json(
        { error: "Authentifizierung erforderlich" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { id, status } = body as { id?: string; status?: string };

    if (!id || !status) {
      return NextResponse.json(
        { error: "id und status sind erforderlich" },
        { status: 400 }
      );
    }

    if (status !== "accepted" && status !== "rejected") {
      return NextResponse.json(
        { error: "status muss 'accepted' oder 'rejected' sein" },
        { status: 400 }
      );
    }

    const updated = updateParsedEmailStatus(id, status);

    if (!updated) {
      return NextResponse.json(
        { error: "E-Mail nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/email/parsed" },
    });

    return NextResponse.json(
      { error: "Fehler beim Aktualisieren" },
      { status: 500 }
    );
  }
}
