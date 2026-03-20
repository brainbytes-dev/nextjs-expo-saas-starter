/**
 * Siri Shortcuts Bridge Layer
 *
 * Registers Siri Shortcut activities so users can trigger LogistikApp
 * actions via Siri voice commands on iOS.
 *
 * Since Expo doesn't ship a first-party Siri Shortcuts module we use
 * `expo-modules-core` NativeModule bridging when available, and fall back
 * to a no-op on Android / Expo Go.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SiriShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Display title shown in the Shortcuts app */
  title: string;
  /** Suggested Siri invocation phrase */
  invocationPhrase: string;
  /** Suggested alternative phrases the user can pick from */
  suggestedPhrases: string[];
  /** Description shown in the Shortcuts app */
  description: string;
  /** Deep-link path opened when the shortcut fires */
  deepLink: string;
  /** SF Symbol name for the shortcut icon (iOS) */
  iconName: string;
}

// ---------------------------------------------------------------------------
// Shortcut Definitions
// ---------------------------------------------------------------------------

export const SHORTCUTS: SiriShortcut[] = [
  {
    id: "com.logistikapp.stockIn",
    title: "Material einbuchen",
    invocationPhrase: "Material einbuchen",
    suggestedPhrases: [
      "Ware einbuchen",
      "Bestand auffüllen",
      "Material hinzufügen",
    ],
    description:
      "Öffnet die Einbuchungs-Ansicht um Materialien zum Lager hinzuzufügen.",
    deepLink: "logistikapp://stock-in",
    iconName: "plus.circle.fill",
  },
  {
    id: "com.logistikapp.stockOut",
    title: "Material ausbuchen",
    invocationPhrase: "Material ausbuchen",
    suggestedPhrases: [
      "Ware ausbuchen",
      "Material entnehmen",
      "Bestand entnehmen",
    ],
    description:
      "Öffnet die Ausbuchungs-Ansicht um Material aus dem Lager zu entnehmen.",
    deepLink: "logistikapp://stock-out",
    iconName: "minus.circle.fill",
  },
  {
    id: "com.logistikapp.toolCheckout",
    title: "Werkzeug ausleihen",
    invocationPhrase: "Werkzeug ausleihen",
    suggestedPhrases: [
      "Werkzeug entnehmen",
      "Gerät ausleihen",
      "Tool ausleihen",
    ],
    description: "Öffnet die Werkzeugausleihe um ein Gerät zu reservieren.",
    deepLink: "logistikapp://tool-checkout",
    iconName: "wrench.fill",
  },
  {
    id: "com.logistikapp.queryStock",
    title: "Bestand abfragen",
    invocationPhrase: "Bestand abfragen",
    suggestedPhrases: [
      "Lagerbestand prüfen",
      "Wie viel haben wir",
      "Bestand anzeigen",
    ],
    description:
      "Fragt den aktuellen Lagerbestand ab und liest das Ergebnis vor.",
    deepLink: "logistikapp://query-stock",
    iconName: "magnifyingglass.circle.fill",
  },
];

// ---------------------------------------------------------------------------
// Storage Key
// ---------------------------------------------------------------------------

const STORAGE_KEY = "siri_shortcuts_enabled";

// ---------------------------------------------------------------------------
// Registration (iOS only)
// ---------------------------------------------------------------------------

/**
 * Attempt to load the native SiriShortcuts module. Returns null when
 * running on Android, Expo Go, or when the native module isn't linked.
 */
function getNativeModule(): {
  registerShortcut: (shortcut: {
    activityType: string;
    title: string;
    suggestedInvocationPhrase: string;
    description: string;
    deepLink: string;
  }) => Promise<void>;
  clearAllShortcuts: () => Promise<void>;
} | null {
  if (Platform.OS !== "ios") return null;

  try {
    // Attempt dynamic require — this will throw in Expo Go or if
    // the native module is not installed.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("expo-modules-core");
    return mod?.NativeModulesProxy?.SiriShortcuts ?? null;
  } catch {
    return null;
  }
}

/**
 * Register all available Siri Shortcuts with iOS.
 * No-op on Android or when the native module isn't available.
 */
export async function registerShortcuts(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;

  const native = getNativeModule();
  if (!native) {
    // Fallback: store intent so the app can surface instructions to the user
    console.log("[Siri] Native module not available — using suggestion-only mode");
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    return true;
  }

  try {
    for (const shortcut of SHORTCUTS) {
      await native.registerShortcut({
        activityType: shortcut.id,
        title: shortcut.title,
        suggestedInvocationPhrase: shortcut.invocationPhrase,
        description: shortcut.description,
        deepLink: shortcut.deepLink,
      });
    }

    await AsyncStorage.setItem(STORAGE_KEY, "true");
    return true;
  } catch (error) {
    console.warn("[Siri] Failed to register shortcuts:", error);
    return false;
  }
}

/**
 * Unregister / clear all Siri Shortcuts.
 */
export async function clearShortcuts(): Promise<void> {
  const native = getNativeModule();
  if (native) {
    try {
      await native.clearAllShortcuts();
    } catch {
      // Ignore — module may not support clearing
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY, "false");
}

/**
 * Check whether shortcuts have been registered in this session.
 */
export async function isShortcutsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEY);
  return val === "true";
}

/**
 * Handle an incoming Siri Shortcut deep link.
 * Returns the screen path to navigate to, or null if unrecognised.
 */
export function handleShortcutDeepLink(
  url: string
): { screen: string; params?: Record<string, string> } | null {
  const match = SHORTCUTS.find((s) => url.startsWith(s.deepLink));
  if (!match) return null;

  switch (match.id) {
    case "com.logistikapp.stockIn":
      return { screen: "/(app)/scanner", params: { mode: "stock-in" } };
    case "com.logistikapp.stockOut":
      return { screen: "/(app)/scanner", params: { mode: "stock-out" } };
    case "com.logistikapp.toolCheckout":
      return { screen: "/(app)/scanner", params: { mode: "tool-checkout" } };
    case "com.logistikapp.queryStock":
      return { screen: "/(app)/scanner", params: { mode: "query" } };
    default:
      return null;
  }
}
