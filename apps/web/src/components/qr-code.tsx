"use client"

import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Button } from "@/components/ui/button"
import { IconDownload, IconPrinter } from "@tabler/icons-react"

interface QrCodeProps {
  value: string
  label?: string
  size?: number
  className?: string
}

export function QrCodeDisplay({ value, label, size = 180, className }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dataUrl, setDataUrl] = useState<string>("")

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    }).catch(console.error)

    QRCode.toDataURL(value, { width: size, margin: 2 })
      .then(setDataUrl)
      .catch(console.error)
  }, [value, size])

  function handleDownload() {
    if (!dataUrl) return
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `qr-${label ?? "code"}.png`
    a.click()
  }

  function handlePrint() {
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`
      <html><head><title>QR Code — ${label ?? ""}</title>
      <style>
        body { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; font-family:monospace; gap:12px; }
        img { border: 1px solid #eee; padding: 16px; }
        p { font-size: 12px; color: #555; letter-spacing: 0.1em; text-transform: uppercase; }
      </style></head>
      <body>
        <img src="${dataUrl}" width="${size}" />
        <p>${label ?? ""}</p>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <div className="rounded-lg border border-border bg-white p-3 shadow-sm">
        <canvas ref={canvasRef} />
      </div>
      {label && (
        <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-muted-foreground text-center max-w-[180px]">
          {label}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={handleDownload}>
          <IconDownload className="size-3" /> PNG
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" onClick={handlePrint}>
          <IconPrinter className="size-3" /> Label drucken
        </Button>
      </div>
    </div>
  )
}
