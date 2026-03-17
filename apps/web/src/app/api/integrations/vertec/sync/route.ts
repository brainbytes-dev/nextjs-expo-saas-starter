// Syncs recent LogistikApp stock changes to Vertec as expense entries.
//
// GET  — lightweight connection check: 200 {connected: true} if vertec_config
//         cookie exists, 401 otherwise.
// POST — fetches the latest 100 stock changes and posts each as a Vertec expense
//         via POST /rest/v1/expenses. Returns {synced, total, errors[]}.

import { NextResponse } from "next/server"
import { cookies } from "next/headers"

interface VertecConfig {
  serverUrl: string
  apiKey: string
}

interface StockChange {
  id: string
  materialName?: string
  quantity?: number
  unit?: string
  projectPhaseLink?: string
  date?: string
  notes?: string
}

async function getVertecConfig(): Promise<VertecConfig | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get("vertec_config")?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as VertecConfig
  } catch {
    return null
  }
}

// GET — connection status probe used by the frontend card on mount
export async function GET() {
  const config = await getVertecConfig()
  if (!config) {
    return NextResponse.json({ connected: false }, { status: 401 })
  }
  return NextResponse.json({ connected: true })
}

// POST — trigger a sync of recent stock changes → Vertec expenses
export async function POST() {
  const config = await getVertecConfig()
  if (!config) {
    return NextResponse.json({ error: "Nicht mit Vertec verbunden" }, { status: 401 })
  }

  // Fetch recent stock changes from the internal API
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3003"
  const stockRes = await fetch(`${appUrl}/api/stock-changes?limit=100`, {
    headers: {
      "x-internal-request": "1",
    },
  })

  if (!stockRes.ok) {
    return NextResponse.json({ error: "Lagerbewegungen konnten nicht abgerufen werden" }, { status: 500 })
  }

  const data = (await stockRes.json()) as {
    stockChanges?: StockChange[]
    changes?: StockChange[]
  }

  // Support both common response shapes
  const changes: StockChange[] = data.stockChanges ?? data.changes ?? []

  let synced = 0
  const errors: string[] = []

  for (const change of changes) {
    const label = change.materialName ?? change.id

    try {
      const expenseBody = {
        date: change.date ?? new Date().toISOString().slice(0, 10),
        text: `Material: ${label}${change.notes ? ` — ${change.notes}` : ""}`,
        quantity: change.quantity ?? 1,
        unit: change.unit ?? "Stk",
        ...(change.projectPhaseLink
          ? { phase: { link: change.projectPhaseLink } }
          : {}),
      }

      const vertecRes = await fetch(`${config.serverUrl}/rest/v1/expenses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(expenseBody),
      })

      if (vertecRes.ok) {
        synced++
      } else {
        const errText = await vertecRes.text().catch(() => String(vertecRes.status))
        errors.push(`${label}: ${vertecRes.status} ${errText}`.slice(0, 120))
      }
    } catch {
      errors.push(`${label}: Netzwerkfehler`)
    }
  }

  return NextResponse.json({
    synced,
    total: changes.length,
    errors,
  })
}
