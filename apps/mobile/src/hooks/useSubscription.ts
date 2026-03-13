import { useEffect, useState } from "react";
import {
  getCustomerInfo,
  hasActiveSubscription,
  getCurrentPlan,
  initializeRevenueCat,
  RCCustomerInfo,
  RCEntitlement,
} from "../lib/revenue-cat";

export interface SubscriptionState {
  isLoading: boolean;
  hasSubscription: boolean;
  currentPlan: string | null;
  customerInfo: RCCustomerInfo | null;
  error: Error | null;
}

/**
 * Hook to manage subscription state and RevenueCat integration
 */
export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    isLoading: true,
    hasSubscription: false,
    currentPlan: null,
    customerInfo: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const loadSubscription = async () => {
      try {
        // Initialize RevenueCat
        await initializeRevenueCat();

        if (!mounted) return;

        // Get customer info
        const customerInfo = await getCustomerInfo();
        const hasSubscription = await hasActiveSubscription();
        const currentPlan = await getCurrentPlan();

        if (!mounted) return;

        setState({
          isLoading: false,
          hasSubscription,
          currentPlan,
          customerInfo,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error("Unknown error"),
        }));
      }
    };

    loadSubscription();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

/**
 * Hook to check if user has specific entitlement
 */
export function useEntitlement(entitlementId: string) {
  const { customerInfo } = useSubscription();

  const hasEntitlement =
    customerInfo?.entitlements?.[entitlementId]?.isActive ?? false;

  return hasEntitlement;
}

/**
 * Hook for subscription expired state
 */
export function useSubscriptionExpired() {
  const { customerInfo } = useSubscription();

  if (!customerInfo || customerInfo.activeSubscriptions.length === 0) {
    return false;
  }

  const activeSubscription: RCEntitlement | undefined = customerInfo.entitlements[
    customerInfo.activeSubscriptions[0]
  ];

  if (!activeSubscription?.expirationDate) {
    return false;
  }

  const expirationDate = new Date(activeSubscription.expirationDate);
  return expirationDate < new Date();
}

/**
 * Hook to get subscription expiration date
 */
export function useSubscriptionExpirationDate() {
  const { customerInfo } = useSubscription();

  if (!customerInfo || customerInfo.activeSubscriptions.length === 0) {
    return null;
  }

  const activeSubscription: RCEntitlement | undefined = customerInfo.entitlements[
    customerInfo.activeSubscriptions[0]
  ];

  return activeSubscription?.expirationDate
    ? new Date(activeSubscription.expirationDate)
    : null;
}
