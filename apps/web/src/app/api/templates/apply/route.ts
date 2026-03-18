import { NextResponse } from "next/server"
import { getDb } from "@repo/db"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  organizations,
  organizationMembers,
  locations,
  materialGroups,
  toolGroups,
  materials,
  tools,
  customFieldDefinitions,
} from "@repo/db/schema"
import { eq, and } from "drizzle-orm"
import { getTemplate } from "@/lib/industry-templates"

// ─── POST /api/templates/apply ───────────────────────────────────────────────
//
// Applies an industry template to an existing organization. Creates locations,
// material groups, tool groups, sample materials, sample tools and custom field
// definitions in a single database transaction.
//
// Body: { industry: string, orgId: string }
// Returns: { locations, materialGroups, toolGroups, materials, tools, customFields }

export async function POST(request: Request) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
    }

    // ── Body validation ──────────────────────────────────────────────────────
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Ungültiger JSON-Body" }, { status: 400 })
    }

    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).industry !== "string" ||
      typeof (body as Record<string, unknown>).orgId !== "string"
    ) {
      return NextResponse.json(
        { error: "industry (string) und orgId (string) sind erforderlich" },
        { status: 400 }
      )
    }

    const { industry, orgId } = body as { industry: string; orgId: string }

    // ── Load template ────────────────────────────────────────────────────────
    const template = getTemplate(industry)
    if (!template) {
      return NextResponse.json(
        { error: `Unbekannte Branche: ${industry}` },
        { status: 400 }
      )
    }

    // ── Verify membership (caller must be owner or admin of the org) ─────────
    const db = getDb()

    const membership = await db
      .select({ role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, session.user.id)
        )
      )
      .limit(1)

    if (!membership.length) {
      return NextResponse.json(
        { error: "Keine Mitgliedschaft in dieser Organisation" },
        { status: 403 }
      )
    }

    const memberRole = membership[0]!.role
    if (memberRole !== "owner" && memberRole !== "admin") {
      return NextResponse.json(
        { error: "Nur Eigentümer oder Admins können Vorlagen anwenden" },
        { status: 403 }
      )
    }

    // ── Verify org exists ────────────────────────────────────────────────────
    const orgRows = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1)

    if (!orgRows.length) {
      return NextResponse.json(
        { error: "Organisation nicht gefunden" },
        { status: 404 }
      )
    }

    // ── Apply template in a single transaction ───────────────────────────────
    const result = await db.transaction(async (tx) => {
      // 1. Create locations
      const createdLocations = await tx
        .insert(locations)
        .values(
          template.locations.map((loc) => ({
            organizationId: orgId,
            name: loc.name,
            type: loc.type,
          }))
        )
        .returning({ id: locations.id, name: locations.name })

      // 2. Create material groups
      const createdMatGroups = await tx
        .insert(materialGroups)
        .values(
          template.materialGroups.map((grp) => ({
            organizationId: orgId,
            name: grp.name,
            color: grp.color,
          }))
        )
        .returning({ id: materialGroups.id, name: materialGroups.name })

      // 3. Create tool groups
      const createdToolGroups = await tx
        .insert(toolGroups)
        .values(
          template.toolGroups.map((grp) => ({
            organizationId: orgId,
            name: grp.name,
            color: grp.color,
          }))
        )
        .returning({ id: toolGroups.id, name: toolGroups.name })

      // 4. Create materials — map groupIndex → actual DB id
      const createdMaterials = await tx
        .insert(materials)
        .values(
          template.materials.map((mat) => ({
            organizationId: orgId,
            name: mat.name,
            number: mat.number,
            unit: mat.unit,
            groupId: createdMatGroups[mat.groupIndex]?.id ?? null,
            mainLocationId: createdLocations[0]?.id ?? null, // default to first location
            manufacturer: mat.manufacturer ?? null,
            reorderLevel: mat.reorderLevel ?? 0,
          }))
        )
        .returning({ id: materials.id, name: materials.name })

      // 5. Create tools
      const createdTools = await tx
        .insert(tools)
        .values(
          template.tools.map((tool) => ({
            organizationId: orgId,
            name: tool.name,
            number: tool.number,
            groupId: createdToolGroups[tool.groupIndex]?.id ?? null,
            homeLocationId: createdLocations[0]?.id ?? null,
            manufacturer: tool.manufacturer ?? null,
            condition: tool.condition ?? "good",
          }))
        )
        .returning({ id: tools.id, name: tools.name })

      // 6. Create custom field definitions
      const createdCustomFields = await tx
        .insert(customFieldDefinitions)
        .values(
          template.customFields.map((field) => ({
            organizationId: orgId,
            entityType: field.entityType,
            name: field.name,
            fieldType: field.fieldType,
            sortOrder: field.sortOrder,
          }))
        )
        .returning({ id: customFieldDefinitions.id, name: customFieldDefinitions.name })

      return {
        locations: createdLocations,
        materialGroups: createdMatGroups,
        toolGroups: createdToolGroups,
        materials: createdMaterials,
        tools: createdTools,
        customFields: createdCustomFields,
      }
    })

    // ── Update organization industry field ────────────────────────────────────
    await db
      .update(organizations)
      .set({ industry, updatedAt: new Date() })
      .where(eq(organizations.id, orgId))

    return NextResponse.json(
      {
        success: true,
        industry,
        counts: {
          locations: result.locations.length,
          materialGroups: result.materialGroups.length,
          toolGroups: result.toolGroups.length,
          materials: result.materials.length,
          tools: result.tools.length,
          customFields: result.customFields.length,
        },
        created: result,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("POST /api/templates/apply error:", error)
    return NextResponse.json(
      { error: "Vorlage konnte nicht angewendet werden" },
      { status: 500 }
    )
  }
}
