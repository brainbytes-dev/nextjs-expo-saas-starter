// Removes the stored Abacus token from the DB, disconnecting the integration.

import { NextRequest, NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { deleteAbacusToken } from "@/lib/integrations/abacus";

export async function POST(req: NextRequest) {
  const result = await getSessionAndOrg(req);
  if (result.error) return result.error;
  const { orgId } = result;

  await deleteAbacusToken(orgId);
  return NextResponse.json({ ok: true });
}
