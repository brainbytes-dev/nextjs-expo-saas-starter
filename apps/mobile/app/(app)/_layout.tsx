import { Tabs, Redirect } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "@/lib/session-store";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  name,
  focused,
  color,
}: {
  name: IoniconsName;
  focused: boolean;
  color: string;
}) {
  return <Ionicons name={focused ? name : (`${name}-outline` as IoniconsName)} size={24} color={color} />;
}

export default function AppLayout() {
  const { data, isPending } = useSession();

  if (isPending) return null;
  if (!data) return <Redirect href="/(auth)" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#f97316", // primary orange
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          borderTopWidth: 0.5,
          ...(Platform.OS === "ios" ? {} : { elevation: 8 }),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Übersicht",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="barcode" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="commissions"
        options={{
          title: "Lieferscheine",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="document-text" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Einstellungen",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="settings" focused={focused} color={color} />
          ),
        }}
      />
      {/* Hidden screens — accessible via navigation but not in tab bar */}
      <Tabs.Screen name="subscription" options={{ href: null }} />
    </Tabs>
  );
}
