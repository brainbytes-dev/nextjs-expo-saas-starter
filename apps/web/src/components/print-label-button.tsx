"use client"

import { useState, useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconPrinter,
  IconCheck,
  IconAlertTriangle,
  IconLoader2,
} from "@tabler/icons-react"
import {
  type LabelData,
  type PrinterSettings,
  generateZPL,
  printLabel,
  loadPrinterSettings,
} from "@/lib/label-printer"

// ---------------------------------------------------------------------------
// PrintLabelButton — reusable print button for material/tool/location pages
// ---------------------------------------------------------------------------

interface PrintLabelButtonProps {
  type: LabelData["type"]
  name: string
  number: string
  barcode?: string
  orgName?: string
  /** Button variant (default: "outline") */
  variant?: "default" | "outline" | "ghost" | "secondary"
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon"
  /** Custom class name for the button */
  className?: string
}

export function PrintLabelButton({
  type,
  name,
  number,
  barcode,
  orgName,
  variant = "outline",
  size = "sm",
  className,
}: PrintLabelButtonProps) {
  const t = useTranslations("printLabel")
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<PrinterSettings>(loadPrinterSettings)
  const [status, setStatus] = useState<"idle" | "printing" | "success" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const labelData: LabelData = useMemo(() => ({
    type,
    name,
    number,
    barcode: barcode || number,
    orgName,
    date: new Date().toLocaleDateString("de-CH"),
  }), [type, name, number, barcode, orgName])

  // Reload settings when dialog opens
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setSettings(loadPrinterSettings())
      setStatus("idle")
      setError(null)
    }
    setOpen(nextOpen)
  }, [])

  // Generate preview
  const preview =
    settings.printerType === "brother"
      ? `[Brother ESC/P Daten — ${name}]`
      : generateZPL(labelData, settings.labelSize)

  const handlePrint = useCallback(async () => {
    setStatus("printing")
    setError(null)
    try {
      await printLabel(labelData, settings)
      setStatus("success")
      setTimeout(() => {
        setOpen(false)
        setStatus("idle")
      }, 1500)
    } catch (err: unknown) {
      setStatus("error")
      setError(err instanceof Error ? err.message : t("printError"))
    }
  }, [labelData, settings])

  const typeLabels: Record<LabelData["type"], string> = {
    material: t("typeMaterial"),
    tool: t("typeTool"),
    location: t("typeLocation"),
    barcode: t("typeBarcode"),
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <IconPrinter className="mr-1.5 size-4" />
          {t("printLabel")}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconPrinter className="size-5" />
            Etikett drucken
          </DialogTitle>
          <DialogDescription>
            {typeLabels[type]}-Etikett für &ldquo;{name}&rdquo; drucken.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Label info */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Typ:</span>{" "}
                <span className="font-medium">{typeLabels[type]}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Nr:</span>{" "}
                <span className="font-mono font-medium">{number}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Name:</span>{" "}
                <span className="font-medium">{name}</span>
              </div>
              {barcode && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Barcode:</span>{" "}
                  <span className="font-mono font-medium">{barcode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Printer selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("printer")}</Label>
              <Select
                value={settings.printerType}
                onValueChange={(v) =>
                  setSettings((s) => ({ ...s, printerType: v as PrinterSettings["printerType"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zebra">Zebra (ZPL)</SelectItem>
                  <SelectItem value="brother">Brother QL</SelectItem>
                  <SelectItem value="generic">Generisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("size")}</Label>
              <Select
                value={settings.labelSize}
                onValueChange={(v) =>
                  setSettings((s) => ({ ...s, labelSize: v as PrinterSettings["labelSize"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50x25">50 x 25 mm</SelectItem>
                  <SelectItem value="100x50">100 x 50 mm</SelectItem>
                  <SelectItem value="100x150">100 x 150 mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div>
            <Label className="text-xs">{t("preview")}</Label>
            <pre className="mt-1.5 max-h-28 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-[10px] leading-relaxed">
              {preview}
            </pre>
          </div>
        </div>

        <DialogFooter>
          {status === "error" && (
            <p className="mr-auto flex items-center gap-1 text-sm text-destructive">
              <IconAlertTriangle className="size-3.5" />
              {error}
            </p>
          )}

          {status === "success" ? (
            <Button disabled className="gap-1.5">
              <IconCheck className="size-4" />
              {t("printed")}
            </Button>
          ) : (
            <Button onClick={handlePrint} disabled={status === "printing"}>
              {status === "printing" ? (
                <>
                  <IconLoader2 className="mr-1.5 size-4 animate-spin" />
                  {t("printing")}
                </>
              ) : (
                <>
                  <IconPrinter className="mr-1.5 size-4" />
                  {t("print")}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
