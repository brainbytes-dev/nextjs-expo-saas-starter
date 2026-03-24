// Abacus / AbaNinja OAuth 2.0 callback — exchanges authorization code for
// tokens and persists them in the integration_tokens table.

import { NextRequest, NextResponse } from "next/server";
import { storeAbacusToken } from "@/lib/integrations/abacus";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { createHmac, timingSafeEqual } from "crypto";

function verifyAbacusState(state: string): { valid: boolean; orgId: string } {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return { valid: false, orgId: "" };

  // State format: "{nonce}.{orgId}.{hmac}"
  const lastDot = state.lastIndexOf(".");
  if (lastDot === -1) return { valid: false, orgId: "" };

  const payload = state.slice(0, lastDot);
  const receivedHmac = state.slice(lastDot + 1);

  const firstDot = payload.indexOf(".");
  if (firstDot === -1) return { valid: false, orgId: "" };

  const orgId = payload.slice(firstDot + 1);
  if (!orgId) return { valid: false, orgId: "" };

  const expectedHmac = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    const a = Buffer.from(expectedHmac, "hex");
    const b = Buffer.from(receivedHmac, "hex");
    if (a.length !== b.length) return { valid: false, orgId: "" };
    return { valid: timingSafeEqual(a, b), orgId };
  } catch {
    return { valid: false, orgId: "" };
  }
}

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

  // Verify user is authenticated
  const sessionResult = await getSessionAndOrg(req);
  if (sessionResult.error) {
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=unauthorized`, req.url)
    );
  }

  // Verify HMAC signature on state parameter
  const { valid, orgId } = verifyAbacusState(state);

  if (!valid || !orgId) {
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=invalid_state`, req.url)
    );
  }

  // Verify the authenticated user belongs to the org in the state
  if (sessionResult.orgId !== orgId) {
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=forbidden`, req.url)
    );
  }

  const baseUrl =
    (process.env.ABACUS_BASE_URL ?? "https://abaninja.ch").replace(/\/$/, "");

  const tokenRes = await fetch(`${baseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ABACUS_CLIENT_ID ?? "",
      client_secret: process.env.ABACUS_CLIENT_SECRET ?? "",
      redirect_uri: process.env.ABACUS_REDIRECT_URI ?? "",
      code,
    }),
  });

  if (!tokenRes.ok) {
    console.error(
      "Abacus token exchange failed:",
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
    // Store the base URL in metadata so self-hosted installations work
    const customBase =
      process.env.ABACUS_BASE_URL !== "https://abaninja.ch"
        ? process.env.ABACUS_BASE_URL
        : undefined;
    await storeAbacusToken(orgId, token, customBase);
  } catch (err) {
    console.error("Failed to store Abacus token:", err);
    return NextResponse.redirect(
      new URL(`${redirectBase}?error=db_error`, req.url)
    );
  }

  return NextResponse.redirect(
    new URL(`${redirectBase}?connected=abacus`, req.url)
  );
}
