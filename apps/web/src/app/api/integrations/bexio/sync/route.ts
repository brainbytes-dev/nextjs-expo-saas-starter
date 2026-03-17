// Syncs LogistikApp materials to bexio articles via the bexio REST API v2.
//
// GET  — lightweight connection check: 200 if token cookie exists, 401 if not.
// POST — performs the actual sync, creating articles in bexio for each material.

import { NextResponse } from "next/server"
import { cookies } from "next/headers"

interface BexioToken {
  access_token: string
  expires_in?: number
  token_type?: string
}

async function getBexioToken(): Promise<BexioToken | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get("bexio_token")?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as BexioToken
  } catch {
    return null
  }
}

// HEAD/GET — connection status check used by the frontend card on mount
export async function GET() {
  const token = await getBexioToken()
  if (!token) {
    return NextResponse.json({ connected: false }, { status: 401 })
  }
  return NextResponse.json({ connected: true })
}

// POST — trigger a full materials → bexio articles sync
export async function POST() {
  const token = await getBexioToken()
  if (!token) {
    return NextResponse.json({ error: "Not connected to bexio" }, { status: 401 })
  }

  // Fetch materials from the internal materials API
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"
  const materialsRes = await fetch(`${appUrl}/api/materials?limit=500`, {
    headers: {
      // Forward internal request marker so the materials route can skip auth if needed
      "x-internal-request": "1",
    },
  })

  if (!materialsRes.ok) {
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 })
  }

  const { materials } = (await materialsRes.json()) as {
    materials?: Array<{
      id: string
      name: string
      number?: string
    }>
  }

  let synced = 0
  const errors: string[] = []

  for (const mat of materials ?? []) {
    try {
      const bexioRes = await fetch("https://api.bexio.com/2.0/article", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          intern_code: mat.number ?? mat.id,
          intern_name: mat.name,
          unit_id: 1, // default unit — can be configured per tenant in the future
          stock_management: true,
          stock_nr: mat.number ?? "",
        }),
      })

      if (bexioRes.ok) {
        synced++
      } else {
        const errBody = await bexioRes.text().catch(() => String(bexioRes.status))
        errors.push(`${mat.name}: ${bexioRes.status} ${errBody}`.slice(0, 120))
      }
    } catch {
      errors.push(`${mat.name}: network error`)
    }
  }

  return NextResponse.json({
    synced,
    errors,
    total: materials?.length ?? 0,
  })
}
