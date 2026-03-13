import { router, Stack } from "expo-router";
import { Platform } from "react-native";

import { Button } from "@/components/nativewindui/Button";
import { Text } from "@/components/nativewindui/Text";

export default function CreateAccountLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={INDEX_SCREEN_OPTIONS} />
      <Stack.Screen name="credentials" options={CREDENTIALS_SCREEN_OPTIONS} />
    </Stack>
  );
}

const INDEX_SCREEN_OPTIONS = {
  headerShown: Platform.OS === "ios",
  headerShadowVisible: false,
  title: "Create Account",
  headerLeft() {
    return (
      <Button
        variant="plain"
        className="ios:px-0"
        onPressOut={() => router.back()}
      >
        <Text className="text-primary">Cancel</Text>
      </Button>
    );
  },
} as const;

const CREDENTIALS_SCREEN_OPTIONS = {
  headerShown: Platform.OS === "ios",
  headerShadowVisible: false,
  title: "Create Account",
  headerLeft() {
    return (
      <Button
        variant="plain"
        className="ios:px-0"
        onPressOut={() => router.back()}
      >
        <Text className="text-primary">Back</Text>
      </Button>
    );
  },
} as const;
