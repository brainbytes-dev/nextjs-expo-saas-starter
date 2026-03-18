import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { warrantyRecords } from "@repo/db/schema"
import { eq, and } from "drizzle-orm"

// ---------------------------------------------------------------------------
// GET — list warranty records (filter by ?entityType=tool&entityId=xxx)
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const auth = await getSessionAndOrg(request)
  if (auth.error) return auth.error
  const { db, orgId } = auth

  const url = new URL(request.url)
  const entityType = url.searchParams.get("entityType")
  const entityId = url.searchParams.get("entityId")

  const conditions = [eq(warrantyRecords.organizationId, orgId)]
  if (entityType) conditions.push(eq(warrantyRecords.entityType, entityType))
  if (entityId) conditions.push(eq(warrantyRecords.entityId, entityId))

  const rows = await db
    .select()
    .from(warrantyRecords)
    .where(and(...conditions))
    .orderBy(warrantyRecords.warrantyEnd)

  return NextResponse.json(rows)
}

// ---------------------------------------------------------------------------
// POST — create a warranty record
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const auth = await getSessionAndOrg(request)
  if (auth.error) return auth.error
  const { db, orgId } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  const {
    entityType,
    entityId,
    provider,
    warrantyStart,
    warrantyEnd,
    notes,
  } = body as Record<string, unknown>

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "entityType und entityId sind erforderlich" },
      { status: 400 }
    )
  }

  const [created] = await db
    .insert(warrantyRecords)
    .values({
      organizationId: orgId,
      entityType: entityType as string,
      entityId: entityId as string,
      provider: (provider as string | undefined) ?? null,
      warrantyStart: (warrantyStart as string | undefined) ?? null,
      warrantyEnd: (warrantyEnd as string | undefined) ?? null,
      notes: (notes as string | undefined) ?? null,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
