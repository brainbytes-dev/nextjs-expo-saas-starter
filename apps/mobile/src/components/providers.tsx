import React, { useEffect } from "react";
import { PostHogProvider } from "posthog-react-native";
import * as Sentry from "@sentry/react-native";
import { getPostHogConfig } from "@/lib/posthog";
import { initSentry } from "@/lib/sentry";

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Root provider component that wraps the app with:
 * - Sentry for crash reporting and error tracking
 * - PostHog for analytics
 */
export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Initialize Sentry once on app load
    initSentry();
  }, []);

  const postHogConfig = getPostHogConfig();

  // If PostHog is not configured, just return Sentry wrapper
  if (!postHogConfig) {
    return (
      <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog>
        {children}
      </Sentry.ErrorBoundary>
    );
  }

  // Return both Sentry and PostHog providers
  return (
    <PostHogProvider
      apiKey={postHogConfig.apiKey}
      host={postHogConfig.host}
      captureNativeAppLifecycleEvents={postHogConfig.captureNativeAppLifecycleEvents}
      captureApplicationLifecycleEvents={postHogConfig.captureApplicationLifecycleEvents}
    >
      <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog>
        {children}
      </Sentry.ErrorBoundary>
    </PostHogProvider>
  );
}

/**
 * Error fallback component shown when an error occurs
 */
function ErrorFallback() {
  return (
    <div style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <h1>Something went wrong</h1>
      <p>Please restart the app</p>
    </div>
  );
}
