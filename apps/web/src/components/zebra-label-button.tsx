"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { IconPrinter, IconDownload } from "@tabler/icons-react"
import { generateZpl, downloadZpl, printToNetwork, type LabelData, type LabelSize } from "@/lib/zpl"

interface ZebraLabelButtonProps {
  data: LabelData
  variant?: "outline" | "ghost" | "default"
  size?: "sm" | "default"
  className?: string
}

export function ZebraLabelButton({ data, variant = "outline", size = "sm", className }: ZebraLabelButtonProps) {
  const [open, setOpen] = useState(false)
  const [labelSize, setLabelSize] = useState<LabelSize>("small")
  const [printerIp, setPrinterIp] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("zebra_printer_ip") ?? ""
    return ""
  })
  const [printing, setPrinting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  function handleDownload() {
    const zpl = generateZpl(data, labelSize)
    downloadZpl(zpl, `label-${data.number ?? data.name}`)
    setResult("ZPL-Datei heruntergeladen")
  }

  async function handleNetworkPrint() {
    if (!printerIp) return
    localStorage.setItem("zebra_printer_ip", printerIp)
    setPrinting(true); setResult(null)
    const zpl = generateZpl(data, labelSize)
    const res = await printToNetwork(zpl, printerIp)
    setResult(res.ok ? "Druckauftrag gesendet ✓" : `Fehler: ${res.error}`)
    setPrinting(false)
  }

  return (
    <>
      <Button variant={variant} size={size} className={`gap-1.5 ${className ?? ""}`} onClick={() => setOpen(true)}>
        <IconPrinter className="size-3.5" /> Etikett drucken
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Zebra-Etikett drucken</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Preview info */}
            <div className="rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs space-y-1">
              <div className="font-bold">{data.name}</div>
              {data.number && <div className="text-muted-foreground">{data.number}</div>}
              {data.location && <div className="text-muted-foreground">{data.location}</div>}
            </div>

            {/* Label size */}
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Etikett-Grösse</Label>
              <Select value={labelSize} onValueChange={v => setLabelSize(v as LabelSize)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Klein — 50×25 mm (2"×1")</SelectItem>
                  <SelectItem value="large">Gross — 100×50 mm (4"×2")</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Network printer IP */}
            <div className="space-y-1.5">
              <Label className="text-xs font-mono">Drucker-IP (optional)</Label>
              <Input
                placeholder="192.168.1.100"
                value={printerIp}
                onChange={e => setPrinterIp(e.target.value)}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground font-mono">
                Netzwerk-Drucker auf Port 9100. Leer lassen für Datei-Download.
              </p>
            </div>

            {result && (
              <p className={`text-xs font-mono ${result.includes("Fehler") ? "text-destructive" : "text-secondary"}`}>
                {result}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 flex-row">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={handleDownload}>
              <IconDownload className="size-3.5" /> .zpl herunterladen
            </Button>
            <Button size="sm" className="gap-1.5 text-xs flex-1" onClick={handleNetworkPrint} disabled={!printerIp || printing}>
              <IconPrinter className="size-3.5" /> {printing ? "Sendet…" : "Drucken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
