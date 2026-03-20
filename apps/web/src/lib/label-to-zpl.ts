import type { LabelElement, LabelTemplate, DataBinding } from "./label-designer-types"

/**
 * Convert mm to ZPL dots (203 DPI = 8 dots/mm)
 */
function mmToDots(mm: number): number {
  return Math.round(mm * 8)
}

/**
 * Convert pt font size to ZPL font height in dots
 */
function ptToDots(pt: number): number {
  return Math.round(pt * 203 / 72)
}

/**
 * Convert a label template to ZPL-II code for Zebra printers.
 */
export function labelToZpl(
  template: LabelTemplate,
  data?: Record<DataBinding, string>
): string {
  const lines: string[] = []

  // Label start
  lines.push("^XA")

  // Label size (width x height in dots)
  lines.push(`^PW${mmToDots(template.width)}`)
  lines.push(`^LL${mmToDots(template.height)}`)

  // Set media darkness
  lines.push("^MD10")

  for (const el of template.elements) {
    const x = mmToDots(el.x)
    const y = mmToDots(el.y)
    const w = mmToDots(el.width)
    const h = mmToDots(el.height)
    const content = resolveContent(el, data)

    switch (el.type) {
      case "text": {
        const fontH = ptToDots(el.fontSize ?? 12)
        const fontW = Math.round(fontH * 0.6)
        // Position
        lines.push(`^FO${x},${y}`)
        // Font: use default scalable font 0
        lines.push(`^A0N,${fontH},${fontW}`)
        // Field block for alignment
        const justification = el.textAlign === "center" ? "C" : el.textAlign === "right" ? "R" : "L"
        lines.push(`^FB${w},1,0,${justification}`)
        // Field data
        lines.push(`^FD${escapeZpl(content)}^FS`)
        break
      }

      case "barcode": {
        lines.push(`^FO${x},${y}`)
        if (el.barcodeFormat === "ean13") {
          lines.push(`^BE,${h},Y,N`)
        } else if (el.barcodeFormat === "code39") {
          lines.push(`^B3N,N,${h},Y,N`)
        } else {
          // Code 128 (default)
          lines.push(`^BCN,${h},Y,N,N`)
        }
        lines.push(`^FD${escapeZpl(content)}^FS`)
        break
      }

      case "qrcode": {
        lines.push(`^FO${x},${y}`)
        // QR code: model 2, magnification auto-calculated from height
        const mag = Math.max(1, Math.min(10, Math.round(h / 20)))
        lines.push(`^BQN,2,${mag}`)
        lines.push(`^FDMA,${escapeZpl(content)}^FS`)
        break
      }

      case "line": {
        const sw = el.strokeWidth ?? 1
        lines.push(`^FO${x},${y}`)
        lines.push(`^GB${w},${mmToDots(sw)},${mmToDots(sw)}^FS`)
        break
      }

      case "rectangle": {
        const sw2 = el.strokeWidth ?? 1
        lines.push(`^FO${x},${y}`)
        lines.push(`^GB${w},${h},${mmToDots(sw2)}^FS`)
        break
      }

      case "image": {
        // ZPL image embedding requires bitmap conversion — add placeholder
        lines.push(`^FO${x},${y}`)
        lines.push(`^A0N,20,16`)
        lines.push(`^FD[Bild]^FS`)
        break
      }
    }
  }

  // Label end
  lines.push("^XZ")

  return lines.join("\n")
}

function resolveContent(
  el: LabelElement,
  data?: Record<DataBinding, string>
): string {
  if (el.dataBinding && el.dataBinding !== "custom_text" && data) {
    return data[el.dataBinding] ?? el.content ?? ""
  }
  return el.content ?? ""
}

function escapeZpl(text: string): string {
  // ZPL uses ~ as escape prefix and ^ as command prefix
  return text.replace(/\\/g, "\\\\").replace(/\^/g, "\\^").replace(/~/g, "\\~")
}

