"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Wordmark } from "@/components/logo"
import {
  IconBrain,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconX,
  IconExternalLink,
  IconLoader2,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type Status = "idle" | "loading" | "saving" | "testing" | "saved" | "error"
type KeyStatus = "unchecked" | "valid" | "invalid"

export default function AiSettingsPage() {
  const t = useTranslations("aiSettings")
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("unchecked")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [hasStoredKey, setHasStoredKey] = useState(false)
  const [storedKeyPreview, setStoredKeyPreview] = useState<string | null>(null)

  // Load current settings on mount
  useEffect(() => {
    const load = async () => {
      setStatus("loading")
      try {
        const res = await fetch("/api/ai/settings")
        if (res.ok) {
          const data: { hasKey: boolean; keyPreview: string | null } = await res.json()
          setHasStoredKey(data.hasKey)
          setStoredKeyPreview(data.keyPreview)
        }
      } catch {
        // Non-blocking
      } finally {
        setStatus("idle")
      }
    }
    void load()
  }, [])

  const handleTest = async () => {
    const key = apiKey.trim()
    if (!key) {
      setErrorMsg(t("enterKeyFirst"))
      return
    }
    setStatus("testing")
    setKeyStatus("unchecked")
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: key }),
      })
      const data: { valid: boolean; error?: string } = await res.json()
      if (data.valid) {
        setKeyStatus("valid")
        setSuccessMsg(t("connectionSuccess"))
      } else {
        setKeyStatus("invalid")
        setErrorMsg(data.error ?? t("keyInvalid"))
      }
    } catch {
      setKeyStatus("invalid")
      setErrorMsg(t("connectionFailed"))
    } finally {
      setStatus("idle")
    }
  }

  const handleSave = async () => {
    setStatus("saving")
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: apiKey.trim() || null }),
      })
      if (!res.ok) {
        const data: { error?: string } = await res.json()
        setErrorMsg(data.error ?? t("saveFailed"))
        return
      }
      setSuccessMsg(t("keySaved"))
      setStatus("saved")
      // Reload preview
      const reload = await fetch("/api/ai/settings")
      if (reload.ok) {
        const data: { hasKey: boolean; keyPreview: string | null } = await reload.json()
        setHasStoredKey(data.hasKey)
        setStoredKeyPreview(data.keyPreview)
      }
      setApiKey("")
      setKeyStatus("unchecked")
      setTimeout(() => {
        setStatus("idle")
        setSuccessMsg(null)
      }, 3000)
    } catch {
      setErrorMsg(t("networkErrorSave"))
    } finally {
      if (status !== "saved") setStatus("idle")
    }
  }

  const handleRemove = async () => {
    setStatus("saving")
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch("/api/ai/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openaiApiKey: null }),
      })
      if (!res.ok) {
        const data: { error?: string } = await res.json()
        setErrorMsg(data.error ?? t("removeFailed"))
        return
      }
      setHasStoredKey(false)
      setStoredKeyPreview(null)
      setSuccessMsg(t("keyRemoved"))
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setErrorMsg(t("networkError"))
    } finally {
      setStatus("idle")
    }
  }

  const isBusy = status === "loading" || status === "saving" || status === "testing"

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-2xl">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
          {t("breadcrumb")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <IconBrain className="size-6 text-primary" />
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("description")} <Wordmark className="inline" />.
        </p>
      </div>

      {/* Status Banner */}
      {(errorMsg || successMsg) && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            errorMsg
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-secondary/30 bg-secondary/10 text-secondary"
          }`}
        >
          {errorMsg ? (
            <IconX className="size-4 shrink-0" />
          ) : (
            <IconCheck className="size-4 shrink-0" />
          )}
          <span>{errorMsg ?? successMsg}</span>
        </div>
      )}

      {/* Current Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("currentStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 className="size-4 animate-spin" />
              {t("loading")}
            </div>
          ) : hasStoredKey ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-secondary/15 text-secondary border-secondary/30 font-mono text-xs">
                  <IconCheck className="size-3 mr-1" />
                  {t("connected")}
                </Badge>
                {storedKeyPreview && (
                  <span className="text-xs text-muted-foreground font-mono">
                    sk-...{storedKeyPreview.replace("...", "")}
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                onClick={handleRemove}
                disabled={isBusy}
              >
                {t("remove")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-muted-foreground font-mono text-xs">
                <IconX className="size-3 mr-1" />
                {t("notConfigured")}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t("systemKeyActive")}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* KI-Funktionen Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("whatIsAiFor")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong className="text-foreground">{t("featurePhotoRecognition")}</strong> — {t("featurePhotoRecognitionDesc")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong className="text-foreground">{t("featureImportMapping")}</strong> — {t("featureImportMappingDesc")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span><strong className="text-foreground">{t("featureForecast")}</strong> — {t("featureForecastDesc")}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* API Key Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("enterApiKey")}</CardTitle>
          <CardDescription>
            <Wordmark className="inline" /> {t("enterApiKeyDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">{t("apiKeyLabel")}</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setKeyStatus("unchecked")
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                disabled={isBusy}
                className={`pr-10 font-mono text-sm ${
                  keyStatus === "valid"
                    ? "border-secondary focus-visible:ring-secondary"
                    : keyStatus === "invalid"
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showKey ? t("hideKey") : t("showKey")}
              >
                {showKey ? (
                  <IconEyeOff className="size-4" />
                ) : (
                  <IconEye className="size-4" />
                )}
              </button>
            </div>
            {keyStatus === "valid" && (
              <p className="flex items-center gap-1 text-xs text-secondary">
                <IconCheck className="size-3" /> {t("validKey")}
              </p>
            )}
            {keyStatus === "invalid" && (
              <p className="flex items-center gap-1 text-xs text-destructive">
                <IconX className="size-3" /> {t("invalidKey")}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={isBusy || !apiKey.trim()}
            >
              {status === "testing" && <IconLoader2 className="size-4 mr-2 animate-spin" />}
              {t("test")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isBusy || !apiKey.trim()}
            >
              {status === "saving" && <IconLoader2 className="size-4 mr-2 animate-spin" />}
              {status === "saved" ? (
                <>
                  <IconCheck className="size-4 mr-2" />
                  {t("saved")}
                </>
              ) : (
                t("save")
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("createKeysAt")}{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center gap-0.5 hover:underline"
            >
              platform.openai.com
              <IconExternalLink className="size-3" />
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Privacy note */}
      <p className="text-xs text-muted-foreground">
        {t("privacyNote")}{" "}
        <Wordmark className="inline" /> {t("noResponseStored")}
      </p>
    </div>
  )
}
