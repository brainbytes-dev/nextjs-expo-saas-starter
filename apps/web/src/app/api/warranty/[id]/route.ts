import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { warrantyRecords } from "@repo/db/schema"
import { eq, and } from "drizzle-orm"

// ---------------------------------------------------------------------------
// PATCH — update warranty record
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

  const { provider, warrantyStart, warrantyEnd, notes } = body as Record<
    string,
    unknown
  >

  const updates: Record<string, unknown> = {}
  if (provider !== undefined) updates.provider = provider
  if (warrantyStart !== undefined) updates.warrantyStart = warrantyStart
  if (warrantyEnd !== undefined) updates.warrantyEnd = warrantyEnd
  if (notes !== undefined) updates.notes = notes

  const [updated] = await db
    .update(warrantyRecords)
    .set(updates)
    .where(
      and(
        eq(warrantyRecords.id, id),
        eq(warrantyRecords.organizationId, orgId)
      )
    )
    .returning()

  if (!updated) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return NextResponse.json(updated)
}

// ---------------------------------------------------------------------------
// DELETE — remove warranty record
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
    .delete(warrantyRecords)
    .where(
      and(
        eq(warrantyRecords.id, id),
        eq(warrantyRecords.organizationId, orgId)
      )
    )

  return NextResponse.json({ success: true })
}
