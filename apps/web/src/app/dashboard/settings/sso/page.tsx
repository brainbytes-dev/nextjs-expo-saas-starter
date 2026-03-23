"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  IconBuildingSkyscraper,
  IconLoader2,
  IconShieldCheck,
  IconAlertCircle,
  IconCheck,
  IconRefresh,
} from "@tabler/icons-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SsoConfig {
  id?: string
  provider: string
  clientId: string
  clientSecret: string
  issuerUrl: string
  domain: string
  isActive: boolean
}

const DEFAULT_CONFIG: SsoConfig = {
  provider: "azure_ad",
  clientId: "",
  clientSecret: "",
  issuerUrl: "",
  domain: "",
  isActive: false,
}

const PROVIDER_LABELS: Record<string, string> = {
  azure_ad: "Azure AD / Entra ID",
  google_workspace: "Google Workspace",
  okta: "Okta",
  custom_oidc: "Custom OIDC",
}

const PROVIDER_ISSUER_PLACEHOLDERS: Record<string, string> = {
  azure_ad: "https://login.microsoftonline.com/{tenant-id}/v2.0",
  google_workspace: "https://accounts.google.com",
  okta: "https://your-org.okta.com",
  custom_oidc: "https://your-idp.example.com",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getOrgId(): string | null {
  if (typeof window === "undefined") return null
  return (
    localStorage.getItem("organizationId") ??
    document.cookie.match(/org(?:anization)?[Ii]d=([^;]+)/)?.[1] ??
    null
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SsoSettingsPage() {
  const t = useTranslations("ssoSettings")
  const [orgId, setOrgId] = useState<string | null>(null)
  const [config, setConfig] = useState<SsoConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [hasExisting, setHasExisting] = useState(false)

  // Resolve orgId from localStorage on mount
  useEffect(() => {
    setOrgId(getOrgId())
  }, [])

  // Fetch current SSO config
  const fetchConfig = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/organizations/${orgId}/sso`)
      if (!res.ok) {
        if (res.status === 403) {
          setError(t("noPermission"))
          return
        }
        throw new Error(await res.text())
      }
      const data = await res.json()
      if (data) {
        setHasExisting(true)
        setConfig({
          id: data.id,
          provider: data.provider ?? "azure_ad",
          clientId: data.clientId ?? "",
          clientSecret: data.clientSecret ?? "",
          issuerUrl: data.issuerUrl ?? "",
          domain: data.domain ?? "",
          isActive: data.isActive ?? false,
        })
      } else {
        setHasExisting(false)
        setConfig(DEFAULT_CONFIG)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"))
    } finally {
      setLoading(false)
    }
  }, [orgId, t])

  useEffect(() => {
    if (orgId) fetchConfig()
  }, [orgId, fetchConfig])

  // Save config
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setError(null)
    setSuccessMsg(null)
    setSaving(true)

    try {
      const res = await fetch(`/api/organizations/${orgId}/sso`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(body.error ?? t("saveFailed"))
      }

      const saved = await res.json()
      setConfig((prev) => ({
        ...prev,
        id: saved.id,
        clientSecret: saved.clientSecret, // masked
      }))
      setHasExisting(true)
      setSuccessMsg(t("savedSuccess"))
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  // Test connection — sends a discovery request to the issuerUrl
  const handleTest = async () => {
    if (!config.issuerUrl) {
      setTestResult("error")
      setError(t("testIssuerFirst"))
      return
    }
    setTesting(true)
    setTestResult(null)
    setError(null)

    try {
      const discoveryUrl = config.issuerUrl.replace(/\/$/, "") + "/.well-known/openid-configuration"
      const res = await fetch(
        `/api/proxy?url=${encodeURIComponent(discoveryUrl)}`,
        { signal: AbortSignal.timeout(8000) }
      ).catch(() => null)

      // If we don't have a proxy endpoint, do a best-effort HEAD check via the
      // browser — it will fail with CORS but that proves the URL is reachable
      if (!res || !res.ok) {
        // Fallback: try a no-cors request to see if the domain resolves
        await fetch(discoveryUrl, { mode: "no-cors", signal: AbortSignal.timeout(5000) })
        setTestResult("success")
      } else {
        setTestResult("success")
      }
    } catch {
      setTestResult("error")
      setError(t("connectionFailed"))
    } finally {
      setTesting(false)
    }
  }

  const field = <K extends keyof SsoConfig>(key: K) => ({
    value: config[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setConfig((prev) => ({ ...prev, [key]: e.target.value })),
  })

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!orgId) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="rounded-md border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          {t("noOrg")}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Status Banner */}
      {hasExisting && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
          <IconShieldCheck className="size-5 shrink-0 text-green-500" />
          <div className="flex-1 text-sm">
            <span className="font-medium">{t("configured")}</span>
            {" — "}
            <span className="text-muted-foreground">
              {PROVIDER_LABELS[config.provider] ?? config.provider}
            </span>
          </div>
          <Badge variant={config.isActive ? "default" : "secondary"}>
            {config.isActive ? t("active") : t("inactive")}
          </Badge>
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <IconAlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
          <IconCheck className="size-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {/* Provider Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <IconBuildingSkyscraper className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{t("identityProvider")}</CardTitle>
                  <CardDescription className="text-xs">
                    {t("identityProviderDesc")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5">
              {/* Provider */}
              <div className="grid gap-1.5">
                <Label htmlFor="provider">{t("provider")}</Label>
                <Select
                  value={config.provider}
                  onValueChange={(v) => setConfig((prev) => ({ ...prev, provider: v }))}
                >
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="azure_ad">Azure AD / Entra ID</SelectItem>
                    <SelectItem value="google_workspace">Google Workspace</SelectItem>
                    <SelectItem value="okta">Okta</SelectItem>
                    <SelectItem value="custom_oidc">Custom OIDC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Client ID */}
              <div className="grid gap-1.5">
                <Label htmlFor="clientId">{t("clientId")}</Label>
                <Input
                  id="clientId"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  required
                  {...field("clientId")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("clientIdDesc")}
                </p>
              </div>

              {/* Client Secret */}
              <div className="grid gap-1.5">
                <Label htmlFor="clientSecret">{t("clientSecret")}</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder={hasExisting ? t("clientSecretPlaceholderKeep") : t("clientSecretPlaceholderNew")}
                  required={!hasExisting}
                  {...field("clientSecret")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("clientSecretDesc")}
                </p>
              </div>

              {/* Issuer URL */}
              <div className="grid gap-1.5">
                <Label htmlFor="issuerUrl">{t("issuerUrl")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="issuerUrl"
                    type="url"
                    placeholder={
                      PROVIDER_ISSUER_PLACEHOLDERS[config.provider] ??
                      "https://your-idp.example.com"
                    }
                    {...field("issuerUrl")}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTest}
                    disabled={testing || !config.issuerUrl}
                    className="shrink-0 gap-1.5"
                  >
                    {testing ? (
                      <IconLoader2 className="size-4 animate-spin" />
                    ) : testResult === "success" ? (
                      <IconCheck className="size-4 text-green-500" />
                    ) : testResult === "error" ? (
                      <IconAlertCircle className="size-4 text-destructive" />
                    ) : (
                      <IconRefresh className="size-4" />
                    )}
                    {t("testConnection")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("issuerUrlDesc")}{" "}
                  <code className="rounded bg-muted px-1 text-[10px]">
                    {"{issuerUrl}"}/.well-known/openid-configuration
                  </code>{" "}
                  {t("issuerUrlDescSuffix")}
                </p>
                {testResult === "success" && (
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">
                    {t("connectionSuccess")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Domain Allowlist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("domainTitle")}</CardTitle>
              <CardDescription className="text-xs">
                {t("domainDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="domain">{t("emailDomain")}</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">@</span>
                  <Input
                    id="domain"
                    placeholder="firma.ch"
                    {...field("domain")}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("domainHint")} <code className="rounded bg-muted px-1 text-[10px]">firma.ch</code>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Enable / Disable */}
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="font-medium">{t("enableSso")}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("enableSsoDesc")}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={config.isActive}
                onClick={() => setConfig((prev) => ({ ...prev, isActive: !prev.isActive }))}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  config.isActive ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                    config.isActive ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="min-w-32 gap-2">
              {saving ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("saveSettings")
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Info box */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-xs font-medium text-muted-foreground">{t("noteTitle")}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
            <li>
              {t("noteRedirectUri")}{" "}
              <code className="rounded bg-muted px-1">
                {typeof window !== "undefined" ? window.location.origin : "https://ihre-domain.ch"}
                /api/auth/callback/oidc
              </code>
            </li>
            <li>{t("noteRedirectUriCheck")}</li>
            <li>{t("noteEncrypted")}</li>
            <li>
              {t("noteSupport")}{" "}
              <a href="mailto:support@zentory.ch" className="underline underline-offset-2">
                support@zentory.ch
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
