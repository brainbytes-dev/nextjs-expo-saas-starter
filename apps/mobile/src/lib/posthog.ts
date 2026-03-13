import { PostHogProvider as PostHogReactNativeProvider } from "posthog-react-native";

/**
 * Initialize PostHog for React Native / Expo
 * Tracks user events and analytics
 */
export function getPostHogConfig() {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  if (!apiKey) {
    console.warn("EXPO_PUBLIC_POSTHOG_KEY is not set, PostHog will not be initialized");
    return null;
  }

  return {
    apiKey,
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
    captureNativeAppLifecycleEvents: true,
    captureApplicationLifecycleEvents: true,
  };
}

/**
 * Track an event with PostHog
 */
export async function trackEvent(eventName: string, properties?: Record<string, any>) {
  try {
    // PostHog tracking will be handled by the provider wrapper
    // This is a placeholder for direct event tracking if needed
    console.log(`[PostHog] Event: ${eventName}`, properties);
  } catch (error) {
    console.error("Error tracking PostHog event:", error);
  }
}

/**
 * Identify a user with PostHog
 */
export async function identifyUser(userId: string, properties?: Record<string, any>) {
  try {
    console.log(`[PostHog] Identify: ${userId}`, properties);
  } catch (error) {
    console.error("Error identifying user in PostHog:", error);
  }
}
