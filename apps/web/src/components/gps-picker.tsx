"use client"

import dynamic from "next/dynamic"
import { useState, useCallback } from "react"
import { IconMapPin, IconX, IconRefresh } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// ---------------------------------------------------------------------------
// Inner map loaded dynamically (SSR safe)
// ---------------------------------------------------------------------------
const PickerMap = dynamic(() => import("./gps-picker-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[220px] w-full items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
      Karte wird geladen...
    </div>
  ),
})

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface GpsValue {
  latitude: string
  longitude: string
}

interface GpsPickerProps {
  value: GpsValue
  onChange: (value: GpsValue) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function GpsPicker({ value, onChange }: GpsPickerProps) {
  const [showMap, setShowMap] = useState(false)

  const handleLatChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, latitude: e.target.value })
    },
    [value, onChange]
  )

  const handleLngChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, longitude: e.target.value })
    },
    [value, onChange]
  )

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      onChange({
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
      })
    },
    [onChange]
  )

  const handleClear = useCallback(() => {
    onChange({ latitude: "", longitude: "" })
  }, [onChange])

  const hasCoords = value.latitude.trim() !== "" && value.longitude.trim() !== ""
  const lat = parseFloat(value.latitude)
  const lng = parseFloat(value.longitude)
  const coordsValid = !isNaN(lat) && !isNaN(lng)

  return (
    <div className="space-y-3">
      {/* Manual inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="latitude" className="text-xs">
            Breitengrad (Lat)
          </Label>
          <Input
            id="latitude"
            type="text"
            inputMode="decimal"
            value={value.latitude}
            onChange={handleLatChange}
            placeholder="47.3769"
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="longitude" className="text-xs">
            L&auml;ngengrad (Lng)
          </Label>
          <Input
            id="longitude"
            type="text"
            inputMode="decimal"
            value={value.longitude}
            onChange={handleLngChange}
            placeholder="8.5417"
            className="text-sm"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMap((v) => !v)}
        >
          <IconMapPin className="size-3.5" />
          {showMap ? "Karte ausblenden" : "Auf Karte w\u00e4hlen"}
        </Button>
        {hasCoords && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
          >
            <IconX className="size-3.5" />
            Koordinaten l\u00f6schen
          </Button>
        )}
      </div>

      {/* Mini map */}
      {showMap && (
        <div className="overflow-hidden rounded-md border">
          <PickerMap
            lat={coordsValid ? lat : 47.3769}
            lng={coordsValid ? lng : 8.5417}
            onPick={handleMapClick}
          />
          <p className="border-t bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            Klicken Sie auf die Karte, um die Position zu setzen.
          </p>
        </div>
      )}

      {hasCoords && coordsValid && (
        <p className="text-xs text-muted-foreground">
          GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
    </div>
  )
}
