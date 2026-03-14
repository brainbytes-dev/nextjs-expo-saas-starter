import { useColorScheme as useRNColorScheme } from "react-native";
import { COLORS } from "@/theme/colors";

export function useColorScheme() {
  const colorScheme = useRNColorScheme() ?? "light";
  return {
    colorScheme,
    isDarkColorScheme: colorScheme === "dark",
    colors: COLORS[colorScheme],
    toggleColorScheme: () => {
      // No-op — use system setting
    },
  };
}
