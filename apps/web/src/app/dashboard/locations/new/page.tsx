"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import {
  IconArrowLeft,
  IconBuildingWarehouse,
  IconTruck,
  IconBuildingFactory,
  IconAmbulance,
  IconStethoscope,
  IconHeartbeat,
  IconUser,
  IconDeviceFloppy,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ─── Type config ─────────────────────────────────────────────────────
const LOCATION_TYPES = [
  { value: "warehouse", icon: IconBuildingWarehouse, color: "text-primary" },
  { value: "vehicle", icon: IconTruck, color: "text-primary" },
  { value: "site", icon: IconBuildingFactory, color: "text-primary" },
  { value: "station", icon: IconAmbulance, color: "text-destructive" },
  { value: "practice", icon: IconStethoscope, color: "text-secondary" },
  { value: "operating_room", icon: IconHeartbeat, color: "text-muted-foreground" },
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

// ─── Template options ────────────────────────────────────────────────
const TEMPLATES = [
  { value: "none", label: "Kein Template" },
  { value: "rettungswagen", label: "Rettungswagen (Standard)" },
  { value: "baustelle", label: "Baustelle (Standard)" },
  { value: "praxis", label: "Arztpraxis (Standard)" },
  { value: "op", label: "OP-Saal (Standard)" },
  { value: "lager", label: "Lager (Standard)" },
]

export default function NewLocationPage() {
  const t = useTranslations("locations")
  const tCommon = useTranslations("common")
  const router = useRouter()

  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<string>("")
  const [category, setCategory] = React.useState("")
  const [address, setAddress] = React.useState("")
  const [template, setTemplate] = React.useState("none")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const isValid = name.trim() !== "" && type !== ""

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setIsSubmitting(true)
    try {
      // TODO: API call to create location
      // await createLocation({ name, type, category, address, template: template === "none" ? null : template })
      router.push("/dashboard/locations")
    } catch {
      // TODO: error handling
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => router.push("/dashboard/locations")}
        >
          <IconArrowLeft className="size-4" />
          {tCommon("back")}
        </Button>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("addLocation")}</h1>
          <p className="text-sm text-muted-foreground">
            Erstellen Sie einen neuen Lagerort für Ihre Organisation.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="px-4 lg:px-6">
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Allgemeine Informationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  {t("name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Hauptlager Zürich"
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>
                  {t("type")} <span className="text-destructive">*</span>
                </Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Typ auswählen..." />
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

                {/* Type preview */}
                {type && (
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                    {(() => {
                      const found = LOCATION_TYPES.find((lt) => lt.value === type)
                      if (!found) return null
                      const Icon = found.icon
                      return (
                        <>
                          <Icon className={`size-5 ${found.color}`} />
                          <span className="text-muted-foreground">
                            Typ: {t(`types.${TYPE_I18N_MAP[type as LocationTypeValue]}`)}
                          </span>
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">{t("category")}</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="z.B. Zentral, Transporter, Chirurgie"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="z.B. Bahnhofstrasse 10, 8001 Zürich"
                />
              </div>

              {/* Template */}
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={template} onValueChange={setTemplate}>
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
                  Ein Template füllt den Lagerort automatisch mit einem vordefinierten Materialset.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!isValid || isSubmitting}>
              <IconDeviceFloppy className="size-4" />
              {isSubmitting ? tCommon("loading") : tCommon("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/locations")}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
