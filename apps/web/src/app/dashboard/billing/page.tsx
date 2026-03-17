"use client"

import { useState, useEffect } from "react"
import { useSession } from "@/lib/auth-client"
import { createPortalSession } from "@/lib/stripe"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface Plan {
  id: string
  name: string
  description: string
  price: number
  interval: "month" | "year"
  features: string[]
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with basic features",
    price: 0,
    interval: "month",
    features: [
      "Up to 3 projects",
      "Basic analytics",
      "Community support",
      "1 GB storage",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Perfect for growing teams",
    price: 29,
    interval: "month",
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "100 GB storage",
      "Team collaboration",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For large organizations",
    price: 99,
    interval: "month",
    features: [
      "Everything in Pro",
      "Custom integrations",
      "Dedicated support",
      "Unlimited storage",
      "SSO & advanced security",
      "SLA guarantee",
    ],
  },
]

export default function BillingPage() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string>("free")

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      if (!session?.user?.email) return

      try {
        const res = await fetch("/api/user/subscription")
        if (!res.ok) return
        const { status } = await res.json()

        if (status === "active" || status === "trialing") {
          setCurrentPlan("pro")
        } else {
          setCurrentPlan("free")
        }
      } catch (err) {
        console.error("Error fetching subscription:", err)
        setCurrentPlan("free")
      }
    }

    fetchCurrentPlan()
  }, [session?.user?.email])

  const handleManageSubscription = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { url } = await createPortalSession()
      if (url) {
        window.location.href = url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open customer portal")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Plans</h1>
        <p className="text-muted-foreground mt-2">Manage your subscription and billing information</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>You are currently on the {currentPlan} plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg capitalize">{currentPlan} Plan</p>
              <p className="text-sm text-muted-foreground">
                {currentPlan === "free"
                  ? "Upgrade to unlock more features"
                  : "Your subscription is active and renews monthly"}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {currentPlan}
            </Badge>
          </div>

          <Separator />

          {currentPlan !== "free" && (
            <Button onClick={handleManageSubscription} disabled={isLoading}>
              {isLoading ? "Loading..." : "Manage Subscription"}
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

      {/* Plans Comparison */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6">Compare Plans</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`flex flex-col ${
                plan.id === currentPlan ? "border-primary border-2" : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                  {plan.id === currentPlan && (
                    <Badge variant="default">Current</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div>
                  <p className="text-3xl font-bold">
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                  </p>
                  {plan.price > 0 && (
                    <p className="text-sm text-muted-foreground">
                      per {plan.interval}
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <svg
                        className="h-4 w-4 text-secondary"
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

                {plan.id !== currentPlan && plan.id !== "free" && (
                  <Button className="w-full" disabled>
                    Coming Soon
                  </Button>
                )}

                {plan.id === currentPlan && plan.id !== "free" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleManageSubscription}
                    disabled={isLoading}
                  >
                    {isLoading ? "Loading..." : "Manage"}
                  </Button>
                )}

                {plan.id === "free" && currentPlan === "free" && (
                  <Button disabled className="w-full">
                    Current Plan
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View your past invoices and payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No invoices yet. Upgrade to see your billing history.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Manage your payment information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No payment methods added yet
            </p>
            <Button disabled>Add Payment Method</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
