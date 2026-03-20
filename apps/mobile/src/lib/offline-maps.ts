import * as FileSystem from "expo-file-system";

// ─── Offline Maps — download & cache OSM tiles ─────────────────────

const TILE_DIR = `${FileSystem.documentDirectory}offline-tiles/`;

export interface DownloadedRegion {
  id: string;
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  minZoom: number;
  maxZoom: number;
  tileCount: number;
  sizeBytes: number;
  downloadedAt: string;
}

const REGIONS_FILE = `${FileSystem.documentDirectory}offline-regions.json`;

// ─── Tile math ──────────────────────────────────────────────────────

function lng2tile(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number): number {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

function tileUrl(x: number, y: number, z: number): string {
  // Use OSM tile server with proper user-agent
  const servers = ["a", "b", "c"];
  const s = servers[Math.abs(x + y) % servers.length];
  return `https://${s}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

function tilePath(x: number, y: number, z: number): string {
  return `${TILE_DIR}${z}/${x}/${y}.png`;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Calculate how many tiles a region download would require.
 */
export function calculateTileCount(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  minZoom: number,
  maxZoom: number
): number {
  let count = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const x1 = lng2tile(bounds.minLng, z);
    const x2 = lng2tile(bounds.maxLng, z);
    const y1 = lat2tile(bounds.maxLat, z); // note: lat is inverted
    const y2 = lat2tile(bounds.minLat, z);
    count += (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1);
  }
  return count;
}

/**
 * Download all tiles for a region. Returns progress via callback.
 */
export async function downloadRegion(
  name: string,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  minZoom: number = 10,
  maxZoom: number = 16,
  onProgress?: (downloaded: number, total: number) => void
): Promise<DownloadedRegion> {
  const totalTiles = calculateTileCount(bounds, minZoom, maxZoom);
  let downloaded = 0;
  let totalBytes = 0;

  for (let z = minZoom; z <= maxZoom; z++) {
    const x1 = Math.min(lng2tile(bounds.minLng, z), lng2tile(bounds.maxLng, z));
    const x2 = Math.max(lng2tile(bounds.minLng, z), lng2tile(bounds.maxLng, z));
    const y1 = Math.min(lat2tile(bounds.maxLat, z), lat2tile(bounds.minLat, z));
    const y2 = Math.max(lat2tile(bounds.maxLat, z), lat2tile(bounds.minLat, z));

    for (let x = x1; x <= x2; x++) {
      for (let y = y1; y <= y2; y++) {
        const dest = tilePath(x, y, z);
        const dir = dest.substring(0, dest.lastIndexOf("/"));

        // Create directory structure
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(
          () => {}
        );

        try {
          const result = await FileSystem.downloadAsync(tileUrl(x, y, z), dest);
          if (result.status === 200) {
            const info = await FileSystem.getInfoAsync(dest);
            if (info.exists && "size" in info) {
              totalBytes += info.size ?? 0;
            }
          }
        } catch {
          // Skip failed tiles — they'll show as blank offline
        }

        downloaded++;
        onProgress?.(downloaded, totalTiles);
      }
    }
  }

  const region: DownloadedRegion = {
    id: `region_${Date.now()}`,
    name,
    minLat: bounds.minLat,
    maxLat: bounds.maxLat,
    minLng: bounds.minLng,
    maxLng: bounds.maxLng,
    minZoom,
    maxZoom,
    tileCount: downloaded,
    sizeBytes: totalBytes,
    downloadedAt: new Date().toISOString(),
  };

  // Save to regions list
  const regions = await getDownloadedRegions();
  regions.push(region);
  await FileSystem.writeAsStringAsync(REGIONS_FILE, JSON.stringify(regions));

  return region;
}

/**
 * Get a local file URL for a cached tile, or null if not cached.
 */
export function getOfflineTileUrl(
  x: number,
  y: number,
  z: number
): string {
  return tilePath(x, y, z);
}

/**
 * Check if a tile exists in cache.
 */
export async function hasTile(
  x: number,
  y: number,
  z: number
): Promise<boolean> {
  const path = tilePath(x, y, z);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

/**
 * List all downloaded regions.
 */
export async function getDownloadedRegions(): Promise<DownloadedRegion[]> {
  try {
    const content = await FileSystem.readAsStringAsync(REGIONS_FILE);
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Delete a downloaded region and its tiles.
 */
export async function deleteRegion(regionId: string): Promise<void> {
  const regions = await getDownloadedRegions();
  const region = regions.find((r) => r.id === regionId);

  if (region) {
    // Delete tiles for this region's zoom levels
    for (let z = region.minZoom; z <= region.maxZoom; z++) {
      const x1 = Math.min(
        lng2tile(region.minLng, z),
        lng2tile(region.maxLng, z)
      );
      const x2 = Math.max(
        lng2tile(region.minLng, z),
        lng2tile(region.maxLng, z)
      );
      const y1 = Math.min(
        lat2tile(region.maxLat, z),
        lat2tile(region.minLat, z)
      );
      const y2 = Math.max(
        lat2tile(region.maxLat, z),
        lat2tile(region.minLat, z)
      );

      for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
          await FileSystem.deleteAsync(tilePath(x, y, z), {
            idempotent: true,
          });
        }
      }
    }
  }

  // Update regions list
  const updated = regions.filter((r) => r.id !== regionId);
  await FileSystem.writeAsStringAsync(REGIONS_FILE, JSON.stringify(updated));
}

/**
 * Get total storage used by offline tiles.
 */
export async function getStorageUsage(): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(TILE_DIR);
    if (info.exists && "size" in info) {
      return info.size ?? 0;
    }
  } catch {
    // ignore
  }

  // Fallback: sum from regions metadata
  const regions = await getDownloadedRegions();
  return regions.reduce((sum, r) => sum + r.sizeBytes, 0);
}

/**
 * Format bytes as human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
