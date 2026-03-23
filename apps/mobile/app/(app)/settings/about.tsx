import { Stack } from "expo-router";
import { ScrollView, View } from "react-native";

import { Logo } from "@/components/Logo";
import { Text } from "@/components/nativewindui/Text";

export default function AboutScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Über Zentory" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="p-5"
      >
        <View className="items-center pt-4 pb-8">
          <Logo size={48} showText={false} />
        </View>

        <View className="gap-4">
          <Text variant="title2" className="mb-1">
            Zentory
          </Text>

          <Text variant="body">
            Zentory ist die Inventar-Management Lösung für Schweizer KMU.
            Verwalte Materialien, Werkzeuge und Schlüssel — zentral, digital
            und effizient.
          </Text>

          <Text variant="title3" className="mt-4 mb-1">
            Features
          </Text>
          <Text variant="body">• Materialverwaltung mit Bestandstracking</Text>
          <Text variant="body">• Werkzeug-Tracking mit Zuweisung</Text>
          <Text variant="body">• Barcode-Scanner für schnelle Erfassung</Text>
          <Text variant="body">• Digitale Lieferscheine</Text>
          <Text variant="body">• Multi-Standort Lagerverwaltung</Text>

          <Text variant="title3" className="mt-4 mb-1">
            Kontakt
          </Text>
          <Text variant="body">support@zentory.ch</Text>

          <Text
            variant="footnote"
            className="text-muted-foreground mt-8 text-center"
          >
            Version 1.0.0 • © 2026 Zentory
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
