import * as Burnt from "burnt";
import * as Haptics from "expo-haptics";
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
import { Logo } from "@/components/Logo";
import { forgotPassword } from "@/lib/auth-client";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  async function onSubmit() {
    if (!email.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      setError("E-Mail ist erforderlich");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      await forgotPassword(email.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch {
      // Fail silently to avoid revealing whether an email is registered.
      // Show success state regardless — this is intentional security behaviour.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <View className="ios:bg-card flex-1 items-center justify-center px-8">
        <Stack.Screen
          options={{
            title: "E-Mail gesendet",
            headerShadowVisible: false,
            headerLeft: () => null,
          }}
        />
        <Logo size={40} showText={false} />
        <Text variant="title1" className="ios:font-bold mt-6 pb-2 text-center">
          E-Mail gesendet!
        </Text>
        <Text className="text-muted-foreground max-w-xs text-center">
          Prüfe dein Postfach. Wir haben dir einen Link zum Zurücksetzen gesendet.
        </Text>
        <Button className="mt-8" size="lg" onPress={() => router.back()}>
          <Text>Zurück zum Login</Text>
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
          title: "Passwort vergessen",
          headerShadowVisible: false,
          headerLeft() {
            return (
              <Button
                variant="plain"
                className="ios:px-0"
                onPressOut={() => router.back()}
              >
                <Text className="text-primary">Abbrechen</Text>
              </Button>
            );
          },
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
            <Logo size={40} showText={false} />
            <Text
              variant="title1"
              className="ios:font-bold pb-1 pt-4 text-center"
            >
              {Platform.select({
                ios: "Passwort vergessen?",
                default: "Passwort zurücksetzen",
              })}
            </Text>
            <Text className="ios:text-sm text-muted-foreground text-center">
              {Platform.select({
                ios: "Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.",
                default: "Passwort zurücksetzen",
              })}
            </Text>
          </View>
          <View className="ios:pt-4 pt-6">
            <Form className="gap-2">
              <FormSection className="ios:bg-background">
                <FormItem>
                  <TextField
                    placeholder={Platform.select({
                      ios: "E-Mail",
                      default: "",
                    })}
                    label={Platform.select({
                      ios: undefined,
                      default: "E-Mail",
                    })}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) setError("");
                    }}
                    onSubmitEditing={onSubmit}
                    submitBehavior="submit"
                    autoFocus
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    errorMessage={error || undefined}
                  />
                </FormItem>
              </FormSection>
            </Form>
          </View>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardStickyView
        offset={{
          closed: 0,
          opened: Platform.select({
            ios: insets.bottom + 30,
            default: insets.bottom,
          }),
        }}
      >
        {Platform.OS === "ios" ? (
          <View className="px-12 py-4">
            <Button size="lg" onPress={onSubmit} disabled={isLoading}>
              <Text>{isLoading ? "Wird gesendet..." : "Link senden"}</Text>
            </Button>
          </View>
        ) : (
          <View className="flex-row justify-end py-4 pl-6 pr-8">
            <Button onPress={onSubmit} disabled={isLoading}>
              <Text className="text-sm">
                {isLoading ? "Wird gesendet..." : "Link senden"}
              </Text>
            </Button>
          </View>
        )}
      </KeyboardStickyView>
    </View>
  );
}
