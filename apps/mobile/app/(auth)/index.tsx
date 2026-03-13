import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import * as React from "react";
import { Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/nativewindui/Button";
import { Text } from "@/components/nativewindui/Text";

export default function AuthIndexScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="ios:justify-end flex-1 justify-center gap-4 px-8 py-4">
        <View className="ios:pb-5 ios:pt-2 pb-2">
          <Text className="ios:font-extrabold text-center text-3xl font-medium">
            Welcome to
          </Text>
          <Text className="ios:font-extrabold pb-3.5 text-center text-3xl font-medium">
            Your App
          </Text>
          <Text className="text-center text-sm opacity-80">
            Sign up or log in to get started.
          </Text>
        </View>
        <Link href="/(auth)/(create-account)" asChild>
          <Button
            size={Platform.select({ ios: "lg", default: "md" })}
            onPressOut={lightHaptic}
          >
            <Text>Sign up free</Text>
          </Button>
        </Link>
        <Link href="/(auth)/(login)" asChild>
          <Button
            variant="plain"
            size={Platform.select({ ios: "lg", default: "md" })}
            onPressOut={lightHaptic}
          >
            <Text className="text-primary">Log in</Text>
          </Button>
        </Link>
      </View>
    </SafeAreaView>
  );
}

function lightHaptic() {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
