import { useEffect, useState, useCallback } from "react";
import {
  useColorScheme as useNativeWindColorScheme,
} from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "@/theme/colors";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme_preference";

let currentPreference: ThemePreference = "system";
let loaded = false;

type ThemeListener = (pref: ThemePreference) => void;
const listeners = new Set<ThemeListener>();

function notify() {
  for (const listener of listeners) {
    listener(currentPreference);
  }
}

/**
 * Hydrate theme preference from AsyncStorage.
 * Call once at app startup in root _layout.tsx.
 */
export async function loadThemePreference(): Promise<ThemePreference> {
  if (loaded) return currentPreference;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      currentPreference = stored;
    }
  } catch {}
  loaded = true;
  notify();
  return currentPreference;
}

/**
 * Persist a new theme preference. The actual NativeWind toggle
 * happens inside the useColorScheme() hook via nativewind's setColorScheme.
 */
export async function setThemePreference(pref: ThemePreference): Promise<void> {
  currentPreference = pref;
  notify();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, pref);
  } catch {}
}

/**
 * React hook — wraps nativewind's useColorScheme with persistence.
 */
export function useColorScheme() {
  const nw = useNativeWindColorScheme();
  const [themePreference, setLocal] = useState<ThemePreference>(currentPreference);

  useEffect(() => {
    const listener: ThemeListener = (pref) => setLocal(pref);
    listeners.add(listener);
    if (!loaded) loadThemePreference();
    return () => { listeners.delete(listener); };
  }, []);

  // Apply NativeWind color scheme whenever preference changes
  useEffect(() => {
    if (themePreference === "system") {
      nw.setColorScheme("system");
    } else {
      nw.setColorScheme(themePreference);
    }
  }, [themePreference]);

  const colorScheme = nw.colorScheme ?? "light";

  const setColorScheme = useCallback(async (pref: ThemePreference) => {
    await setThemePreference(pref);
  }, []);

  return {
    colorScheme,
    isDarkColorScheme: colorScheme === "dark",
    colors: COLORS[colorScheme],
    themePreference,
    setColorScheme,
  };
}
