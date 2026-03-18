import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { attachments, users } from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ACCEPTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

// GET /api/attachments?entityType=tool&entityId=xxx
export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType");
    const entityId = url.searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType und entityId sind erforderlich" },
        { status: 400 }
      );
    }

    const rows = await db
      .select({
        id: attachments.id,
        fileName: attachments.fileName,
        fileUrl: attachments.fileUrl,
        fileSize: attachments.fileSize,
        mimeType: attachments.mimeType,
        uploadedById: attachments.uploadedById,
        uploaderName: users.name,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .leftJoin(users, eq(attachments.uploadedById, users.id))
      .where(
        and(
          eq(attachments.organizationId, orgId),
          eq(attachments.entityType, entityType),
          eq(attachments.entityId, entityId)
        )
      )
      .orderBy(desc(attachments.createdAt))
      .limit(100);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/attachments error:", error);
    return NextResponse.json(
      { error: "Anhänge konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}

// POST /api/attachments  (multipart/form-data)
// Fields: entityType, entityId, file (File)
export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    const formData = await request.formData();
    const entityType = formData.get("entityType");
    const entityId = formData.get("entityId");
    const file = formData.get("file");

    if (
      typeof entityType !== "string" ||
      typeof entityId !== "string" ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { error: "entityType, entityId und file sind erforderlich" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Datei zu groß. Maximum: 5 MB` },
        { status: 413 }
      );
    }

    const mimeType = file.type || "";
    if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Dateityp nicht unterstützt: ${mimeType}` },
        { status: 415 }
      );
    }

    // Convert to base64 data URL
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const [inserted] = await db
      .insert(attachments)
      .values({
        organizationId: orgId,
        entityType,
        entityId,
        fileName: file.name,
        fileUrl: dataUrl,
        fileSize: file.size,
        mimeType,
        uploadedById: session.user.id,
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error("POST /api/attachments error:", error);
    return NextResponse.json(
      { error: "Anhang konnte nicht gespeichert werden" },
      { status: 500 }
    );
  }
}
