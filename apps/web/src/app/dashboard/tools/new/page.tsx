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
interface ToolGroup {
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
  groupId: string
  homeLocationId: string
  barcode: string
  manufacturer: string
  manufacturerNumber: string
  serialNumber: string
  condition: string
  maintenanceIntervalDays: string
  notes: string
}

const initialForm: FormState = {
  name: "",
  number: "",
  groupId: "",
  homeLocationId: "",
  barcode: "",
  manufacturer: "",
  manufacturerNumber: "",
  serialNumber: "",
  condition: "good",
  maintenanceIntervalDays: "",
  notes: "",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NewToolPage() {
  const t = useTranslations("tools")
  const tc = useTranslations("common")
  const router = useRouter()

  const [form, setForm] = useState<FormState>(initialForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  // Reference data
  const [groups, setGroups] = useState<ToolGroup[]>([])
  const [locations, setLocations] = useState<Location[]>([])

  useEffect(() => {
    async function loadRefs() {
      try {
        const [groupsRes, locsRes] = await Promise.all([
          fetch("/api/tool-groups"),
          fetch("/api/locations"),
        ])
        if (groupsRes.ok) {
          const g = await groupsRes.json()
          setGroups(Array.isArray(g) ? g : (g.data ?? []))
        }
        if (locsRes.ok) {
          const l = await locsRes.json()
          setLocations(Array.isArray(l) ? l : (l.data ?? []))
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
      }))
      if (data.name) {
        setErrors((e) => ({ ...e, name: undefined }))
      }
    },
    []
  )

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) errs.name = t("nameRequired")
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
        groupId: form.groupId || null,
        homeLocationId: form.homeLocationId || null,
        barcode: form.barcode.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        manufacturerNumber: form.manufacturerNumber.trim() || null,
        serialNumber: form.serialNumber.trim() || null,
        condition: form.condition || "good",
        maintenanceIntervalDays: form.maintenanceIntervalDays
          ? parseInt(form.maintenanceIntervalDays)
          : null,
        notes: form.notes.trim() || null,
      }

      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        router.push(`/dashboard/tools/${created.id}`)
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
            onClick={() => router.push("/dashboard/tools")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("addTool")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/tools")}
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
              <CardTitle className="text-base">{t("aiRecognition")}</CardTitle>
            </CardHeader>
            <CardContent>
              <AiPhotoRecognize onRecognized={handleRecognized} />
            </CardContent>
          </Card>

          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("basicData")}</CardTitle>
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
                  placeholder={t("namePlaceholder")}
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
                  placeholder={t("numberPlaceholder")}
                />
              </div>

              {/* Gruppe */}
              <div className="space-y-2">
                <Label>{t("group")}</Label>
                <Select
                  value={form.groupId}
                  onValueChange={(v) => updateField("groupId", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectGroup")} />
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

              {/* Heimstandort */}
              <div className="space-y-2">
                <Label>{t("home")}</Label>
                <Select
                  value={form.homeLocationId}
                  onValueChange={(v) => updateField("homeLocationId", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectLocation")} />
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

              {/* Barcode */}
              <div className="space-y-2">
                <Label htmlFor="barcode">{t("barcode")}</Label>
                <Input
                  id="barcode"
                  value={form.barcode}
                  onChange={(e) => updateField("barcode", e.target.value)}
                  placeholder="z.B. 4058546345679"
                />
              </div>
            </CardContent>
          </Card>

          {/* Herstellerdaten */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("manufacturerData")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">{t("manufacturer")}</Label>
                <Input
                  id="manufacturer"
                  value={form.manufacturer}
                  onChange={(e) => updateField("manufacturer", e.target.value)}
                  placeholder="z.B. Hilti"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturerNumber">{t("manufacturerNumber")}</Label>
                <Input
                  id="manufacturerNumber"
                  value={form.manufacturerNumber}
                  onChange={(e) =>
                    updateField("manufacturerNumber", e.target.value)
                  }
                  placeholder="z.B. TE 6-A22"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">{t("serialNumber")}</Label>
                <Input
                  id="serialNumber"
                  value={form.serialNumber}
                  onChange={(e) => updateField("serialNumber", e.target.value)}
                  placeholder="z.B. SN-2024-00456"
                />
              </div>
            </CardContent>
          </Card>

          {/* Zustand & Wartung */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("conditionAndMaintenance")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("condition")}</Label>
                <Select
                  value={form.condition}
                  onValueChange={(v) => updateField("condition", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">{t("conditionGood")}</SelectItem>
                    <SelectItem value="damaged">{t("conditionDamaged")}</SelectItem>
                    <SelectItem value="repair">{t("conditionRepair")}</SelectItem>
                    <SelectItem value="decommissioned">{t("conditionDecommissioned")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenanceInterval">
                  {t("maintenanceInterval")}
                </Label>
                <Input
                  id="maintenanceInterval"
                  type="number"
                  min={0}
                  value={form.maintenanceIntervalDays}
                  onChange={(e) =>
                    updateField("maintenanceIntervalDays", e.target.value)
                  }
                  placeholder="z.B. 180"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">{t("notes")}</Label>
                <textarea
                  id="notes"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder={t("additionalInfo")}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("overview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("name")}</span>
                <span className="max-w-[140px] truncate font-medium">
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
                <span className="text-muted-foreground">{t("condition")}</span>
                <span>
                  {form.condition === "good"
                    ? t("conditionGood")
                    : form.condition === "damaged"
                      ? t("conditionDamaged")
                      : form.condition === "repair"
                        ? t("conditionRepair")
                        : t("conditionDecommissioned")"}
                </span>
              </div>
              {form.manufacturer && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("manufacturer")}</span>
                    <span className="truncate max-w-[140px]">{form.manufacturer}</span>
                  </div>
                </>
              )}
              {form.serialNumber && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("serialNumber")}</span>
                    <span className="font-mono text-xs">
                      {form.serialNumber}
                    </span>
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
