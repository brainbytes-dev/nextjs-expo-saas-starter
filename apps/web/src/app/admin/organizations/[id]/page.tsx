"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, RotateCcw, CheckCheck } from "lucide-react"
import { PLAN_FEATURES, type PlanId } from "@/lib/plans"

interface OrgDetail {
  id: string
  name: string
  slug: string
  industry: string | null
  plan: string
  planOverride: string | null
  enabledFeatures: string[] | null
  adminNotes: string | null
  userCount: number
  materialCount: number
  toolCount: number
  createdAt: string
}

const PLAN_OPTIONS = [
  { value: "none", label: "Kein Override (Abo)" },
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
]

export default function AdminOrgDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string

  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Editable state
  const [planOverride, setPlanOverride] = useState<string>("none")
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([])
  const [adminNotes, setAdminNotes] = useState("")

  const fetchOrg = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/organizations")
      if (res.ok) {
        const data = await res.json()
        const found = (data.organizations || []).find(
          (o: OrgDetail) => o.id === orgId
        )
        if (found) {
          setOrg(found)
          setPlanOverride(found.planOverride || "none")
          setEnabledFeatures(
            Array.isArray(found.enabledFeatures) ? found.enabledFeatures : []
          )
          setAdminNotes(found.adminNotes || "")
        }
      }
    } catch (err) {
      console.error("Failed to fetch org:", err)
    } finally {
      setIsLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchOrg()
  }, [fetchOrg])

  const effectivePlan: PlanId =
    (planOverride !== "none" ? planOverride : org?.plan || "starter") as PlanId

  function isFeatureIncludedInPlan(featureId: string): boolean {
    const feature = PLAN_FEATURES.find((f) => f.id === featureId)
    if (!feature) return false
    return feature.plans.includes(effectivePlan)
  }

  function isFeatureEnabled(featureId: string): boolean {
    if (isFeatureIncludedInPlan(featureId)) return true
    return enabledFeatures.includes(featureId)
  }

  function toggleFeature(featureId: string) {
    // If it's included in the plan, can't toggle off
    if (isFeatureIncludedInPlan(featureId)) return

    setEnabledFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId]
    )
  }

  function enableAllFeatures() {
    const allIds = PLAN_FEATURES.map((f) => f.id)
    setEnabledFeatures(allIds)
  }

  function resetToDefaults() {
    setEnabledFeatures([])
    setPlanOverride("none")
  }

  async function handleSave() {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orgId,
          planOverride: planOverride === "none" ? null : planOverride,
          enabledFeatures: enabledFeatures.length > 0 ? enabledFeatures : null,
          adminNotes: adminNotes || null,
        }),
      })
      if (res.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (err) {
      console.error("Failed to save:", err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Lade Organisation...</p>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push("/admin/organizations")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurueck
        </Button>
        <p className="text-muted-foreground text-center py-12">
          Organisation nicht gefunden.
        </p>
      </div>
    )
  }

  // Group features by plan tier
  const starterFeatures = PLAN_FEATURES.filter((f) => f.plans.includes("starter"))
  const proFeatures = PLAN_FEATURES.filter(
    (f) => f.plans.includes("professional") && !f.plans.includes("starter")
  )
  const enterpriseFeatures = PLAN_FEATURES.filter(
    (f) => f.plans.length === 1 && f.plans[0] === "enterprise"
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin/organizations")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurueck
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{org.name}</h2>
            <p className="text-muted-foreground text-sm">/{org.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-sm text-green-600 font-medium">Gespeichert!</span>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Details + Stats */}
        <div className="space-y-6 lg:col-span-1">
          {/* Org Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Branche</span>
                <span>{org.industry || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aktueller Plan</span>
                <Badge variant="outline">{org.plan}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Erstellt</span>
                <span>{new Date(org.createdAt).toLocaleDateString("de-CH")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statistiken</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Benutzer</span>
                <span className="font-medium">{org.userCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Materialien</span>
                <span className="font-medium">{org.materialCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Werkzeuge</span>
                <span className="font-medium">{org.toolCount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Plan Override */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan Override</CardTitle>
              <CardDescription>
                Manueller Plan-Override (ueberschreibt Abo)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={planOverride} onValueChange={setPlanOverride}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin-Notizen</CardTitle>
              <CardDescription>Interne Notizen (nur fuer Admins sichtbar)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notizen hier eingeben..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aktionen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={enableAllFeatures}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Alle Features aktivieren
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={resetToDefaults}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Auf Standard zuruecksetzen
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Feature Toggles */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Feature-Verwaltung</CardTitle>
              <CardDescription>
                Effektiver Plan: <Badge variant="outline" className="ml-1">{effectivePlan}</Badge>
                {" "} — Im Plan enthaltene Features sind automatisch aktiv. Zusaetzliche Features koennen einzeln aktiviert werden.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Starter Features */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                  Starter-Features
                </h4>
                <div className="space-y-3">
                  {starterFeatures.map((feature) => {
                    const included = isFeatureIncludedInPlan(feature.id)
                    const enabled = isFeatureEnabled(feature.id)
                    return (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">{feature.name}</Label>
                          <p className="text-xs text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {included && (
                            <span className="text-[10px] text-muted-foreground">Im Plan</span>
                          )}
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => toggleFeature(feature.id)}
                            disabled={included}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Professional Features */}
              <div>
                <h4 className="text-sm font-semibold text-blue-700 mb-3">
                  Professional-Features
                </h4>
                <div className="space-y-3">
                  {proFeatures.map((feature) => {
                    const included = isFeatureIncludedInPlan(feature.id)
                    const enabled = isFeatureEnabled(feature.id)
                    return (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">{feature.name}</Label>
                          <p className="text-xs text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {included && (
                            <span className="text-[10px] text-muted-foreground">Im Plan</span>
                          )}
                          {!included && enabled && (
                            <span className="text-[10px] text-green-600">Extra</span>
                          )}
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => toggleFeature(feature.id)}
                            disabled={included}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Separator />

              {/* Enterprise Features */}
              <div>
                <h4 className="text-sm font-semibold text-orange-700 mb-3">
                  Enterprise-Features
                </h4>
                <div className="space-y-3">
                  {enterpriseFeatures.map((feature) => {
                    const included = isFeatureIncludedInPlan(feature.id)
                    const enabled = isFeatureEnabled(feature.id)
                    return (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">{feature.name}</Label>
                          <p className="text-xs text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {included && (
                            <span className="text-[10px] text-muted-foreground">Im Plan</span>
                          )}
                          {!included && enabled && (
                            <span className="text-[10px] text-green-600">Extra</span>
                          )}
                          <Switch
                            checked={enabled}
                            onCheckedChange={() => toggleFeature(feature.id)}
                            disabled={included}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
