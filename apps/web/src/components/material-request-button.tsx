"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  IconPlus,
  IconPackage,
  IconSearch,
  IconCheck,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface MaterialSearchResult {
  id: string
  name: string
  number: string | null
  unit: string
}

interface MaterialRequestButtonProps {
  /** If provided, pre-fills the material and hides search */
  materialId?: string
  materialName?: string
  materialUnit?: string
  /** Whether the dialog is controlled externally */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Button label — defaults to "Material anfragen" */
  label?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

export function MaterialRequestButton({
  materialId: prefillId,
  materialName: prefillName,
  materialUnit: prefillUnit,
  open: controlledOpen,
  onOpenChange,
  label: labelProp,
  variant = "outline",
  size = "sm",
}: MaterialRequestButtonProps) {
  const t = useTranslations("materialRequest")
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v)
    onOpenChange?.(v)
  }

  const [materialSearch, setMaterialSearch] = useState(prefillName || "")
  const [materialId, setMaterialId] = useState(prefillId || "")
  const [materialName, setMaterialName] = useState(prefillName || "")
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState(prefillUnit || "Stk")
  const [reason, setReason] = useState("")
  const [priority, setPriority] = useState("normal")
  const [searchResults, setSearchResults] = useState<MaterialSearchResult[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setMaterialSearch(prefillName || "")
      setMaterialId(prefillId || "")
      setMaterialName(prefillName || "")
      setUnit(prefillUnit || "Stk")
      setQuantity(1)
      setReason("")
      setPriority("normal")
      setSearchResults([])
      setSuccess(false)
    }
  }, [open, prefillId, prefillName, prefillUnit])

  const searchMaterials = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    try {
      const res = await fetch(`/api/materials?search=${encodeURIComponent(q)}&limit=6`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(Array.isArray(data) ? data : (data.data ?? []))
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { if (!materialId) searchMaterials(materialSearch) }, 300)
    return () => clearTimeout(t)
  }, [materialSearch, materialId, searchMaterials])

  const handleSubmit = async () => {
    const name = materialName.trim() || materialSearch.trim()
    if (!name || quantity < 1) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/material-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: materialId || undefined,
          materialName: name,
          quantity,
          unit,
          reason: reason.trim() || undefined,
          priority,
        }),
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => setOpen(false), 1200)
      }
    } catch { /* silent */ } finally {
      setSubmitting(false)
    }
  }

  const selectMaterial = (m: MaterialSearchResult) => {
    setMaterialId(m.id)
    setMaterialName(m.name)
    setMaterialSearch(m.name)
    setUnit(m.unit)
    setSearchResults([])
  }

  return (
    <>
      {!isControlled && (
        <Button variant={variant} size={size} onClick={() => setOpen(true)}>
          <IconPackage className="size-4" />
          {labelProp || t("title")}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {t("description")}
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <IconCheck className="size-6 text-green-600" />
              </div>
              <p className="text-sm font-medium">{t("success")}</p>
              <p className="text-xs text-muted-foreground text-center">
                {t("successDesc")}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {!prefillId && (
                  <div className="space-y-2">
                    <Label>{t("materialLabel")}</Label>
                    <div className="relative">
                      <IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder={t("searchPlaceholder")}
                        className="pl-8"
                        value={materialSearch}
                        onChange={(e) => {
                          setMaterialSearch(e.target.value)
                          setMaterialId("")
                          setMaterialName("")
                        }}
                      />
                    </div>
                    {materialId && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <IconCheck className="size-3.5" />
                        {t("linkedMaterial")}
                      </p>
                    )}
                    {searchResults.length > 0 && !materialId && (
                      <div className="rounded-md border shadow-sm bg-background overflow-hidden">
                        {searchResults.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left border-b last:border-b-0"
                            onClick={() => selectMaterial(m)}
                          >
                            <IconPackage className="size-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 truncate">{m.name}</span>
                            {m.number && (
                              <span className="text-xs font-mono text-muted-foreground shrink-0">{m.number}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {prefillId && (
                  <div className="rounded-lg border bg-muted/40 px-3 py-2.5 flex items-center gap-2 text-sm">
                    <IconPackage className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{prefillName}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("quantity")}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("unit")}</Label>
                    <Input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="Stk, kg, m…"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("priority")}</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("priorityLow")}</SelectItem>
                      <SelectItem value="normal">{t("priorityNormal")}</SelectItem>
                      <SelectItem value="high">{t("priorityHigh")}</SelectItem>
                      <SelectItem value="urgent">{t("priorityUrgent")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    {t("reason")}{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    placeholder={t("reasonPlaceholder")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-[72px]"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    (!materialSearch.trim() && !materialName.trim() && !prefillName) ||
                    quantity < 1
                  }
                >
                  <IconPlus className="size-4" />
                  {submitting ? t("submitting") : t("submitRequest")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
