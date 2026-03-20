"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { type PlanId, isFeatureAvailable, getRequiredPlan, getPlanDisplayName } from "@/lib/plans"

// ─── Context Types ────────────────────────────────────────────────────────────

interface FeatureGateContextValue {
  plan: PlanId
  loaded: boolean
  enabledFeatures: string[]
  canAccess: (featureId: string) => boolean
  getRequired: (featureId: string) => PlanId
  getRequiredPlanName: (featureId: string) => string
}

const FeatureGateContext = createContext<FeatureGateContextValue>({
  plan: "starter",
  loaded: false,
  enabledFeatures: [],
  canAccess: () => true,
  getRequired: () => "starter",
  getRequiredPlanName: () => "Starter",
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function FeatureGateProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanId>("starter")
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchPlan() {
      try {
        const res = await fetch("/api/subscription/status")
        if (!res.ok) throw new Error("Failed to fetch subscription status")
        const data = await res.json()
        if (!cancelled) {
          if (data.planId) setPlan(data.planId as PlanId)
          if (Array.isArray(data.enabledFeatures)) setEnabledFeatures(data.enabledFeatures)
        }
      } catch {
        // Fail open: default to starter
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }

    void fetchPlan()
    return () => { cancelled = true }
  }, [])

  const canAccess = useCallback(
    (featureId: string) => {
      // Enterprise with managed features: check enabledFeatures array
      if (plan === "enterprise" && enabledFeatures.length > 0) {
        return enabledFeatures.includes(featureId)
      }
      // Starter/Pro or Enterprise without overrides: check plan-based access
      return isFeatureAvailable(featureId, plan)
    },
    [plan, enabledFeatures]
  )

  const getRequired = useCallback(
    (featureId: string) => getRequiredPlan(featureId),
    []
  )

  const getRequiredPlanName = useCallback(
    (featureId: string) => getPlanDisplayName(getRequiredPlan(featureId)),
    []
  )

  return (
    <FeatureGateContext.Provider
      value={{ plan, loaded, enabledFeatures, canAccess, getRequired, getRequiredPlanName }}
    >
      {children}
    </FeatureGateContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFeatureGate() {
  return useContext(FeatureGateContext)
}
