// Syncs LogistikApp materials to AbaNinja articles via the AbaNinja REST API.
//
// GET  — lightweight connection check: 200 if token cookie exists, 401 if not.
// POST — performs the actual sync, creating articles in AbaNinja for each material.

import { NextResponse } from "next/server"
import { cookies } from "next/headers"

interface AbacusToken {
  access_token: string
  expires_in?: number
  token_type?: string
}

async function getAbacusToken(): Promise<AbacusToken | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get("abacus_token")?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as AbacusToken
  } catch {
    return null
  }
}

// GET — connection status check used by the frontend card on mount
export async function GET() {
  const token = await getAbacusToken()
  if (!token) {
    return NextResponse.json({ connected: false }, { status: 401 })
  }
  return NextResponse.json({ connected: true })
}

// POST — trigger a full materials → AbaNinja articles sync
export async function POST() {
  const token = await getAbacusToken()
  if (!token) {
    return NextResponse.json({ error: "Not connected to Abacus" }, { status: 401 })
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
      unit?: string
    }>
  }

  let synced = 0
  const errors: string[] = []

  for (const mat of materials ?? []) {
    try {
      const abacusRes = await fetch("https://abaninja.ch/api/accounting/v1/articles", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          nr: mat.number ?? mat.id,
          name: mat.name,
          unit: { name: mat.unit ?? "Stk" },
          stock: { enabled: true },
        }),
      })

      if (abacusRes.ok) {
        synced++
      } else {
        const errBody = await abacusRes.text().catch(() => String(abacusRes.status))
        errors.push(`${mat.name}: ${abacusRes.status} ${errBody}`.slice(0, 120))
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
