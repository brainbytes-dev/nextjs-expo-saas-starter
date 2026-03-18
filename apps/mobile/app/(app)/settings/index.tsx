import { router } from "expo-router";
import { Alert as RNAlert, Linking, Platform, View } from "react-native";

import { Button } from "@/components/nativewindui/Button";
import { Icon } from "@/components/nativewindui/Icon";
import { LargeTitleHeader } from "@/components/nativewindui/LargeTitleHeader";
import {
  List,
  ListItem,
  ListSectionHeader,
  type ListDataItem,
  type ListRenderItemInfo,
} from "@/components/nativewindui/List";
import { Text } from "@/components/nativewindui/Text";
import { cn } from "@/lib/cn";
import { signOut } from "@/lib/auth-client";
import { useSession } from "@/lib/session-store";

type SettingsItem = {
  id: string;
  title: string;
  leftView?: React.ReactNode;
  rightText?: string;
  hideChevron?: boolean;
  onPress?: () => void;
};

function IconView({ className, name }: { className?: string; name: string }) {
  return (
    <View className="px-3">
      <View
        style={{ borderCurve: "continuous" }}
        className={cn("h-7 w-7 items-center justify-center rounded-md", className)}
      >
        <Icon name={name as any} className="size-5 text-white" />
      </View>
    </View>
  );
}

function ChevronRight() {
  return <Icon name="chevron.right" className="text-muted-foreground/80 ios:size-4" />;
}

function keyExtractor(item: (SettingsItem | string)) {
  return typeof item === "string" ? item : item.id;
}

export default function SettingsScreen() {
  const { data } = useSession();
  const user = data?.user;

  function handleSignOut() {
    RNAlert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Abmelden",
        style: "destructive",
        onPress: async () => { await signOut(); },
      },
    ]);
  }

  const DATA: (SettingsItem | string)[] = [
    "Konto",
    {
      id: "account",
      title: "Profil",
      leftView: <IconView name="person.fill" className="bg-blue-500" />,
      rightText: user?.name || "—",
      onPress: () => router.push("/(app)/settings/profile"),
    },
    {
      id: "email",
      title: "E-Mail",
      leftView: <IconView name="envelope.fill" className="bg-blue-500" />,
      rightText: user?.email || "—",
      hideChevron: true,
    },
    {
      id: "subscription",
      title: "Abo verwalten",
      leftView: <IconView name="creditcard.fill" className="bg-purple-500" />,
      rightText: "Verwalten",
      onPress: () => router.push("/(app)/settings/subscription"),
    },
    "Allgemein",
    {
      id: "terms",
      title: "AGB",
      leftView: <IconView name="doc.fill" className="bg-gray-500" />,
      onPress: () => Linking.openURL("https://logistikapp.ch/agb"),
    },
    {
      id: "privacy",
      title: "Datenschutz",
      leftView: <IconView name="lock.fill" className="bg-gray-500" />,
      onPress: () => Linking.openURL("https://logistikapp.ch/datenschutz"),
    },
    {
      id: "support",
      title: "Support",
      leftView: <IconView name="questionmark.bubble.fill" className="bg-gray-500" />,
      rightText: "E-Mail",
      onPress: () => Linking.openURL("mailto:support@logistikapp.ch"),
    },
    {
      id: "about",
      title: "Über LogistikApp",
      leftView: <IconView name="info.circle.fill" className="bg-orange-500" />,
      onPress: () => router.push("/(app)/settings/about"),
    },
    "",
    {
      id: "signout",
      title: "Abmelden",
      leftView: <IconView name="rectangle.portrait.and.arrow.right" className="bg-red-500" />,
      hideChevron: true,
      onPress: handleSignOut,
    },
  ];

  function renderItem<T extends (typeof DATA)[number]>(info: ListRenderItemInfo<T>) {
    if (typeof info.item === "string") {
      return <ListSectionHeader {...info} />;
    }
    return (
      <ListItem
        className={cn(
          "ios:pl-0 pl-2",
          info.index === 0 && "ios:border-t-0 border-border/25 dark:border-border/80 border-t"
        )}
        titleClassName={cn("text-lg", info.item.id === "signout" && "text-destructive")}
        leftView={info.item.leftView}
        rightView={
          <View className="flex-1 flex-row items-center justify-center gap-2 px-4">
            {info.item.rightText && (
              <Text variant="callout" className="ios:px-0 text-muted-foreground px-2">
                {info.item.rightText}
              </Text>
            )}
            {!info.item.hideChevron && <ChevronRight />}
          </View>
        }
        onPress={info.item.onPress}
        {...info}
      />
    );
  }

  return (
    <>
      <LargeTitleHeader title="Einstellungen" backgroundColor="transparent" />
      <List
        contentContainerClassName="pt-4"
        contentInsetAdjustmentBehavior="automatic"
        variant="insets"
        data={DATA as ListDataItem[]}
        renderItem={renderItem as any}
        keyExtractor={keyExtractor as any}
        sectionHeaderAsGap
      />
    </>
  );
}
