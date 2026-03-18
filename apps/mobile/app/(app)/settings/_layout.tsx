import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Zurück" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" options={{ title: "Profil" }} />
      <Stack.Screen name="about" options={{ title: "Über LogistikApp" }} />
      <Stack.Screen name="subscription" options={{ title: "Abo" }} />
    </Stack>
  );
}
