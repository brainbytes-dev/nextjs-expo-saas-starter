"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BarcodeLabelView,
  BarcodeLabel,
  type BarcodeLabelData,
  type LabelSize,
} from "@/components/barcode-label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  IconBarcode,
  IconWand,
  IconPrinter,
  IconCheck,
  IconLoader2,
  IconSearch,
  IconPackage,
  IconTool,
  IconAlertTriangle,
} from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ItemType = "material" | "tool"

interface UnbarcodedItem {
  id: string
  name: string
  number: string | null
  barcode: string | null
}

// ---------------------------------------------------------------------------
// Single-item barcode preview + save
// ---------------------------------------------------------------------------
function SingleBarcodePanel({
  item,
  itemType,
  barcode,
  onBarcodeChange,
  onSaved,
}: {
  item: UnbarcodedItem
  itemType: ItemType
  barcode: string
  onBarcodeChange: (v: string) => void
  onSaved: (itemId: string, barcode: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState<LabelSize>("medium")

  const labelData: BarcodeLabelData = {
    name: item.name,
    number: item.number,
    barcode: barcode || null,
    itemId: item.id,
    itemType,
  }

  const isValid = barcode.trim().length >= 3

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/barcode-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: itemType, itemId: item.id, barcode: barcode.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Fehler beim Speichern")
        return
      }
      setSaved(true)
      onSaved(item.id, barcode.trim())
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError("Netzwerkfehler")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Barcode input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="barcode-value">Barcode-Wert</Label>
        <div className="flex gap-2">
          <Input
            id="barcode-value"
            value={barcode}
            onChange={(e) => onBarcodeChange(e.target.value)}
            placeholder="z.B. LA-MBA-000001"
            className="font-mono"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!isValid}
            onClick={handleSave}
            className="shrink-0 gap-2"
          >
            {saving ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : saved ? (
              <IconCheck className="size-4 text-green-500" />
            ) : (
              <IconCheck className="size-4" />
            )}
            {saved ? "Gespeichert!" : "Speichern"}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {barcode.length > 0 && barcode.length < 3 && (
          <p className="text-sm text-muted-foreground">Mindestens 3 Zeichen erforderlich</p>
        )}
      </div>

      {/* Label size selector */}
      <div className="flex items-center gap-3">
        <Label className="shrink-0">Etiketten-Grösse</Label>
        <Select value={size} onValueChange={(v) => setSize(v as LabelSize)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Klein — 50×25 mm</SelectItem>
            <SelectItem value="medium">Mittel — 75×38 mm</SelectItem>
            <SelectItem value="large">Gross — 100×50 mm</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="flex flex-col items-start gap-3">
        <Label>Vorschau</Label>
        <div className="overflow-x-auto rounded-lg border bg-muted/30 p-4">
          <BarcodeLabelView data={labelData} size={size} />
        </div>
      </div>

      {/* Print / download (reuse full BarcodeLabel controls) */}
      {isValid && (
        <BarcodeLabel
          data={labelData}
          showSizeSelector={false}
          forcedSize={size}
          printOnly={false}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Batch panel
// ---------------------------------------------------------------------------
function BatchPanel({
  items,
  barcodeMap,
  selectedIds,
  onToggle,
  onSelectAll,
  onSaveAll,
  saving,
}: {
  items: UnbarcodedItem[]
  barcodeMap: Map<string, string>
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onSaveAll: () => void
  saving: boolean
}) {
  const selectedCount = selectedIds.size
  const allSelected = items.length > 0 && selectedCount === items.length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            id="select-all"
            checked={allSelected}
            onCheckedChange={onSelectAll}
          />
          <Label htmlFor="select-all" className="cursor-pointer">
            Alle auswählen ({items.length})
          </Label>
        </div>
        <Button
          size="sm"
          disabled={selectedCount === 0 || saving}
          onClick={onSaveAll}
          className="gap-2"
        >
          {saving ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconCheck className="size-4" />
          )}
          {selectedCount} Barcode(s) speichern
        </Button>
      </div>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {items.map((item) => {
          const bc = barcodeMap.get(item.id)
          const isSelected = selectedIds.has(item.id)
          return (
            <div
              key={item.id}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-colors",
                isSelected ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border",
              ].join(" ")}
            >
              <Checkbox
                id={`batch-${item.id}`}
                checked={isSelected}
                onCheckedChange={() => onToggle(item.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{item.name}</p>
                {item.number && (
                  <p className="text-xs text-muted-foreground font-mono">{item.number}</p>
                )}
              </div>
              {bc ? (
                <Badge variant="secondary" className="font-mono text-xs shrink-0">
                  {bc}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                  Kein Barcode
                </Badge>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function BarcodeGeneratorPage() {
  const [itemType, setItemType] = useState<ItemType>("material")
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<UnbarcodedItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  // Single-item barcode value
  const [singleBarcode, setSingleBarcode] = useState("")
  const [generatingNext, setGeneratingNext] = useState(false)

  // Batch mode
  const [batchMode, setBatchMode] = useState(false)
  const [batchBarcodeMap, setBatchBarcodeMap] = useState<Map<string, string>>(new Map())
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set())
  const [batchSaving, setBatchSaving] = useState(false)
  const [batchGenerating, setBatchGenerating] = useState(false)

  // Saved items (remove from list after save)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  const filteredItems = items.filter(
    (item) =>
      !savedIds.has(item.id) &&
      (search === "" ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.number ?? "").toLowerCase().includes(search.toLowerCase()))
  )

  const selectedItem = filteredItems.find((i) => i.id === selectedItemId) ?? null

  // Load items without barcodes
  const loadItems = useCallback(async (type: ItemType) => {
    setLoadingItems(true)
    setSelectedItemId(null)
    setSingleBarcode("")
    setBatchBarcodeMap(new Map())
    setBatchSelected(new Set())
    try {
      const res = await fetch(`/api/barcode-generator?type=${type}`)
      if (res.ok) setItems(await res.json())
    } finally {
      setLoadingItems(false)
    }
  }, [])

  useEffect(() => {
    void loadItems(itemType)
  }, [itemType, loadItems])

  // Auto-clear selection when search changes and selected item disappears
  useEffect(() => {
    if (selectedItemId && !filteredItems.find((i) => i.id === selectedItemId)) {
      setSelectedItemId(null)
    }
  }, [filteredItems, selectedItemId])

  // Generate next barcode for selected item
  const handleGenerateNext = useCallback(async () => {
    setGeneratingNext(true)
    try {
      const res = await fetch(`/api/barcode-generator/next?type=${itemType}&count=1`)
      if (res.ok) {
        const data = await res.json()
        setSingleBarcode(data.barcodes?.[0] ?? "")
      }
    } finally {
      setGeneratingNext(false)
    }
  }, [itemType])

  // Generate barcodes for all items in batch
  const handleBatchGenerate = useCallback(async () => {
    setBatchGenerating(true)
    try {
      const count = filteredItems.length
      if (count === 0) return
      const res = await fetch(`/api/barcode-generator/next?type=${itemType}&count=${count}`)
      if (!res.ok) return
      const data = await res.json()
      const codes: string[] = data.barcodes ?? []
      const newMap = new Map<string, string>()
      filteredItems.forEach((item, i) => {
        if (codes[i]) newMap.set(item.id, codes[i]!)
      })
      setBatchBarcodeMap(newMap)
      // Auto-select all
      setBatchSelected(new Set(filteredItems.map((i) => i.id)))
    } finally {
      setBatchGenerating(false)
    }
  }, [filteredItems, itemType])

  // Save all selected barcodes in batch
  const handleBatchSave = useCallback(async () => {
    setBatchSaving(true)
    const toSave = [...batchSelected]
      .map((id) => ({ id, barcode: batchBarcodeMap.get(id) }))
      .filter((x): x is { id: string; barcode: string } => !!x.barcode)

    const results = await Promise.allSettled(
      toSave.map(({ id, barcode }) =>
        fetch("/api/barcode-generator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: itemType, itemId: id, barcode }),
        })
      )
    )

    const newSaved = new Set(savedIds)
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.ok) {
        newSaved.add(toSave[i]!.id)
      }
    })
    setSavedIds(newSaved)
    setBatchSelected(new Set())
    setBatchSaving(false)
  }, [batchSelected, batchBarcodeMap, itemType, savedIds])

  const handleBatchToggle = (id: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBatchSelectAll = () => {
    if (batchSelected.size === filteredItems.length) {
      setBatchSelected(new Set())
    } else {
      setBatchSelected(new Set(filteredItems.map((i) => i.id)))
    }
  }

  const handleItemSaved = (itemId: string) => {
    setSavedIds((prev) => new Set([...prev, itemId]))
    setSelectedItemId(null)
    setSingleBarcode("")
  }

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IconBarcode className="size-6 text-primary" />
              Barcode-Generator
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Barcodes für Artikel ohne Barcode erstellen und speichern
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={batchMode ? "default" : "outline"}
              size="sm"
              onClick={() => setBatchMode((v) => !v)}
              className="gap-2"
            >
              <IconPrinter className="size-4" />
              Batch-Modus
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left panel: item list ──────────────────────────────────────── */}
        <aside className="w-80 shrink-0 border-r flex flex-col overflow-hidden">
          {/* Type selector */}
          <div className="p-4 border-b flex flex-col gap-3">
            <div className="flex gap-2">
              <Button
                variant={itemType === "material" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setItemType("material")}
              >
                <IconPackage className="size-4" />
                Materialien
              </Button>
              <Button
                variant={itemType === "tool" ? "default" : "outline"}
                size="sm"
                className="flex-1 gap-2"
                onClick={() => setItemType("tool")}
              >
                <IconTool className="size-4" />
                Werkzeuge
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* Item list */}
          <div className="flex-1 overflow-y-auto">
            {loadingItems ? (
              <div className="flex items-center justify-center h-32">
                <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center px-4">
                <IconAlertTriangle className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {savedIds.size > 0
                    ? "Alle Barcodes wurden gespeichert."
                    : "Keine Artikel ohne Barcode gefunden."}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedItemId(item.id)
                    setSingleBarcode("")
                  }}
                  className={[
                    "w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors",
                    selectedItemId === item.id ? "bg-primary/5 border-l-2 border-l-primary" : "",
                  ].join(" ")}
                >
                  <p className="font-medium text-sm truncate">{item.name}</p>
                  {item.number && (
                    <p className="text-xs text-muted-foreground font-mono">{item.number}</p>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="p-3 border-t text-xs text-muted-foreground text-center">
            {filteredItems.length} Artikel ohne Barcode
          </div>
        </aside>

        {/* ── Right panel: generator ──────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">
          {batchMode ? (
            /* Batch mode */
            <div className="max-w-2xl flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Batch Barcode-Generierung</h2>
                  <p className="text-sm text-muted-foreground">
                    Barcodes für mehrere Artikel gleichzeitig generieren und speichern
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={batchGenerating || filteredItems.length === 0}
                  onClick={handleBatchGenerate}
                  className="gap-2"
                >
                  {batchGenerating ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconWand className="size-4" />
                  )}
                  Alle auto-generieren
                </Button>
              </div>

              <Separator />

              <BatchPanel
                items={filteredItems}
                barcodeMap={batchBarcodeMap}
                selectedIds={batchSelected}
                onToggle={handleBatchToggle}
                onSelectAll={handleBatchSelectAll}
                onSaveAll={handleBatchSave}
                saving={batchSaving}
              />
            </div>
          ) : selectedItem ? (
            /* Single-item mode */
            <div className="max-w-xl flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedItem.name}</h2>
                  {selectedItem.number && (
                    <p className="text-sm text-muted-foreground font-mono">{selectedItem.number}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={generatingNext}
                  onClick={handleGenerateNext}
                  className="gap-2 shrink-0"
                >
                  {generatingNext ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconWand className="size-4" />
                  )}
                  Auto-generieren
                </Button>
              </div>

              <Separator />

              <SingleBarcodePanel
                item={selectedItem}
                itemType={itemType}
                barcode={singleBarcode}
                onBarcodeChange={setSingleBarcode}
                onSaved={handleItemSaved}
              />
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center text-muted-foreground">
              <IconBarcode className="size-16 opacity-20" />
              <div>
                <p className="text-lg font-medium">Artikel auswählen</p>
                <p className="text-sm">
                  Wählen Sie links einen Artikel aus, um einen Barcode zu erstellen.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
