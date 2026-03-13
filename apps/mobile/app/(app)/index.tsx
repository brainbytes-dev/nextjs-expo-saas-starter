import { router } from "expo-router";
import { Platform, View } from "react-native";

import { Button } from "@/components/nativewindui/Button";
import { Card } from "@/components/nativewindui/Card";
import { Icon } from "@/components/nativewindui/Icon";
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader";
import { Text } from "@/components/nativewindui/Text";
import { useSession } from "@/lib/session-store";
import { SubscriptionBadge } from "@/components/subscription-badge";

export default function HomeScreen() {
  const { data } = useSession();
  const user = data?.user;

  return (
    <>
      <LargeTitleHeader
        title="Home"
        backgroundColor="transparent"
      />
      <View className="flex-1 px-4 pt-4 gap-4">
        <Card className="p-4 gap-2">
          <Text variant="heading">
            Welcome{user?.name ? `, ${user.name}` : ""}
          </Text>
          <Text className="text-muted-foreground">{user?.email}</Text>
        </Card>

        <Card className="p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text variant="heading">Subscription</Text>
            <SubscriptionBadge plan="Free" isActive={false} />
          </View>
          <Text className="text-muted-foreground">
            Upgrade to unlock all features.
          </Text>
          <Button
            variant="tonal"
            onPress={() => router.push("/(app)/subscription")}
          >
            <Text>View Plans</Text>
          </Button>
        </Card>
      </View>
    </>
  );
}
