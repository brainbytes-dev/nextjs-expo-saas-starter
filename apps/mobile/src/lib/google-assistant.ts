/**
 * Google Assistant App Actions Bridge Layer
 *
 * Defines App Actions for Google Assistant on Android.
 * These map voice commands to deep-link intents that open specific
 * screens in the LogistikApp mobile app.
 *
 * The actual actions.xml is generated/maintained in the Android manifest.
 * This module provides the TypeScript definitions and intent handling logic.
 */

import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AppAction {
  /** Unique action identifier */
  id: string;
  /** Display name */
  title: string;
  /** Google Assistant query triggers (German) */
  queryPatterns: string[];
  /** Description for the user */
  description: string;
  /** Android intent action string */
  intentAction: string;
  /** Deep-link URI */
  deepLink: string;
  /** Material Design icon name */
  iconName: string;
}

// ---------------------------------------------------------------------------
// Action Definitions
// ---------------------------------------------------------------------------

export const APP_ACTIONS: AppAction[] = [
  {
    id: "stock_in",
    title: "Material einbuchen",
    queryPatterns: [
      "Material einbuchen in LogistikApp",
      "Ware einbuchen",
      "Bestand auffüllen",
    ],
    description:
      "Öffnet die Einbuchungs-Ansicht um Materialien zum Lager hinzuzufügen.",
    intentAction: "com.logistikapp.ACTION_STOCK_IN",
    deepLink: "logistikapp://stock-in",
    iconName: "add-circle",
  },
  {
    id: "stock_out",
    title: "Material ausbuchen",
    queryPatterns: [
      "Material ausbuchen in LogistikApp",
      "Ware entnehmen",
      "Material entnehmen",
    ],
    description:
      "Öffnet die Ausbuchungs-Ansicht um Material aus dem Lager zu entnehmen.",
    intentAction: "com.logistikapp.ACTION_STOCK_OUT",
    deepLink: "logistikapp://stock-out",
    iconName: "remove-circle",
  },
  {
    id: "tool_checkout",
    title: "Werkzeug ausleihen",
    queryPatterns: [
      "Werkzeug ausleihen in LogistikApp",
      "Gerät ausleihen",
      "Tool ausleihen",
    ],
    description: "Öffnet die Werkzeugausleihe um ein Gerät zu reservieren.",
    intentAction: "com.logistikapp.ACTION_TOOL_CHECKOUT",
    deepLink: "logistikapp://tool-checkout",
    iconName: "build",
  },
  {
    id: "query_stock",
    title: "Bestand abfragen",
    queryPatterns: [
      "Bestand abfragen in LogistikApp",
      "Lagerbestand prüfen",
      "Wie viel haben wir",
    ],
    description: "Fragt den aktuellen Lagerbestand ab und zeigt das Ergebnis.",
    intentAction: "com.logistikapp.ACTION_QUERY_STOCK",
    deepLink: "logistikapp://query-stock",
    iconName: "search",
  },
];

// ---------------------------------------------------------------------------
// actions.xml Template
// ---------------------------------------------------------------------------

/**
 * Returns the XML content for Android App Actions (actions.xml).
 * This should be placed in `android/app/src/main/res/xml/actions.xml`
 * and referenced in the AndroidManifest.xml.
 */
export function generateActionsXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<actions>
${APP_ACTIONS.map(
  (action) => `  <action intentName="actions.intent.OPEN_APP_FEATURE">
    <fulfillment urlTemplate="${action.deepLink}">
      <parameter-mapping
        intentParameter="feature"
        urlParameter="feature" />
    </fulfillment>
    <parameter name="feature">
${action.queryPatterns
  .map(
    (q) =>
      `      <entity-set-reference entitySetId="${action.id}_triggers">
        <element name="${q}" />
      </entity-set-reference>`
  )
  .join("\n")}
    </parameter>
  </action>`
).join("\n\n")}
</actions>`;
}

// ---------------------------------------------------------------------------
// Storage Key
// ---------------------------------------------------------------------------

const STORAGE_KEY = "google_assistant_enabled";

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Enable Google Assistant integration.
 * On Android this is mostly a config-time concern (actions.xml in the APK).
 * At runtime we just persist the preference.
 */
export async function enableAssistant(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    return true;
  } catch {
    return false;
  }
}

/**
 * Disable Google Assistant integration.
 */
export async function disableAssistant(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, "false");
}

/**
 * Check whether Google Assistant integration is enabled.
 */
export async function isAssistantEnabled(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const val = await AsyncStorage.getItem(STORAGE_KEY);
  return val === "true";
}

/**
 * Handle an incoming Google Assistant intent deep link.
 * Returns the screen path to navigate to, or null if unrecognised.
 */
export function handleAssistantDeepLink(
  url: string
): { screen: string; params?: Record<string, string> } | null {
  const match = APP_ACTIONS.find((a) => url.startsWith(a.deepLink));
  if (!match) return null;

  switch (match.id) {
    case "stock_in":
      return { screen: "/(app)/scanner", params: { mode: "stock-in" } };
    case "stock_out":
      return { screen: "/(app)/scanner", params: { mode: "stock-out" } };
    case "tool_checkout":
      return { screen: "/(app)/scanner", params: { mode: "tool-checkout" } };
    case "query_stock":
      return { screen: "/(app)/scanner", params: { mode: "query" } };
    default:
      return null;
  }
}
