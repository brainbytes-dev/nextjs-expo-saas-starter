// Removes the stored Abacus OAuth token, effectively disconnecting the integration.

import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("abacus_token")
  return NextResponse.json({ ok: true })
}
