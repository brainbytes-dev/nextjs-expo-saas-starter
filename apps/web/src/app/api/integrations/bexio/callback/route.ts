// bexio OAuth 2.0 callback — exchanges authorization code for tokens
// and persists them in the integration_tokens table.

import { NextRequest, NextResponse } from "next/server";
import { storeBexioToken } from "@/lib/integrations/bexio";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? "";
  const errorParam = searchParams.get("error");

  const redirectBase = "/dashboard/settings/integrations";

  if (errorParam || !code) {
    const reason = errorParam === "access_denied" ? "cancelled" : "token_failed";
    return NextResponse.redirect(new URL(`${redirectBase}?error=${reason}`, req.url));
  }

  // Extract orgId from state: "<nonce>.<orgId>"
  const dotIdx = state.indexOf(".");
  const orgId = dotIdx !== -1 ? state.slice(dotIdx + 1) : "";

  if (!orgId) {
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=invalid_state`, req.url)
    );
  }

  // Exchange code for tokens
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
  );

  if (!tokenRes.ok) {
    console.error(
      "bexio token exchange failed:",
      tokenRes.status,
      await tokenRes.text().catch(() => "")
    );
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=token_failed`, req.url)
    );
  }

  const token = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  try {
    await storeBexioToken(orgId, token);
  } catch (err) {
    console.error("Failed to store bexio token:", err);
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=db_error`, req.url)
    );
  }

  return NextResponse.redirect(
    new URL(`${redirectBase}?connected=bexio`, req.url)
  );
}
