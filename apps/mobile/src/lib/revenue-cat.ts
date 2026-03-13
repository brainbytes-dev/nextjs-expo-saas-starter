import Purchases, { PurchasesPackage } from "react-native-purchases";

/**
 * RevenueCat Configuration for In-App Purchases
 * Handles Apple StoreKit, Google Play Billing, and Stripe Integration
 */

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "";

export interface RCEntitlement {
  identifier: string;
  isActive: boolean;
  willRenew: boolean;
  latestPurchaseDate: string | null;
  originalPurchaseDate: string | null;
  expirationDate: string | null;
}

export interface RCSubscription {
  identifier: string;
  latestPurchaseDate: string | null;
  originalPurchaseDate: string | null;
  expirationDate: string | null;
  store: "app_store" | "play_store" | "stripe";
  purchaseDate: string;
  isSandbox: boolean;
}

export interface RCCustomerInfo {
  entitlements: Record<string, RCEntitlement>;
  activeSubscriptions: string[];
  allPurchasedProductIdentifiers: string[];
  originalAppUserId: string;
  originalApplicationVersion: string | null;
  originalPurchaseDate: string | null;
  requestDate: string;
  managementURL: string | null;
}

/**
 * Initialize RevenueCat SDK
 * Call this once at app startup
 */
export const initializeRevenueCat = async () => {
  if (!REVENUECAT_API_KEY) {
    console.warn(
      "RevenueCat API key not set. In-app purchases will not work. Set EXPO_PUBLIC_REVENUECAT_API_KEY in .env.local"
    );
    return;
  }

  try {
    // Configure RevenueCat
    Purchases.setDebugLogsEnabled(true); // Set to false in production
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
    });

    console.log("RevenueCat initialized successfully");
  } catch (error) {
    console.error("Failed to initialize RevenueCat:", error);
  }
};

/**
 * Get current user's customer info and entitlements
 */
export const getCustomerInfo = async (): Promise<RCCustomerInfo | null> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo as unknown as RCCustomerInfo;
  } catch (error) {
    console.error("Error fetching customer info:", error);
    return null;
  }
};

/**
 * Get available products/packages for purchase
 */
export const getOfferings = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings;
  } catch (error) {
    console.error("Error fetching offerings:", error);
    return null;
  }
};

/**
 * Purchase a subscription
 */
export const purchasePackage = async (packageId: string) => {
  try {
    const offerings = await Purchases.getOfferings();

    if (!offerings.current) {
      throw new Error("No current offering available");
    }

    const package_ = offerings.current.availablePackages.find(
      (pkg: PurchasesPackage) => pkg.identifier === packageId
    );

    if (!package_) {
      throw new Error(`Package ${packageId} not found`);
    }

    const result = await Purchases.purchasePackage(package_);

    return {
      success: true,
      customerInfo: result.customerInfo,
      transaction: result.transaction,
    };
  } catch (error) {
    console.error("Error purchasing package:", error);
    throw error;
  }
};

/**
 * Check if user has active subscription
 */
export const hasActiveSubscription = async (): Promise<boolean> => {
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) return false;

    return customerInfo.activeSubscriptions.length > 0;
  } catch (error) {
    console.error("Error checking subscription:", error);
    return false;
  }
};

/**
 * Get user's current plan
 */
export const getCurrentPlan = async (): Promise<string | null> => {
  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo || customerInfo.activeSubscriptions.length === 0) {
      return "free";
    }

    return customerInfo.activeSubscriptions[0];
  } catch (error) {
    console.error("Error getting current plan:", error);
    return null;
  }
};

/**
 * Restore purchases (for users switching devices)
 */
export const restorePurchases = async () => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("Error restoring purchases:", error);
    throw error;
  }
};

/**
 * Manage subscription (open app store/play store subscription management)
 */
export const manageSubscription = async () => {
  try {
    const customerInfo = await getCustomerInfo();
    if (customerInfo?.managementURL) {
      // In a real app, you'd open this URL with Linking
      console.log("Open subscription management:", customerInfo.managementURL);
    }
  } catch (error) {
    console.error("Error managing subscription:", error);
  }
};

/**
 * Set user ID for tracking (call after user logs in)
 */
export const setUserID = async (userId: string) => {
  try {
    await Purchases.logIn(userId);
    console.log("User logged in to RevenueCat:", userId);
  } catch (error) {
    console.error("Error setting user ID:", error);
  }
};

/**
 * Clear user ID for tracking (call on logout)
 */
export const clearUserID = async () => {
  try {
    await Purchases.logOut();
    console.log("User logged out from RevenueCat");
  } catch (error) {
    console.error("Error clearing user ID:", error);
  }
};
