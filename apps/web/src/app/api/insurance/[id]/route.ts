import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { insuranceRecords } from "@repo/db/schema"
import { eq, and } from "drizzle-orm"

// ---------------------------------------------------------------------------
// PATCH — update insurance record
// ---------------------------------------------------------------------------
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionAndOrg(request)
  if (auth.error) return auth.error
  const { db, orgId } = auth
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  const {
    provider,
    policyNumber,
    coverageAmount,
    premium,
    startDate,
    endDate,
    notes,
  } = body as Record<string, unknown>

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (provider !== undefined) updates.provider = provider
  if (policyNumber !== undefined) updates.policyNumber = policyNumber
  if (coverageAmount !== undefined)
    updates.coverageAmount =
      typeof coverageAmount === "number" ? Math.round(coverageAmount) : null
  if (premium !== undefined)
    updates.premium = typeof premium === "number" ? Math.round(premium) : null
  if (startDate !== undefined) updates.startDate = startDate
  if (endDate !== undefined) updates.endDate = endDate
  if (notes !== undefined) updates.notes = notes

  const [updated] = await db
    .update(insuranceRecords)
    .set(updates)
    .where(
      and(
        eq(insuranceRecords.id, id),
        eq(insuranceRecords.organizationId, orgId)
      )
    )
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return NextResponse.json(updated)
}

// ---------------------------------------------------------------------------
// DELETE — remove insurance record
// ---------------------------------------------------------------------------
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getSessionAndOrg(request)
  if (auth.error) return auth.error
  const { db, orgId } = auth
  const { id } = await params

  await db
    .delete(insuranceRecords)
    .where(
      and(
        eq(insuranceRecords.id, id),
        eq(insuranceRecords.organizationId, orgId)
      )
    )

  return NextResponse.json({ success: true })
}
