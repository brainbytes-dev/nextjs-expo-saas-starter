import { Tabs } from "expo-router";
import { useSession } from "@/lib/session-store";
import { Redirect } from "expo-router";

export default function AppLayout() {
  const { data, isPending } = useSession();

  if (isPending) return null;

  if (!data) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home" }}
      />
      <Tabs.Screen
        name="subscription"
        options={{ title: "Subscription" }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings" }}
      />
    </Tabs>
  );
}
