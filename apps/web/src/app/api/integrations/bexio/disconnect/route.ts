// Removes the stored bexio OAuth token, effectively disconnecting the integration.

import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("bexio_token")
  return NextResponse.json({ ok: true })
}
