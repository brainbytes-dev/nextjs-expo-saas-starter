"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconDownload, IconShieldCheck } from "@tabler/icons-react"

export function DsgvoExportCard() {
  const [format, setFormat] = useState<"json" | "csv">("csv")
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExport = async () => {
    setError(null)
    setIsExporting(true)

    try {
      const res = await fetch(`/api/dsgvo/export?format=${format}`)

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(
          data?.error ?? "Export fehlgeschlagen. Bitte versuchen Sie es später erneut."
        )
        return
      }

      // Trigger download
      const blob = await res.blob()
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const filenameMatch = disposition.match(/filename="(.+?)"/)
      const filename =
        filenameMatch?.[1] ??
        `logistikapp-daten-export.${format === "csv" ? "csv" : "json"}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError("Export fehlgeschlagen. Bitte versuchen Sie es später erneut.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconShieldCheck className="size-5 text-primary" aria-hidden />
          <CardTitle>Ihre Daten</CardTitle>
        </div>
        <CardDescription>
          Gemäss DSGVO Art. 15 können Sie alle Ihre personenbezogenen Daten
          exportieren.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Der Export enthält Ihr Profil, Bestandsänderungen,
            Werkzeug-Buchungen, Zeiteinträge, Kommentare und
            Kommissions-Einträge.
          </p>

          <div className="flex items-center gap-3">
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as "json" | "csv")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Excel)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleExport} disabled={isExporting}>
              <IconDownload className="mr-2 size-4" aria-hidden />
              {isExporting ? "Exportiert..." : "Daten exportieren"}
            </Button>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
