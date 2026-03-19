import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { warrantyClaims, warrantyRecords, tools, materials, users } from "@repo/db/schema"
import { eq, and, inArray } from "drizzle-orm"

// ─── GET /api/warranty-claims/[id] ───────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await getSessionAndOrg(request)
    if (result.error) return result.error
    const { db, orgId } = result

    const [row] = await db
      .select({
        id: warrantyClaims.id,
        warrantyRecordId: warrantyClaims.warrantyRecordId,
        entityType: warrantyClaims.entityType,
        entityId: warrantyClaims.entityId,
        claimNumber: warrantyClaims.claimNumber,
        reason: warrantyClaims.reason,
        description: warrantyClaims.description,
        photos: warrantyClaims.photos,
        status: warrantyClaims.status,
        resolution: warrantyClaims.resolution,
        resolutionNotes: warrantyClaims.resolutionNotes,
        submittedAt: warrantyClaims.submittedAt,
        resolvedAt: warrantyClaims.resolvedAt,
        submittedById: warrantyClaims.submittedById,
        assignedToId: warrantyClaims.assignedToId,
        createdAt: warrantyClaims.createdAt,
        updatedAt: warrantyClaims.updatedAt,
        warrantyProvider: warrantyRecords.provider,
        warrantyStart: warrantyRecords.warrantyStart,
        warrantyEnd: warrantyRecords.warrantyEnd,
      })
      .from(warrantyClaims)
      .leftJoin(warrantyRecords, eq(warrantyClaims.warrantyRecordId, warrantyRecords.id))
      .where(
        and(
          eq(warrantyClaims.id, id),
          eq(warrantyClaims.organizationId, orgId)
        )
      )
      .limit(1)

    if (!row) {
      return NextResponse.json(
        { error: "Garantieanspruch nicht gefunden" },
        { status: 404 }
      )
    }

    // Resolve entity name
    let entityName: string | null = null
    if (row.entityType === "tool") {
      const [t] = await db
        .select({ name: tools.name })
        .from(tools)
        .where(eq(tools.id, row.entityId))
        .limit(1)
      entityName = t?.name ?? null
    } else if (row.entityType === "material") {
      const [m] = await db
        .select({ name: materials.name })
        .from(materials)
        .where(eq(materials.id, row.entityId))
        .limit(1)
      entityName = m?.name ?? null
    }

    // Resolve user names
    const userIds: string[] = []
    if (row.submittedById) userIds.push(row.submittedById)
    if (row.assignedToId) userIds.push(row.assignedToId)

    const userMap: Record<string, { name: string | null; email: string }> = {}
    if (userIds.length > 0) {
      const userRows = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, userIds))
      for (const u of userRows) userMap[u.id] = { name: u.name, email: u.email }
    }

    return NextResponse.json({
      ...row,
      entityName,
      submittedByName: row.submittedById ? (userMap[row.submittedById]?.name ?? null) : null,
      submittedByEmail: row.submittedById ? (userMap[row.submittedById]?.email ?? null) : null,
      assignedToName: row.assignedToId ? (userMap[row.assignedToId]?.name ?? null) : null,
    })
  } catch (error) {
    console.error("GET /api/warranty-claims/[id] error:", error)
    return NextResponse.json(
      { error: "Garantieanspruch konnte nicht geladen werden" },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/warranty-claims/[id] ─────────────────────────────────────────
// Body: { status?, resolution?, resolutionNotes?, assignedToId?, reason?, description?, photos? }

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await getSessionAndOrg(request)
    if (result.error) return result.error
    const { db, orgId } = result

    // Verify claim exists and belongs to org
    const [existing] = await db
      .select({ id: warrantyClaims.id, status: warrantyClaims.status })
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.id, id),
          eq(warrantyClaims.organizationId, orgId)
        )
      )
      .limit(1)

    if (!existing) {
      return NextResponse.json(
        { error: "Garantieanspruch nicht gefunden" },
        { status: 404 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 })
    }

    const { status, resolution, resolutionNotes, assignedToId, reason, description, photos } =
      body as {
        status?: string
        resolution?: string
        resolutionNotes?: string
        assignedToId?: string | null
        reason?: string
        description?: string
        photos?: string[]
      }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (status !== undefined) {
      const VALID_STATUSES = ["draft", "submitted", "in_review", "approved", "rejected", "resolved"]
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Ungültiger Status. Erlaubt: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        )
      }
      updates.status = status

      // Auto-set timestamps based on status transitions
      if (status === "submitted") {
        updates.submittedAt = new Date()
      }
      if (status === "resolved") {
        updates.resolvedAt = new Date()
      }
    }

    if (resolution !== undefined) updates.resolution = resolution
    if (resolutionNotes !== undefined) updates.resolutionNotes = resolutionNotes
    if (assignedToId !== undefined) updates.assignedToId = assignedToId
    if (reason !== undefined) updates.reason = reason
    if (description !== undefined) updates.description = description
    if (photos !== undefined) updates.photos = photos

    const [updated] = await db
      .update(warrantyClaims)
      .set(updates)
      .where(
        and(
          eq(warrantyClaims.id, id),
          eq(warrantyClaims.organizationId, orgId)
        )
      )
      .returning()

    return NextResponse.json(updated)
  } catch (error) {
    console.error("PATCH /api/warranty-claims/[id] error:", error)
    return NextResponse.json(
      { error: "Garantieanspruch konnte nicht aktualisiert werden" },
      { status: 500 }
    )
  }
}
