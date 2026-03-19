"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface BrandConfig {
  primaryColor: string
  accentColor: string
  logo: string | null
  orgName: string
}

interface BrandContextValue extends BrandConfig {
  isLoaded: boolean
}

// ---------------------------------------------------------------------------
// Defaults (match LogistikApp design tokens)
// ---------------------------------------------------------------------------
const DEFAULT_BRAND: BrandConfig = {
  primaryColor: "#2563eb",
  accentColor: "#06b6d4",
  logo: null,
  orgName: "",
}

// ---------------------------------------------------------------------------
// CSS variable application
// ---------------------------------------------------------------------------
function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  const r = parseInt(result[1]!, 16) / 255
  const g = parseInt(result[2]!, 16) / 255
  const b = parseInt(result[3]!, 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function applyBrandCssVars(primary: string, accent: string) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.style.setProperty("--org-primary", primary)
  root.style.setProperty("--org-accent", accent)

  // Override the actual Tailwind CSS variables so the whole theme changes
  const primaryHsl = hexToHsl(primary)
  const accentHsl = hexToHsl(accent)
  if (primaryHsl) {
    root.style.setProperty("--primary", primaryHsl)
    root.style.setProperty("--ring", primaryHsl)
    root.style.setProperty("--sidebar-primary", primaryHsl)
  }
  if (accentHsl) {
    root.style.setProperty("--secondary", accentHsl)
    root.style.setProperty("--sidebar-accent", accentHsl)
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const BrandContext = createContext<BrandContextValue>({
  ...DEFAULT_BRAND,
  isLoaded: false,
})

export function useBrand() {
  return useContext(BrandContext)
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND)
  const [isLoaded, setIsLoaded] = useState(false)

  const applyBrand = useCallback((config: Partial<BrandConfig>) => {
    setBrand((prev) => {
      const next = { ...prev, ...config }
      applyBrandCssVars(
        next.primaryColor ?? DEFAULT_BRAND.primaryColor,
        next.accentColor ?? DEFAULT_BRAND.accentColor
      )
      return next
    })
  }, [])

  // Fetch org branding on mount
  useEffect(() => {
    async function fetchBranding() {
      try {
        const res = await fetch("/api/organizations")
        if (!res.ok) return
        const orgs = await res.json()
        if (!Array.isArray(orgs) || orgs.length === 0) return
        const org = orgs[0] as {
          name?: string
          logo?: string | null
          primaryColor?: string | null
          accentColor?: string | null
        }
        applyBrand({
          orgName: org.name ?? "",
          logo: org.logo ?? null,
          primaryColor: org.primaryColor ?? DEFAULT_BRAND.primaryColor,
          accentColor: org.accentColor ?? DEFAULT_BRAND.accentColor,
        })
      } catch {
        // Fail open — use defaults
      } finally {
        setIsLoaded(true)
      }
    }
    void fetchBranding()
  }, [applyBrand])

  // Listen for live branding updates from the settings page
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<Partial<BrandConfig>>).detail
      applyBrand(detail)
    }
    window.addEventListener("org-branding-updated", handler)
    return () => window.removeEventListener("org-branding-updated", handler)
  }, [applyBrand])

  return (
    <BrandContext.Provider value={{ ...brand, isLoaded }}>
      {children}
    </BrandContext.Provider>
  )
}
