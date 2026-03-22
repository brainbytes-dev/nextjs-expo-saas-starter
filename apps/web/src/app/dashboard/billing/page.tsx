"use client"

import { useTranslations } from "next-intl"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { createPortalSession, createCheckoutSession } from "@/lib/stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------
interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceYearly: number
  features: string[]
  priceIdMonthly?: string
  priceIdYearly?: string
  isEnterprise?: boolean
}


const stripeConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BillingPage() {
  const t = useTranslations("billingPage")
  const plans: Plan[] = [
    {
      id: "starter",
      name: t("starterName"),
      description: t("starterDesc"),
      priceMonthly: 59,
      priceYearly: 49,
      features: Array.from({length: 8}, (_, i) => t(`feat_starter_${i}`)),
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_STARTER_MONTHLY ?? "",
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_STARTER_YEARLY ?? "",
    },
    {
      id: "professional",
      name: t("professionalName"),
      description: t("professionalDesc"),
      priceMonthly: 199,
      priceYearly: 169,
      features: Array.from({length: 12}, (_, i) => t(`feat_pro_${i}`)),
      priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY ?? "",
      priceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY ?? "",
    },
    {
      id: "enterprise",
      name: t("enterpriseName"),
      description: t("enterpriseDesc"),
      priceMonthly: 699,
      priceYearly: 599,
      isEnterprise: true,
      features: Array.from({length: 13}, (_, i) => t(`feat_ent_${i}`)),
    },
  ]
  
  // ---------------------------------------------------------------------------
  // Stripe configured check
  // ---------------------------------------------------------------------------
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [actionPlanId, setActionPlanId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string>("starter")
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly")

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (!session?.user?.email) return
      try {
        const res = await fetch("/api/user/subscription")
        if (!res.ok) return
        const { status, plan } = await res.json()
        if (status === "active" || status === "trialing") {
          setCurrentPlan(plan ?? "professional")
        } else {
          setCurrentPlan("starter")
        }
      } catch {
        setCurrentPlan("starter")
      }
    }
    fetchCurrentPlan()
  }, [session?.user?.email])

  const handleManageSubscription = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { url } = await createPortalSession()
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : t("portalError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (plan: Plan) => {
    if (!stripeConfigured) return
    const priceId =
      billingInterval === "yearly" ? plan.priceIdYearly : plan.priceIdMonthly
    if (!priceId) {
      setError(t("stripeNotConfiguredError"))
      return
    }
    setActionPlanId(plan.id)
    setError(null)
    try {
      const { url } = await createCheckoutSession(priceId)
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkoutError"))
    } finally {
      setActionPlanId(null)
    }
  }

  const planRank: Record<string, number> = { starter: 1, professional: 2, enterprise: 3 }
  const currentRank = planRank[currentPlan] ?? 1

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("description")}
        </p>
      </div>

      {/* ── Stripe not configured banner ── */}
      {!stripeConfigured && (
        <div className="rounded-md border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-300">
          <strong>{t("stripeNotConfigured")}</strong> {t("stripePreview")}{" "}
          {t("stripeNotConfiguredHelp", { key: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", file: ".env" })}
        </div>
      )}

      {/* ── Current Plan Summary ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("currentPlan")}</CardTitle>
          <CardDescription>
            {t("currentPlanUsing", { plan: currentPlan })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg capitalize">{currentPlan}</p>
              <p className="text-sm text-muted-foreground">
                {currentPlan === "starter"
                  ? t("upgradeAvailable")
                  : t("subscriptionActive")}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {currentPlan}
            </Badge>
          </div>

          <Separator />

          {currentPlan !== "starter" && (
            <Button onClick={handleManageSubscription} disabled={isLoading}>
              {isLoading ? t("loading") : t("manageSubscription")}
            </Button>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ── Billing Interval Toggle ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t("comparePlans")}</h2>
        <div className="flex items-center gap-1 rounded-lg border p-1 text-sm">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              billingInterval === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("monthly")}
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("yearly")}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              billingInterval === "yearly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("yearly")}
            <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
              –15%
            </span>
          </button>
        </div>
      </div>

      {/* ── Plan Cards ── */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan
          const planRankVal = planRank[plan.id] ?? 0
          const isUpgrade = planRankVal > currentRank
          const isDowngrade = planRankVal < currentRank
          const price =
            billingInterval === "yearly" ? plan.priceYearly : plan.priceMonthly

          return (
            <Card
              key={plan.id}
              className={`flex flex-col ${isCurrentPlan ? "border-primary border-2" : ""}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                  {isCurrentPlan && (
                    <Badge variant="default">{t("currentPlanBadge")}</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col space-y-6">
                {/* Price */}
                <div>
                  {plan.isEnterprise ? (
                    <p className="text-3xl font-bold">{t("onRequest")}</p>
                  ) : (
                    <>
                      <p className="text-3xl font-bold">
                        CHF {price}
                        <span className="text-base font-normal text-muted-foreground">{t("perMonth")}</span>
                      </p>
                      {billingInterval === "yearly" && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("billedYearly", { amount: price * 12 })}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <svg
                        className="h-4 w-4 shrink-0 text-secondary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                {isCurrentPlan ? (
                  currentPlan !== "starter" ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleManageSubscription}
                      disabled={isLoading}
                    >
                      {isLoading ? t("loading") : t("manage")}
                    </Button>
                  ) : (
                    <Button disabled className="w-full">
                      {t("currentPlanBadge")}
                    </Button>
                  )
                ) : plan.isEnterprise ? (
                  <Button
                    className="w-full"
                    variant="outline"
                    asChild
                  >
                    <a href="mailto:sales@logistikapp.ch">{t("contactSales")}</a>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={isUpgrade ? "default" : "outline"}
                    disabled={!stripeConfigured || actionPlanId === plan.id}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {actionPlanId === plan.id
                      ? t("loading")
                      : isUpgrade
                        ? t("upgrade")
                        : isDowngrade
                          ? t("downgrade")
                          : t("switchPlan")}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator />

      {/* ── Rechnungen ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("invoices")}</CardTitle>
          <CardDescription>{t("invoicesDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan === "starter" ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                {t("noInvoices")}
              </p>
            </div>
          ) : (
            <div className="py-6 text-center">
              <Button onClick={handleManageSubscription} variant="outline" disabled={isLoading}>
                {isLoading ? t("loading") : t("viewInPortal")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Zahlungsmethoden ── */}
      <Card>
        <CardHeader>
          <CardTitle>{t("paymentMethods")}</CardTitle>
          <CardDescription>{t("paymentMethodsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              {t("noPaymentMethod")}
            </p>
            {stripeConfigured ? (
              <Button onClick={handleManageSubscription} variant="outline" disabled={isLoading}>
                {isLoading ? t("loading") : t("manageInPortal")}
              </Button>
            ) : (
              <Button disabled variant="outline">
                {t("stripeNotConfigured")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
