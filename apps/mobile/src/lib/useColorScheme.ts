import { useCallback, useEffect, useState } from "react";
import { useColorScheme as useNativeWindColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "@/theme/colors";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme_preference";

// Module-level state so loadThemePreference can run before hooks mount
let storedPreference: ThemePreference = "system";
let loaded = false;

type Listener = () => void;
const listeners = new Set<Listener>();

/**
 * Call once at app startup. Reads the persisted preference so the hook
 * can apply it on first mount.
 */
export async function loadThemePreference(): Promise<void> {
  if (loaded) return;
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY);
    if (val === "light" || val === "dark" || val === "system") {
      storedPreference = val;
    }
  } catch {}
  loaded = true;
  for (const l of listeners) l();
}

/**
 * React hook — wraps NativeWind's useColorScheme with persistence.
 */
export function useColorScheme() {
  const nw = useNativeWindColorScheme();
  const [themePreference, setThemePref] = useState<ThemePreference>(storedPreference);
  const [applied, setApplied] = useState(false);

  // When stored preference loads, apply to NativeWind once
  useEffect(() => {
    function applyStored() {
      setThemePref(storedPreference);
      nw.setColorScheme(storedPreference);
      setApplied(true);
    }

    if (loaded) {
      applyStored();
    } else {
      const listener = () => applyStored();
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }
  }, []);

  const effectiveScheme = nw.colorScheme === "dark" ? "dark" : "light";

  const setColorScheme = useCallback(
    async (pref: ThemePreference) => {
      storedPreference = pref;
      setThemePref(pref);
      nw.setColorScheme(pref);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, pref);
      } catch {}
    },
    [nw.setColorScheme]
  );

  return {
    colorScheme: effectiveScheme,
    isDarkColorScheme: effectiveScheme === "dark",
    colors: COLORS[effectiveScheme],
    themePreference,
    setColorScheme,
  };
}
