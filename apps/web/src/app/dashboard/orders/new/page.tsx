"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconTruck,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Supplier {
  id: string
  name: string
}

interface FormState {
  supplierId: string
  materialName: string
  materialId: string
  quantity: number
  notes: string
  expectedDeliveryDate: string
  requestId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NewOrderPage() {
  const t = useTranslations("newOrder")
  const tc = useTranslations("common")
  const router = useRouter()
  const searchParams = useSearchParams()

  const [form, setForm] = useState<FormState>({
    supplierId: "",
    materialName: searchParams.get("materialName") || "",
    materialId: searchParams.get("materialId") || "",
    quantity: parseInt(searchParams.get("quantity") || "1") || 1,
    notes: "",
    expectedDeliveryDate: "",
    requestId: searchParams.get("requestId") || "",
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  // Reference data
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const res = await fetch("/api/suppliers")
        if (res.ok) {
          const data = await res.json()
          setSuppliers(Array.isArray(data) ? data : data.data ?? [])
        }
      } catch {
        // silent
      }
    }
    loadSuppliers()
  }, [])

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }))
      setErrors((e) => ({ ...e, [key]: undefined }))
    },
    []
  )

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.supplierId) errs.supplierId = t("supplierRequired")
    if (!form.materialName.trim()) errs.materialName = t("materialRequired")
    if (form.quantity < 1) errs.quantity = t("quantityMin")
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form, t])

  const handleSave = useCallback(async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const body = {
        supplierId: form.supplierId,
        notes: form.notes.trim() || null,
        orderDate: new Date().toISOString().split("T")[0],
        requestId: form.requestId || null,
        items: [
          {
            materialId: form.materialId || undefined,
            materialName: form.materialName.trim(),
            quantity: form.quantity,
          },
        ],
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        // If created from a request, update request status
        if (form.requestId) {
          await fetch(`/api/material-requests/${form.requestId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ordered" }),
          }).catch(() => {
            // silent — non-critical
          })
        }
        router.push("/dashboard/orders")
      }
    } catch {
      // TODO: toast
    } finally {
      setSaving(false)
    }
  }, [form, validate, router])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/orders")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/orders")}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <IconDeviceFloppy className="size-4" />
            {saving ? tc("loading") : t("createOrder")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("supplierSection")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>
                  {t("supplier")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.supplierId}
                  onValueChange={(v) => updateField("supplierId", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectSupplier")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.supplierId && (
                  <p className="text-xs text-destructive">{errors.supplierId}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("orderDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              {/* Material name */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="materialName">
                  {t("materialName")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="materialName"
                  value={form.materialName}
                  onChange={(e) => updateField("materialName", e.target.value)}
                  placeholder={t("materialNamePlaceholder")}
                  aria-invalid={!!errors.materialName}
                />
                {errors.materialName && (
                  <p className="text-xs text-destructive">{errors.materialName}</p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  {t("quantity")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) =>
                    updateField("quantity", parseInt(e.target.value) || 1)
                  }
                  aria-invalid={!!errors.quantity}
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive">{errors.quantity}</p>
                )}
              </div>

              {/* Expected delivery date */}
              <div className="space-y-2">
                <Label htmlFor="expectedDeliveryDate">
                  {t("expectedDeliveryDate")}
                </Label>
                <Input
                  id="expectedDeliveryDate"
                  type="date"
                  value={form.expectedDeliveryDate}
                  onChange={(e) =>
                    updateField("expectedDeliveryDate", e.target.value)
                  }
                />
              </div>

              {/* Notes */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">{tc("notes")}</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder={t("notesPlaceholder")}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("supplier")}</span>
                <span className="font-medium truncate max-w-[140px]">
                  {suppliers.find((s) => s.id === form.supplierId)?.name || "\u2014"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("materialName")}</span>
                <span className="font-medium truncate max-w-[140px]">
                  {form.materialName || "\u2014"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("quantity")}</span>
                <span>{form.quantity}</span>
              </div>
              {form.expectedDeliveryDate && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("expectedDeliveryDate")}
                    </span>
                    <span>
                      {new Date(form.expectedDeliveryDate).toLocaleDateString("de-CH")}
                    </span>
                  </div>
                </>
              )}
              {form.requestId && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <IconTruck className="size-3.5" />
                    <span className="text-xs">{t("fromRequest")}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
