"use client"

import { useEffect, useRef } from "react"

interface PickerMapProps {
  lat: number
  lng: number
  onPick: (lat: number, lng: number) => void
}

export default function PickerMapInner({ lat, lng, onPick }: PickerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    let cancelled = false

    async function init() {
      const L = (await import("leaflet")).default
      await import("leaflet/dist/leaflet.css")
      if (cancelled || !containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 12,
        zoomControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Marker SVG
      const iconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
          <path d="M14 0C6.268 0 0 6.268 0 14c0 9.625 12.6 21.375 13.15 21.9a1.2 1.2 0 0 0 1.7 0C15.4 35.375 28 23.625 28 14 28 6.268 21.732 0 14 0z" fill="#3b82f6"/>
          <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
        </svg>`
      )}`

      const icon = L.icon({
        iconUrl,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      })

      const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
      markerRef.current = marker

      marker.on("dragend", () => {
        const pos = marker.getLatLng()
        onPick(pos.lat, pos.lng)
      })

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng])
        onPick(e.latlng.lat, e.latlng.lng)
      })

      mapRef.current = map
    }

    init()
    return () => {
      cancelled = true
    }
    // onPick is stable via useCallback in parent — intentionally omitted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync marker when lat/lng props change externally
  useEffect(() => {
    if (!markerRef.current || !mapRef.current) return
    markerRef.current.setLatLng([lat, lng])
  }, [lat, lng])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return <div ref={containerRef} style={{ height: 220, width: "100%" }} />
}
