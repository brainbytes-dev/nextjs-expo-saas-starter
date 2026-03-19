import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { warrantyClaims, warrantyRecords, tools, materials, users } from "@repo/db/schema"
import { eq, and, desc, like, count, inArray } from "drizzle-orm"

// ─── GET /api/warranty-claims ────────────────────────────────────────────────
// Query params:
//   status = "draft" | "submitted" | "in_review" | "approved" | "rejected" | "resolved"

export async function GET(request: Request) {
  try {
    const result = await getSessionAndOrg(request)
    if (result.error) return result.error
    const { db, orgId } = result

    const url = new URL(request.url)
    const status = url.searchParams.get("status")

    const conditions = [eq(warrantyClaims.organizationId, orgId)]

    const VALID_STATUSES = ["draft", "submitted", "in_review", "approved", "rejected", "resolved"]
    if (status && VALID_STATUSES.includes(status)) {
      conditions.push(eq(warrantyClaims.status, status))
    }

    const rows = await db
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
        // Warranty record fields
        warrantyProvider: warrantyRecords.provider,
        warrantyStart: warrantyRecords.warrantyStart,
        warrantyEnd: warrantyRecords.warrantyEnd,
      })
      .from(warrantyClaims)
      .leftJoin(warrantyRecords, eq(warrantyClaims.warrantyRecordId, warrantyRecords.id))
      .where(and(...conditions))
      .orderBy(desc(warrantyClaims.createdAt))
      .limit(500)

    if (rows.length === 0) {
      return NextResponse.json([])
    }

    // Collect entity IDs for tool/material name resolution
    const toolIds = new Set<string>()
    const materialIds = new Set<string>()
    const userIdSet = new Set<string>()

    for (const row of rows) {
      if (row.entityType === "tool") toolIds.add(row.entityId)
      if (row.entityType === "material") materialIds.add(row.entityId)
      if (row.submittedById) userIdSet.add(row.submittedById)
      if (row.assignedToId) userIdSet.add(row.assignedToId)
    }

    // Batch-fetch entity names
    const toolMap: Record<string, string> = {}
    const materialMap: Record<string, string> = {}
    const userMap: Record<string, { name: string | null; email: string }> = {}

    if (toolIds.size > 0) {
      const toolRows = await db
        .select({ id: tools.id, name: tools.name })
        .from(tools)
        .where(inArray(tools.id, Array.from(toolIds)))
      for (const t of toolRows) toolMap[t.id] = t.name
    }

    if (materialIds.size > 0) {
      const matRows = await db
        .select({ id: materials.id, name: materials.name })
        .from(materials)
        .where(inArray(materials.id, Array.from(materialIds)))
      for (const m of matRows) materialMap[m.id] = m.name
    }

    if (userIdSet.size > 0) {
      const userRows = await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, Array.from(userIdSet)))
      for (const u of userRows) userMap[u.id] = { name: u.name, email: u.email }
    }

    const enriched = rows.map((row) => ({
      ...row,
      entityName:
        row.entityType === "tool"
          ? toolMap[row.entityId] ?? null
          : row.entityType === "material"
            ? materialMap[row.entityId] ?? null
            : null,
      submittedByName: row.submittedById ? (userMap[row.submittedById]?.name ?? null) : null,
      submittedByEmail: row.submittedById ? (userMap[row.submittedById]?.email ?? null) : null,
      assignedToName: row.assignedToId ? (userMap[row.assignedToId]?.name ?? null) : null,
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error("GET /api/warranty-claims error:", error)
    return NextResponse.json(
      { error: "Garantieansprüche konnten nicht geladen werden" },
      { status: 500 }
    )
  }
}

// ─── POST /api/warranty-claims ───────────────────────────────────────────────
// Body: { warrantyRecordId, entityType, entityId, reason, description?, photos? }

export async function POST(request: Request) {
  try {
    const result = await getSessionAndOrg(request)
    if (result.error) return result.error
    const { db, orgId, session } = result

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 })
    }

    const { warrantyRecordId, entityType, entityId, reason, description, photos } = body as {
      warrantyRecordId?: string
      entityType?: string
      entityId?: string
      reason?: string
      description?: string
      photos?: string[]
    }

    if (!warrantyRecordId || !entityType || !entityId || !reason) {
      return NextResponse.json(
        { error: "warrantyRecordId, entityType, entityId und reason sind erforderlich" },
        { status: 400 }
      )
    }

    // Verify warranty record belongs to this org
    const [wr] = await db
      .select({ id: warrantyRecords.id })
      .from(warrantyRecords)
      .where(
        and(
          eq(warrantyRecords.id, warrantyRecordId),
          eq(warrantyRecords.organizationId, orgId)
        )
      )
      .limit(1)

    if (!wr) {
      return NextResponse.json(
        { error: "Garantieeintrag nicht gefunden" },
        { status: 404 }
      )
    }

    // Auto-generate claim number: WC-YYYY-NNN
    const year = new Date().getFullYear()
    const prefix = `WC-${year}-`

    const [countResult] = await db
      .select({ value: count() })
      .from(warrantyClaims)
      .where(
        and(
          eq(warrantyClaims.organizationId, orgId),
          like(warrantyClaims.claimNumber, `${prefix}%`)
        )
      )

    const nextNum = (countResult?.value ?? 0) + 1
    const claimNumber = `${prefix}${String(nextNum).padStart(3, "0")}`

    const [created] = await db
      .insert(warrantyClaims)
      .values({
        organizationId: orgId,
        warrantyRecordId,
        entityType,
        entityId,
        claimNumber,
        reason,
        description: description ?? null,
        photos: photos ?? null,
        status: "draft",
        submittedById: session.user.id,
      })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("POST /api/warranty-claims error:", error)
    return NextResponse.json(
      { error: "Garantieanspruch konnte nicht erstellt werden" },
      { status: 500 }
    )
  }
}
