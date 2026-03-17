import Image from "next/image"

// Simple Icons imports — only for brands confirmed to exist in this version
import {
  siSap,
  siZapier,
  siWhatsapp,
  siMake,
  siQuickbooks,
  siZebratechnologies,
} from "simple-icons"

// Map brand name → simple-icons icon
const SIMPLE_ICONS: Record<string, { path: string; hex: string; title: string }> = {
  "SAP Business One": siSap,
  "SAP IS-H":         siSap,
  "WhatsApp":         siWhatsapp,
  "Zapier":           siZapier,
  "Make":             siMake,
  "QuickBooks":       siQuickbooks,
  "Zebra":            siZebratechnologies,
}

// Map brand name → local SVG file in /public/logos/
const LOCAL_LOGOS: Record<string, string> = {
  "bexio":             "/logos/bexio.svg",
  "Abacus":            "/logos/abacus.svg",
  "Abacus / AbaNinja": "/logos/abacus.svg",
  "Vertec":            "/logos/vertec.svg",
}

interface BrandLogoProps {
  name: string
  fallbackColor: string
  fallbackShort: string
  size?: number
  className?: string
}

export function BrandLogo({
  name,
  fallbackColor,
  fallbackShort,
  size = 40,
  className = "",
}: BrandLogoProps) {
  const icon = SIMPLE_ICONS[name]
  const localLogo = LOCAL_LOGOS[name]

  // Simple Icons — render inline SVG with brand color
  if (icon) {
    return (
      <div
        className={`shrink-0 rounded-lg flex items-center justify-center bg-muted ${className}`}
        style={{ width: size, height: size }}
      >
        <svg
          role="img"
          viewBox="0 0 24 24"
          style={{ width: size * 0.55, height: size * 0.55, fill: `#${icon.hex}` }}
          aria-label={icon.title}
        >
          <path d={icon.path} />
        </svg>
      </div>
    )
  }

  // Local SVG file
  if (localLogo) {
    return (
      <div
        className={`shrink-0 rounded-lg overflow-hidden bg-white flex items-center justify-center p-1 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={localLogo}
          alt={name}
          width={size - 8}
          height={size - 8}
          className="object-contain"
        />
      </div>
    )
  }

  // Fallback: colored square with text
  return (
    <div
      className={`shrink-0 rounded-lg flex items-center justify-center text-white font-bold font-mono select-none ${className}`}
      style={{ width: size, height: size, background: fallbackColor, fontSize: size * 0.28 }}
    >
      {fallbackShort}
    </div>
  )
}
