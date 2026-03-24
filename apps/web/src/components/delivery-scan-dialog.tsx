"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import {
  IconUpload,
  IconCamera,
  IconLoader2,
  IconCheck,
  IconSparkles,
  IconPackageImport,
  IconAlertTriangle,
} from "@tabler/icons-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────

interface DeliveryLineItem {
  position: number
  name: string
  quantity: number
  unit: string
  ean: string | null
  articleNumber: string | null
  notes: string | null
}

interface ScanResult {
  supplierName: string
  deliveryNoteNumber: string
  deliveryDate: string
  items: DeliveryLineItem[]
  rawText: string | null
  provider: string
}

interface MaterialMatch {
  materialId: string
  materialName: string
  barcode: string | null
  confidence: "barcode" | "name"
}

interface MatchResult {
  position: number
  match: MaterialMatch | null
}

interface Location {
  id: string
  name: string
}

interface Material {
  id: string
  name: string
  barcode: string | null
}

interface EditableItem extends DeliveryLineItem {
  materialId: string
  materialName: string
  locationId: string
  included: boolean
  matchConfidence: "barcode" | "name" | null
  isNew: boolean
}

type Step = "upload" | "processing" | "results" | "booking"

// ── Component ──────────────────────────────────────────────────────────

export function DeliveryScanDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations("deliveryScan")
  const tc = useTranslations("common")

  const [step, setStep] = useState<Step>("upload")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [editableItems, setEditableItems] = useState<EditableItem[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [materialSearch, setMaterialSearch] = useState("")
  const [isDemo, setIsDemo] = useState(false)
  const [bookingProgress, setBookingProgress] = useState(0)
  const [bookingTotal, setBookingTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Fetch locations
  useEffect(() => {
    if (!open) return
    fetch("/api/locations?limit=200")
      .then((r) => r.json())
      .then((json) => setLocations(json.data || json || []))
      .catch(() => {})
  }, [open])

  // Fetch materials for autocomplete
  useEffect(() => {
    if (!open) return
    fetch("/api/materials?limit=500")
      .then((r) => r.json())
      .then((json) => setMaterials(json.data || json || []))
      .catch(() => {})
  }, [open])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("upload")
      setImageFile(null)
      setImagePreview(null)
      setScanResult(null)
      setEditableItems([])
      setIsDemo(false)
      setBookingProgress(0)
      setBookingTotal(0)
      setError(null)
    }
  }, [open])

  // ── File handling ─────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.type)) {
      setError("Image must be JPEG, PNG, or WebP")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10 MB")
      return
    }
    setError(null)
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  // ── Scan ──────────────────────────────────────────────────────────

  const handleScan = useCallback(async () => {
    if (!imageFile) return
    setStep("processing")
    setError(null)

    try {
      // Convert to base64 (strip data URI prefix)
      const arrayBuffer = await imageFile.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      )

      const res = await fetch("/api/deliveries/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64,
          mimeType: imageFile.type,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      const json = await res.json()
      const result: ScanResult = json.result
      const matchResults: MatchResult[] = json.matches || []
      setIsDemo(json.demo === true)
      setScanResult(result)

      // Build editable items
      const items: EditableItem[] = result.items.map((item) => {
        const matchEntry = matchResults.find((m) => m.position === item.position)
        const match = matchEntry?.match

        return {
          ...item,
          materialId: match?.materialId || "",
          materialName: match?.materialName || "",
          locationId: "",
          included: true,
          matchConfidence: match?.confidence || null,
          isNew: !match,
        }
      })

      setEditableItems(items)
      setStep("results")
    } catch (err) {
      console.error("Scan error:", err)
      setError(err instanceof Error ? err.message : t("error"))
      setStep("upload")
    }
  }, [imageFile, t])

  // ── Update item ───────────────────────────────────────────────────

  const updateItem = useCallback(
    (position: number, updates: Partial<EditableItem>) => {
      setEditableItems((prev) =>
        prev.map((item) =>
          item.position === position ? { ...item, ...updates } : item
        )
      )
    },
    []
  )

  const handleMaterialSelect = useCallback(
    (position: number, materialId: string) => {
      const mat = materials.find((m) => m.id === materialId)
      if (mat) {
        updateItem(position, {
          materialId: mat.id,
          materialName: mat.name,
          isNew: false,
          matchConfidence: null,
        })
      }
    },
    [materials, updateItem]
  )

  // ── Book all ──────────────────────────────────────────────────────

  const handleBookAll = useCallback(async () => {
    const includedItems = editableItems.filter((item) => item.included)

    // Validate: all items need a location
    const missingLocation = includedItems.find((item) => !item.locationId)
    if (missingLocation) {
      toast.error(t("selectLocation"))
      return
    }

    setStep("booking")
    setBookingTotal(includedItems.length)
    setBookingProgress(0)

    let successCount = 0
    let errorCount = 0

    for (const item of includedItems) {
      try {
        let materialId = item.materialId

        // Create new material if needed
        if (!materialId) {
          const createRes = await fetch("/api/materials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.name,
              unit: item.unit || "Stk",
              barcode: item.ean || undefined,
              notes: item.notes || undefined,
              mainLocationId: item.locationId,
            }),
          })

          if (!createRes.ok) {
            throw new Error(`Failed to create material: ${item.name}`)
          }

          const created = await createRes.json()
          materialId = created.id
        }

        // Stock-in
        const stockRes = await fetch("/api/stock-changes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialId,
            locationId: item.locationId,
            quantity: item.quantity,
            changeType: "in",
            notes: `Lieferschein: ${scanResult?.deliveryNoteNumber || "–"}`,
          }),
        })

        if (!stockRes.ok) {
          throw new Error(`Stock-in failed for: ${item.name}`)
        }

        successCount++
      } catch (err) {
        console.error("Booking error:", err)
        errorCount++
      }

      setBookingProgress((prev) => prev + 1)
    }

    if (errorCount === 0) {
      toast.success(t("success", { count: successCount }))
    } else {
      toast.warning(
        t("partialSuccess", { success: successCount, errors: errorCount })
      )
    }

    onOpenChange(false)
  }, [editableItems, scanResult, onOpenChange, t])

  // ── Filter materials for search ───────────────────────────────────

  const filteredMaterials = materialSearch
    ? materials.filter(
        (m) =>
          m.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
          (m.barcode && m.barcode.includes(materialSearch))
      )
    : materials

  const includedCount = editableItems.filter((i) => i.included).length

  // ── Render ────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "overflow-y-auto",
          step === "results"
            ? "sm:max-w-5xl max-h-[90vh]"
            : "sm:max-w-lg"
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSparkles className="size-5 text-primary" />
            {t("title")}
            {isDemo && (
              <Badge variant="secondary" className="text-xs">
                {t("demo")}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="flex flex-col gap-4 py-2">
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
                <IconAlertTriangle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors",
                imagePreview
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              )}
            >
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-48 rounded-lg object-contain"
                />
              ) : (
                <>
                  <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                    <IconUpload className="size-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {t("uploadTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("uploadDescription")}
                    </p>
                  </div>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => {
                  // Trigger camera specifically
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = "image/*"
                  input.capture = "environment"
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) handleFile(file)
                  }
                  input.click()
                }}
              >
                <IconCamera className="size-4" />
                {t("takePhoto")}
              </Button>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleScan}
                disabled={!imageFile}
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                <IconSparkles className="size-4" />
                {t("analyze")}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="relative">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                <IconLoader2 className="size-8 text-primary animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {t("processing")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("processingDescription")}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === "results" && scanResult && (
          <div className="flex flex-col gap-4 py-2">
            {/* Header info */}
            <div className="flex items-start justify-between gap-4 bg-muted/50 rounded-lg p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {t("supplier")}
                  </p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {scanResult.supplierName || "–"}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-xs text-muted-foreground">
                  {t("deliveryNote")}
                </p>
                <p className="text-sm font-semibold text-foreground font-mono">
                  {scanResult.deliveryNoteNumber || "–"}
                </p>
              </div>
            </div>

            {editableItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{t("noItems")}</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-10 text-xs">
                        {t("position")}
                      </TableHead>
                      <TableHead className="text-xs min-w-[180px]">
                        {t("itemName")}
                      </TableHead>
                      <TableHead className="text-xs w-20">
                        {t("quantity")}
                      </TableHead>
                      <TableHead className="text-xs w-16">
                        {t("unit")}
                      </TableHead>
                      <TableHead className="text-xs w-32">
                        {t("ean")}
                      </TableHead>
                      <TableHead className="text-xs min-w-[200px]">
                        {t("material")}
                      </TableHead>
                      <TableHead className="text-xs min-w-[160px]">
                        {t("location")}
                      </TableHead>
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={
                            editableItems.every((i) => i.included)
                          }
                          onCheckedChange={(checked) =>
                            setEditableItems((prev) =>
                              prev.map((i) => ({
                                ...i,
                                included: !!checked,
                              }))
                            )
                          }
                        />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editableItems.map((item) => (
                      <TableRow
                        key={item.position}
                        className={cn(
                          !item.included && "opacity-40"
                        )}
                      >
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {item.position}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.name}
                            onChange={(e) =>
                              updateItem(item.position, {
                                name: e.target.value,
                              })
                            }
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.position, {
                                quantity: parseInt(e.target.value) || 1,
                              })
                            }
                            className="h-8 text-xs w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(item.position, {
                                unit: e.target.value,
                              })
                            }
                            className="h-8 text-xs w-14"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">
                            {item.ean || "–"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Select
                              value={item.materialId || "__new__"}
                              onValueChange={(v) => {
                                if (v === "__new__") {
                                  updateItem(item.position, {
                                    materialId: "",
                                    materialName: "",
                                    isNew: true,
                                  })
                                } else {
                                  handleMaterialSelect(item.position, v)
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue
                                  placeholder={t("searchMaterial")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="px-2 pb-2">
                                  <Input
                                    placeholder={t("searchMaterial")}
                                    value={materialSearch}
                                    onChange={(e) =>
                                      setMaterialSearch(e.target.value)
                                    }
                                    className="h-7 text-xs"
                                  />
                                </div>
                                <SelectItem value="__new__">
                                  <span className="flex items-center gap-1 text-primary">
                                    + {t("newMaterial")}
                                  </span>
                                </SelectItem>
                                {filteredMaterials.slice(0, 50).map((m) => (
                                  <SelectItem key={m.id} value={m.id}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {item.matchConfidence === "barcode" && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 shrink-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              >
                                EAN
                              </Badge>
                            )}
                            {item.matchConfidence === "name" && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 shrink-0"
                              >
                                ~
                              </Badge>
                            )}
                            {item.isNew && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 shrink-0 text-blue-600 border-blue-300"
                              >
                                {t("new")}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.locationId || ""}
                            onValueChange={(v) =>
                              updateItem(item.position, { locationId: v })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue
                                placeholder={t("selectLocation")}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>
                                  {loc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={item.included}
                            onCheckedChange={(checked) =>
                              updateItem(item.position, {
                                included: !!checked,
                              })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Location bulk-set helper */}
            {editableItems.length > 0 && locations.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {t("setAllLocations")}:
                </span>
                <Select
                  onValueChange={(v) =>
                    setEditableItems((prev) =>
                      prev.map((i) => ({ ...i, locationId: v }))
                    )
                  }
                >
                  <SelectTrigger className="h-7 text-xs w-[200px]">
                    <SelectValue placeholder={t("selectLocation")} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload")
                  setScanResult(null)
                  setEditableItems([])
                }}
              >
                {tc("back")}
              </Button>
              <Button
                onClick={handleBookAll}
                disabled={includedCount === 0}
                className="gap-1.5"
              >
                <IconPackageImport className="size-4" />
                {t("bookAll", { count: includedCount })}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Booking */}
        {step === "booking" && (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
              {bookingProgress < bookingTotal ? (
                <IconLoader2 className="size-8 text-primary animate-spin" />
              ) : (
                <IconCheck className="size-8 text-green-600" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {t("bookingProgress", {
                  current: bookingProgress,
                  total: bookingTotal,
                })}
              </p>
              {/* Progress bar */}
              <div className="w-48 h-2 bg-muted rounded-full mt-3 mx-auto overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${bookingTotal > 0 ? (bookingProgress / bookingTotal) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
