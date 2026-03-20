import { NextResponse } from "next/server";
import { getSession } from "@/app/api/_helpers/auth";
import { twoFactorSecrets } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// ─── Base32 encoding (RFC 4648) ──────────────────────────────────────────────
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let result = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }
  return result;
}

// ─── Simple QR code SVG generation ───────────────────────────────────────────
// Minimal QR code generator for alphanumeric data (Mode 2, version auto)
// For simplicity, we return the otpauth URI and let the client use it.
// We generate a data URL with an embedded SVG of a QR-like visual.

function generateQrSvgDataUrl(data: string): string {
  // Use a simple approach: encode as a matrix using a basic QR algorithm
  // For production, you'd want a full QR encoder. Here we create a visual
  // representation that authenticator apps can scan via the otpauth URI.
  const matrix = encodeQr(data);
  const size = matrix.length;
  const scale = 4;
  const margin = 4;
  const totalSize = (size + margin * 2) * scale;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}">`;
  svg += `<rect width="${totalSize}" height="${totalSize}" fill="white"/>`;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y]![x]) {
        svg += `<rect x="${(x + margin) * scale}" y="${(y + margin) * scale}" width="${scale}" height="${scale}" fill="black"/>`;
      }
    }
  }
  svg += "</svg>";

  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

// ─── Minimal QR Code encoder (Version 1-6, Byte mode, ECC L) ────────────────
// This is a simplified but functional QR encoder for short strings like otpauth URIs.

function encodeQr(text: string): boolean[][] {
  const data = Buffer.from(text, "utf-8");
  const dataLen = data.length;

  // Determine version (1-40), we need enough capacity for byte mode, ECC L
  const capacities = [0, 17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953];
  let version = 1;
  for (let v = 1; v <= 40; v++) {
    if (capacities[v]! >= dataLen) { version = v; break; }
  }

  const size = version * 4 + 17;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(x: number, y: number, val: boolean, reserve = true) {
    if (x >= 0 && x < size && y >= 0 && y < size) {
      matrix[y]![x] = val;
      if (reserve) reserved[y]![x] = true;
    }
  }

  // Finder patterns
  function drawFinder(cx: number, cy: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        // Simpler: use standard finder pattern
        setModule(x, y, false);
      }
    }
    // Standard 7x7 finder
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        const outer = adx === 3 || ady === 3;
        const inner = adx <= 1 && ady <= 1;
        setModule(x, y, outer || inner);
      }
    }
  }

  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(i, 6, i % 2 === 0);
    setModule(6, i, i % 2 === 0);
  }

  // Format info placeholder
  for (let i = 0; i < 8; i++) {
    setModule(i, 8, false); setModule(8, i, false);
    setModule(size - 1 - i, 8, false); setModule(8, size - 1 - i, false);
  }
  setModule(8, 8, false);
  setModule(8, size - 8, true); // dark module

  // Alignment patterns for version >= 2
  if (version >= 2) {
    const positions = getAlignmentPositions(version);
    for (const ay of positions) {
      for (const ax of positions) {
        // Skip if overlapping finder patterns
        if ((ax <= 8 && ay <= 8) || (ax <= 8 && ay >= size - 9) || (ax >= size - 9 && ay <= 8)) continue;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const adx = Math.abs(dx), ady = Math.abs(dy);
            const max = Math.max(adx, ady);
            setModule(ax + dx, ay + dy, max === 0 || max === 2);
          }
        }
      }
    }
  }

  // Version info for version >= 7
  if (version >= 7) {
    const versionBits = getVersionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((versionBits >> i) & 1) === 1;
      const x = Math.floor(i / 3);
      const y = size - 11 + (i % 3);
      setModule(x, y, bit);
      setModule(y, x, bit);
    }
  }

  // Mark all reserved areas
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y]![x] !== null) reserved[y]![x] = true;
    }
  }

  // Encode data
  const encoded = encodeData(data, version);

  // Place data bits
  let bitIdx = 0;
  let upward = true;
  for (let right = size - 1; right >= 0; right -= 2) {
    if (right === 6) right = 5; // skip timing column
    const colPair = [right, right - 1].filter(c => c >= 0);
    const rows = upward ? Array.from({ length: size }, (_, i) => size - 1 - i) : Array.from({ length: size }, (_, i) => i);
    for (const y of rows) {
      for (const x of colPair) {
        if (reserved[y]![x]) continue;
        const bit = bitIdx < encoded.length ? encoded[bitIdx]! : false;
        matrix[y]![x] = bit;
        bitIdx++;
      }
    }
    upward = !upward;
  }

  // Apply mask (mask 0: (x+y) % 2 === 0)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!reserved[y]![x] && (x + y) % 2 === 0) {
        matrix[y]![x] = !matrix[y]![x];
      }
    }
  }

  // Write format info (ECC L = 01, mask 0 = 000 => 01000)
  const formatBits = getFormatBits(0b01, 0);
  const formatPositions1: [number, number][] = [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8],
    [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  ];
  const formatPositions2: [number, number][] = [
    [8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4], [8, size - 5], [8, size - 6], [8, size - 7],
    [size - 8, 8], [size - 7, 8], [size - 6, 8], [size - 5, 8], [size - 4, 8], [size - 3, 8], [size - 2, 8], [size - 1, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> (14 - i)) & 1) === 1;
    const [x1, y1] = formatPositions1[i]!;
    const [x2, y2] = formatPositions2[i]!;
    matrix[y1]![x1] = bit;
    matrix[y2]![x2] = bit;
  }

  return matrix.map(row => row.map(v => v === true));
}

function getAlignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const intervals = Math.floor(version / 7) + 1;
  const size = version * 4 + 17;
  const last = size - 7;
  const first = 6;
  if (intervals === 1) return [first, last];
  const step = Math.ceil((last - first) / intervals / 2) * 2;
  const positions = [first];
  for (let pos = last; pos > first; pos -= step) {
    positions.unshift(pos);
  }
  return [...new Set(positions)].sort((a, b) => a - b);
}

function encodeData(data: Buffer, version: number): boolean[] {
  const bits: boolean[] = [];
  function pushBits(value: number, count: number) {
    for (let i = count - 1; i >= 0; i--) {
      bits.push(((value >> i) & 1) === 1);
    }
  }

  // Mode indicator: byte mode = 0100
  pushBits(0b0100, 4);
  // Character count (8 bits for version 1-9, 16 for 10+)
  const countBits = version <= 9 ? 8 : 16;
  pushBits(data.length, countBits);
  // Data
  for (const byte of data) {
    pushBits(byte, 8);
  }
  // Terminator
  pushBits(0, Math.min(4, getDataCapacityBits(version) - bits.length));
  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(false);
  // Pad bytes
  const cap = getDataCapacityBits(version);
  let padByte = 0;
  while (bits.length < cap) {
    pushBits(padByte === 0 ? 0xEC : 0x11, 8);
    padByte = 1 - padByte;
  }

  // Add ECC
  const dataBytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] ? 1 : 0);
    dataBytes.push(byte);
  }

  const eccInfo = getEccInfo(version);
  const allCodewords = addErrorCorrection(dataBytes, eccInfo);

  const result: boolean[] = [];
  for (const byte of allCodewords) {
    for (let i = 7; i >= 0; i--) result.push(((byte >> i) & 1) === 1);
  }
  return result;
}

function getDataCapacityBits(version: number): number {
  // ECC level L data codewords * 8
  const dataCodewords: Record<number, number> = {
    1: 19, 2: 34, 3: 55, 4: 80, 5: 108, 6: 136, 7: 156, 8: 194, 9: 232, 10: 274,
    11: 324, 12: 370, 13: 428, 14: 461, 15: 523, 16: 589, 17: 647, 18: 721, 19: 795, 20: 861,
    21: 932, 22: 1006, 23: 1094, 24: 1174, 25: 1276, 26: 1370, 27: 1468, 28: 1531, 29: 1631, 30: 1735,
    31: 1843, 32: 1955, 33: 2071, 34: 2191, 35: 2306, 36: 2434, 37: 2566, 38: 2702, 39: 2812, 40: 2956,
  };
  return (dataCodewords[version] ?? 19) * 8;
}

function getEccInfo(version: number): { dataPerBlock: number; eccPerBlock: number; blocks: number; blocks2?: number; dataPerBlock2?: number } {
  // Simplified ECC info for Level L
  const table: Record<number, { dataPerBlock: number; eccPerBlock: number; blocks: number; blocks2?: number; dataPerBlock2?: number }> = {
    1: { dataPerBlock: 19, eccPerBlock: 7, blocks: 1 },
    2: { dataPerBlock: 34, eccPerBlock: 10, blocks: 1 },
    3: { dataPerBlock: 55, eccPerBlock: 15, blocks: 1 },
    4: { dataPerBlock: 80, eccPerBlock: 20, blocks: 1 },
    5: { dataPerBlock: 108, eccPerBlock: 26, blocks: 1 },
    6: { dataPerBlock: 68, eccPerBlock: 18, blocks: 2 },
    7: { dataPerBlock: 78, eccPerBlock: 20, blocks: 2 },
    8: { dataPerBlock: 97, eccPerBlock: 24, blocks: 2 },
    9: { dataPerBlock: 116, eccPerBlock: 30, blocks: 2 },
    10: { dataPerBlock: 68, eccPerBlock: 18, blocks: 2, blocks2: 2, dataPerBlock2: 69 },
    11: { dataPerBlock: 81, eccPerBlock: 20, blocks: 4 },
    12: { dataPerBlock: 92, eccPerBlock: 24, blocks: 2, blocks2: 2, dataPerBlock2: 93 },
    13: { dataPerBlock: 107, eccPerBlock: 26, blocks: 4 },
    14: { dataPerBlock: 115, eccPerBlock: 30, blocks: 3, blocks2: 1, dataPerBlock2: 116 },
    15: { dataPerBlock: 87, eccPerBlock: 22, blocks: 5, blocks2: 1, dataPerBlock2: 88 },
    16: { dataPerBlock: 98, eccPerBlock: 24, blocks: 5, blocks2: 1, dataPerBlock2: 99 },
    17: { dataPerBlock: 107, eccPerBlock: 28, blocks: 1, blocks2: 5, dataPerBlock2: 108 },
    18: { dataPerBlock: 120, eccPerBlock: 30, blocks: 5, blocks2: 1, dataPerBlock2: 121 },
    19: { dataPerBlock: 113, eccPerBlock: 28, blocks: 3, blocks2: 4, dataPerBlock2: 114 },
    20: { dataPerBlock: 107, eccPerBlock: 28, blocks: 3, blocks2: 5, dataPerBlock2: 108 },
  };
  return table[version] ?? table[1]!;
}

