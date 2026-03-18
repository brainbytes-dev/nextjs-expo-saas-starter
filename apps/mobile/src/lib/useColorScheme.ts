import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme as useNativewindColorScheme } from "nativewind";
import * as React from "react";

import { COLORS } from "@/theme/colors";

export type ThemePreference = "light" | "dark" | "system";

function useColorScheme() {
  const { colorScheme, setColorScheme, toggleColorScheme } =
    useNativewindColorScheme();
  const [isDarkColorScheme, setIsDarkColorScheme] = React.useState(
    colorScheme === "dark"
  );
  const [themePreference, setThemePreference] =
    React.useState<ThemePreference>("system");

  React.useEffect(() => {
    setIsDarkColorScheme(colorScheme === "dark");
  }, [colorScheme]);

  React.useEffect(() => {
    AsyncStorage.getItem("theme").then((savedTheme) => {
      if (savedTheme) {
        setThemePreference(savedTheme as ThemePreference);
        setColorScheme(savedTheme as ThemePreference);
      }
    });
  }, []);

  function handleSetColorScheme(scheme: ThemePreference) {
    setThemePreference(scheme);
    setColorScheme(scheme);
    AsyncStorage.setItem("theme", scheme);
  }

  function handleToggleColorScheme() {
    const newScheme = colorScheme === "light" ? "dark" : "light";
    handleSetColorScheme(newScheme);
  }

  return {
    colorScheme: colorScheme ?? "light",
    isDarkColorScheme,
    setColorScheme: handleSetColorScheme,
    toggleColorScheme: handleToggleColorScheme,
    colors: COLORS[colorScheme ?? "light"] ?? COLORS.light,
    themePreference,
  };
}

// loadThemePreference is a no-op now — the hook handles loading itself
export async function loadThemePreference(): Promise<void> {}

export { useColorScheme };
