import { type LabelData, type LabelSize, generateZpl } from "./zpl"

/**
 * Generate ZPL for a batch of labels with page breaks.
 * Each label is a separate ZPL document (^XA...^XZ), which
 * Zebra printers interpret as separate labels automatically.
 */
export function generateBatchZPL(
  items: LabelData[],
  size: LabelSize = "small"
): string {
  return items.map((item) => generateZpl(item, size)).join("\n")
}

/**
 * Count estimate: approximately 2 seconds per label on a standard Zebra printer.
 */
export function estimatePrintTime(count: number): string {
  const seconds = count * 2
  if (seconds < 60) return `~${seconds} Sekunden`
  const minutes = Math.ceil(seconds / 60)
  return `~${minutes} Minute${minutes > 1 ? "n" : ""}`
}

/**
 * Build a self-contained HTML document with multiple label previews
 * for browser-based batch printing (window.print).
 */
export function buildBatchPrintHtml(
  labels: Array<{
    name: string
    number?: string | null
    barcode?: string | null
    type: string
  }>
): string {
  const labelCards = labels
    .map(
      (l, i) => `
    <div class="label" style="page-break-inside:avoid;border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:12px;display:flex;align-items:center;gap:12px">
      <div style="font-size:12px;color:#999;min-width:24px">${i + 1}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:14px">${escapeHtml(l.name)}</div>
        ${l.number ? `<div style="font-family:monospace;font-size:11px;color:#666">${escapeHtml(l.number)}</div>` : ""}
        ${l.barcode ? `<div style="font-family:monospace;font-size:10px;color:#999">${escapeHtml(l.barcode)}</div>` : ""}
      </div>
      <div style="font-size:10px;color:#aaa;text-transform:uppercase">${escapeHtml(l.type)}</div>
    </div>`
    )
    .join("\n")

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>Massendruck — ${labels.length} Etiketten</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,-apple-system,sans-serif;padding:24px;max-width:800px;margin:0 auto}
  @media print{
    @page{margin:10mm}
    body{padding:0}
    .no-print{display:none!important}
  }
  h1{font-size:18px;margin-bottom:16px}
</style>
</head>
<body>
  <h1 class="no-print">Massendruck — ${labels.length} Etiketten</h1>
  ${labelCards}
  <script>window.onload=()=>window.print()</script>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
