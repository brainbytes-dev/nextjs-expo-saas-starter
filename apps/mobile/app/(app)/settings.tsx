import { router } from "expo-router";
import { Alert as RNAlert, Linking, Platform, View } from "react-native";

import { Avatar, AvatarFallback } from "@/components/nativewindui/Avatar";
import { Button } from "@/components/nativewindui/Button";
import { Icon } from "@/components/nativewindui/Icon";
import {
  List,
  ListItem,
  ListRenderItemInfo,
  ListSectionHeader,
} from "@/components/nativewindui/List";
import { Text } from "@/components/nativewindui/Text";
import { cn } from "@/lib/cn";
import { useSession } from "@/lib/session-store";
import { signOut } from "@/lib/auth-client";

export default function SettingsScreen() {
  const { data } = useSession();
  const user = data?.user;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  function handleSignOut() {
    RNAlert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)");
        },
      },
    ]);
  }

  const DATA: DataItem[] = [
    ...(Platform.OS !== "ios" ? (["Account"] as DataItem[]) : []),
    {
      id: "name",
      title: "Name",
      ...(Platform.OS === "ios"
        ? { value: user?.name || "—" }
        : { subTitle: user?.name || "—" }),
      onPress: () => {},
    },
    {
      id: "email",
      title: "Email",
      ...(Platform.OS === "ios"
        ? { value: user?.email || "—" }
        : { subTitle: user?.email || "—" }),
      onPress: () => {},
    },
    "gap-1",
    {
      id: "subscription",
      title: "Subscription",
      ...(Platform.OS === "ios"
        ? { value: "Manage" }
        : { subTitle: "Manage your plan" }),
      onPress: () => router.push("/(app)/subscription"),
    },
    "gap-2",
    {
      id: "support",
      title: "Support",
      onPress: () => Linking.openURL("mailto:support@example.com"),
    },
    {
      id: "privacy",
      title: "Privacy Policy",
      onPress: () => Linking.openURL("https://example.com/privacy"),
    },
    {
      id: "terms",
      title: "Terms of Service",
      onPress: () => Linking.openURL("https://example.com/terms"),
    },
  ];

  return (
    <>
      <List
        variant="insets"
        data={DATA}
        sectionHeaderAsGap={Platform.OS === "ios"}
        renderItem={renderItem}
        ListHeaderComponent={
          <ListHeaderComponent name={user?.name} initials={initials} email={user?.email} />
        }
        ListFooterComponent={
          <ListFooterComponent onSignOut={handleSignOut} />
        }
      />
    </>
  );
}

function renderItem(info: ListRenderItemInfo<DataItem>) {
  if (typeof info.item === "string") {
    return <ListSectionHeader {...info} />;
  }
  return (
    <ListItem
      titleClassName="text-lg"
      rightView={
        <View className="flex-1 flex-row items-center gap-0.5 px-2">
          {!!info.item.value && (
            <Text className="text-muted-foreground">{info.item.value}</Text>
          )}
          <Icon
            name="chevron.right"
            className="text-muted-foreground/80 ios:size-4"
          />
        </View>
      }
      onPress={info.item.onPress}
      {...info}
    />
  );
}

function ListHeaderComponent({
  name,
  initials,
  email,
}: {
  name?: string;
  initials: string;
  email?: string;
}) {
  return (
    <View className="ios:pb-8 items-center pb-4 pt-8">
      <Avatar alt="Profile" className="h-24 w-24">
        <AvatarFallback>
          <Text
            variant="largeTitle"
            className={cn(
              "dark:text-background font-medium text-white",
              Platform.OS === "ios" && "dark:text-foreground"
            )}
          >
            {initials}
          </Text>
        </AvatarFallback>
      </Avatar>
      <View className="p-1" />
      <Text variant="title1">{name || "User"}</Text>
      {email && <Text className="text-muted-foreground">{email}</Text>}
    </View>
  );
}

function ListFooterComponent({ onSignOut }: { onSignOut: () => void }) {
  return (
    <View className="ios:px-0 px-4 pt-8">
      <Button
        size="lg"
        variant={Platform.select({ ios: "primary", default: "secondary" })}
        className="border-border bg-card"
        onPress={onSignOut}
      >
        <Text className="text-destructive">Log Out</Text>
      </Button>
    </View>
  );
}

type DataItem =
  | string
  | {
      id: string;
      title: string;
      value?: string;
      subTitle?: string;
      onPress: () => void;
    };
