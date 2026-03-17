"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { IconX } from "@tabler/icons-react"

interface QrScannerProps {
  onScan: (value: string) => void
  onClose: () => void
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [error, setError] = useState<string>("")
  const scannerRef = useRef<any>(null)
  const divId = "qr-reader"

  useEffect(() => {
    let scanner: any = null

    async function startScanner() {
      const { Html5QrcodeScanner } = await import("html5-qrcode")
      scanner = new Html5QrcodeScanner(
        divId,
        { fps: 10, qrbox: { width: 220, height: 220 }, rememberLastUsedCamera: true },
        false
      )
      scannerRef.current = scanner
      scanner.render(
        (decoded: string) => {
          scanner.clear().catch(() => {})
          onScan(decoded)
        },
        (_err: string) => {
          // Ignore frequent scan errors (normal for no QR in frame)
        }
      )
    }

    startScanner().catch((e: Error) => setError("Kamera nicht verfügbar: " + e.message))

    return () => {
      scannerRef.current?.clear().catch(() => {})
    }
  }, [onScan])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-mono text-muted-foreground">QR-Code in Kamera halten</p>
        <Button size="icon" variant="ghost" className="size-7" onClick={onClose}>
          <IconX className="size-4" />
        </Button>
      </div>
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive font-mono">
          {error}
        </div>
      ) : (
        <div id={divId} className="rounded-lg overflow-hidden" />
      )}
    </div>
  )
}
