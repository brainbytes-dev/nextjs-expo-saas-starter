"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { getConsent, setConsent, hasConsent } from "@/lib/cookie-consent"

type View = "hidden" | "banner" | "settings"

export function CookieBanner() {
  const t = useTranslations("cookies")
  const [view, setView] = useState<View>("hidden")
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  // Check on mount whether consent has been given
  useEffect(() => {
    if (!hasConsent()) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setView("banner"), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  // Listen for "open-cookie-settings" event (e.g. from footer link)
  useEffect(() => {
    const handler = () => {
      const existing = getConsent()
      if (existing) {
        setAnalytics(existing.analytics)
        setMarketing(existing.marketing)
      }
      setView("settings")
    }
    window.addEventListener("open-cookie-settings", handler)
    return () => window.removeEventListener("open-cookie-settings", handler)
  }, [])

  const acceptAll = useCallback(() => {
    setConsent({ necessary: true, analytics: true, marketing: true, timestamp: "" })
    setView("hidden")
  }, [])

  const acceptNecessary = useCallback(() => {
    setConsent({ necessary: true, analytics: false, marketing: false, timestamp: "" })
    setView("hidden")
  }, [])

  const saveSelection = useCallback(() => {
    setConsent({ necessary: true, analytics, marketing, timestamp: "" })
    setView("hidden")
  }, [analytics, marketing])

  const openSettings = useCallback(() => {
    const existing = getConsent()
    if (existing) {
      setAnalytics(existing.analytics)
      setMarketing(existing.marketing)
    }
    setView("settings")
  }, [])

  // ── Banner View ──────────────────────────────────────────────
  if (view === "banner") {
    return (
      <div
        className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300"
      >
        <div className="border-t border-border bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-1">
              <p className="text-sm text-foreground">
                {t("bannerText")}
              </p>
              <Link
                href="/datenschutz"
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                {t("privacyLink")}
              </Link>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                onClick={openSettings}
                className="order-3 sm:order-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
              >
                {t("settings")}
              </button>
              <button
                onClick={acceptNecessary}
                className="order-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {t("necessaryOnly")}
              </button>
              <button
                onClick={acceptAll}
                className="order-1 sm:order-3 rounded-md bg-[hsl(152,60%,32%)] px-4 py-2 text-sm font-medium text-white hover:bg-[hsl(152,60%,28%)] transition-colors"
              >
                {t("acceptAll")}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Settings View (Modal) ────────────────────────────────────
  if (view === "settings") {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setView(hasConsent() ? "hidden" : "banner")}
        />
        {/* Dialog */}
        <div className="relative w-full max-w-lg rounded-t-xl sm:rounded-xl border border-border bg-background p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            {t("settingsTitle")}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {t("settingsDescription")}
          </p>

          <div className="space-y-4">
            {/* Necessary */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("categoryNecessary")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("categoryNecessaryDesc")}</p>
              </div>
              <Switch checked disabled className="data-[state=checked]:bg-[hsl(152,60%,32%)] opacity-70" />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("categoryAnalytics")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("categoryAnalyticsDesc")}</p>
              </div>
              <Switch
                checked={analytics}
                onCheckedChange={setAnalytics}
                className="data-[state=checked]:bg-[hsl(152,60%,32%)]"
              />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("categoryMarketing")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("categoryMarketingDesc")}</p>
              </div>
              <Switch
                checked={marketing}
                onCheckedChange={setMarketing}
                className="data-[state=checked]:bg-[hsl(152,60%,32%)]"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              onClick={saveSelection}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {t("saveSelection")}
            </button>
            <button
              onClick={acceptAll}
              className="rounded-md bg-[hsl(152,60%,32%)] px-4 py-2 text-sm font-medium text-white hover:bg-[hsl(152,60%,28%)] transition-colors"
            >
              {t("acceptAll")}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
