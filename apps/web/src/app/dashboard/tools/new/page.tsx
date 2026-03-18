"use client"

import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconArrowLeft, IconDeviceFloppy, IconUpload } from "@tabler/icons-react"

export default function NewToolPage() {
  const t = useTranslations("tools")
  const tc = useTranslations("common")
  const router = useRouter()

  const [imagePreview, setImagePreview] = useState<string | null>(null)

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // In production: validate, call API, redirect
    router.push("/dashboard/tools")
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/tools")}
        >
          <IconArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("addTool")}
          </h1>
          <p className="text-muted-foreground text-sm">
            Neues Werkzeug erfassen
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="space-y-6 lg:col-span-2">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t("tabs.general")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="name">
                      {t("name")} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="z.B. Bohrmaschine Hilti TE 6-A22"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">{t("number")}</Label>
                    <Input id="number" placeholder="z.B. WZ-001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group">{t("group")}</Label>
                    <Select>
                      <SelectTrigger id="group">
                        <SelectValue placeholder="Gruppe auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Elektrowerkzeuge</SelectItem>
                        <SelectItem value="2">Handwerkzeuge</SelectItem>
                        <SelectItem value="3">Messinstrumente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="home">{t("home")}</Label>
                    <Select>
                      <SelectTrigger id="home">
                        <SelectValue placeholder="Lagerort auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="loc-1">Hauptlager</SelectItem>
                        <SelectItem value="loc-2">Fahrzeug 1</SelectItem>
                        <SelectItem value="loc-3">Fahrzeug 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input id="barcode" placeholder="z.B. 4058546345679" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manufacturer Details */}
            <Card>
              <CardHeader>
                <CardTitle>Herstellerdaten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Hersteller</Label>
                    <Input id="manufacturer" placeholder="z.B. Hilti" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturerNumber">Herstellernummer</Label>
                    <Input
                      id="manufacturerNumber"
                      placeholder="z.B. TE 6-A22"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Seriennummer</Label>
                    <Input
                      id="serialNumber"
                      placeholder="z.B. SN-2024-00456"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Condition & Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle>Zustand & Wartung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="condition">{t("condition")}</Label>
                    <Select defaultValue="good">
                      <SelectTrigger id="condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Gut</SelectItem>
                        <SelectItem value="damaged">Beschädigt</SelectItem>
                        <SelectItem value="repair">Reparatur</SelectItem>
                        <SelectItem value="decommissioned">
                          Ausgemustert
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceInterval">
                      Wartungsintervall (Tage)
                    </Label>
                    <Input
                      id="maintenanceInterval"
                      type="number"
                      placeholder="z.B. 180"
                      min={0}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="notes">Notizen</Label>
                    <Textarea
                      id="notes"
                      rows={3}
                      placeholder="Zusätzliche Informationen..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar — Image Upload */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bild</CardTitle>
              </CardHeader>
              <CardContent>
                <label
                  htmlFor="image-upload"
                  className="bg-muted hover:bg-muted/80 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors"
                >
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Vorschau"
                      width={200}
                      height={192}
                      className="mb-2 max-h-48 rounded-md object-contain"
                      unoptimized
                    />
                  ) : (
                    <>
                      <IconUpload className="text-muted-foreground mb-3 size-10" />
                      <p className="text-muted-foreground text-sm text-center">
                        Klicken zum Hochladen
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        JPG, PNG bis 5MB
                      </p>
                    </>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setImagePreview(null)}
                  >
                    Bild entfernen
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Nach dem Erstellen können Sie das Werkzeug direkt auschecken
                  und einer Person oder einem Standort zuweisen.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form Actions */}
        <Separator className="my-6" />
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/tools")}
          >
            {tc("cancel")}
          </Button>
          <Button type="submit">
            <IconDeviceFloppy className="size-4" />
            {tc("save")}
          </Button>
        </div>
      </form>
    </div>
  )
}
