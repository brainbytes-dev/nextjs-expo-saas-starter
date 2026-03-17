import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IconCheck } from "@tabler/icons-react"
import { BrandLogo } from "@/components/integrations/brand-logo"

export function ZebraCard() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo name="Zebra" fallbackColor="#474747" fallbackShort="zb" />
            <div>
              <CardTitle className="text-base">Zebra Labels</CardTitle>
              <CardDescription className="text-xs">ZPL-Etikettendruck für Lager &amp; Werkzeuge</CardDescription>
            </div>
          </div>
          <Badge variant="default" className="bg-secondary/10 text-secondary border-secondary/30">Aktiv</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground font-mono leading-relaxed">
          QR-Code-Etiketten direkt auf Zebra-Drucker senden oder als ZPL-Datei herunterladen.
        </p>
        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-muted-foreground">
          {["50×25mm Labels", "100×50mm Labels", "Netzwerkdruck"].map(f => (
            <div key={f} className="flex items-center gap-1.5"><IconCheck className="size-3 text-primary" />{f}</div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/60">
          Drucken via Material- und Werkzeug-Detailseiten → Tab &ldquo;QR-Code&rdquo;
        </p>
      </CardContent>
    </Card>
  )
}
