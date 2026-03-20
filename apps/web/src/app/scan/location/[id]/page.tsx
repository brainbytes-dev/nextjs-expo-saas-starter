import { notFound } from "next/navigation"
import Link from "next/link"
import { getDb } from "@repo/db"
import { locations, materialStocks, materials, tools } from "@repo/db/schema"
import { eq, and } from "drizzle-orm"
import {
  IconBuildingWarehouse,
  IconTruck,
  IconBuildingFactory,
  IconAmbulance,
  IconStethoscope,
  IconHeartbeat,
  IconUser,
  IconMapPin,
  IconPackage,
  IconTool,
  IconLogin,
} from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// Type config
// ---------------------------------------------------------------------------
const TYPE_META: Record<string, { label: string; icon: string }> = {
  warehouse: { label: "Lager", icon: "warehouse" },
  vehicle: { label: "Fahrzeug", icon: "truck" },
  site: { label: "Baustelle", icon: "factory" },
  station: { label: "Rettungswache", icon: "ambulance" },
  practice: { label: "Praxis", icon: "stethoscope" },
  operating_room: { label: "OP-Saal", icon: "heartbeat" },
  user: { label: "Person", icon: "user" },
}

const TYPE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  warehouse: IconBuildingWarehouse,
  vehicle: IconTruck,
  site: IconBuildingFactory,
  station: IconAmbulance,
  practice: IconStethoscope,
  operating_room: IconHeartbeat,
  user: IconUser,
}

function conditionLabel(c: string | null): string {
  const map: Record<string, string> = {
    good: "Gut",
    damaged: "Beschaedigt",
    repair: "In Reparatur",
    decommissioned: "Ausgemustert",
  }
  return map[c ?? "good"] ?? (c ?? "Gut")
}

// ---------------------------------------------------------------------------
// Page (Server Component — public, no auth)
// ---------------------------------------------------------------------------
export default async function ScanLocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const db = getDb()

  // Fetch location
  const [location] = await db
    .select({
      id: locations.id,
      name: locations.name,
      type: locations.type,
      category: locations.category,
      address: locations.address,
    })
    .from(locations)
    .where(and(eq(locations.id, id), eq(locations.isActive, true)))
    .limit(1)

  if (!location) notFound()

  // Fetch materials at location
  const stockRows = await db
    .select({
      materialName: materials.name,
      materialNumber: materials.number,
      quantity: materialStocks.quantity,
      unit: materials.unit,
    })
    .from(materialStocks)
    .innerJoin(materials, eq(materials.id, materialStocks.materialId))
    .where(eq(materialStocks.locationId, id))

  // Fetch tools at location
  const toolRows = await db
    .select({
      name: tools.name,
      number: tools.number,
      condition: tools.condition,
    })
    .from(tools)
    .where(and(eq(tools.assignedLocationId, id), eq(tools.isActive, true)))

  const TypeIcon = TYPE_ICON_MAP[location.type] ?? IconMapPin
  const typeMeta = TYPE_META[location.type] ?? { label: location.type, icon: "pin" }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TypeIcon className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{location.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {typeMeta.label}
                </span>
                {location.category && (
                  <>
                    <span aria-hidden>&middot;</span>
                    <span>{location.category}</span>
                  </>
                )}
              </div>
              {location.address && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {location.address}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-8">
        {/* Materials */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <IconPackage className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              Materialien ({stockRows.length})
            </h2>
          </div>
          {stockRows.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Keine Materialien an diesem Standort.
            </p>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Nummer
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Material
                    </th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Bestand
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Einheit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {row.materialNumber ?? "\u2014"}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        {row.materialName}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">
                        {row.quantity}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.unit ?? "Stk"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Tools */}
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <IconTool className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">
              Werkzeuge ({toolRows.length})
            </h2>
          </div>
          {toolRows.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Keine Werkzeuge an diesem Standort.
            </p>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Nummer
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Werkzeug
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Zustand
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {toolRows.map((tool, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {tool.number ?? "\u2014"}
                      </td>
                      <td className="px-3 py-2 font-medium">{tool.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {conditionLabel(tool.condition)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* CTA */}
        <div className="rounded-xl border bg-card p-6 text-center">
          <IconLogin className="mx-auto mb-2 size-8 text-primary" />
          <h3 className="text-lg font-semibold">Mehr Details verfuegbar</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Melden Sie sich an, um Bestaende zu bearbeiten, Buchungen
            durchzufuehren und vollstaendige Informationen zu sehen.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <IconLogin className="size-4" />
            Anmelden fuer mehr Details
          </Link>
        </div>

        {/* Footer branding */}
        <p className="mt-8 text-center text-xs text-muted-foreground/50 tracking-wider uppercase">
          logistikapp.ch
        </p>
      </main>
    </div>
  )
}
