"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import QRCode from "qrcode"
import { code128Svg } from "@/lib/code128"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconPrinter, IconDownload } from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type LabelSize = "small" | "medium" | "large"

export interface BarcodeLabelData {
  name: string
  number?: string | null
  /** Code128 barcode value */
  barcode?: string | null
  location?: string | null
  itemId: string
  itemType: "material" | "tool"
}

interface BarcodeLabelProps {
  data: BarcodeLabelData
  showSizeSelector?: boolean
  /** Override size from outside (e.g. batch context) */
  forcedSize?: LabelSize
  className?: string
  /** Only render the label preview, no controls */
  printOnly?: boolean
}

// ---------------------------------------------------------------------------
// Size config  (px at 96 dpi)
// ---------------------------------------------------------------------------
export const SIZE_CONFIG: Record<
  LabelSize,
  {
    label: string
    widthPx: number
    heightPx: number
    qrSize: number
    barcodeHeight: number
    barcodeModuleWidth: number
  }
> = {
  small:  { label: "Klein — 50×25 mm",  widthPx: 283, heightPx: 142, qrSize: 90,  barcodeHeight: 32, barcodeModuleWidth: 1   },
  medium: { label: "Mittel — 75×38 mm", widthPx: 425, heightPx: 215, qrSize: 130, barcodeHeight: 46, barcodeModuleWidth: 1.5 },
  large:  { label: "Gross — 100×50 mm", widthPx: 567, heightPx: 283, qrSize: 170, barcodeHeight: 58, barcodeModuleWidth: 2   },
}

const PADDING = 10

const SELF_SERVICE_BASE = "https://app.logistikapp.ch"

function itemUrl(data: BarcodeLabelData): string {
  const base = typeof window !== "undefined" ? window.location.origin : SELF_SERVICE_BASE
  // Use the public self-service URL when a barcode is present so anyone
  // who scans the QR code can interact without needing an account.
  if (data.barcode) {
    return `${base}/s/${encodeURIComponent(data.barcode)}`
  }
  // Fallback to the dashboard deep-link when no barcode is set
  const path =
    data.itemType === "material"
      ? `/dashboard/materials/${data.itemId}`
      : `/dashboard/tools/${data.itemId}`
  return `${base}${path}`
}

