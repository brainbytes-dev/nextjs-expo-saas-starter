"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import QRCode from "qrcode"
import { code128Svg } from "@/lib/code128"
import { BarcodeLabelView, SIZE_CONFIG, type LabelSize, type BarcodeLabelData } from "@/components/barcode-label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  IconArrowLeft,
  IconSearch,
  IconPrinter,
  IconTag,
} from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// Types (minimal — only what we need from the list API)
// ---------------------------------------------------------------------------
interface MaterialRow {
  id: string
  number: string | null
  name: string
  barcode: string | null
  mainLocation: { id: string; name: string } | null
}

interface MaterialsResponse {
  data: MaterialRow[]
  total: number
}

// ---------------------------------------------------------------------------
// Build a self-contained HTML page for batch printing
// ---------------------------------------------------------------------------
async function buildBatchPrintHtml(
  items: BarcodeLabelData[],
  size: LabelSize
): Promise<string> {
  const { widthPx, heightPx, qrSize, barcodeHeight, barcodeModuleWidth } = SIZE_CONFIG[size]

  const PADDING = 10
  const textX = qrSize + PADDING * 2 + 4
  const availWidth = widthPx - textX - PADDING
  const nameFontSize = Math.max(10, Math.round(heightPx * 0.1))
  const metaFontSize = Math.max(7, Math.round(heightPx * 0.07))

  // Resolve all QR data URLs in parallel
  const qrDataUrls = await Promise.all(
    items.map((item) => {
      const url = `${window.location.origin}/dashboard/materials/${item.itemId}`
      return QRCode.toDataURL(url, { width: qrSize * 2, margin: 1 })
    })
  )

  const labelHtmls = items.map((item, i) => {
    const bottomReserve = item.barcode ? barcodeHeight + 14 : PADDING
    const barcodeSvg = item.barcode
      ? code128Svg(item.barcode, barcodeHeight, barcodeModuleWidth)
      : null

    return `<div class="label">
  <div class="qr"><img src="${qrDataUrls[i]}" width="${qrSize}" height="${qrSize}" alt="QR"/></div>
  <div class="divider"></div>
  <div class="txt" style="bottom:${bottomReserve}px">
    ${item.number ? `<p class="num">${item.number}</p>` : ""}
    <p class="nam">${item.name}</p>
    ${item.location ? `<p class="loc">${item.location}</p>` : ""}
  </div>
  ${barcodeSvg ? `<div class="bc"><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(barcodeSvg)}" style="display:block;max-width:${availWidth}px;height:${barcodeHeight}px" alt="Barcode"/><span class="bcv">${item.barcode}</span></div>` : ""}
  <span class="brand">logistikapp</span>
</div>`
  })

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8"/>
<title>Etiketten — Materialien</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:white;font-family:sans-serif}
@media screen{body{padding:20px;display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-start}}
@media print{
  @page{size:auto;margin:4mm}
  body{display:flex;flex-wrap:wrap;gap:4mm;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
.label{position:relative;width:${widthPx}px;height:${heightPx}px;background:white;border:1px solid #e5e7eb;overflow:hidden;flex-shrink:0}
.qr{position:absolute;top:0;left:0;width:${qrSize + PADDING * 2}px;height:${heightPx}px;display:flex;align-items:center;justify-content:center}
.divider{position:absolute;top:8px;bottom:8px;left:${qrSize + PADDING * 2}px;width:1px;background:#e5e7eb}
.txt{position:absolute;left:${textX}px;right:${PADDING}px;top:${PADDING}px;display:flex;flex-direction:column;justify-content:center;gap:2px;overflow:hidden}
.num{font-family:monospace;font-size:${metaFontSize}px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nam{font-weight:700;font-size:${nameFontSize}px;color:#111827;line-height:1.2;word-wrap:break-word;max-width:${availWidth}px}
.loc{font-size:${metaFontSize}px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bc{position:absolute;bottom:0;left:${textX}px;right:${PADDING}px;height:${barcodeHeight + 12}px;display:flex;align-items:flex-end}
.bcv{position:absolute;bottom:2px;left:0;font-family:monospace;font-size:6px;color:#9ca3af}
.brand{position:absolute;bottom:2px;right:5px;font-family:monospace;font-size:5px;color:#d1d5db;letter-spacing:.15em;text-transform:uppercase}
</style>
</head>
<body>
${labelHtmls.join("\n")}
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MaterialLabelsPage() {
  const router = useRouter()
  const [materials, setMaterials] = useState<MaterialRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [size, setSize] = useState<LabelSize>("medium")
  const [printing, setPrinting] = useState(false)

  const LIMIT = 50

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  // Fetch
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
    if (debouncedSearch) params.set("search", debouncedSearch)
    fetch(`/api/materials?${params}`)
      .then((r) => r.ok ? r.json() : { data: [], total: 0 })
      .then((json: MaterialsResponse) => {
        setMaterials(json.data ?? [])
        setTotal(json.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  // Selected material rows
  const selectedRows = useMemo(
    () => materials.filter((m) => selected.has(m.id)),
    [materials, selected]
  )

  // All-on-page toggle
  const allPageSelected =
    materials.length > 0 && materials.every((m) => selected.has(m.id))
  const somePageSelected =
    materials.some((m) => selected.has(m.id)) && !allPageSelected

  function toggleAll() {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        materials.forEach((m) => next.delete(m.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        materials.forEach((m) => next.add(m.id))
        return next
      })
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toBarcodeLabelData = useCallback(
    (m: MaterialRow): BarcodeLabelData => ({
      name: m.name,
      number: m.number,
      barcode: m.barcode,
      location: m.mainLocation?.name,
      itemId: m.id,
      itemType: "material",
    }),
    []
  )

  async function handlePrintAll() {
    const toPrint = selected.size === 0 ? materials : selectedRows
    if (toPrint.length === 0) return
    setPrinting(true)
    try {
      const html = await buildBatchPrintHtml(toPrint.map(toBarcodeLabelData), size)
      const win = window.open("", "_blank")
      if (!win) return
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 400)
    } finally {
      setPrinting(false)
    }
  }

  const previewItems = useMemo(() => {
    const rows = selected.size > 0 ? selectedRows : materials.slice(0, 6)
    return rows.slice(0, 12).map(toBarcodeLabelData)
  }, [selected, selectedRows, materials, toBarcodeLabelData])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/materials")}>
            <IconArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <IconTag className="size-5 text-muted-foreground" />
              Etiketten drucken
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Materialien auswählen und Etiketten mit Barcode und QR-Code drucken
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={size} onValueChange={(v) => setSize(v as LabelSize)}>
            <SelectTrigger className="h-8 w-44 text-xs">
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
          <Button
            onClick={handlePrintAll}
            disabled={printing || (loading && materials.length === 0)}
            className="gap-1.5"
          >
            <IconPrinter className="size-4" />
            {printing
              ? "Vorbereitung…"
              : selected.size > 0
              ? `${selected.size} drucken`
              : "Alle drucken"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* ── Left: selection list ────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Material suchen…"
              className="pl-9"
            />
          </div>

          {/* Selection hint */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                onCheckedChange={toggleAll}
              />
              Alle auf dieser Seite
            </label>
            {selected.size > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selected.size} ausgewählt
              </Badge>
            )}
          </div>

          {/* Material list */}
          <div className="rounded-lg border bg-card overflow-hidden">
            {loading ? (
              <div className="space-y-0 divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="size-4 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : materials.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Keine Materialien gefunden
              </div>
            ) : (
              <div className="divide-y max-h-[540px] overflow-y-auto">
                {materials.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <Checkbox
                      checked={selected.has(m.id)}
                      onCheckedChange={() => toggle(m.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {[m.number, m.mainLocation?.name].filter(Boolean).join(" · ") || "\u2014"}
                      </p>
                      {m.barcode && (
                        <p className="text-xs text-muted-foreground font-mono">
                          BC: {m.barcode}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && total > LIMIT && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} von {total}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Zurück
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Weiter
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: preview grid ──────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Vorschau
              {selected.size > 0
                ? ` (${Math.min(selected.size, 12)} von ${selected.size} ausgewählt)`
                : " (erste 6 Materialien)"}
            </h2>
          </div>

          {previewItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-sm text-muted-foreground">
              <IconTag className="size-8 mb-3 text-muted-foreground/40" />
              Materialien auswählen um Vorschau zu sehen
            </div>
          ) : (
            <div
              className="flex flex-wrap gap-3 overflow-auto rounded-lg border bg-muted/20 p-4"
              style={{ maxHeight: 640 }}
            >
              {previewItems.map((item) => (
                <BarcodeLabelView key={item.itemId} data={item} size={size} />
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Die Etiketten werden in einem neuen Fenster geöffnet und können direkt gedruckt werden.
            Für beste Ergebnisse: Papierformat auf Etikettengrösse einstellen, Ränder auf 0 setzen.
          </p>
        </div>
      </div>
    </div>
  )
}
