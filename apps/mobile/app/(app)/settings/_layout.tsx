import { Stack } from "expo-router";
import { useColorScheme } from "@/lib/useColorScheme";

export default function SettingsLayout() {
  const { colors, isDarkColorScheme } = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Zurück",
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" options={{ title: "Profil" }} />
      <Stack.Screen name="appearance" options={{ title: "Darstellung" }} />
      <Stack.Screen name="about" options={{ title: "Über LogistikApp" }} />
      <Stack.Screen name="subscription" options={{ title: "Abo" }} />
      <Stack.Screen name="two-factor" options={{ title: "Zwei-Faktor-Auth" }} />
      <Stack.Screen name="language" options={{ title: "Sprache" }} />
      <Stack.Screen name="sessions" options={{ title: "Aktive Sitzungen" }} />
    </Stack>
  );
}
