// Removes the stored bexio token from the DB, disconnecting the integration.

import { NextRequest, NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { deleteBexioToken } from "@/lib/integrations/bexio";

export async function POST(req: NextRequest) {
  const result = await getSessionAndOrg(req);
  if (result.error) return result.error;
  const { orgId } = result;

  await deleteBexioToken(orgId);
  return NextResponse.json({ ok: true });
}
