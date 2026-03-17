// Required env vars:
//   ABACUS_CLIENT_ID      — OAuth client ID from AbaNinja developer portal
//   ABACUS_CLIENT_SECRET  — OAuth client secret
//   ABACUS_REDIRECT_URI   — Must match redirect URI registered in the portal
//                           e.g. https://yourdomain.com/api/integrations/abacus/callback

import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.ABACUS_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: "abacus not configured" }, { status: 503 })
  }

  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: process.env.ABACUS_REDIRECT_URI ?? "",
    scope: "read write",
    state,
  })

  const url = `https://abaninja.ch/oauth/authorize?${params}`
  return NextResponse.redirect(url)
}
