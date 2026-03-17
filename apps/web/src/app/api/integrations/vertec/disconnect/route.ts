// Removes the stored Vertec config cookie, effectively disconnecting the integration.

import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("vertec_config")
  return NextResponse.json({ ok: true })
}
