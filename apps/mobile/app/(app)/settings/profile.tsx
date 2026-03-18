import { router, Stack } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
} from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardController,
} from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Form, FormItem, FormSection } from "@/components/nativewindui/Form";
import { Text } from "@/components/nativewindui/Text";
import { TextField } from "@/components/nativewindui/TextField";
import { isDemoMode } from "@/lib/demo/config";
import { getSession, setSession, useSession } from "@/lib/session-store";
import { toast } from "@/lib/burnt-shim";

const API_URL = process.env.EXPO_PUBLIC_APP_URL || "http://localhost:3003";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useSession();
  const user = data?.user;

  const nameParts = (user?.name ?? "").trim().split(/\s+/);
  const [firstName, setFirstName] = useState(nameParts[0] ?? "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" ") ?? "");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (isDemoMode) {
      toast({ title: "Im Demo-Modus nicht verfügbar", preset: "error" });
      return;
    }

    const fullName = [firstName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");

    if (!fullName) {
      toast({ title: "Bitte gib deinen Namen ein", preset: "error" });
      return;
    }

    setIsSaving(true);
    try {
      const session = getSession();
      const res = await fetch(`${API_URL}/api/auth/update-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({ name: fullName }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || res.statusText);
      }

      if (session) {
        await setSession({
          ...session,
          user: { ...session.user, name: fullName },
        });
      }

      toast({ title: "Gespeichert", preset: "done" });
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast({ title: "Fehler beim Speichern", message, preset: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Profil",
          headerBackTitle: "Zurück",
          ...(Platform.OS === "ios"
            ? { headerTransparent: true, headerBlurEffect: "systemMaterial" }
            : {}),
          headerRight: Platform.select({
            ios: () =>
              isSaving ? (
                <ActivityIndicator size="small" />
              ) : (
                <Pressable onPress={handleSave}>
                  <Text className="text-primary font-semibold">Speichern</Text>
                </Pressable>
              ),
          }),
        }}
      />

      <KeyboardAwareScrollView
        bottomOffset={8}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: insets.bottom }}
      >
        <Form className="gap-5 px-4 pt-8">
          <FormSection footnote="Dein Name wird anderen Teammitgliedern angezeigt.">
            <FormItem>
              <TextField
                textContentType="givenName"
                autoComplete="name-given"
                label={Platform.select({ ios: undefined, default: "Vorname" })}
                leftView={Platform.select({ ios: <LeftLabel>Vorname</LeftLabel> })}
                placeholder="Erforderlich"
                value={firstName}
                onChangeText={setFirstName}
                onSubmitEditing={() => KeyboardController.setFocusTo("next")}
                submitBehavior="submit"
                enterKeyHint="next"
              />
            </FormItem>
            <FormItem>
              <TextField
                textContentType="familyName"
                autoComplete="name-family"
                label={Platform.select({ ios: undefined, default: "Nachname" })}
                leftView={Platform.select({ ios: <LeftLabel>Nachname</LeftLabel> })}
                placeholder="Erforderlich"
                value={lastName}
                onChangeText={setLastName}
                onSubmitEditing={handleSave}
                enterKeyHint="done"
              />
            </FormItem>
          </FormSection>

          <FormSection footnote="Die E-Mail-Adresse kann nicht geändert werden.">
            <FormItem>
              <TextField
                textContentType="emailAddress"
                label={Platform.select({ ios: undefined, default: "E-Mail" })}
                leftView={Platform.select({ ios: <LeftLabel>E-Mail</LeftLabel> })}
                value={user?.email ?? ""}
                editable={false}
              />
            </FormItem>
          </FormSection>

          {Platform.OS !== "ios" && (
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="self-end bg-primary rounded-lg px-6 py-3"
            >
              {isSaving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-white font-semibold">Speichern</Text>
              )}
            </Pressable>
          )}
        </Form>
      </KeyboardAwareScrollView>
    </>
  );
}

function LeftLabel({ children }: { children: string }) {
  return (
    <Pressable className="w-28 justify-center pl-2">
      <Text className="font-medium">{children}</Text>
    </Pressable>
  );
}
