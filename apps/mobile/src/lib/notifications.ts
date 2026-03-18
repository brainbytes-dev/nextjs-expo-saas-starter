/**
 * Push Notifications module for LogistikApp mobile.
 *
 * Handles permission requests, Expo push token registration / deregistration,
 * and syncing the token with the web API.  All operations are best-effort and
 * will never throw to the caller.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSession } from "./session-store";
import { isDemoMode } from "./demo/config";

const NOTIFICATIONS_KEY = "notifications_enabled";
const API_URL = process.env.EXPO_PUBLIC_APP_URL || "http://localhost:3003";

// Configure how incoming notifications are presented while the app is in the
// foreground.  Must be called before any component mounts.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission and register the device for push notifications.
 * Stores the Expo push token on the server for this user.
 *
 * @returns The Expo push token string, or null if unavailable / denied.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // In demo mode or simulator, just persist the preference without real registration
  if (isDemoMode || !Device.isDevice) {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, "true");
    return "demo-token";
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, "false");
    return null;
  }

  // Android requires an explicit notification channel.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "LogistikApp",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563eb",
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  });
  const token = tokenData.data;

  // Register on server — non-fatal if it fails; will retry on next launch.
  const session = getSession();
  if (session?.token) {
    try {
      await fetch(`${API_URL}/api/push-tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ token, platform: Platform.OS }),
      });
    } catch {
      // Silently swallow — the stored preference will trigger a retry.
    }
  }

  await AsyncStorage.setItem(NOTIFICATIONS_KEY, "true");
  return token;
}

/**
 * Deactivate the push token on the server and clear the stored preference.
 * Called on sign-out or when the user disables notifications in settings.
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (isDemoMode) return;

  const session = getSession();
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });
    if (session?.token) {
      await fetch(`${API_URL}/api/push-tokens`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ token: tokenData.data }),
      });
    }
  } catch {
    // Best-effort — token will expire naturally.
  }

  await AsyncStorage.setItem(NOTIFICATIONS_KEY, "false");
}

/**
 * Returns whether the user has previously enabled push notifications.
 */
export async function isNotificationsEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
  return stored === "true";
}
