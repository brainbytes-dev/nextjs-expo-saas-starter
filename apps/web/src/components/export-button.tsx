"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconDownload, IconFileTypeCsv, IconJson, IconLoader2 } from "@tabler/icons-react"

interface ExportButtonProps {
  entity: "materials" | "tools" | "suppliers" | "locations" | "commissions"
  label?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

export function ExportButton({
  entity,
  label,
  variant = "outline",
  size = "sm",
}: ExportButtonProps) {
  const t = useTranslations("common")
  const resolvedLabel = label ?? t("export")
  const [loading, setLoading] = useState(false)

  const handleExport = async (format: "csv" | "json") => {
    setLoading(true)
    try {
      const res = await fetch(`/api/export?entity=${entity}&format=${format}`)
      if (!res.ok) throw new Error(t("exportFailed"))

      const blob = await res.blob()
      const contentDisposition = res.headers.get("Content-Disposition") || ""
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || `${entity}_export.${format}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={loading}>
          {loading ? (
            <IconLoader2 className="size-4 animate-spin mr-2" />
          ) : (
            <IconDownload className="size-4 mr-2" />
          )}
          {resolvedLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <IconFileTypeCsv className="size-4 mr-2" />
          {t("exportCsv")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <IconJson className="size-4 mr-2" />
          {t("exportJson")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
