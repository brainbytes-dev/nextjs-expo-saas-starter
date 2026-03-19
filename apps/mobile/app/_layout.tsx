import "../global.css";
import { useEffect } from "react";
import { View } from "react-native";
import { Slot } from "expo-router";
import { router } from "expo-router";
import * as Sentry from "@sentry/react-native";
import * as Notifications from "expo-notifications";
import { PostHogProvider } from "posthog-react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { loadSession } from "@/lib/session-store";
import { loadOrgId } from "@/lib/org-store";
import { loadQueue } from "@/lib/offline-queue";
import { loadThemePreference, useColorScheme } from "@/lib/useColorScheme";
import { lightVars, darkVars } from "@/lib/theme-vars";
import { ToastOverlay } from "@/components/toast-overlay";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

function RootLayout() {
  const { colorScheme, colors } = useColorScheme();

  useEffect(() => {
    loadSession();
    loadQueue();
    loadOrgId();
    loadThemePreference();
  }, []);

  // Handle deep-link navigation triggered by a tapped notification.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<
          string,
          unknown
        >;
        if (data?.screen === "commission" && typeof data.id === "string") {
          router.push(`/(app)/commissions/${data.id}`);
        } else if (data?.screen === "dashboard") {
          router.push("/(app)");
        }
      }
    );
    return () => sub.remove();
  }, []);

  // Switch CSS variables based on color scheme — NativeWind's vars() API
  // is the only way to make :root/.dark CSS variables work on React Native.
  const themeStyle = colorScheme === "dark" ? darkVars : lightVars;

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, themeStyle]}>
      <KeyboardProvider>
        <Slot />
        <ToastOverlay />
      </KeyboardProvider>
    </View>
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