function addErrorCorrection(dataBytes: number[], eccInfo: { dataPerBlock: number; eccPerBlock: number; blocks: number; blocks2?: number; dataPerBlock2?: number }): number[] {
  const blocks: number[][] = [];
  const eccBlocks: number[][] = [];
  let offset = 0;

  // Group 1 blocks
  for (let i = 0; i < eccInfo.blocks; i++) {
    const blockData = dataBytes.slice(offset, offset + eccInfo.dataPerBlock);
    blocks.push(blockData);
    eccBlocks.push(rsEncode(blockData, eccInfo.eccPerBlock));
    offset += eccInfo.dataPerBlock;
  }

  // Group 2 blocks (if any)
  const blocks2 = eccInfo.blocks2 ?? 0;
  const dataPerBlock2 = eccInfo.dataPerBlock2 ?? eccInfo.dataPerBlock;
  for (let i = 0; i < blocks2; i++) {
    const blockData = dataBytes.slice(offset, offset + dataPerBlock2);
    blocks.push(blockData);
    eccBlocks.push(rsEncode(blockData, eccInfo.eccPerBlock));
    offset += dataPerBlock2;
  }

  // Interleave data
  const result: number[] = [];
  const maxDataLen = Math.max(...blocks.map(b => b.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]!);
    }
  }
  // Interleave ECC
  for (let i = 0; i < eccInfo.eccPerBlock; i++) {
    for (const block of eccBlocks) {
      if (i < block.length) result.push(block[i]!);
    }
  }

  return result;
}

// Reed-Solomon encoding over GF(256)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initGf() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]!;
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 255]!;
}

function rsEncode(data: number[], eccCount: number): number[] {
  // Generate generator polynomial
  let gen = [1];
  for (let i = 0; i < eccCount; i++) {
    const newGen = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      newGen[j] ^= gen[j]!;
      newGen[j + 1] ^= gfMul(gen[j]!, GF_EXP[i]!);
    }
    gen = newGen;
  }

  const result = new Array(eccCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ result[0]!;
    result.shift();
    result.push(0);
    for (let i = 0; i < eccCount; i++) {
      result[i] ^= gfMul(factor, gen[i + 1]!);
    }
  }
  return result;
}

function getFormatBits(eccLevel: number, mask: number): number {
  const data = (eccLevel << 3) | mask;
  let bits = data << 10;
  for (let i = 4; i >= 0; i--) {
    if ((bits >> (i + 10)) & 1) bits ^= 0b10100110111 << i;
  }
  return ((data << 10) | bits) ^ 0b101010000010010;
}

function getVersionBits(version: number): number {
  let bits = version << 12;
  for (let i = 5; i >= 0; i--) {
    if ((bits >> (i + 12)) & 1) bits ^= 0b1111100100101 << i;
  }
  return (version << 12) | bits;
}

// ─── POST /api/auth/two-factor/setup ─────────────────────────────────────────

export async function POST() {
  try {
    const result = await getSession();
    if ("error" in result && result.error instanceof Response) return result.error;
    const { session, db } = result as { session: NonNullable<typeof result.session>; db: NonNullable<typeof result.db> };
    const userId = session.user.id;

    // Check if already set up
    const [existing] = await db
      .select({ enabled: twoFactorSecrets.enabled })
      .from(twoFactorSecrets)
      .where(eq(twoFactorSecrets.userId, userId))
      .limit(1);

    if (existing?.enabled) {
      return NextResponse.json(
        { error: "Zwei-Faktor-Authentifizierung ist bereits aktiviert." },
        { status: 400 }
      );
    }

    // Generate 20-byte random secret
    const secretBuffer = crypto.randomBytes(20);
    const secret = base32Encode(secretBuffer);

    // Build otpauth URI
    const issuer = "LogistikApp";
    const accountName = session.user.email;
    const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    // Generate QR code SVG data URL
    const qrDataUrl = generateQrSvgDataUrl(otpauthUri);

    // Upsert secret (delete old if exists, insert new)
    if (existing) {
      await db
        .delete(twoFactorSecrets)
        .where(eq(twoFactorSecrets.userId, userId));
    }

    await db.insert(twoFactorSecrets).values({
      userId,
      secret,
      enabled: false,
    });

    return NextResponse.json({ secret, qrDataUrl, otpauthUri });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json(
      { error: "Fehler beim Einrichten der Zwei-Faktor-Authentifizierung." },
      { status: 500 }
    );
  }
}
