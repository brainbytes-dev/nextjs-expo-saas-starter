import "../global.css";
import { useEffect } from "react";
import { Slot } from "expo-router";
import * as Sentry from "@sentry/react-native";
import { PostHogProvider } from "posthog-react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { loadSession } from "@/lib/session-store";
import { loadOrgId } from "@/lib/org-store";
import { initializeRevenueCat } from "@/lib/revenue-cat";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

function RootLayout() {
  useEffect(() => {
    loadSession();
    loadOrgId();
    initializeRevenueCat();
  }, []);

  return (
    <KeyboardProvider>
      <Slot />
    </KeyboardProvider>
  );
}

function App() {
  if (POSTHOG_KEY) {
    return (
      <PostHogProvider apiKey={POSTHOG_KEY} options={{ host: POSTHOG_HOST }}>
        <RootLayout />
      </PostHogProvider>
    );
  }

  return <RootLayout />;
}

export default Sentry.wrap(App);
