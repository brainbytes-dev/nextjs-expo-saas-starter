"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  IconBuilding,
  IconMapPin,
  IconPackage,
  IconUsers,
  IconCheck,
  IconPlus,
  IconTrash,
  IconArrowRight,
  IconArrowLeft,
} from "@tabler/icons-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { useSession } from "@/lib/auth-client"

// ── Types ────────────────────────────────────────────────────────────────

interface OrgFormData {
  name: string
  industry: string
  address: string
  zip: string
  city: string
  country: string
}

interface LocationFormData {
  name: string
  type: string
  address: string
}

interface MaterialRow {
  name: string
  number: string
  unit: string
}

interface InviteRow {
  email: string
  role: string
}

// ── Constants ─────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5

const INDUSTRIES = [
  { value: "bau", label: "Bau" },
  { value: "handwerk", label: "Handwerk" },
  { value: "industrie", label: "Industrie" },
  { value: "handel", label: "Handel" },
  { value: "dienstleistung", label: "Dienstleistung" },
  { value: "andere", label: "Andere" },
]

const LOCATION_TYPES = [
  { value: "warehouse", label: "Lager" },
  { value: "vehicle", label: "Fahrzeug" },
  { value: "site", label: "Baustelle" },
  { value: "station", label: "Station" },
]

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Mitglied" },
]

const UNITS = ["Stk", "m", "m²", "kg", "L", "Pkg", "Rl"]

// ── Step progress header ──────────────────────────────────────────────────

