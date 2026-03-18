import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { attachments } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/attachments/[id] — returns the file as a binary response (or redirect to data URL)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const [row] = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, id), eq(attachments.organizationId, orgId)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Anhang nicht gefunden" }, { status: 404 });
    }

    // Data URL → binary response
    const dataUrl = row.fileUrl;
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      // Legacy: return as redirect
      return NextResponse.redirect(dataUrl);
    }

    const [, mimeType, base64] = matches;
    const buffer = Buffer.from(base64!, "base64");

    return new Response(buffer, {
      headers: {
        "Content-Type": mimeType!,
        "Content-Disposition": `inline; filename="${encodeURIComponent(row.fileName)}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/attachments/[id] error:", error);
    return NextResponse.json(
      { error: "Anhang konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}

// DELETE /api/attachments/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session, membership } = result;

    const [row] = await db
      .select()
      .from(attachments)
      .where(and(eq(attachments.id, id), eq(attachments.organizationId, orgId)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Anhang nicht gefunden" }, { status: 404 });
    }

    // Only the uploader or an admin/owner can delete
    const isAdmin =
      membership.role === "admin" || membership.role === "owner";
    const isUploader = row.uploadedById === session.user.id;

    if (!isAdmin && !isUploader) {
      return NextResponse.json(
        { error: "Keine Berechtigung zum Löschen dieses Anhangs" },
        { status: 403 }
      );
    }

    await db
      .delete(attachments)
      .where(and(eq(attachments.id, id), eq(attachments.organizationId, orgId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/attachments/[id] error:", error);
    return NextResponse.json(
      { error: "Anhang konnte nicht gelöscht werden" },
      { status: 500 }
    );
  }
}