/**
 * Generate a PNG data URL preview of the label using Canvas API.
 * This is meant for client-side use only.
 */
export function renderLabelToCanvas(
  canvas: HTMLCanvasElement,
  template: LabelTemplate,
  data: Record<DataBinding, string>,
  scale: number = 3 // 3px per mm
): void {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const w = template.width * scale
  const h = template.height * scale

  canvas.width = w
  canvas.height = h

  // White background
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, w, h)

  // Border
  ctx.strokeStyle = "#d1d5db"
  ctx.lineWidth = 1
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1)

  for (const el of template.elements) {
    const ex = el.x * scale
    const ey = el.y * scale
    const ew = el.width * scale
    const eh = el.height * scale
    const content = resolveContent(el, data)

    ctx.save()

    switch (el.type) {
      case "text": {
        const fontSize = (el.fontSize ?? 12) * scale * 0.35
        ctx.font = `${el.fontWeight === "bold" ? "bold " : ""}${fontSize}px sans-serif`
        ctx.fillStyle = "#000000"
        ctx.textBaseline = "top"

        if (el.textAlign === "center") {
          ctx.textAlign = "center"
          ctx.fillText(content, ex + ew / 2, ey, ew)
        } else if (el.textAlign === "right") {
          ctx.textAlign = "right"
          ctx.fillText(content, ex + ew, ey, ew)
        } else {
          ctx.textAlign = "left"
          ctx.fillText(content, ex, ey, ew)
        }
        break
      }

      case "barcode": {
        // Simplified barcode rendering (vertical lines)
        ctx.fillStyle = "#000000"
        const barWidth = Math.max(1, ew / (content.length * 6))
        let bx = ex
        for (let i = 0; i < content.length * 6; i++) {
          if (i % 2 === 0) {
            ctx.fillRect(bx, ey, barWidth, eh * 0.75)
          }
          bx += barWidth
        }
        // Text below
        const bFontSize = Math.max(6, eh * 0.15)
        ctx.font = `${bFontSize}px monospace`
        ctx.textAlign = "center"
        ctx.textBaseline = "top"
        ctx.fillText(content, ex + ew / 2, ey + eh * 0.78, ew)
        break
      }

      case "qrcode": {
        // Simplified QR placeholder
        ctx.fillStyle = "#000000"
        const cellSize = Math.min(ew, eh) / 21
        for (let row = 0; row < 21; row++) {
          for (let col = 0; col < 21; col++) {
            // Simple pattern for preview
            const isCorner =
              (row < 7 && col < 7) ||
              (row < 7 && col > 13) ||
              (row > 13 && col < 7)
            const isBorder =
              isCorner &&
              (row === 0 || row === 6 || col === 0 || col === 6 ||
               (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
               row === (row < 7 ? 0 : 20) || col === (col < 7 ? 0 : 20))
            const isData = !isCorner && ((row + col) % 3 === 0 || (row * col) % 2 === 0)

            if (isBorder || isData) {
              ctx.fillRect(
                ex + col * cellSize,
                ey + row * cellSize,
                cellSize,
                cellSize
              )
            }
          }
        }
        break
      }

      case "line": {
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = (el.strokeWidth ?? 1) * scale * 0.3
        ctx.beginPath()
        ctx.moveTo(ex, ey)
        ctx.lineTo(ex + ew, ey)
        ctx.stroke()
        break
      }

      case "rectangle": {
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = (el.strokeWidth ?? 1) * scale * 0.3
        ctx.strokeRect(ex, ey, ew, eh)
        break
      }

      case "image": {
        ctx.fillStyle = "#f3f4f6"
        ctx.fillRect(ex, ey, ew, eh)
        ctx.strokeStyle = "#9ca3af"
        ctx.lineWidth = 1
        ctx.strokeRect(ex, ey, ew, eh)
        ctx.fillStyle = "#6b7280"
        ctx.font = `${8 * scale * 0.35}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("Bild", ex + ew / 2, ey + eh / 2)
        break
      }
    }

    ctx.restore()
  }
}
