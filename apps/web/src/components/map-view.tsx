"use client"

import { useEffect, useRef, useMemo } from "react"

// Leaflet must only run in the browser
export interface MapLocation {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  itemCount?: number
  address?: string | null
}

interface MapViewProps {
  locations: MapLocation[]
  /** ID of the location to fly to */
  focusId?: string | null
  className?: string
}

// Marker colours keyed by location type
const TYPE_COLORS: Record<string, string> = {
  warehouse: "#3b82f6",  // blue
  vehicle: "#f97316",    // orange
  site: "#22c55e",       // green
  station: "#ef4444",    // red
  practice: "#8b5cf6",   // purple
  operating_room: "#06b6d4", // cyan
  user: "#6b7280",       // gray
}

const TYPE_LABELS: Record<string, string> = {
  warehouse: "Lager",
  vehicle: "Fahrzeug",
  site: "Baustelle",
  station: "Station",
  practice: "Praxis",
  operating_room: "OP-Saal",
  user: "Nutzer",
}

function markerColor(type: string): string {
  return TYPE_COLORS[type] ?? "#6b7280"
}

function createMarkerIcon(color: string): string {
  // Inline SVG pin — avoids broken default Leaflet icon in bundlers
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.625 12.6 21.375 13.15 21.9a1.2 1.2 0 0 0 1.7 0C15.4 35.375 28 23.625 28 14 28 6.268 21.732 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export default function MapView({ locations, focusId, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Use a ref to hold the Leaflet map instance so it survives re-renders
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map())

  const validLocations = useMemo(
    () => locations.filter((l) => !isNaN(l.lat) && !isNaN(l.lng)),
    [locations]
  )

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let cancelled = false

    async function init() {
      // Dynamic import — keeps Leaflet out of the SSR bundle
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")

      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        center: [47.37, 8.54], // Switzerland
        zoom: 8,
        zoomControl: true,
        scrollWheelZoom: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
    }

    init()

    return () => {
      cancelled = true
    }
  }, [])

  // Add / update markers when locations or map changes
  useEffect(() => {
    if (!mapRef.current) return

    let cancelled = false

    async function syncMarkers() {
      const L = (await import("leaflet")).default
      if (cancelled || !mapRef.current) return

      const map = mapRef.current
      const existing = markersRef.current
      const nextIds = new Set(validLocations.map((l) => l.id))

      // Remove stale markers
      for (const [id, marker] of existing.entries()) {
        if (!nextIds.has(id)) {
          map.removeLayer(marker)
          existing.delete(id)
        }
      }

      // Add / update markers
      for (const loc of validLocations) {
        const color = markerColor(loc.type)
        const icon = L.icon({
          iconUrl: createMarkerIcon(color),
          iconSize: [28, 36],
          iconAnchor: [14, 36],
          popupAnchor: [0, -36],
        })

        const popupHtml = `
          <div style="min-width:160px;font-family:system-ui,sans-serif">
            <strong style="font-size:14px">${loc.name}</strong>
            <div style="margin-top:4px;font-size:12px;color:#6b7280">
              ${TYPE_LABELS[loc.type] ?? loc.type}
            </div>
            ${loc.address ? `<div style="margin-top:4px;font-size:11px;color:#9ca3af">${loc.address}</div>` : ""}
            ${loc.itemCount !== undefined ? `<div style="margin-top:6px;font-size:12px"><strong>${loc.itemCount}</strong> Artikel</div>` : ""}
            <a href="/dashboard/locations/${loc.id}" style="display:inline-block;margin-top:8px;font-size:12px;color:#3b82f6;text-decoration:underline">Standort bearbeiten</a>
          </div>
        `

        if (existing.has(loc.id)) {
          const marker = existing.get(loc.id)
          marker.setLatLng([loc.lat, loc.lng])
          marker.setIcon(icon)
          marker.getPopup()?.setContent(popupHtml)
        } else {
          const marker = L.marker([loc.lat, loc.lng], { icon })
            .addTo(map)
            .bindPopup(popupHtml)
          existing.set(loc.id, marker)
        }
      }

      // Fit bounds if we have markers and no focusId
      if (validLocations.length > 0 && !focusId) {
        const bounds = L.latLngBounds(validLocations.map((l) => [l.lat, l.lng]))
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
      }
    }

    // Small delay to ensure the map is fully rendered
    const timer = setTimeout(() => syncMarkers(), 100)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [validLocations, focusId])

  // Fly to focused location
  useEffect(() => {
    if (!focusId || !mapRef.current) return

    const loc = validLocations.find((l) => l.id === focusId)
    if (!loc) return

    mapRef.current.flyTo([loc.lat, loc.lng], 14, { duration: 1 })

    // Open the popup after flying
    const timer = setTimeout(() => {
      const marker = markersRef.current.get(focusId)
      if (marker) marker.openPopup()
    }, 1100)

    return () => clearTimeout(timer)
  }, [focusId, validLocations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full w-full"}
      style={{ minHeight: 400 }}
    />
  )
}
