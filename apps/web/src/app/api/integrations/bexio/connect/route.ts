// bexio OAuth 2.0 — initiates the authorization code flow.
//
// Required env vars:
//   BEXIO_CLIENT_ID      — OAuth client ID from bexio developer portal
//   BEXIO_CLIENT_SECRET  — OAuth client secret
//   BEXIO_REDIRECT_URI   — Must match redirect URI registered in bexio portal
//                          e.g. https://yourdomain.com/api/integrations/bexio/callback
//
// The orgId is round-tripped through the OAuth `state` parameter so the
// callback knows which organization to associate the token with.

import { NextRequest, NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";

export async function GET(req: NextRequest) {
  const clientId = process.env.BEXIO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "bexio nicht konfiguriert" }, { status: 503 });
  }

  const result = await getSessionAndOrg(req);
  if (result.error) return result.error;
  const { orgId } = result;

  // Encode orgId into the state param so the callback can retrieve it.
  // A random nonce is prepended to prevent CSRF.
  const state = `${crypto.randomUUID()}.${orgId}`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: process.env.BEXIO_REDIRECT_URI ?? "",
    scope: "openid profile email article_edit stock_edit",
    state,
  });

  const url = `https://idp.bexio.com/auth/realms/bexio/protocol/openid-connect/auth?${params}`;
  return NextResponse.redirect(url);
}
