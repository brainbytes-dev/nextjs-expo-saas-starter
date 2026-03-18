import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { insuranceRecords } from "@repo/db/schema"
import { eq, and } from "drizzle-orm"

// ---------------------------------------------------------------------------
// GET — list insurance records (filter by ?entityType=tool&entityId=xxx)
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const auth = await getSessionAndOrg(request)
  if (auth.error) return auth.error
  const { db, orgId } = auth

  const url = new URL(request.url)
  const entityType = url.searchParams.get("entityType")
  const entityId = url.searchParams.get("entityId")

  const conditions = [eq(insuranceRecords.organizationId, orgId)]
  if (entityType) conditions.push(eq(insuranceRecords.entityType, entityType))
  if (entityId) conditions.push(eq(insuranceRecords.entityId, entityId))

  const rows = await db
    .select()
    .from(insuranceRecords)
    .where(and(...conditions))
    .orderBy(insuranceRecords.endDate)

  return NextResponse.json(rows)
}

// ---------------------------------------------------------------------------
// POST — create an insurance record
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
    policyNumber,
    coverageAmount,
    premium,
    startDate,
    endDate,
    notes,
  } = body as Record<string, unknown>

  if (!entityType || !entityId || !provider) {
    return NextResponse.json(
      { error: "entityType, entityId und provider sind erforderlich" },
      { status: 400 }
    )
  }

  const [created] = await db
    .insert(insuranceRecords)
    .values({
      organizationId: orgId,
      entityType: entityType as string,
      entityId: entityId as string,
      provider: provider as string,
      policyNumber: (policyNumber as string | undefined) ?? null,
      coverageAmount:
        typeof coverageAmount === "number" ? Math.round(coverageAmount) : null,
      premium: typeof premium === "number" ? Math.round(premium) : null,
      startDate: (startDate as string | undefined) ?? null,
      endDate: (endDate as string | undefined) ?? null,
      notes: (notes as string | undefined) ?? null,
    })
    .returning()

  return NextResponse.json(created, { status: 201 })
}
