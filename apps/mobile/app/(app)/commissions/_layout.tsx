import { Stack } from "expo-router";

export default function CommissionsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: "Lieferschein", headerBackTitle: "Zurück" }} />
      <Stack.Screen
        name="scan-modal"
        options={{
          title: "Artikel scannen",
          presentation: "modal",
          headerBackTitle: "Abbrechen",
        }}
      />
    </Stack>
  );
}
