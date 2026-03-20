"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconArrowLeft,
  IconDeviceFloppy,
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
import { AiPhotoRecognize, type RecognizeResult } from "@/components/ai-photo-recognize"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MaterialGroup {
  id: string
  name: string
  color: string | null
}

interface Location {
  id: string
  name: string
}

interface FormState {
  name: string
  number: string
  unit: string
  barcode: string
  groupId: string
  mainLocationId: string
  reorderLevel: number
  manufacturer: string
  manufacturerNumber: string
  expiryDate: string
  notes: string
}

const initialForm: FormState = {
  name: "",
  number: "",
  unit: "Stk",
  barcode: "",
  groupId: "",
  mainLocationId: "",
  reorderLevel: 0,
  manufacturer: "",
  manufacturerNumber: "",
  expiryDate: "",
  notes: "",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NewMaterialPage() {
  const t = useTranslations("materials")
  const tc = useTranslations("common")
  const router = useRouter()

  const [form, setForm] = useState<FormState>(initialForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  // Reference data
  const [groups, setGroups] = useState<MaterialGroup[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  useEffect(() => {
    async function loadRefs() {
      try {
        const [groupsRes, locsRes] = await Promise.all([
          fetch("/api/material-groups"),
          fetch("/api/locations"),
        ])
        if (groupsRes.ok) {
          const g = await groupsRes.json()
          setGroups(Array.isArray(g) ? g : g.data ?? [])
        }
        if (locsRes.ok) {
          const l = await locsRes.json()
          setLocations(Array.isArray(l) ? l : l.data ?? [])
        }
      } catch {
        // silent
      }
    }
    loadRefs()
  }, [])

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }))
      setErrors((e) => ({ ...e, [key]: undefined }))
    },
    []
  )

  // ── AI recognition callback ──────────────────────────────────────────────
  const handleRecognized = useCallback(
    (data: Partial<RecognizeResult>) => {
      setForm((prev) => ({
        ...prev,
        ...(data.name ? { name: data.name } : {}),
        ...(data.manufacturer ? { manufacturer: data.manufacturer } : {}),
        ...(data.description ? { notes: data.description } : {}),
        ...(data.unit ? { unit: data.unit } : {}),
      }))
      // Clear name error if it was just filled in
      if (data.name) {
        setErrors((e) => ({ ...e, name: undefined }))
      }
    },
    []
  )

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) errs.name = "Name ist erforderlich"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form])

  const handleSave = useCallback(async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        number: form.number.trim() || null,
        unit: form.unit || "Stk",
        barcode: form.barcode.trim() || null,
        groupId: form.groupId || null,
        mainLocationId: form.mainLocationId || null,
        reorderLevel: form.reorderLevel,
        manufacturer: form.manufacturer.trim() || null,
        manufacturerNumber: form.manufacturerNumber.trim() || null,
        notes: form.notes.trim() || null,
      }
      if (form.expiryDate) {
        body.expiryDate = form.expiryDate
      }

      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        router.push(`/dashboard/materials/${created.id}`)
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
            onClick={() => router.push("/dashboard/materials")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("addMaterial")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/materials")}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <IconDeviceFloppy className="size-4" />
            {saving ? tc("loading") : tc("save")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Photo Recognition */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">KI-Erkennung aus Foto</CardTitle>
            </CardHeader>
            <CardContent>
              <AiPhotoRecognize onRecognized={handleRecognized} />
            </CardContent>
          </Card>

          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grunddaten</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              {/* Name */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">
                  {t("name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="z.B. Infusionslösung NaCl 0.9%"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Nummer */}
              <div className="space-y-2">
                <Label htmlFor="number">{t("number")}</Label>
                <Input
                  id="number"
                  value={form.number}
                  onChange={(e) => updateField("number", e.target.value)}
                  placeholder="z.B. MAT-001"
                />
              </div>

              {/* Einheit */}
              <div className="space-y-2">
                <Label htmlFor="unit">{t("unit")}</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => updateField("unit", v)}
                >
                  <SelectTrigger className="w-full" id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stk">Stück (Stk)</SelectItem>
                    <SelectItem value="Pkg">Packung (Pkg)</SelectItem>
                    <SelectItem value="Fl">Flasche (Fl)</SelectItem>
                    <SelectItem value="Rll">Rolle (Rll)</SelectItem>
                    <SelectItem value="Set">Set</SelectItem>
                    <SelectItem value="m">Meter (m)</SelectItem>
                    <SelectItem value="kg">Kilogramm (kg)</SelectItem>
                    <SelectItem value="l">Liter (l)</SelectItem>
                    <SelectItem value="ml">Milliliter (ml)</SelectItem>
                    <SelectItem value="Paar">Paar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Barcode */}
              <div className="space-y-2">
                <Label htmlFor="barcode">{t("barcode")}</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => updateField("barcode", e.target.value)}
                  placeholder="EAN / GTIN"
                />
              </div>

              {/* Material Gruppe */}
              <div className="space-y-2">
                <Label>{t("group")}</Label>
                <Select
                  value={form.groupId}
                  onValueChange={(v) => updateField("groupId", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("group")} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Inventory & Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bestand &amp; Lagerort</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              {/* Haupt Lagerort */}
              <div className="space-y-2">
                <Label>{t("mainLocation")}</Label>
                <Select
                  value={form.mainLocationId}
                  onValueChange={(v) => updateField("mainLocationId", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("mainLocation")} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Meldebestand */}
              <div className="space-y-2">
                <Label htmlFor="reorderLevel">{t("reorderLevel")}</Label>
                <Input
                  id="reorderLevel"
                  type="number"
                  min={0}
                  value={form.reorderLevel}
                  onChange={(e) =>
                    updateField(
                      "reorderLevel",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
              </div>

              {/* Ablaufdatum */}
              <div className="space-y-2">
                <Label htmlFor="expiryDate">{t("expiryDate")}</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => updateField("expiryDate", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Wichtig für medizinische Materialien
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Manufacturer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hersteller</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              {/* Hersteller */}
              <div className="space-y-2">
                <Label htmlFor="manufacturer">{t("manufacturer")}</Label>
                <Input
                  id="manufacturer"
                  value={form.manufacturer}
                  onChange={(e) =>
                    updateField("manufacturer", e.target.value)
                  }
                />
              </div>

              {/* Herstellernummer */}
              <div className="space-y-2">
                <Label htmlFor="manufacturerNumber">
                  {t("manufacturerNumber")}
                </Label>
                <Input
                  id="manufacturerNumber"
                  value={form.manufacturerNumber}
                  onChange={(e) =>
                    updateField("manufacturerNumber", e.target.value)
                  }
                />
              </div>

              {/* Notes */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notizen</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Zusätzliche Hinweise..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">&Uuml;bersicht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("name")}</span>
                <span className="font-medium truncate max-w-[140px]">
                  {form.name || "\u2014"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("number")}</span>
                <span className="font-mono text-xs">
                  {form.number || "\u2014"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("unit")}</span>
                <span>{form.unit}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("reorderLevel")}</span>
                <span>{form.reorderLevel}</span>
              </div>
              {form.expiryDate && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("expiryDate")}
                    </span>
                    <span>
                      {new Date(form.expiryDate).toLocaleDateString("de-CH")}
                    </span>
                  </div>
                </>
              )}
              {form.manufacturer && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("manufacturer")}</span>
                    <span className="truncate max-w-[140px]">{form.manufacturer}</span>
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
