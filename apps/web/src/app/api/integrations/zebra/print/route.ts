import { NextRequest, NextResponse } from "next/server"
import * as net from "net"

export async function POST(req: NextRequest) {
  const { zpl, printerIp } = await req.json()

  if (!zpl || !printerIp) {
    return NextResponse.json({ error: "zpl und printerIp erforderlich" }, { status: 400 })
  }

  // Validate IP format (basic)
  if (!/^[\d.]+$/.test(printerIp.replace(/:\d+$/, ""))) {
    return NextResponse.json({ error: "Ungültige IP-Adresse" }, { status: 400 })
  }

  const [host, portStr] = printerIp.split(":")
  const port = parseInt(portStr ?? "9100", 10)

  return new Promise<NextResponse>(resolve => {
    const socket = new net.Socket()
    const timeout = setTimeout(() => {
      socket.destroy()
      resolve(NextResponse.json({ error: "Drucker nicht erreichbar (Timeout)" }, { status: 503 }))
    }, 5000)

    socket.connect(port, host, () => {
      socket.write(zpl, "utf8", () => {
        socket.end()
        clearTimeout(timeout)
        resolve(NextResponse.json({ ok: true }))
      })
    })

    socket.on("error", (err) => {
      clearTimeout(timeout)
      resolve(NextResponse.json({ error: `Verbindungsfehler: ${err.message}` }, { status: 503 }))
    })
  })
}
