import { notFound } from "next/navigation"
import Image from "next/image"
import { getDb } from "@repo/db"
import { tools, materials, materialStocks, locations } from "@repo/db/schema"
import { eq, or } from "drizzle-orm"
import { SelfServiceActions } from "./self-service-actions"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ItemType = "tool" | "material"

interface ItemData {
  id: string
  name: string
  type: ItemType
  number: string | null
  image: string | null
  location: string | null
  condition: string | null
  stock: number | null
  barcode: string | null
}

// ---------------------------------------------------------------------------
// Lookup helper — checks both tools and materials by barcode or ID
// ---------------------------------------------------------------------------
async function lookupItem(code: string): Promise<ItemData | null> {
  const db = getDb()

  // Try tools first — match by barcode OR uuid
  const toolRows = await db
    .select({
      id: tools.id,
      name: tools.name,
      number: tools.number,
      image: tools.image,
      barcode: tools.barcode,
      condition: tools.condition,
      homeLocationId: tools.homeLocationId,
      isActive: tools.isActive,
    })
    .from(tools)
    .where(
      or(
        eq(tools.barcode, code),
        eq(tools.id, code)
      )
    )
    .limit(1)

  if (toolRows.length > 0) {
    const t = toolRows[0]!
    if (!t.isActive) return null

    let locationName: string | null = null
    if (t.homeLocationId) {
      const locRow = await db
        .select({ name: locations.name })
        .from(locations)
        .where(eq(locations.id, t.homeLocationId))
        .limit(1)
      locationName = locRow[0]?.name ?? null
    }

    return {
      id: t.id,
      name: t.name,
      type: "tool",
      number: t.number,
      image: t.image,
      location: locationName,
      condition: t.condition,
      stock: null,
      barcode: t.barcode,
    }
  }

  // Try materials
  const matRows = await db
    .select({
      id: materials.id,
      name: materials.name,
      number: materials.number,
      image: materials.image,
      barcode: materials.barcode,
      unit: materials.unit,
      locationId: materials.locationId,
      isActive: materials.isActive,
    })
    .from(materials)
    .where(
      or(
        eq(materials.barcode, code),
        eq(materials.id, code)
      )
    )
    .limit(1)

  if (matRows.length > 0) {
    const m = matRows[0]!
    if (!m.isActive) return null

    let locationName: string | null = null
    if (m.locationId) {
      const locRow = await db
        .select({ name: locations.name })
        .from(locations)
        .where(eq(locations.id, m.locationId))
        .limit(1)
      locationName = locRow[0]?.name ?? null
    }

    const stockRow = await db
      .select({ quantity: materialStocks.quantity })
      .from(materialStocks)
      .where(eq(materialStocks.materialId, m.id))
      .limit(1)

    return {
      id: m.id,
      name: m.name,
      type: "material",
      number: m.number,
      image: m.image,
      location: locationName,
      condition: null,
      stock: stockRow[0] ? Number(stockRow[0].quantity) : null,
      barcode: m.barcode,
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Condition badge helper
// ---------------------------------------------------------------------------
function conditionLabel(c: string | null): string {
  if (!c) return ""
  const map: Record<string, string> = {
    good: "Gut",
    damaged: "Beschädigt",
    repair: "Reparatur",
    decommissioned: "Ausgemustert",
  }
  return map[c] ?? c
}

function conditionClass(c: string | null): string {
  const map: Record<string, string> = {
    good: "bg-green-100 text-green-800 border-green-200",
    damaged: "bg-yellow-100 text-yellow-800 border-yellow-200",
    repair: "bg-red-100 text-red-800 border-red-200",
    decommissioned: "bg-gray-100 text-gray-500 border-gray-200",
  }
  return c ? (map[c] ?? "") : ""
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function SelfServicePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const item = await lookupItem(decodeURIComponent(code))

  if (!item) {
    notFound()
  }

  const isAvailable = item.type === "tool"
    ? item.condition !== "decommissioned" && item.condition !== "repair"
    : (item.stock ?? 0) > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold tracking-tight text-gray-900">
          LogistikApp
        </span>
        <span className="text-xs text-gray-400">Self-Service</span>
      </div>

      <div className="max-w-sm mx-auto px-4 py-8 space-y-5">
        {/* Item card */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          {/* Image */}
          <div className="relative h-40 bg-gray-100 flex items-center justify-center">
            {item.image ? (
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="text-5xl text-gray-300">
                {item.type === "tool" ? "🔧" : "📦"}
              </div>
            )}
          </div>

          <div className="p-5 space-y-3">
            {/* Type badge + condition */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                {item.type === "tool" ? "Werkzeug" : "Material"}
              </span>
              {item.condition && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${conditionClass(item.condition)}`}>
                  {conditionLabel(item.condition)}
                </span>
              )}
              {item.type === "material" && item.stock !== null && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${item.stock > 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                  {item.stock > 0 ? `${item.stock} verfügbar` : "Nicht vorrätig"}
                </span>
              )}
            </div>

            {/* Name + number */}
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                {item.name}
              </h1>
              {item.number && (
                <p className="mt-0.5 text-sm font-mono text-gray-500">
                  Nr. {item.number}
                </p>
              )}
            </div>

            {/* Location */}
            {item.location && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <span className="text-gray-400">📍</span>
                {item.location}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <SelfServiceActions
          item={{
            id: item.id,
            name: item.name,
            type: item.type,
            barcode: item.barcode,
          }}
          isAvailable={isAvailable}
        />

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          LogistikApp · Self-Service-Portal
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Not found page
// ---------------------------------------------------------------------------
export function generateMetadata() {
  return { title: "Self-Service | LogistikApp" }
}
