"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import QRCode from "qrcode"
import { useTranslations } from "next-intl"
import {
  IconArrowLeft,
  IconPrinter,
  IconDownload,
  IconBuildingWarehouse,
  IconTruck,
  IconBuildingFactory,
  IconAmbulance,
  IconStethoscope,
  IconHeartbeat,
  IconUser,
  IconMapPin,
  IconQrcode,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const BASE_URL = "https://logistikapp.ch"

const LOCATION_TYPE_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>
    label: string
    color: string
  }
> = {
  warehouse: { icon: IconBuildingWarehouse, label: "warehouse", color: "text-primary" },
  vehicle: { icon: IconTruck, label: "vehicle", color: "text-primary" },
  site: { icon: IconBuildingFactory, label: "site", color: "text-primary" },
  station: { icon: IconAmbulance, label: "station", color: "text-destructive" },
  practice: { icon: IconStethoscope, label: "practice", color: "text-secondary" },
  operating_room: { icon: IconHeartbeat, label: "operating_room", color: "text-muted-foreground" },
  user: { icon: IconUser, label: "user", color: "text-muted-foreground" },
}

interface LocationData {
  id: string
  name: string
  type: string
  category: string | null
  address: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LocationQrPage() {
  const t = useTranslations("locations")
  const tc = useTranslations("common")
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState("")

  const qrUrl = `${BASE_URL}/scan/location/${id}`

  // Fetch location data
  useEffect(() => {
    async function fetchLocation() {
      try {
        const res = await fetch(`/api/locations/${id}`)
        if (res.ok) {
          setLocation(await res.json())
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchLocation()
  }, [id])

  // Generate QR code
  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, qrUrl, {
      width: 320,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(console.error)

    QRCode.toDataURL(qrUrl, { width: 640, margin: 2 })
      .then(setQrDataUrl)
      .catch(console.error)
  }, [qrUrl])

  // Print
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // Download as PNG
  const handleDownload = useCallback(() => {
    if (!canvasRef.current || !location) return
    const link = document.createElement("a")
    link.download = `qr-standort-${location.name.replace(/\s+/g, "-").toLowerCase()}.png`
    link.href = canvasRef.current.toDataURL("image/png")
    link.click()
  }, [location])

  const typeConfig = location
    ? LOCATION_TYPE_CONFIG[location.type] ?? {
        icon: IconMapPin,
        label: location.type,
        color: "text-muted-foreground",
      }
    : null
  const TypeIcon = typeConfig?.icon ?? IconMapPin

  if (loading) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mx-auto h-96 w-96 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .qr-print-area, .qr-print-area * { visibility: visible; }
          .qr-print-area { position: absolute; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="no-print w-fit"
          onClick={() => router.push(`/dashboard/locations/${id}`)}
        >
          <IconArrowLeft className="size-4" />
          {t("backToLocation")}
        </Button>

        {/* Print area */}
        <div className="qr-print-area mx-auto flex max-w-lg flex-col items-center gap-6">
          {/* Header info */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2">
              <TypeIcon className={`size-6 ${typeConfig?.color ?? ""}`} />
              <h1 className="text-2xl font-bold tracking-tight">
                {location?.name ?? "Standort"}
              </h1>
            </div>
            {location?.category && (
              <Badge variant="outline">{location.category}</Badge>
            )}
            {location?.address && (
              <p className="text-sm text-muted-foreground">{location.address}</p>
            )}
            {typeConfig && (
              <Badge variant="secondary" className="text-xs">
                {typeConfig.label}
              </Badge>
            )}
          </div>

          {/* QR Code Card */}
          <Card className="w-fit">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <canvas ref={canvasRef} className="rounded-lg" />
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconQrcode className="size-3.5" />
                  <span>{t("scanForInfo")}</span>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground/60 break-all max-w-xs text-center">
                  {qrUrl}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <p className="text-xs text-muted-foreground/50 tracking-wider uppercase">
            logistikapp.ch
          </p>
        </div>

        {/* Action buttons */}
        <div className="no-print mx-auto flex items-center gap-3">
          <Button variant="default" onClick={handlePrint}>
            <IconPrinter className="size-4" />
            {tc("print")}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={!qrDataUrl}
          >
            <IconDownload className="size-4" />
            {t("downloadPng")}
          </Button>
        </div>
      </div>
    </>
  )
}
