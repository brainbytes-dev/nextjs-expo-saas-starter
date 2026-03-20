"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  IconPrinter,
  IconPackage,
  IconTool,
  IconMapPin,
  IconCheck,
  IconChevronRight,
  IconChevronLeft,
  IconDownload,
  IconArrowLeft,
  IconSelectAll,
  IconDeselect,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { type LabelData, type LabelSize, downloadZpl } from "@/lib/zpl"
import {
  generateBatchZPL,
  estimatePrintTime,
  buildBatchPrintHtml,
} from "@/lib/batch-label-generator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type EntityType = "material" | "tool" | "location"

interface SelectableItem {
  id: string
  name: string
  number: string | null
  barcode: string | null
  type: EntityType
  location?: string | null
}

interface LabelTemplate {
  id: string
  name: string
}

const ENTITY_OPTIONS: {
  value: EntityType
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: "material", label: "Materialien", icon: IconPackage },
  { value: "tool", label: "Werkzeuge", icon: IconTool },
  { value: "location", label: "Standorte", icon: IconMapPin },
]

const LABEL_SIZES: { value: LabelSize; label: string }[] = [
  { value: "small", label: "Klein (50x25 mm)" },
  { value: "large", label: "Gross (100x50 mm)" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BatchPrintPage() {
  const router = useRouter()

  // Steps
  const [step, setStep] = useState(1)

  // Step 1: Entity type
  const [entityType, setEntityType] = useState<EntityType>("material")

  // Step 2: Items
  const [items, setItems] = useState<SelectableItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Step 3: Template / size
  const [templates, setTemplates] = useState<LabelTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default")
  const [labelSize, setLabelSize] = useState<LabelSize>("small")

  // Step 4/5: Generating
  const [generating, setGenerating] = useState(false)

  // Fetch items based on entity type
  useEffect(() => {
    async function fetchItems() {
      setLoadingItems(true)
      setSelectedIds(new Set())
      try {
        let endpoint = ""
        if (entityType === "material") endpoint = "/api/materials"
        else if (entityType === "tool") endpoint = "/api/tools"
        else endpoint = "/api/locations"

        const res = await fetch(endpoint)
        if (!res.ok) return

        const data = await res.json()
        const rows: SelectableItem[] = (
          Array.isArray(data) ? data : data.data ?? []
        ).map(
          (
            item: Record<string, unknown>
          ): SelectableItem => ({
            id: item.id as string,
            name: (item.name as string) ?? "Unbenannt",
            number: (item.number as string | null) ?? null,
            barcode: (item.barcode as string | null) ?? null,
            type: entityType,
            location:
              entityType === "location"
                ? (item.address as string | null)
                : null,
          })
        )
        setItems(rows)
      } catch {
        setItems([])
      } finally {
        setLoadingItems(false)
      }
    }
    fetchItems()
  }, [entityType])

  // Fetch label templates
  useEffect(() => {
    fetch("/api/label-templates")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data)
      })
      .catch(() => {})
  }, [])

  // Selection helpers
  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((i) => i.id)))
  }, [items])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds]
  )

  // Build LabelData array for ZPL generation
  const labelDataArray: LabelData[] = useMemo(
    () =>
      selectedItems.map((item) => ({
        name: item.name,
        number: item.number,
        qrValue:
          typeof window !== "undefined"
            ? `${window.location.origin}/s/${encodeURIComponent(item.barcode ?? item.id)}`
            : `https://logistikapp.ch/s/${encodeURIComponent(item.barcode ?? item.id)}`,
        location: item.location,
      })),
    [selectedItems]
  )

  // Generate ZPL and download
  const handleDownloadZpl = useCallback(() => {
    if (labelDataArray.length === 0) return
    setGenerating(true)
    try {
      const zpl = generateBatchZPL(labelDataArray, labelSize)
      downloadZpl(zpl, `massendruck-${entityType}-${labelDataArray.length}`)
    } finally {
      setGenerating(false)
    }
  }, [labelDataArray, labelSize, entityType])

  // Browser print
  const handleBrowserPrint = useCallback(() => {
    if (selectedItems.length === 0) return
    setGenerating(true)
    try {
      const html = buildBatchPrintHtml(
        selectedItems.map((i) => ({
          name: i.name,
          number: i.number,
          barcode: i.barcode,
          type: entityType,
        }))
      )
      const win = window.open("", "_blank", "width=850,height=600")
      if (win) {
        win.document.write(html)
        win.document.close()
      }
    } finally {
      setGenerating(false)
    }
  }, [selectedItems, entityType])

  // ---------------------------------------------------------------------------
  // Steps UI
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
        >
          <IconArrowLeft className="size-4" />
          Zurueck
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Etiketten-Massendruck
          </h1>
          <p className="text-sm text-muted-foreground">
            Mehrere Etiketten auf einmal drucken oder als ZPL herunterladen
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                s === step
                  ? "bg-primary text-primary-foreground"
                  : s < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s < step ? <IconCheck className="size-4" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`h-px w-8 ${
                  s < step ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {step === 1 && "Typ waehlen"}
          {step === 2 && "Eintraege waehlen"}
          {step === 3 && "Vorlage & Groesse"}
          {step === 4 && "Vorschau & Drucken"}
        </span>
      </div>

      {/* ── Step 1: Entity Type ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {ENTITY_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const selected = entityType === opt.value
            return (
              <Card
                key={opt.value}
                className={`cursor-pointer transition-shadow hover:shadow-md ${
                  selected ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setEntityType(opt.value)}
              >
                <CardContent className="flex flex-col items-center gap-3 py-8">
                  <Icon
                    className={`size-10 ${
                      selected ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-lg font-medium ${
                      selected ? "text-primary" : ""
                    }`}
                  >
                    {opt.label}
                  </span>
                  {selected && (
                    <Badge variant="default" className="text-xs">
                      Ausgewaehlt
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Step 2: Select Items ────────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              {ENTITY_OPTIONS.find((o) => o.value === entityType)?.label}{" "}
              auswaehlen
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="gap-1.5 text-xs"
              >
                <IconSelectAll className="size-3.5" />
                Alle
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                className="gap-1.5 text-xs"
              >
                <IconDeselect className="size-3.5" />
                Keine
              </Button>
              <Badge variant="secondary" className="tabular-nums">
                {selectedIds.size} / {items.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>Nummer</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Barcode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingItems ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Keine Eintraege gefunden.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => toggleItem(item.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {item.number ?? "\u2014"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.barcode ?? "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Template & Size ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Etiketten-Groesse</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={labelSize}
                onValueChange={(v) => setLabelSize(v as LabelSize)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LABEL_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Druckvorlage</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    Standard (QR + Barcode)
                  </SelectItem>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Step 4: Preview & Print ─────────────────────────────────────── */}
      {step === 4 && (
        <div className="flex flex-col gap-6">
          {/* Summary */}
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <IconPrinter className="size-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">
                    {selectedItems.length} Etiketten bereit
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Groesse:{" "}
                    {LABEL_SIZES.find((s) => s.value === labelSize)?.label} |
                    Geschaetzte Druckzeit:{" "}
                    {estimatePrintTime(selectedItems.length)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedItems.slice(0, 12).map((item, i) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {item.number ?? item.barcode ?? item.id.slice(0, 8)}
                  </p>
                </div>
              </div>
            ))}
            {selectedItems.length > 12 && (
              <div className="flex items-center justify-center rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                + {selectedItems.length - 12} weitere Etiketten
              </div>
            )}
          </div>

          {/* Print actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleBrowserPrint}
              disabled={generating || selectedItems.length === 0}
              className="gap-2"
            >
              <IconPrinter className="size-4" />
              Im Browser drucken
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadZpl}
              disabled={generating || selectedItems.length === 0}
              className="gap-2"
            >
              <IconDownload className="size-4" />
              ZPL herunterladen
            </Button>
            <p className="text-xs text-muted-foreground">
              ZPL-Dateien koennen direkt an Zebra-Etikettendrucker gesendet
              werden.
            </p>
          </div>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="gap-1.5"
        >
          <IconChevronLeft className="size-4" />
          Zurueck
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={step === 2 && selectedIds.size === 0}
            className="gap-1.5"
          >
            Weiter
            <IconChevronRight className="size-4" />
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">
            Bereit zum Drucken
          </span>
        )}
      </div>
    </div>
  )
}