// ---------------------------------------------------------------------------
// Pure label preview — no buttons, suitable for batch contexts too
// ---------------------------------------------------------------------------
export function BarcodeLabelView({
  data,
  size = "medium",
}: {
  data: BarcodeLabelData
  size?: LabelSize
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { widthPx, heightPx, qrSize, barcodeHeight, barcodeModuleWidth } = SIZE_CONFIG[size]

  const url = itemUrl(data)
  const barcodeSvg = data.barcode
    ? code128Svg(data.barcode, barcodeHeight, barcodeModuleWidth)
    : null

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: qrSize,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(console.error)
  }, [url, qrSize])

  const textX = qrSize + PADDING * 2 + 4
  const availWidth = widthPx - textX - PADDING
  const nameFontSize = Math.max(10, Math.round(heightPx * 0.1))
  const metaFontSize = Math.max(7, Math.round(heightPx * 0.07))
  const bottomReserve = barcodeSvg ? barcodeHeight + 14 : PADDING

  return (
    <div
      className="barcode-label-view relative bg-white border border-border rounded overflow-hidden select-none"
      style={{ width: widthPx, height: heightPx, flexShrink: 0 }}
    >
      {/* QR code */}
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-center"
        style={{ width: qrSize + PADDING * 2 }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* Divider */}
      <div
        className="absolute bg-border"
        style={{ left: qrSize + PADDING * 2, top: 8, bottom: 8, width: 1 }}
      />

      {/* Text block */}
      <div
        className="absolute flex flex-col justify-center gap-0.5 overflow-hidden"
        style={{
          left: textX,
          right: PADDING,
          top: PADDING,
          bottom: bottomReserve,
        }}
      >
        {data.number && (
          <p
            className="font-mono text-muted-foreground leading-none truncate"
            style={{ fontSize: metaFontSize }}
          >
            {data.number}
          </p>
        )}
        <p
          className="font-bold text-foreground leading-tight"
          style={{ fontSize: nameFontSize, maxWidth: availWidth, overflowWrap: "break-word" }}
        >
          {data.name}
        </p>
        {data.location && (
          <p
            className="text-muted-foreground leading-none truncate"
            style={{ fontSize: metaFontSize }}
          >
            {data.location}
          </p>
        )}
      </div>

      {/* Code128 barcode */}
      {barcodeSvg && (
        <div
          className="absolute bottom-0 flex items-end overflow-hidden"
          style={{ left: textX, right: PADDING, height: barcodeHeight + 12 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`Barcode ${data.barcode}`}
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(barcodeSvg)}`}
            style={{ display: "block", maxWidth: availWidth, height: barcodeHeight }}
          />
          <span
            className="absolute bottom-1 left-0 font-mono text-muted-foreground"
            style={{ fontSize: 6 }}
          >
            {data.barcode}
          </span>
        </div>
      )}

      {/* Branding */}
      <span
        className="absolute bottom-1 right-1.5 font-mono text-muted-foreground/40 uppercase tracking-widest"
        style={{ fontSize: 5 }}
      >
        logistikapp
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Build self-contained HTML for printing a single label
// ---------------------------------------------------------------------------
function buildLabelHtml(
  data: BarcodeLabelData,
  size: LabelSize,
  qrDataUrl: string
): string {
  const { widthPx, heightPx, qrSize, barcodeHeight, barcodeModuleWidth } = SIZE_CONFIG[size]
  const textX = qrSize + PADDING * 2 + 4
  const availWidth = widthPx - textX - PADDING
  const nameFontSize = Math.max(10, Math.round(heightPx * 0.1))
  const metaFontSize = Math.max(7, Math.round(heightPx * 0.07))
  const bottomReserve = data.barcode ? barcodeHeight + 14 : PADDING

  const barcodeSvg = data.barcode
    ? code128Svg(data.barcode, barcodeHeight, barcodeModuleWidth)
    : null

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>Etikett — ${data.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${widthPx}px;height:${heightPx}px;background:white}
@media print{@page{size:${widthPx}px ${heightPx}px;margin:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.label{position:relative;width:${widthPx}px;height:${heightPx}px;background:white;border:1px solid #e5e7eb;overflow:hidden}
.qr{position:absolute;top:0;left:0;width:${qrSize + PADDING * 2}px;height:${heightPx}px;display:flex;align-items:center;justify-content:center}
.divider{position:absolute;top:8px;bottom:8px;left:${qrSize + PADDING * 2}px;width:1px;background:#e5e7eb}
.txt{position:absolute;left:${textX}px;right:${PADDING}px;top:${PADDING}px;bottom:${bottomReserve}px;display:flex;flex-direction:column;justify-content:center;gap:2px;overflow:hidden}
.num{font-family:monospace;font-size:${metaFontSize}px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nam{font-family:sans-serif;font-weight:700;font-size:${nameFontSize}px;color:#111827;line-height:1.2;word-wrap:break-word;max-width:${availWidth}px}
.loc{font-family:sans-serif;font-size:${metaFontSize}px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bc{position:absolute;bottom:0;left:${textX}px;right:${PADDING}px;height:${barcodeHeight + 12}px;display:flex;align-items:flex-end}
.bcv{position:absolute;bottom:2px;left:0;font-family:monospace;font-size:6px;color:#9ca3af}
.brand{position:absolute;bottom:2px;right:5px;font-family:monospace;font-size:5px;color:#d1d5db;letter-spacing:.15em;text-transform:uppercase}
</style>
</head>
<body>
<div class="label">
  <div class="qr"><img src="${qrDataUrl}" width="${qrSize}" height="${qrSize}" alt="QR"/></div>
  <div class="divider"></div>
  <div class="txt">
    ${data.number ? `<p class="num">${data.number}</p>` : ""}
    <p class="nam">${data.name}</p>
    ${data.location ? `<p class="loc">${data.location}</p>` : ""}
  </div>
  ${barcodeSvg ? `<div class="bc"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(barcodeSvg)}" style="display:block;max-width:${availWidth}px;height:${barcodeHeight}px" alt="Barcode"/><span class="bcv">${data.barcode}</span></div>` : ""}
  <span class="brand">logistikapp</span>
</div>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Full component with size selector + print/download controls
// ---------------------------------------------------------------------------
export function BarcodeLabel({
  data,
  showSizeSelector = true,
  forcedSize,
  className,
  printOnly = false,
}: BarcodeLabelProps) {
  // When forcedSize is provided it controls which size is used; otherwise use local state
  const [localSize, setLocalSize] = useState<LabelSize>("medium")
  const activeSize: LabelSize = forcedSize ?? localSize
  const [qrDataUrl, setQrDataUrl] = useState("")

  useEffect(() => {
    QRCode.toDataURL(itemUrl(data), {
      width: SIZE_CONFIG[activeSize].qrSize * 2,
      margin: 1,
    })
      .then(setQrDataUrl)
      .catch(console.error)
  }, [data, activeSize])

  const handlePrint = useCallback(() => {
    const { widthPx, heightPx } = SIZE_CONFIG[activeSize]
    const win = window.open("", "_blank", `width=${widthPx + 60},height=${heightPx + 100}`)
    if (!win) return
    win.document.write(buildLabelHtml(data, activeSize, qrDataUrl))
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 350)
  }, [data, activeSize, qrDataUrl])

  const handleDownload = useCallback(() => {
    const html = buildLabelHtml(data, activeSize, qrDataUrl)
    const blob = new Blob([html], { type: "text/html;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `etikett-${data.number ?? data.name}.html`
    a.click()
    URL.revokeObjectURL(url)
  }, [data, activeSize, qrDataUrl])

  if (printOnly) {
    return <BarcodeLabelView data={data} size={activeSize} />
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className ?? ""}`}>
      {showSizeSelector && !forcedSize && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">Etiketten-Grösse</span>
          <Select value={localSize} onValueChange={(v) => setLocalSize(v as LabelSize)}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(SIZE_CONFIG) as [LabelSize, (typeof SIZE_CONFIG)[LabelSize]][]).map(
                ([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      <BarcodeLabelView data={data} size={activeSize} />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs h-8"
          onClick={handleDownload}
          disabled={!qrDataUrl}
        >
          <IconDownload className="size-3.5" />
          HTML
        </Button>
        <Button
          size="sm"
          variant="default"
          className="gap-1.5 text-xs h-8"
          onClick={handlePrint}
          disabled={!qrDataUrl}
        >
          <IconPrinter className="size-3.5" />
          Etikett drucken
        </Button>
      </div>
    </div>
  )
}
