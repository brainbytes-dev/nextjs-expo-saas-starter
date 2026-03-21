import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs, Redirect } from "expo-router";
import * as React from "react";
import { Platform, Pressable, PressableProps, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/nativewindui/Icon";
import { Text } from "@/components/nativewindui/Text";
import { cn } from "@/lib/cn";
import { useColorScheme } from "@/lib/useColorScheme";
import { useSession } from "@/lib/session-store";
import { isDemoMode } from "@/lib/demo/config";
import { DemoBanner } from "@/components/demo-banner";
import { OfflineBanner } from "@/components/offline-banner";
import {
  registerForPushNotifications,
  isNotificationsEnabled,
} from "@/lib/notifications";
import { useConflicts } from "@/lib/conflict-resolver";

export default function AppLayout() {
  const { data, isPending } = useSession();
  const { colors } = useColorScheme();
  const { unresolvedCount } = useConflicts();

  // Re-register the push token on every launch when the user has previously
  // opted in (covers token rotation and server-side deactivation recovery).
  React.useEffect(() => {
    if (!data) return;
    isNotificationsEnabled().then((enabled) => {
      if (enabled) registerForPushNotifications();
    });
  }, [data]);

  if (isPending) return null;
  if (!data) return <Redirect href="/(auth)" />;

  return (
    <>
      <Tabs
      tabBar={TAB_BAR}
      sceneStyle={{ backgroundColor: colors.background }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.grey2,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
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
            <Icon
              name={focused ? "house.fill" : ("house" as any)}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          tabBarIcon: ({ focused, color }) => (
            <Icon
              name={
                focused
                  ? "barcode.viewfinder"
                  : ("barcode.viewfinder" as any)
              }
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="commissions"
        options={{
          title: "Lieferscheine",
          tabBarIcon: ({ focused, color }) => (
            <Icon
              name={focused ? "doc.text.fill" : ("doc.text" as any)}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: "Sync",
          tabBarIcon: ({ focused, color }) => (
            <View>
              <Icon
                name={focused ? "arrow.triangle.2.circlepath" : ("arrow.triangle.2.circlepath" as any)}
                color={color}
                size={24}
              />
              {unresolvedCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -6,
                    backgroundColor: "#ef4444",
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 3,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: "700",
                      lineHeight: 14,
                    }}
                  >
                    {unresolvedCount > 9 ? "9+" : unresolvedCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Einstellungen",
          tabBarIcon: ({ focused, color }) => (
            <Icon
              name={focused ? "gearshape.fill" : ("gearshape" as any)}
              color={color}
              size={24}
            />
          ),
        }}
      />
      {/* Hidden screens that exist as files but should not appear as tabs */}
      <Tabs.Screen name="deliveries" options={{ href: null }} />
      <Tabs.Screen name="warranty-claims" options={{ href: null }} />
      <Tabs.Screen name="nfc" options={{ href: null }} />
      <Tabs.Screen name="geofencing" options={{ href: null }} />
      <Tabs.Screen name="watch" options={{ href: null }} />
      <Tabs.Screen name="beacons" options={{ href: null }} />
      <Tabs.Screen name="scanner-settings" options={{ href: null }} />
      <Tabs.Screen name="voice-assistant" options={{ href: null }} />
      <Tabs.Screen name="offline-maps" options={{ href: null }} />
      <Tabs.Screen name="time-tracking" options={{ href: null }} />
      <Tabs.Screen name="ai-chat" options={{ href: null }} />
      <Tabs.Screen name="shift-handover" options={{ href: null }} />
    </Tabs>
      {isDemoMode && <DemoBanner />}
      <OfflineBanner />
    </>
  );
}

// On iOS use the system tab bar; on Android render the Material pill bar.
const TAB_BAR = Platform.select<
  ((props: BottomTabBarProps) => React.ReactNode) | undefined
>({
  ios: undefined,
  android: (props: BottomTabBarProps) => <MaterialTabBar {...props} />,
});

// MaterialCommunityIcons names used on Android (the Android Icon fallback layer).
const TAB_ICON: Record<string, string> = {
  index: "home",
  scanner: "barcode-scan",
  commissions: "file-document-outline",
  sync: "sync",
  settings: "cog",
};

function MaterialTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { unresolvedCount } = useConflicts();

  // Build the visible routes list while keeping the original route index for
  // focus comparison against state.index.
  const visibleRoutes = state.routes
    .map((route, originalIndex) => ({ route, originalIndex }))
    .filter(({ route }) => {
      const { options } = descriptors[route.key];
      return options.href !== null;
    });

  return (
    <View
      style={{ paddingBottom: insets.bottom + 4 }}
      className="border-t-border/25 bg-card flex-row border-t pb-1 pt-3 dark:border-t-0"
    >
      {visibleRoutes.map(({ route, originalIndex }) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === originalIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const showBadge = route.name === "sync" && unresolvedCount > 0;

        return (
          <MaterialTabItem
            key={route.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            iconName={TAB_ICON[route.name] ?? "star"}
            isFocused={isFocused}
            label={label}
            activeColor={colors.primary}
            inactiveColor={colors.grey2}
            badgeCount={showBadge ? unresolvedCount : 0}
          />
        );
      })}
    </View>
  );
}

function MaterialTabItem({
  isFocused,
  iconName = "star",
  label,
  activeColor,
  inactiveColor,
  badgeCount = 0,
  className: itemClassName,
  ...pressableProps
}: {
  isFocused: boolean;
  iconName: string;
  label: string;
  activeColor: string;
  inactiveColor: string;
  badgeCount?: number;
} & Omit<PressableProps, "children">) {
  // Derive a shared value from the JS boolean so Reanimated can read it on
  // the UI thread without stale closure issues.
  const focusedDerived = useDerivedValue(() => (isFocused ? 1 : 0));

  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleX: withTiming(focusedDerived.value, { duration: 200 }),
      },
    ],
    opacity: withTiming(focusedDerived.value, { duration: 200 }),
  }));

  const iconColor = isFocused ? activeColor : inactiveColor;

  return (
    <Pressable
      className={cn("flex-1 items-center", itemClassName)}
      {...pressableProps}
    >
      <View className="h-8 w-16 items-center justify-center overflow-hidden rounded-full">
        {/* Animated pill highlight behind the icon */}
        <Animated.View
          style={[
            pillStyle,
            {
              position: "absolute",
              bottom: 0,
              top: 0,
              left: 0,
              right: 0,
              borderRadius: 100,
            },
          ]}
          className="bg-secondary dark:bg-secondary"
        />
        <Icon
          materialCommunityIcon={{ name: iconName as any, color: iconColor }}
          name="questionmark"
          size={22}
        />
        {badgeCount > 0 && (
          <View
            style={{
              position: "absolute",
              top: 2,
              right: 10,
              backgroundColor: "#ef4444",
              borderRadius: 8,
              minWidth: 14,
              height: 14,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 2,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 8, fontWeight: "700", lineHeight: 12 }}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </Text>
          </View>
        )}
      </View>
      <Text
        variant="caption2"
        className={cn("pt-1", !isFocused && "text-muted-foreground")}
      >
        {label}
      </Text>
    </Pressable>
  );
}
