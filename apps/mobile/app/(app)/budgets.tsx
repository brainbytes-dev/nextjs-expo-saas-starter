import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Text } from "@/components/nativewindui/Text";
import { ActivityIndicator } from "@/components/nativewindui/ActivityIndicator";
import { useColorScheme } from "@/lib/useColorScheme";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────

interface Budget {
  id: string;
  name: string;
  amount: number; // total budget in CHF (cents)
  spent: number; // spent so far in CHF (cents)
  period: string; // monthly, quarterly, yearly
  startDate: string;
  endDate: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatCHF(cents: number): string {
  return `CHF ${(cents / 100).toLocaleString("de-CH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case "weekly":
      return "Wöchentlich";
    case "monthly":
      return "Monatlich";
    case "quarterly":
      return "Quartalsweise";
    case "yearly":
      return "Jährlich";
    default:
      return period;
  }
}

function getProgressColor(percent: number): { color: string; bg: string } {
  if (percent > 100) return { color: "#ef4444", bg: "#fef2f2" };
  if (percent >= 80) return { color: "#eab308", bg: "#fefce8" };
  return { color: "#16a34a", bg: "#f0fdf4" };
}

// ── Screen ─────────────────────────────────────────────────────────────

export default function BudgetsScreen() {
  const { colors } = useColorScheme();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await api.get<{ data: Budget[] }>("/api/budgets");
      setBudgets(res.data);
    } catch {
      // Keep last known data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBudgets();
  }, [fetchBudgets]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]} className="bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Title */}
        <Text variant="largeTitle" className="font-bold">
          Budgets
        </Text>

        {/* Content */}
        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator />
          </View>
        ) : budgets.length === 0 ? (
          <View className="items-center py-12 gap-3">
            <Ionicons name="wallet-outline" size={48} color={colors.grey3} />
            <Text className="text-muted-foreground text-sm">
              Keine Budgets vorhanden
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {budgets.map((budget) => (
              <BudgetCard key={budget.id} budget={budget} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── BudgetCard ─────────────────────────────────────────────────────────

function BudgetCard({ budget }: { budget: Budget }) {
  const percent = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  const remaining = budget.amount - budget.spent;
  const { color, bg } = getProgressColor(percent);
  const clampedPercent = Math.min(percent, 100);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View
            style={[styles.iconWrap, { backgroundColor: bg }]}
          >
            <Ionicons name="wallet" size={22} color={color} />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-[15px]" numberOfLines={1}>
              {budget.name}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {formatCHF(budget.amount)}
            </Text>
          </View>
        </View>

        {/* Period badge */}
        <View style={[styles.badge, { backgroundColor: "#f0f9ff" }]}>
          <Text style={{ color: "#0ea5e9", fontSize: 11, fontWeight: "700" }}>
            {getPeriodLabel(budget.period)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View className="mt-3">
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${clampedPercent}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>

        {/* Stats row */}
        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs text-muted-foreground">
            Ausgegeben: {formatCHF(budget.spent)}
          </Text>
          <Text
            className="text-xs font-semibold"
            style={{ color: remaining < 0 ? "#ef4444" : "#16a34a" }}
          >
            {remaining >= 0 ? "Verbleibend" : "Überschritten"}:{" "}
            {formatCHF(Math.abs(remaining))}
          </Text>
        </View>

        {/* Percentage */}
        <View className="flex-row items-center justify-end mt-1">
          <Text
            className="text-xs font-bold"
            style={{ color }}
          >
            {percent.toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor:
      Platform.OS === "ios"
        ? "rgba(255,255,255,0.6)"
        : "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
});
