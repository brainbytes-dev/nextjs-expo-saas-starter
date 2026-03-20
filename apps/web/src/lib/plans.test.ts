import { describe, it, expect } from "vitest"
import {
  isFeatureAvailable,
  getRequiredPlan,
  getPlanDisplayName,
  getPlanPrice,
  stripePlanIdToPlanId,
  PLAN_FEATURES,
} from "@/lib/plans"

describe("plans", () => {
  describe("isFeatureAvailable", () => {
    it("starter can access starter features (e.g. materials)", () => {
      expect(isFeatureAvailable("materials", "starter")).toBe(true)
      expect(isFeatureAvailable("tools", "starter")).toBe(true)
      expect(isFeatureAvailable("barcode_scanner", "starter")).toBe(true)
    })

    it("starter cannot access professional features", () => {
      expect(isFeatureAvailable("time_tracking", "starter")).toBe(false)
      expect(isFeatureAvailable("reports", "starter")).toBe(false)
      expect(isFeatureAvailable("budgets", "starter")).toBe(false)
    })

    it("starter cannot access enterprise features", () => {
      expect(isFeatureAvailable("rfid", "starter")).toBe(false)
      expect(isFeatureAvailable("sso", "starter")).toBe(false)
      expect(isFeatureAvailable("workflow_engine", "starter")).toBe(false)
    })

    it("professional can access starter and professional features", () => {
      expect(isFeatureAvailable("materials", "professional")).toBe(true)
      expect(isFeatureAvailable("time_tracking", "professional")).toBe(true)
      expect(isFeatureAvailable("reports", "professional")).toBe(true)
    })

    it("professional cannot access enterprise features", () => {
      expect(isFeatureAvailable("rfid", "professional")).toBe(false)
      expect(isFeatureAvailable("sso", "professional")).toBe(false)
    })

    it("enterprise can access all features", () => {
      expect(isFeatureAvailable("materials", "enterprise")).toBe(true)
      expect(isFeatureAvailable("time_tracking", "enterprise")).toBe(true)
      expect(isFeatureAvailable("rfid", "enterprise")).toBe(true)
      expect(isFeatureAvailable("sso", "enterprise")).toBe(true)
      expect(isFeatureAvailable("workflow_engine", "enterprise")).toBe(true)
    })

    it("unknown features are accessible (fail-open)", () => {
      expect(isFeatureAvailable("nonexistent_feature", "starter")).toBe(true)
    })
  })

  describe("getRequiredPlan", () => {
    it("returns starter for starter features", () => {
      expect(getRequiredPlan("materials")).toBe("starter")
      expect(getRequiredPlan("tools")).toBe("starter")
    })

    it("returns professional for professional features", () => {
      expect(getRequiredPlan("time_tracking")).toBe("professional")
      expect(getRequiredPlan("reports")).toBe("professional")
    })

    it("returns enterprise for enterprise features", () => {
      expect(getRequiredPlan("rfid")).toBe("enterprise")
      expect(getRequiredPlan("sso")).toBe("enterprise")
    })

    it("returns starter for unknown features", () => {
      expect(getRequiredPlan("unknown_feature")).toBe("starter")
    })
  })

  describe("getPlanDisplayName", () => {
    it("returns German display names", () => {
      expect(getPlanDisplayName("starter")).toBe("Starter")
      expect(getPlanDisplayName("professional")).toBe("Professional")
      expect(getPlanDisplayName("enterprise")).toBe("Enterprise")
    })
  })

  describe("getPlanPrice", () => {
    it("returns CHF prices", () => {
      expect(getPlanPrice("starter")).toBe("CHF 59/Mo")
      expect(getPlanPrice("professional")).toBe("CHF 199/Mo")
      expect(getPlanPrice("enterprise")).toBe("ab CHF 699/Mo")
    })
  })

  describe("stripePlanIdToPlanId", () => {
    it("maps known Stripe IDs", () => {
      expect(stripePlanIdToPlanId("price_starter_monthly")).toBe("starter")
      expect(stripePlanIdToPlanId("price_professional_monthly")).toBe("professional")
      expect(stripePlanIdToPlanId("price_enterprise_monthly")).toBe("enterprise")
    })

    it("falls back to starter for null/undefined", () => {
      expect(stripePlanIdToPlanId(null)).toBe("starter")
      expect(stripePlanIdToPlanId(undefined)).toBe("starter")
    })

    it("detects plan from embedded name", () => {
      expect(stripePlanIdToPlanId("price_1Abc_enterprise_annual")).toBe("enterprise")
      expect(stripePlanIdToPlanId("my_pro_plan")).toBe("professional")
    })

    it("defaults to starter for unrecognized IDs", () => {
      expect(stripePlanIdToPlanId("price_xyz_unknown")).toBe("starter")
    })
  })

  describe("PLAN_FEATURES", () => {
    it("has features for all three tiers", () => {
      const starterOnly = PLAN_FEATURES.filter(
        (f) => f.plans.length === 3
      )
      const proFeatures = PLAN_FEATURES.filter(
        (f) => f.plans.includes("professional") && !f.plans.includes("starter")
      )
      const enterpriseOnly = PLAN_FEATURES.filter(
        (f) => f.plans.length === 1 && f.plans[0] === "enterprise"
      )
      expect(starterOnly.length).toBeGreaterThan(0)
      expect(proFeatures.length).toBeGreaterThan(0)
      expect(enterpriseOnly.length).toBeGreaterThan(0)
    })
  })
})
