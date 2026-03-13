import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useSession } from "@/lib/session-store";

export default function Index() {
  const { data, isPending } = useSession();

  if (isPending) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (data) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)" />;
}
