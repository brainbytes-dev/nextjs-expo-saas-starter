// Validates Vertec API key credentials and stores them in a cookie.
//
// POST — accepts { serverUrl, apiKey }, tests the connection against
//         Vertec's /rest/v1/userinfos/me endpoint, and on success sets
//         a long-lived httpOnly cookie with the config.
//
// Required env vars (optional — can also be supplied per-tenant via this route):
//   VERTEC_SERVER_URL  — e.g. https://myfirm.vertec.cloud
//   VERTEC_API_KEY     — API key from Vertec admin settings

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 })
  }

  const { serverUrl, apiKey } = body as { serverUrl?: string; apiKey?: string }

  if (!serverUrl || !apiKey) {
    return NextResponse.json(
      { error: "serverUrl und apiKey erforderlich" },
      { status: 400 },
    )
  }

  // Validate URL — only https:// allowed to prevent SSRF
  let parsedUrl: URL
  try {
    parsedUrl = new URL(serverUrl)
  } catch {
    return NextResponse.json({ error: "Ungültige serverUrl" }, { status: 400 })
  }
  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json({ error: "serverUrl muss HTTPS verwenden" }, { status: 400 })
  }

  const base = parsedUrl.origin

  // Validate credentials against the Vertec identity endpoint
  try {
    const testRes = await fetch(`${base}/rest/v1/userinfos/me`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    })

    if (!testRes.ok) {
      return NextResponse.json(
        { error: "Verbindung fehlgeschlagen — API-Key prüfen" },
        { status: 401 },
      )
    }
  } catch {
    return NextResponse.json(
      { error: "Server nicht erreichbar" },
      { status: 503 },
    )
  }

  const cookieStore = await cookies()
  cookieStore.set("vertec_config", JSON.stringify({ serverUrl: base, apiKey }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  })

  return NextResponse.json({ ok: true })
}
