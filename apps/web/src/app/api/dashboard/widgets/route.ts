import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { dashboardWidgets } from "@repo/db/schema"
import { eq, and } from "drizzle-orm"

// ── GET /api/dashboard/widgets ─────────────────────────────────────────
export async function GET(request: Request) {
  const result = await getSessionAndOrg(request)
  if (result.error) return result.error
  const { db, orgId, session } = result

  const rows = await db
    .select()
    .from(dashboardWidgets)
    .where(
      and(
        eq(dashboardWidgets.organizationId, orgId),
        eq(dashboardWidgets.userId, session.user.id)
      )
    )
    .orderBy(dashboardWidgets.createdAt)

  return NextResponse.json({ data: rows })
}

// ── POST /api/dashboard/widgets ────────────────────────────────────────
export async function POST(request: Request) {
  const result = await getSessionAndOrg(request)
  if (result.error) return result.error
  const { db, orgId, session } = result

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).widgetType !== "string"
  ) {
    return NextResponse.json({ error: "widgetType is required" }, { status: 400 })
  }

  const { widgetType, config, position, size } = body as {
    widgetType: string
    config?: unknown
    position?: { x: number; y: number }
    size?: { w: number; h: number }
  }

  const [row] = await db
    .insert(dashboardWidgets)
    .values({
      organizationId: orgId,
      userId: session.user.id,
      widgetType,
      config: (config as Record<string, unknown>) ?? null,
      position: (position as Record<string, unknown>) ?? null,
      size: (size as Record<string, unknown>) ?? null,
    })
    .returning()

  return NextResponse.json({ data: row }, { status: 201 })
}

// ── PUT /api/dashboard/widgets ─────────────────────────────────────────
// Batch-update positions after a drag-and-drop reorder.
// Body: { layouts: Array<{ id: string; position: { x, y }; size: { w, h } }> }
export async function PUT(request: Request) {
  const result = await getSessionAndOrg(request)
  if (result.error) return result.error
  const { db, orgId, session } = result

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const layouts = (body as { layouts?: unknown }).layouts
  if (!Array.isArray(layouts)) {
    return NextResponse.json({ error: "layouts array required" }, { status: 400 })
  }

  await Promise.all(
    layouts.map(async (item: { id: string; position: { x: number; y: number }; size: { w: number; h: number } }) => {
      await db
        .update(dashboardWidgets)
        .set({
          position: item.position as unknown as Record<string, unknown>,
          size: item.size as unknown as Record<string, unknown>,
        })
        .where(
          and(
            eq(dashboardWidgets.id, item.id),
            eq(dashboardWidgets.organizationId, orgId),
            eq(dashboardWidgets.userId, session.user.id)
          )
        )
    })
  )

  return NextResponse.json({ ok: true })
}

// ── DELETE /api/dashboard/widgets?id=<uuid> ────────────────────────────
export async function DELETE(request: Request) {
  const result = await getSessionAndOrg(request)
  if (result.error) return result.error
  const { db, orgId, session } = result

  const id = new URL(request.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 })
  }

  await db
    .delete(dashboardWidgets)
    .where(
      and(
        eq(dashboardWidgets.id, id),
        eq(dashboardWidgets.organizationId, orgId),
        eq(dashboardWidgets.userId, session.user.id)
      )
    )

  return NextResponse.json({ ok: true })
}
