/**
 * ZPL (Zebra Programming Language) label generator
 * Standard label sizes: 2"×1" (50×25mm) and 4"×2" (100×50mm)
 */

export interface LabelData {
  name: string
  number?: string | null
  qrValue: string       // URL to encode in QR
  location?: string | null
  extra?: string | null // e.g. expiry date or condition
}

export type LabelSize = "small" | "large"

/**
 * Generate ZPL for a 2"×1" (50×25mm) label at 203 DPI
 * Layout: QR code left, name + number right
 */
export function generateZpl(data: LabelData, size: LabelSize = "small"): string {
  const { name, number, qrValue, location, extra } = data

  if (size === "large") {
    // 4"×2" label (100×50mm) at 203dpi = 812×406 dots
    return [
      "^XA",
      "^CI28",                                    // UTF-8 encoding
      "^PW812",                                   // label width
      "^LL406",                                   // label length
      // QR code — left side
      `^FO20,20^BQN,2,7^FDQA,${qrValue}^FS`,    // QR code, magnification 7
      // Name — top right
      `^FO240,20^A0N,32,32^FD${name.substring(0, 30)}^FS`,
      // Number
      number ? `^FO240,65^A0N,24,24^FD${number}^FS` : "",
      // Location
      location ? `^FO240,100^A0N,20,20^FD${location.substring(0, 25)}^FS` : "",
      // Extra info
      extra ? `^FO240,130^A0N,18,18^FD${extra.substring(0, 30)}^FS` : "",
      // Separator line
      "^FO240,165^GB570,2,2^FS",
      // LogistikApp branding
      "^FO240,175^A0N,16,16^FDlogistikapp.ch^FS",
      "^XZ",
    ].filter(Boolean).join("\n")
  }

  // 2"×1" label (50×25mm) at 203dpi = 406×203 dots
  return [
    "^XA",
    "^CI28",
    "^PW406",
    "^LL203",
    // QR code — left
    `^FO10,10^BQN,2,4^FDQA,${qrValue}^FS`,     // QR magnification 4
    // Name
    `^FO130,10^A0N,22,22^FD${name.substring(0, 16)}^FS`,
    // Number
    number ? `^FO130,42^A0N,18,18^FD${number}^FS` : "",
    // Location
    location ? `^FO130,68^A0N,16,16^FD${location.substring(0, 16)}^FS` : "",
    // Separator + branding
    "^FO130,98^GB276,2,2^FS",
    "^FO130,108^A0N,14,14^FDlogistikapp.ch^FS",
    "^XZ",
  ].filter(Boolean).join("\n")
}

/** Download ZPL as a file — user sends to printer manually */
export function downloadZpl(zpl: string, filename: string) {
  const blob = new Blob([zpl], { type: "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename + ".zpl"; a.click()
  URL.revokeObjectURL(url)
}

/** Send ZPL directly to a networked Zebra printer via raw TCP/HTTP proxy
 *  Requires the user to enter their printer IP in settings
 *  The printer must be on the same network and have port 9100 open
 */
export async function printToNetwork(zpl: string, printerIp: string): Promise<{ ok: boolean; error?: string }> {
  try {
    // We route through our own API to avoid CORS
    const res = await fetch("/api/integrations/zebra/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zpl, printerIp }),
    })
    if (res.ok) return { ok: true }
    const d = await res.json()
    return { ok: false, error: d.error ?? "Druckfehler" }
  } catch {
    return { ok: false, error: "Netzwerkfehler" }
  }
}

/** Generate ZPL for multiple labels (e.g. bulk print from list) */
export function generateBulkZpl(labels: LabelData[], size: LabelSize = "small"): string {
  return labels.map(l => generateZpl(l, size)).join("\n")
}
