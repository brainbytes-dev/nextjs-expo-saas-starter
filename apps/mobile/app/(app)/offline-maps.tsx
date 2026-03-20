import * as React from "react";
import {
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { Text } from "@/components/nativewindui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import {
  getDownloadedRegions,
  downloadRegion,
  deleteRegion,
  getStorageUsage,
  calculateTileCount,
  formatBytes,
  type DownloadedRegion,
} from "@/lib/offline-maps";

// ─── Predefined Swiss regions ──────────────────────────────────────
const PREDEFINED_REGIONS = [
  {
    name: "Zürich & Umgebung",
    bounds: { minLat: 47.32, maxLat: 47.43, minLng: 8.44, maxLng: 8.62 },
  },
  {
    name: "Bern & Umgebung",
    bounds: { minLat: 46.90, maxLat: 47.00, minLng: 7.38, maxLng: 7.50 },
  },
  {
    name: "Basel & Umgebung",
    bounds: { minLat: 47.52, maxLat: 47.60, minLng: 7.54, maxLng: 7.66 },
  },
  {
    name: "Luzern & Umgebung",
    bounds: { minLat: 46.99, maxLat: 47.07, minLng: 8.25, maxLng: 8.37 },
  },
  {
    name: "St. Gallen & Umgebung",
    bounds: { minLat: 47.40, maxLat: 47.46, minLng: 9.34, maxLng: 9.44 },
  },
  {
    name: "Ganze Schweiz (Übersicht)",
    bounds: { minLat: 45.82, maxLat: 47.81, minLng: 5.95, maxLng: 10.49 },
  },
];

const MIN_ZOOM = 10;
const MAX_ZOOM = 15;

export default function OfflineMapsScreen() {
  const { colors } = useColorScheme();
  const [regions, setRegions] = React.useState<DownloadedRegion[]>([]);
  const [storageUsed, setStorageUsed] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const [downloadTotal, setDownloadTotal] = React.useState(0);
  const [downloadName, setDownloadName] = React.useState("");

  const refresh = React.useCallback(async () => {
    const [r, s] = await Promise.all([getDownloadedRegions(), getStorageUsage()]);
    setRegions(r);
    setStorageUsed(s);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDownload = async (
    name: string,
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  ) => {
    const tileCount = calculateTileCount(bounds, MIN_ZOOM, MAX_ZOOM);

    Alert.alert(
      "Region herunterladen",
      `"${name}" wird ${tileCount} Kacheln herunterladen (ca. ${formatBytes(tileCount * 15000)}). Fortfahren?`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Herunterladen",
          onPress: async () => {
            setDownloading(true);
            setDownloadName(name);
            setDownloadProgress(0);
            setDownloadTotal(tileCount);

            try {
              await downloadRegion(name, bounds, MIN_ZOOM, MAX_ZOOM, (done, total) => {
                setDownloadProgress(done);
                setDownloadTotal(total);
              });
              await refresh();
            } catch (err) {
              Alert.alert("Fehler", "Beim Herunterladen ist ein Fehler aufgetreten.");
            } finally {
              setDownloading(false);
              setDownloadName("");
            }
          },
        },
      ]
    );
  };

  const handleDelete = (region: DownloadedRegion) => {
    Alert.alert(
      "Karte löschen",
      `Möchtest du "${region.name}" wirklich löschen? (${formatBytes(region.sizeBytes)})`,
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            await deleteRegion(region.id);
            await refresh();
          },
        },
      ]
    );
  };

  const progressPercent = downloadTotal > 0 ? (downloadProgress / downloadTotal) * 100 : 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Offline-Karten",
          headerLargeTitle: true,
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="px-4 py-6 gap-6">
          {/* Storage info */}
          <View
            className="rounded-xl p-4"
            style={{ backgroundColor: colors.card }}
          >
            <Text className="text-sm text-muted-foreground mb-1">
              Speicherverbrauch
            </Text>
            <Text className="text-2xl font-bold">
              {loading ? "..." : formatBytes(storageUsed)}
            </Text>
            <Text className="text-xs text-muted-foreground mt-1">
              {regions.length} Region{regions.length !== 1 ? "en" : ""} heruntergeladen
            </Text>
          </View>

          {/* Download progress */}
          {downloading && (
            <View
              className="rounded-xl p-4"
              style={{ backgroundColor: colors.card }}
            >
              <View className="flex-row items-center gap-3 mb-3">
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="text-sm font-medium flex-1">
                  {downloadName} wird heruntergeladen...
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {Math.round(progressPercent)}%
                </Text>
              </View>
              <View
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: colors.grey5 }}
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: colors.primary,
                    width: `${progressPercent}%`,
                  }}
                />
              </View>
              <Text className="text-xs text-muted-foreground mt-2">
                {downloadProgress} / {downloadTotal} Kacheln
              </Text>
            </View>
          )}

          {/* Downloaded regions */}
          {regions.length > 0 && (
            <View>
              <Text className="text-lg font-semibold mb-3">
                Heruntergeladene Regionen
              </Text>
              <View className="gap-2">
                {regions.map((region) => (
                  <View
                    key={region.id}
                    className="rounded-xl p-4 flex-row items-center"
                    style={{ backgroundColor: colors.card }}
                  >
                    <View className="flex-1">
                      <Text className="font-medium">{region.name}</Text>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        {region.tileCount} Kacheln &middot; {formatBytes(region.sizeBytes)}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        Heruntergeladen: {new Date(region.downloadedAt).toLocaleDateString("de-CH")}
                      </Text>
                    </View>
                    <View
                      className="rounded-lg px-3 py-1.5"
                      style={{ backgroundColor: "#ef444420" }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: "#ef4444" }}
                        onPress={() => handleDelete(region)}
                      >
                        Löschen
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Available regions to download */}
          <View>
            <Text className="text-lg font-semibold mb-3">
              Region herunterladen
            </Text>
            <View className="gap-2">
              {PREDEFINED_REGIONS.map((region) => {
                const isDownloaded = regions.some((r) => r.name === region.name);
                const tileCount = calculateTileCount(
                  region.bounds,
                  MIN_ZOOM,
                  MAX_ZOOM
                );
                return (
                  <View
                    key={region.name}
                    className="rounded-xl p-4 flex-row items-center"
                    style={{ backgroundColor: colors.card }}
                  >
                    <View className="flex-1">
                      <Text className="font-medium">{region.name}</Text>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        ca. {tileCount} Kacheln &middot; ~{formatBytes(tileCount * 15000)}
                      </Text>
                    </View>
                    {isDownloaded ? (
                      <View
                        className="rounded-lg px-3 py-1.5"
                        style={{ backgroundColor: `${colors.primary}20` }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: colors.primary }}
                        >
                          Vorhanden
                        </Text>
                      </View>
                    ) : (
                      <View
                        className="rounded-lg px-3 py-1.5"
                        style={{ backgroundColor: `${colors.primary}15` }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: colors.primary }}
                          onPress={() =>
                            !downloading && handleDownload(region.name, region.bounds)
                          }
                        >
                          {downloading ? "..." : "Herunterladen"}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Info */}
          <View className="px-2 pb-4">
            <Text className="text-xs text-muted-foreground text-center">
              Kartendaten: &copy; OpenStreetMap-Mitwirkende. Karten werden lokal gespeichert und sind ohne Internetverbindung verfügbar.
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
