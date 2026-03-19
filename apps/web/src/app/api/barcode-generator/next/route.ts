import { NextResponse } from "next/server"
import { getSessionAndOrg } from "@/app/api/_helpers/auth"
import { materials, tools, organizations } from "@repo/db/schema"
import { eq, sql, and } from "drizzle-orm"

// GET /api/barcode-generator/next?type=material|tool&count=1
// Generates one or more sequential internal barcodes like LA-ABC-000042.
// The prefix is derived from the org slug (first 3 uppercase letters).
export async function GET(request: Request) {
  const result = await getSessionAndOrg(request)
  if (result.error) return result.error
  const { db, orgId } = result

  const url = new URL(request.url)
  const count = Math.min(50, Math.max(1, Number(url.searchParams.get("count") ?? "1")))

  // Resolve org slug to derive a short prefix
  const [org] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  const slugPrefix = (org?.slug ?? "org")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 3)
    .toUpperCase()
  const prefix = `LA-${slugPrefix}-`

  // Find the current highest sequential number already issued for this org
  const patternLike = `${prefix}%`

  // Count existing barcodes with this prefix in both materials and tools
  const [matMax] = await db
    .select({ max: sql<string | null>`MAX(barcode)` })
    .from(materials)
    .where(and(eq(materials.organizationId, orgId), sql`barcode LIKE ${patternLike}`))

  const [toolMax] = await db
    .select({ max: sql<string | null>`MAX(barcode)` })
    .from(tools)
    .where(and(eq(tools.organizationId, orgId), sql`barcode LIKE ${patternLike}`))

  // Parse the numeric suffix from the highest barcode found
  const parseSeq = (bc: string | null | undefined): number => {
    if (!bc) return 0
    const suffix = bc.slice(prefix.length)
    const n = parseInt(suffix, 10)
    return isNaN(n) ? 0 : n
  }

  const highestSeq = Math.max(parseSeq(matMax?.max), parseSeq(toolMax?.max))

  const barcodes: string[] = []
  for (let i = 1; i <= count; i++) {
    const seq = highestSeq + i
    barcodes.push(`${prefix}${String(seq).padStart(6, "0")}`)
  }

  return NextResponse.json({ barcodes, prefix })
}
