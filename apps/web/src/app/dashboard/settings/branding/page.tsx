"use client"

import { useState, useEffect, useCallback } from "react"
import { IconRefresh, IconUpload, IconCheck } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { LogoMark } from "@/components/logo"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OrgBranding {
  id: string
  name: string
  logo: string | null
  primaryColor: string | null
  accentColor: string | null
}

// ---------------------------------------------------------------------------
// Preset colours — LogistikApp defaults + common alternatives
// ---------------------------------------------------------------------------
const PRIMARY_PRESETS = [
  { label: "LogistikApp Orange", value: "#F97316" },
  { label: "Blau", value: "#2563eb" },
  { label: "Grün", value: "#16a34a" },
  { label: "Violett", value: "#7c3aed" },
  { label: "Rot", value: "#dc2626" },
  { label: "Grau", value: "#4b5563" },
]

const ACCENT_PRESETS = [
  { label: "LogistikApp Cyan", value: "#06b6d4" },
  { label: "Gelb", value: "#ca8a04" },
  { label: "Pink", value: "#db2777" },
  { label: "Teal", value: "#0d9488" },
  { label: "Indigo", value: "#4338ca" },
  { label: "Grau", value: "#6b7280" },
]

const DEFAULT_PRIMARY = "#F97316"
const DEFAULT_ACCENT = "#06b6d4"

// ---------------------------------------------------------------------------
// Color picker row
// ---------------------------------------------------------------------------
interface ColorPickerRowProps {
  label: string
  value: string
  presets: { label: string; value: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}

function ColorPickerRow({
  label,
  value,
  presets,
  onChange,
  disabled,
}: ColorPickerRowProps) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-14 cursor-pointer rounded-md border border-input bg-background p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
          }}
          disabled={disabled}
          className="w-28 font-mono text-sm"
          placeholder="#000000"
          maxLength={7}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            disabled={disabled}
            title={p.label}
            className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: p.value,
              borderColor: value === p.value ? "var(--foreground)" : "transparent",
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Preview card
// ---------------------------------------------------------------------------
function BrandPreview({
  primaryColor,
  accentColor,
  logo,
  orgName,
}: {
  primaryColor: string
  accentColor: string
  logo: string | null
  orgName: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Simulated sidebar header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: primaryColor + "12" }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt="Logo"
            className="h-7 w-7 rounded-md object-cover"
          />
        ) : (
          <LogoMark size={28} />
        )}
        <span className="text-sm font-semibold" style={{ color: primaryColor }}>
          {orgName || "Ihre Organisation"}
        </span>
      </div>

      {/* Simulated nav item */}
      <div className="px-3 py-2">
        <div
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="h-4 w-4 rounded-sm bg-white/30" />
          Materialien
        </div>
        <div className="mt-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
          <div className="h-4 w-4 rounded-sm bg-muted" />
          Werkzeuge
        </div>
      </div>

      {/* Simulated badge */}
      <div className="px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: accentColor }}
          >
            In Bearbeitung
          </span>
          <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            Entwurf
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function BrandingPage() {
  const [org, setOrg] = useState<OrgBranding | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [primaryColor, setPrimaryColor] = useState(DEFAULT_PRIMARY)
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT)
  const [logo, setLogo] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  // Fetch current org
  const fetchOrg = useCallback(async () => {
    try {
      const orgsRes = await fetch("/api/organizations")
      if (!orgsRes.ok) return
      const orgs: OrgBranding[] = await orgsRes.json()
      if (!Array.isArray(orgs) || orgs.length === 0) return
      const first = orgs[0]!
      setOrg(first)
      setPrimaryColor(first.primaryColor ?? DEFAULT_PRIMARY)
      setAccentColor(first.accentColor ?? DEFAULT_ACCENT)
      setLogo(first.logo ?? null)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchOrg()
  }, [fetchOrg])

  // Save
  const handleSave = async () => {
    if (!org) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColor,
          accentColor,
          logo,
        }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        // Dispatch event so BrandProvider updates immediately
        window.dispatchEvent(
          new CustomEvent("org-branding-updated", {
            detail: { primaryColor, accentColor, logo },
          })
        )
      } else {
        const err = await res.json()
        setError(err.error ?? "Fehler beim Speichern")
      }
    } catch {
      setError("Netzwerkfehler")
    } finally {
      setSaving(false)
    }
  }

  // Reset to defaults
  const handleReset = () => {
    setPrimaryColor(DEFAULT_PRIMARY)
    setAccentColor(DEFAULT_ACCENT)
  }

  // Logo upload (convert to base64 data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500_000) {
      setError("Logo darf maximal 500 KB gross sein")
      return
    }
    setLogoUploading(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLogo(ev.target?.result as string)
      setLogoUploading(false)
    }
    reader.onerror = () => {
      setError("Fehler beim Lesen der Datei")
      setLogoUploading(false)
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div className="space-y-6 px-4 py-6 md:px-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-8 px-4 py-6 md:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Branding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Passen Sie Farben und Logo Ihrer Organisation an
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left: settings */}
        <div className="space-y-6">
          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Farben</CardTitle>
              <CardDescription>
                Wählen Sie die Primär- und Akzentfarbe Ihrer Organisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ColorPickerRow
                label="Primärfarbe"
                value={primaryColor}
                presets={PRIMARY_PRESETS}
                onChange={setPrimaryColor}
                disabled={saving}
              />
              <Separator />
              <ColorPickerRow
                label="Akzentfarbe"
                value={accentColor}
                presets={ACCENT_PRESETS}
                onChange={setAccentColor}
                disabled={saving}
              />
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Laden Sie das Logo Ihrer Organisation hoch (PNG, SVG, max.
                500 KB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {logo && (
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo}
                    alt="Aktuelles Logo"
                    className="h-16 w-16 rounded-lg border object-contain"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLogo(null)}
                    disabled={saving}
                  >
                    Logo entfernen
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Label
                  htmlFor="logo-upload"
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 rounded-md border border-dashed border-input px-4 py-2.5 text-sm text-muted-foreground hover:border-primary hover:text-foreground">
                    <IconUpload className="size-4" />
                    {logoUploading ? "Wird geladen..." : "Logo hochladen"}
                  </div>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleLogoUpload}
                  disabled={saving || logoUploading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || logoUploading}>
              {saving ? "Wird gespeichert..." : saved ? (
                <>
                  <IconCheck className="size-4" />
                  Gespeichert
                </>
              ) : "Speichern"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={saving}
            >
              <IconRefresh className="size-4" />
              Auf Standard zurücksetzen
            </Button>
          </div>
        </div>

        {/* Right: preview */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Vorschau</p>
          <BrandPreview
            primaryColor={primaryColor}
            accentColor={accentColor}
            logo={logo}
            orgName={org?.name ?? ""}
          />
        </div>
      </div>
    </div>
  )
}
