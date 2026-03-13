import * as Sentry from "@sentry/react-native";

/**
 * Initialize Sentry for React Native / Expo
 * Captures crashes, errors, and performance issues
 */
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn("EXPO_PUBLIC_SENTRY_DSN is not set, Sentry will not be initialized");
    return;
  }

  Sentry.init({
    dsn,
    enableInExpoDevelopment: true,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.ReactNativeTracing({
        routingInstrumentation: Sentry.ReactNavigationInstrumentation,
      }),
    ],
  });
}

/**
 * Capture an exception with context
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, any>
) {
  Sentry.captureException(error, {
    tags: context?.tags || {},
  });
}

/**
 * Set user context for Sentry
 */
export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email: email,
  });
}

/**
 * Clear user context
 */
export function clearUserContext() {
  Sentry.setUser(null);
}
