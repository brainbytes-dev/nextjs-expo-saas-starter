"use client"

import {
  createContext,
  useContext,
  useCallback,
  useState,
} from "react"
import { usePathname } from "next/navigation"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"
import { toast } from "sonner"
import { IconBarcode } from "@tabler/icons-react"

// ---------------------------------------------------------------------------
// localStorage keys for scanner settings
// ---------------------------------------------------------------------------
const STORAGE_KEY_ENABLED = "scanner_enabled"
const STORAGE_KEY_SOUND = "scanner_sound"
const STORAGE_KEY_AUTO_LOOKUP = "scanner_auto_lookup"

function loadBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback
  try {
    const v = localStorage.getItem(key)
    if (v === "true") return true
    if (v === "false") return false
  } catch {
    // ignore
  }
  return fallback
}

function saveBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Web Audio beep
// ---------------------------------------------------------------------------
let audioCtx: AudioContext | null = null

function playBeep() {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext()
    }
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = "sine"
    osc.frequency.value = 1200
    gain.gain.value = 0.15
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15)
    osc.stop(audioCtx.currentTime + 0.15)
  } catch {
    // Web Audio not available — silent
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface ScannerSettings {
  enabled: boolean
  soundEnabled: boolean
  autoLookup: boolean
  setEnabled: (v: boolean) => void
  setSoundEnabled: (v: boolean) => void
  setAutoLookup: (v: boolean) => void
  lastScan: string | null
}

const ScannerContext = createContext<ScannerSettings>({
  enabled: true,
  soundEnabled: true,
  autoLookup: true,
  setEnabled: () => {},
  setSoundEnabled: () => {},
  setAutoLookup: () => {},
  lastScan: null,
})

export function useScannerSettings() {
  return useContext(ScannerContext)
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function BarcodeScannerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Settings state — loaded from localStorage via lazy initializer
  const [enabled, setEnabledState] = useState(() => loadBool(STORAGE_KEY_ENABLED, true))
  const [soundEnabled, setSoundEnabledState] = useState(() => loadBool(STORAGE_KEY_SOUND, true))
  const [autoLookup, setAutoLookupState] = useState(() => loadBool(STORAGE_KEY_AUTO_LOOKUP, true))
  const [lastScan, setLastScan] = useState<string | null>(null)

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v)
    saveBool(STORAGE_KEY_ENABLED, v)
  }, [])

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v)
    saveBool(STORAGE_KEY_SOUND, v)
  }, [])

  const setAutoLookup = useCallback((v: boolean) => {
    setAutoLookupState(v)
    saveBool(STORAGE_KEY_AUTO_LOOKUP, v)
  }, [])

  // ── Scan handler ────────────────────────────────────────────────────────
  const handleScan = useCallback(
    async (barcode: string) => {
      setLastScan(barcode)

      // Play beep if enabled
      if (soundEnabled) {
        playBeep()
      }

      // Show initial toast
      toast("Barcode gescannt", {
        description: barcode,
        icon: <IconBarcode className="size-4" />,
        duration: 4000,
      })

      // Dispatch custom event so any page can react
      window.dispatchEvent(
        new CustomEvent("barcode-scanned", { detail: { barcode } })
      )

      // Auto-fill search on materials/tools pages
      if (
        pathname.startsWith("/dashboard/materials") ||
        pathname.startsWith("/dashboard/tools")
      ) {
        // Try to find the search input and fill it
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[placeholder*="Such"], input[placeholder*="such"], input[name="search"], input[name="query"]'
        )
        if (searchInput) {
          // Use native input value setter to trigger React's onChange
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set
          nativeInputValueSetter?.call(searchInput, barcode)
          searchInput.dispatchEvent(new Event("input", { bubbles: true }))
          searchInput.dispatchEvent(new Event("change", { bubbles: true }))
        }
      }

      // EAN lookup if enabled
      if (!autoLookup) return

      try {
        const res = await fetch(
          `/api/ean-lookup?code=${encodeURIComponent(barcode)}`
        )
        if (!res.ok) return

        const data = await res.json()

        if (data.found && data.product) {
          const name =
            data.product.name ?? data.product.title ?? "Unbekanntes Produkt"
          toast.success(`Produkt erkannt: ${name}`, {
            description: `EAN: ${barcode}`,
            duration: 6000,
          })
        } else {
          toast.info("Kein Produkt gefunden", {
            description: `Barcode ${barcode} ist nicht in der Datenbank hinterlegt.`,
            duration: 4000,
          })
        }
      } catch {
        // EAN lookup failed — don't show error, the initial toast is enough
      }
    },
    [soundEnabled, autoLookup, pathname]
  )

  useBarcodeScanner(handleScan, enabled)

  return (
    <ScannerContext.Provider
      value={{
        enabled,
        soundEnabled,
        autoLookup,
        setEnabled,
        setSoundEnabled,
        setAutoLookup,
        lastScan,
      }}
    >
      {children}
    </ScannerContext.Provider>
  )
}
