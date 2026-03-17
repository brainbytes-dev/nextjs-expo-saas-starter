// Required env vars:
//   BEXIO_CLIENT_ID      — OAuth client ID from bexio developer portal
//   BEXIO_CLIENT_SECRET  — OAuth client secret
//   BEXIO_REDIRECT_URI   — Must match redirect URI registered in bexio portal
//                          e.g. https://yourdomain.com/api/integrations/bexio/callback

import { NextResponse } from "next/server"

export async function GET() {
  const clientId = process.env.BEXIO_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: "bexio not configured" }, { status: 503 })
  }

  const state = crypto.randomUUID()

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: process.env.BEXIO_REDIRECT_URI ?? "",
    scope: "openid profile email article_edit stock_edit",
    state,
  })

  const url = `https://idp.bexio.com/auth/realms/bexio/protocol/openid-connect/auth?${params}`
  return NextResponse.redirect(url)
}
