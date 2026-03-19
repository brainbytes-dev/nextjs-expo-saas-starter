import { Stack } from "expo-router";
import { Linking, Platform, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/nativewindui/Button";
import { Card } from "@/components/nativewindui/Card";
import { Text } from "@/components/nativewindui/Text";

const APP_URL = process.env.EXPO_PUBLIC_APP_URL || "https://logistikapp.ch";

export default function SubscriptionScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Abo",
          headerBackTitle: "Zurück",
          ...(Platform.OS === "ios"
            ? { headerTransparent: true, headerBlurEffect: "systemMaterial" }
            : {}),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <Text variant="title1" className="font-bold">
          Abo verwalten
        </Text>
        <Text className="text-muted-foreground">
          Verwalte dein Abonnement über die Web-App. Dort kannst du deinen Plan
          ändern, Rechnungen einsehen und Zahlungsmethoden aktualisieren.
        </Text>

        <Card className="p-5 gap-3">
          <View className="flex-row items-center gap-3">
            <Ionicons name="card-outline" size={24} color="#F97316" />
            <Text variant="heading">Abrechnung & Rechnungen</Text>
          </View>
          <Text className="text-muted-foreground text-sm">
            Abo-Status, Plan wechseln, Rechnungen herunterladen und
            Zahlungsmethode ändern.
          </Text>
          <Button
            className="mt-1"
            onPress={() => Linking.openURL(`${APP_URL}/dashboard/billing`)}
          >
            <Text className="text-white font-medium">
              Abo im Browser verwalten
            </Text>
          </Button>
        </Card>

        <Card className="p-5 gap-3">
          <View className="flex-row items-center gap-3">
            <Ionicons name="pricetags-outline" size={24} color="#F97316" />
            <Text variant="heading">Pläne & Preise</Text>
          </View>
          <Text className="text-muted-foreground text-sm">
            Vergleiche unsere Pläne: Starter, Professional und Enterprise.
          </Text>
          <Button
            variant="tonal"
            className="mt-1"
            onPress={() => Linking.openURL(`${APP_URL}/pricing`)}
          >
            <Text className="font-medium">Preise ansehen</Text>
          </Button>
        </Card>
      </ScrollView>
    </>
  );
}
