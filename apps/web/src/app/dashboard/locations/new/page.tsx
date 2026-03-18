"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconBuildingWarehouse,
  IconTruck,
  IconBuildingFactory,
  IconAmbulance,
  IconStethoscope,
  IconHeartbeat,
  IconUser,
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
import GpsPicker, { type GpsValue } from "@/components/gps-picker"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LOCATION_TYPES = [
  { value: "warehouse", icon: IconBuildingWarehouse, color: "text-primary" },
  { value: "vehicle", icon: IconTruck, color: "text-primary" },
  { value: "site", icon: IconBuildingFactory, color: "text-primary" },
  { value: "station", icon: IconAmbulance, color: "text-destructive" },
  { value: "practice", icon: IconStethoscope, color: "text-secondary" },
  {
    value: "operating_room",
    icon: IconHeartbeat,
    color: "text-muted-foreground",
  },
  { value: "user", icon: IconUser, color: "text-muted-foreground" },
] as const

type LocationTypeValue = (typeof LOCATION_TYPES)[number]["value"]

const TYPE_I18N_MAP: Record<LocationTypeValue, string> = {
  warehouse: "warehouse",
  vehicle: "vehicle",
  site: "site",
  station: "station",
  practice: "practice",
  operating_room: "operatingRoom",
  user: "user",
}

const TEMPLATES = [
  { value: "none", label: "Kein Template" },
  { value: "rettungswagen", label: "Rettungswagen (Standard)" },
  { value: "baustelle", label: "Baustelle (Standard)" },
  { value: "praxis", label: "Arztpraxis (Standard)" },
  { value: "op", label: "OP-Saal (Standard)" },
  { value: "lager", label: "Lager (Standard)" },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface FormState {
  name: string
  type: string
  category: string
  address: string
  template: string
  latitude: string
  longitude: string
}

const initialForm: FormState = {
  name: "",
  type: "",
  category: "",
  address: "",
  template: "none",
  latitude: "",
  longitude: "",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NewLocationPage() {
  const t = useTranslations("locations")
  const tc = useTranslations("common")
  const router = useRouter()

  const [form, setForm] = useState<FormState>(initialForm)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {}
  )

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }))
      setErrors((e) => ({ ...e, [key]: undefined }))
    },
    []
  )

  const handleGpsChange = useCallback((gps: GpsValue) => {
    setForm((f) => ({ ...f, latitude: gps.latitude, longitude: gps.longitude }))
  }, [])

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {}
    if (!form.name.trim()) errs.name = "Name ist erforderlich"
    if (!form.type) errs.type = "Typ ist erforderlich"
    if (form.latitude && isNaN(parseFloat(form.latitude)))
      errs.latitude = "Ungültiger Breitengrad"
    if (form.longitude && isNaN(parseFloat(form.longitude)))
      errs.longitude = "Ungültiger Längengrad"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form])

  const handleSave = useCallback(async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        type: form.type,
        category: form.category.trim() || null,
        address: form.address.trim() || null,
        template: form.template !== "none" ? form.template : null,
        latitude: form.latitude.trim() || null,
        longitude: form.longitude.trim() || null,
      }

      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        router.push(`/dashboard/locations/${created.id}`)
      }
    } catch {
      // TODO: toast error
    } finally {
      setSaving(false)
    }
  }, [form, validate, router])

  const selectedTypeConfig = LOCATION_TYPES.find((lt) => lt.value === form.type)

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
            onClick={() => router.push("/dashboard/locations")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("addLocation")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/locations")}
          >
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.type}
          >
            <IconDeviceFloppy className="size-4" />
            {saving ? tc("loading") : tc("save")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Allgemeine Informationen</CardTitle>
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
                  placeholder="z.B. Hauptlager Z\u00fcrich"
                  aria-invalid={!!errors.name}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  {t("type")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => updateField("type", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Typ ausw\u00e4hlen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((lt) => {
                      const Icon = lt.icon
                      return (
                        <SelectItem key={lt.value} value={lt.value}>
                          <Icon className={`size-4 ${lt.color}`} />
                          {t(`types.${TYPE_I18N_MAP[lt.value]}`)}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-xs text-destructive">{errors.type}</p>
                )}
                {selectedTypeConfig && (
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                    <selectedTypeConfig.icon
                      className={`size-5 ${selectedTypeConfig.color}`}
                    />
                    <span className="text-muted-foreground">
                      Typ:{" "}
                      {t(
                        `types.${TYPE_I18N_MAP[form.type as LocationTypeValue]}`
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">{t("category")}</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  placeholder="z.B. Zentral, Transporter, Chirurgie"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="z.B. Bahnhofstrasse 10, 8001 Z\u00fcrich"
                />
              </div>
            </CardContent>
          </Card>

          {/* GPS Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">GPS-Koordinaten</CardTitle>
            </CardHeader>
            <CardContent>
              <GpsPicker
                value={{ latitude: form.latitude, longitude: form.longitude }}
                onChange={handleGpsChange}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Vorlage</Label>
                <Select
                  value={form.template}
                  onValueChange={(v) => updateField("template", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((tpl) => (
                      <SelectItem key={tpl.value} value={tpl.value}>
                        {tpl.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ein Template f\u00fcllt den Lagerort automatisch mit einem
                  vordefinierten Materialset.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: live preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">\u00dcbersicht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("name")}</span>
                <span className="max-w-[160px] truncate font-medium">
                  {form.name || "\u2014"}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("type")}</span>
                <span className="font-medium">
                  {form.type
                    ? t(
                        `types.${TYPE_I18N_MAP[form.type as LocationTypeValue]}`
                      )
                    : "\u2014"}
                </span>
              </div>
              {form.category && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("category")}
                    </span>
                    <span className="max-w-[160px] truncate">
                      {form.category}
                    </span>
                  </div>
                </>
              )}
              {form.address && (
                <>
                  <Separator />
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0 text-muted-foreground">
                      Adresse
                    </span>
                    <span className="text-right text-xs">{form.address}</span>
                  </div>
                </>
              )}
              {(form.latitude || form.longitude) && (
                <>
                  <Separator />
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0 text-muted-foreground">GPS</span>
                    <span className="text-right text-xs font-mono">
                      {form.latitude}, {form.longitude}
                    </span>
                  </div>
                </>
              )}
              {form.template !== "none" && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vorlage</span>
                    <span className="max-w-[160px] truncate">
                      {TEMPLATES.find((t) => t.value === form.template)
                        ?.label ?? form.template}
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