function StepHeader({ step }: { step: number }) {
  const progress = Math.round((step / TOTAL_STEPS) * 100)
  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Einrichtung</span>
        <span>Schritt {step} von {TOTAL_STEPS}</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              i + 1 < step
                ? "bg-primary text-primary-foreground"
                : i + 1 === step
                ? "border-2 border-primary bg-background text-primary"
                : "border border-border bg-muted text-muted-foreground"
            }`}
          >
            {i + 1 < step ? <IconCheck className="size-3.5" /> : i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Step 1: Organisation ──────────────────────────────────────────────────

function StepOrganisation({
  data,
  onChange,
  onNext,
  isLoading,
  error,
}: {
  data: OrgFormData
  onChange: (patch: Partial<OrgFormData>) => void
  onNext: () => void
  isLoading: boolean
  error: string | null
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <IconBuilding className="size-5 text-primary" />
        </div>
        <CardTitle>Organisation erstellen</CardTitle>
        <CardDescription>
          Gib die Grunddaten deines Unternehmens ein. Du kannst diese später in den Einstellungen anpassen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="org-name">Firmenname *</Label>
              <Input
                id="org-name"
                placeholder="Mustermann AG"
                value={data.name}
                onChange={(e) => onChange({ name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="org-industry">Branche</Label>
              <Select
                value={data.industry}
                onValueChange={(v) => onChange({ industry: v })}
              >
                <SelectTrigger id="org-industry" className="w-full">
                  <SelectValue placeholder="Branche wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="org-address">Adresse</Label>
              <Input
                id="org-address"
                placeholder="Musterstrasse 1"
                value={data.address}
                onChange={(e) => onChange({ address: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-zip">PLZ</Label>
              <Input
                id="org-zip"
                placeholder="8001"
                value={data.zip}
                onChange={(e) => onChange({ zip: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-city">Ort</Label>
              <Input
                id="org-city"
                placeholder="Zürich"
                value={data.city}
                onChange={(e) => onChange({ city: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="org-country">Land</Label>
              <Select
                value={data.country}
                onValueChange={(v) => onChange({ country: v })}
              >
                <SelectTrigger id="org-country" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CH">Schweiz</SelectItem>
                  <SelectItem value="DE">Deutschland</SelectItem>
                  <SelectItem value="AT">Österreich</SelectItem>
                  <SelectItem value="LI">Liechtenstein</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isLoading || !data.name.trim()} className="gap-2">
              {isLoading ? "Wird erstellt..." : "Weiter"}
              {!isLoading && <IconArrowRight className="size-4" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 2: Erster Standort ───────────────────────────────────────────────

function StepLocation({
  data,
  onChange,
  onNext,
  onBack,
  isLoading,
  error,
}: {
  data: LocationFormData
  onChange: (patch: Partial<LocationFormData>) => void
  onNext: () => void
  onBack: () => void
  isLoading: boolean
  error: string | null
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-emerald-500/10">
          <IconMapPin className="size-5 text-emerald-600" />
        </div>
        <CardTitle>Erster Standort</CardTitle>
        <CardDescription>
          Erstelle deinen ersten Lagerort oder Standort. Weitere Standorte kannst du jederzeit hinzufügen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">Name *</Label>
              <Input
                id="loc-name"
                placeholder="Hauptlager"
                value={data.name}
                onChange={(e) => onChange({ name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loc-type">Typ</Label>
              <Select
                value={data.type}
                onValueChange={(v) => onChange({ type: v })}
              >
                <SelectTrigger id="loc-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="loc-address">Adresse (optional)</Label>
              <Input
                id="loc-address"
                placeholder="Lagerstrasse 5, 8001 Zürich"
                value={data.address}
                onChange={(e) => onChange({ address: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={onBack} className="gap-2">
              <IconArrowLeft className="size-4" />
              Zurück
            </Button>
            <Button type="submit" disabled={isLoading || !data.name.trim()} className="gap-2">
              {isLoading ? "Wird erstellt..." : "Weiter"}
              {!isLoading && <IconArrowRight className="size-4" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 3: Erste Materialien ─────────────────────────────────────────────

const EMPTY_MATERIAL: MaterialRow = { name: "", number: "", unit: "Stk" }

function StepMaterials({
  rows,
  onChange,
  onNext,
  onBack,
  onSkip,
  isLoading,
  error,
}: {
  rows: MaterialRow[]
  onChange: (rows: MaterialRow[]) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  isLoading: boolean
  error: string | null
}) {
  const updateRow = (i: number, patch: Partial<MaterialRow>) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const addRow = () => onChange([...rows, { ...EMPTY_MATERIAL }])

  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i))

  const hasAnyName = rows.some((r) => r.name.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-blue-500/10">
          <IconPackage className="size-5 text-blue-500" />
        </div>
        <CardTitle>Erste Materialien (optional)</CardTitle>
        <CardDescription>
          Erfasse deine häufigsten Materialien. Du kannst diesen Schritt auch überspringen und Materialien später anlegen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_120px_100px_32px] gap-2 px-1">
              <span className="text-xs font-medium text-muted-foreground">Name</span>
              <span className="text-xs font-medium text-muted-foreground">Nummer</span>
              <span className="text-xs font-medium text-muted-foreground">Einheit</span>
              <span />
            </div>

            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_100px_32px] items-center gap-2">
                <Input
                  placeholder="Materialname"
                  value={row.name}
                  onChange={(e) => updateRow(i, { name: e.target.value })}
                  autoFocus={i === 0}
                />
                <Input
                  placeholder="M-001"
                  value={row.number}
                  onChange={(e) => updateRow(i, { number: e.target.value })}
                />
                <Select
                  value={row.unit}
                  onValueChange={(v) => updateRow(i, { unit: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  aria-label="Zeile entfernen"
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={addRow}
          >
            <IconPlus className="size-4" />
            Zeile hinzufügen
          </Button>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={onBack} className="gap-2">
              <IconArrowLeft className="size-4" />
              Zurück
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onSkip}>
                Überspringen
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !hasAnyName}
                className="gap-2"
              >
                {isLoading ? "Wird gespeichert..." : "Weiter"}
                {!isLoading && <IconArrowRight className="size-4" />}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 4: Team einladen ─────────────────────────────────────────────────

const EMPTY_INVITE: InviteRow = { email: "", role: "member" }

function StepInvite({
  rows,
  onChange,
  onNext,
  onBack,
  onSkip,
  isLoading,
  error,
}: {
  rows: InviteRow[]
  onChange: (rows: InviteRow[]) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  isLoading: boolean
  error: string | null
}) {
  const updateRow = (i: number, patch: Partial<InviteRow>) => {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const addRow = () => onChange([...rows, { ...EMPTY_INVITE }])

  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i))

  const hasAnyEmail = rows.some((r) => r.email.trim())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-amber-500/10">
          <IconUsers className="size-5 text-amber-600" />
        </div>
        <CardTitle>Team einladen (optional)</CardTitle>
        <CardDescription>
          Lade Mitarbeiter in deine Organisation ein. Bestehende Nutzer werden direkt hinzugefügt, neue erhalten einen Einladungslink.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_140px_32px] gap-2 px-1">
              <span className="text-xs font-medium text-muted-foreground">E-Mail-Adresse</span>
              <span className="text-xs font-medium text-muted-foreground">Rolle</span>
              <span />
            </div>

            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_140px_32px] items-center gap-2">
                <Input
                  type="email"
                  placeholder="mitarbeiter@firma.ch"
                  value={row.email}
                  onChange={(e) => updateRow(i, { email: e.target.value })}
                  autoFocus={i === 0}
                />
                <Select
                  value={row.role}
                  onValueChange={(v) => updateRow(i, { role: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  aria-label="Zeile entfernen"
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={addRow}
          >
            <IconPlus className="size-4" />
            Zeile hinzufügen
          </Button>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={onBack} className="gap-2">
              <IconArrowLeft className="size-4" />
              Zurück
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onSkip}>
                Überspringen
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !hasAnyEmail}
                className="gap-2"
              >
                {isLoading ? "Wird gesendet..." : "Einladen"}
                {!isLoading && <IconArrowRight className="size-4" />}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ── Step 5: Fertig! ───────────────────────────────────────────────────────

function StepDone({ firstName }: { firstName: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-emerald-500/10 ring-8 ring-emerald-500/5">
          <IconCheck className="size-10 text-emerald-600" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          Alles bereit{firstName ? `, ${firstName}` : ""}!
        </h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          Deine Organisation ist eingerichtet. Du kannst jetzt mit der Erfassung deiner Bestände beginnen.
        </p>

        <Button asChild size="lg" className="mt-8 gap-2 px-8">
          <Link href="/dashboard">
            Los geht&apos;s — zum Dashboard
            <IconArrowRight className="size-4" />
          </Link>
        </Button>

        <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <Link
            href="/dashboard/materials"
            className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
          >
            <IconPackage className="size-5 text-primary" />
            Materialien
          </Link>
          <Link
            href="/dashboard/tools"
            className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
          >
            <span className="text-lg">🔧</span>
            Werkzeuge
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex flex-col items-center gap-1.5 rounded-lg border bg-card p-3 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
          >
            <span className="text-lg">⚙️</span>
            Einstellungen
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Slug generator ─────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
}

// ── Main wizard ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Created entity IDs — needed for subsequent steps
  const [orgId, setOrgId] = useState<string | null>(null)

  // Form state per step
  const [orgData, setOrgData] = useState<OrgFormData>({
    name: "",
    industry: "",
    address: "",
    zip: "",
    city: "",
    country: "CH",
  })

  const [locationData, setLocationData] = useState<LocationFormData>({
    name: "Hauptlager",
    type: "warehouse",
    address: "",
  })

  const [materialRows, setMaterialRows] = useState<MaterialRow[]>([
    { ...EMPTY_MATERIAL },
    { ...EMPTY_MATERIAL },
    { ...EMPTY_MATERIAL },
  ])

  const [inviteRows, setInviteRows] = useState<InviteRow[]>([
    { ...EMPTY_INVITE },
    { ...EMPTY_INVITE },
    { ...EMPTY_INVITE },
  ])

  const clearError = () => setError(null)

  // ── Step 1: Create organisation ───────────────────────────────────────

  const handleCreateOrg = useCallback(async () => {
    clearError()
    setIsLoading(true)
    try {
      const slug = toSlug(orgData.name)
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgData.name.trim(),
          slug,
          industry: orgData.industry || undefined,
          address: orgData.address || undefined,
          zip: orgData.zip || undefined,
          city: orgData.city || undefined,
          country: orgData.country,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Organisation konnte nicht erstellt werden")
      }

      const org = await res.json() as { id: string }
      setOrgId(org.id)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [orgData])

  // ── Step 2: Create location ───────────────────────────────────────────

  const handleCreateLocation = useCallback(async () => {
    if (!orgId) return
    clearError()
    setIsLoading(true)
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": orgId,
        },
        body: JSON.stringify({
          name: locationData.name.trim(),
          type: locationData.type,
          address: locationData.address || undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Standort konnte nicht erstellt werden")
      }

      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [orgId, locationData])

  // ── Step 3: Create materials ──────────────────────────────────────────

  const handleCreateMaterials = useCallback(async () => {
    if (!orgId) return
    clearError()
    setIsLoading(true)
    try {
      const validRows = materialRows.filter((r) => r.name.trim())
      await Promise.all(
        validRows.map((row) =>
          fetch("/api/materials", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-organization-id": orgId,
            },
            body: JSON.stringify({
              name: row.name.trim(),
              number: row.number.trim() || undefined,
              unit: row.unit,
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              throw new Error(body.error ?? `Material "${row.name}" konnte nicht erstellt werden`)
            }
          })
        )
      )
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [orgId, materialRows])

  // ── Step 4: Send invites ──────────────────────────────────────────────

  const handleSendInvites = useCallback(async () => {
    if (!orgId) return
    clearError()
    setIsLoading(true)
    try {
      const validRows = inviteRows.filter((r) => r.email.trim())
      // Fire all invites; report first error but don't block progress
      const results = await Promise.allSettled(
        validRows.map((row) =>
          fetch(`/api/organizations/${orgId}/invite`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: row.email.trim(), role: row.role }),
          }).then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              throw new Error(body.error ?? `Einladung an ${row.email} fehlgeschlagen`)
            }
          })
        )
      )
      const firstFailure = results.find((r): r is PromiseRejectedResult => r.status === "rejected")
      if (firstFailure) {
        setError(firstFailure.reason instanceof Error ? firstFailure.reason.message : "Eine Einladung ist fehlgeschlagen")
        // Still advance — partial success is fine
      }
      setStep(5)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler")
    } finally {
      setIsLoading(false)
    }
  }, [orgId, inviteRows])

  const firstName = session?.user?.name?.split(" ")[0] ?? ""

  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.24))] items-start justify-center py-8 px-4">
      <div className="w-full max-w-xl">
        {/* Logo / brand mark */}
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold tracking-tight">LogistikApp</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Willkommen! Richte deine Organisation in wenigen Schritten ein.
          </p>
        </div>

        {step < TOTAL_STEPS && <StepHeader step={step} />}

        {step === 1 && (
          <StepOrganisation
            data={orgData}
            onChange={(p) => setOrgData((d) => ({ ...d, ...p }))}
            onNext={handleCreateOrg}
            isLoading={isLoading}
            error={error}
          />
        )}

        {step === 2 && (
          <StepLocation
            data={locationData}
            onChange={(p) => setLocationData((d) => ({ ...d, ...p }))}
            onNext={handleCreateLocation}
            onBack={() => { clearError(); setStep(1) }}
            isLoading={isLoading}
            error={error}
          />
        )}

        {step === 3 && (
          <StepMaterials
            rows={materialRows}
            onChange={setMaterialRows}
            onNext={handleCreateMaterials}
            onBack={() => { clearError(); setStep(2) }}
            onSkip={() => { clearError(); setStep(4) }}
            isLoading={isLoading}
            error={error}
          />
        )}

        {step === 4 && (
          <StepInvite
            rows={inviteRows}
            onChange={setInviteRows}
            onNext={handleSendInvites}
            onBack={() => { clearError(); setStep(3) }}
            onSkip={() => { clearError(); setStep(5) }}
            isLoading={isLoading}
            error={error}
          />
        )}

        {step === 5 && <StepDone firstName={firstName} />}
      </div>
    </div>
  )
}
