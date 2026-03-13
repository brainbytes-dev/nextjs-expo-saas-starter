import { useState } from "react";
import { Alert as RNAlert, View } from "react-native";

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
      RNAlert.alert("Success", "Subscription activated!");
    } catch (e) {
      RNAlert.alert(
        "Error",
        e instanceof Error ? e.message : "Purchase failed"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    try {
      await restorePurchases();
      RNAlert.alert("Success", "Purchases restored");
    } catch (e) {
      RNAlert.alert(
        "Error",
        e instanceof Error ? e.message : "Restore failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 px-4 pt-8 gap-4">
      <View className="gap-2 pb-4">
        <Text variant="title1" className="font-bold">
          Upgrade to Pro
        </Text>
        <Text className="text-muted-foreground">
          Unlock all features with a Pro subscription.
        </Text>
      </View>

      <Card className="p-4 gap-2 border-2 border-primary">
        <Text variant="heading">Monthly</Text>
        <Text className="text-muted-foreground">
          Full access to all features, billed monthly.
        </Text>
        <Button
          className="mt-2"
          onPress={() => handlePurchase("$rc_monthly")}
          disabled={loading}
        >
          <Text>{loading ? "Processing..." : "Subscribe Monthly"}</Text>
        </Button>
      </Card>

      <Card className="p-4 gap-2">
        <Text variant="heading">Yearly</Text>
        <Text className="text-muted-foreground">
          Save with annual billing.
        </Text>
        <Button
          variant="tonal"
          className="mt-2"
          onPress={() => handlePurchase("$rc_annual")}
          disabled={loading}
        >
          <Text>{loading ? "Processing..." : "Subscribe Yearly"}</Text>
        </Button>
      </Card>

      <Button
        variant="plain"
        onPress={handleRestore}
        disabled={loading}
        className="mt-4"
      >
        <Text className="text-muted-foreground text-sm">
          Restore Purchases
        </Text>
      </Button>
    </View>
  );
}
