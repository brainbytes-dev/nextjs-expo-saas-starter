import { Stack } from "expo-router";
import { useState } from "react";
import { Alert as RNAlert, Platform, ScrollView } from "react-native";

import { Button } from "@/components/nativewindui/Button";
import { Card } from "@/components/nativewindui/Card";
import { Text } from "@/components/nativewindui/Text";
import { purchasePackage, restorePurchases } from "@/lib/revenue-cat";

export default function SubscriptionScreen() {
  const [loading, setLoading] = useState(false);

  async function handlePurchase(packageId: string) {
    setLoading(true);
    try {
      await purchasePackage(packageId);
      RNAlert.alert("Erfolg", "Abo aktiviert!");
    } catch (e) {
      RNAlert.alert("Fehler", e instanceof Error ? e.message : "Kauf fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    try {
      await restorePurchases();
      RNAlert.alert("Erfolg", "Käufe wiederhergestellt");
    } catch (e) {
      RNAlert.alert("Fehler", e instanceof Error ? e.message : "Wiederherstellen fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

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
          Upgrade auf Pro
        </Text>
        <Text className="text-muted-foreground">
          Schalte alle Features mit einem Pro-Abo frei.
        </Text>

        <Card className="p-4 gap-2 border-2 border-primary">
          <Text variant="heading">Monatlich</Text>
          <Text className="text-muted-foreground">
            Voller Zugang, monatlich abgerechnet.
          </Text>
          <Button className="mt-2" onPress={() => handlePurchase("$rc_monthly")} disabled={loading}>
            <Text>{loading ? "Wird verarbeitet..." : "Monatlich abonnieren"}</Text>
          </Button>
        </Card>

        <Card className="p-4 gap-2">
          <Text variant="heading">Jährlich</Text>
          <Text className="text-muted-foreground">
            Spare mit jährlicher Abrechnung.
          </Text>
          <Button variant="tonal" className="mt-2" onPress={() => handlePurchase("$rc_annual")} disabled={loading}>
            <Text>{loading ? "Wird verarbeitet..." : "Jährlich abonnieren"}</Text>
          </Button>
        </Card>

        <Button variant="plain" onPress={handleRestore} disabled={loading} className="mt-2">
          <Text className="text-muted-foreground text-sm">Käufe wiederherstellen</Text>
        </Button>
      </ScrollView>
    </>
  );
}
