// Handles the OAuth 2.0 authorization code callback from bexio.
// Exchanges the authorization code for an access token and stores it in an
// httpOnly cookie so subsequent API calls can use it server-side.

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard/settings/integrations?error=cancelled", req.url)
    )
  }

  const tokenRes = await fetch(
    "https://idp.bexio.com/auth/realms/bexio/protocol/openid-connect/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.BEXIO_CLIENT_ID ?? "",
        client_secret: process.env.BEXIO_CLIENT_SECRET ?? "",
        redirect_uri: process.env.BEXIO_REDIRECT_URI ?? "",
        code,
      }),
    }
  )

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/settings/integrations?error=token_failed", req.url)
    )
  }

  const token = await tokenRes.json()

  const cookieStore = await cookies()
  cookieStore.set("bexio_token", JSON.stringify(token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: token.expires_in ?? 3600,
    path: "/",
    sameSite: "lax",
  })

  return NextResponse.redirect(
    new URL("/dashboard/settings/integrations?connected=true", req.url)
  )
}
