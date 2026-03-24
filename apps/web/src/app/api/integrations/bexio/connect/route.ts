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
import { createHmac } from "crypto";

function signState(nonce: string, orgId: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  const hmac = createHmac("sha256", secret)
    .update(`${nonce}.${orgId}`)
    .digest("hex");
  return `${nonce}.${orgId}.${hmac}`;
}

export { signState };

export async function GET(req: NextRequest) {
  const clientId = process.env.BEXIO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "bexio nicht konfiguriert" }, { status: 503 });
  }

  const result = await getSessionAndOrg(req);
  if (result.error) return result.error;
  const { orgId } = result;

  // HMAC-signed state: "{nonce}.{orgId}.{hmac}" — verified in the callback
  const nonce = crypto.randomUUID();
  const state = signState(nonce, orgId);

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
