// Abacus / AbaNinja OAuth 2.0 — initiates the authorization code flow.
//
// Required env vars:
//   ABACUS_CLIENT_ID      — OAuth client ID from AbaNinja developer portal
//   ABACUS_CLIENT_SECRET  — OAuth client secret
//   ABACUS_REDIRECT_URI   — Must match redirect URI registered in the portal
//                           e.g. https://yourdomain.com/api/integrations/abacus/callback
//   ABACUS_BASE_URL       — Optional. Defaults to https://abaninja.ch for cloud.
//                           Set to self-hosted URL for on-premise Abacus.
//
// The orgId is round-tripped through the OAuth `state` parameter.

import { NextRequest, NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";

export async function GET(req: NextRequest) {
  const clientId = process.env.ABACUS_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Abacus nicht konfiguriert" }, { status: 503 });
  }

  const result = await getSessionAndOrg(req);
  if (result.error) return result.error;
  const { orgId } = result;

  const baseUrl =
    (process.env.ABACUS_BASE_URL ?? "https://abaninja.ch").replace(/\/$/, "");

  const state = `${crypto.randomUUID()}.${orgId}`;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: process.env.ABACUS_REDIRECT_URI ?? "",
    scope: "read write",
    state,
  });

  return NextResponse.redirect(`${baseUrl}/oauth/authorize?${params}`);
}
