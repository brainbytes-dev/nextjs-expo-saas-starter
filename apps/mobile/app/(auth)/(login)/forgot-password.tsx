import { Stack, router } from "expo-router";
import * as React from "react";
import { Platform, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/nativewindui/Button";
import { Form, FormItem, FormSection } from "@/components/nativewindui/Form";
import { Text } from "@/components/nativewindui/Text";
import { TextField } from "@/components/nativewindui/TextField";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  function onSubmit() {
    if (!email) return;
    // TODO: call password reset API
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <View className="ios:bg-card flex-1 items-center justify-center px-8">
        <Stack.Screen options={{ title: "Check your email" }} />
        <Text variant="title1" className="pb-2 text-center">
          Email sent
        </Text>
        <Text className="text-muted-foreground text-center">
          If an account exists for {email}, you'll receive a password reset link.
        </Text>
        <Button className="mt-8" onPress={() => router.back()}>
          <Text>Back to login</Text>
        </Button>
      </View>
    );
  }

  return (
    <View
      className="ios:bg-card flex-1"
      style={{ paddingBottom: insets.bottom }}
    >
      <Stack.Screen
        options={{
          title: "Forgot Password",
          headerShadowVisible: false,
        }}
      />
      <KeyboardAwareScrollView
        bottomOffset={Platform.select({ ios: 8 })}
        bounces={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="ios:pt-12 pt-20"
      >
        <View className="ios:px-12 flex-1 px-8">
          <View className="items-center pb-1">
            <Text
              variant="title1"
              className="ios:font-bold pb-1 pt-4 text-center"
            >
              {Platform.select({
                ios: "What's your email?",
                default: "Forgot password",
              })}
            </Text>
            {Platform.OS !== "ios" && (
              <Text className="ios:text-sm text-muted-foreground text-center">
                What's your email?
              </Text>
            )}
          </View>
          <View className="ios:pt-4 pt-6">
            <Form className="gap-2">
              <FormSection className="ios:bg-background">
                <FormItem>
                  <TextField
                    placeholder={Platform.select({
                      ios: "Email",
                      default: "",
                    })}
                    label={Platform.select({
                      ios: undefined,
                      default: "Email",
                    })}
                    onChangeText={setEmail}
                    onSubmitEditing={onSubmit}
                    submitBehavior="submit"
                    autoFocus
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                </FormItem>
              </FormSection>
            </Form>
          </View>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardStickyView
        offset={{ closed: 0, opened: insets.bottom }}
      >
        {Platform.OS === "ios" ? (
          <View className="px-12 py-4">
            <Button size="lg" onPress={onSubmit}>
              <Text>Submit</Text>
            </Button>
          </View>
        ) : (
          <View className="flex-row justify-end py-4 pl-6 pr-8">
            <Button onPress={onSubmit}>
              <Text className="text-sm">Submit</Text>
            </Button>
          </View>
        )}
      </KeyboardStickyView>
    </View>
  );
}
