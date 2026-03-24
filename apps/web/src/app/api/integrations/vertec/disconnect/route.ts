// Removes the stored Vertec config cookie, effectively disconnecting the integration.

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.delete("vertec_config")
  return NextResponse.json({ ok: true })
}
