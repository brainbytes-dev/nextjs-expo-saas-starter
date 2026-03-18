/**
 * NFC utility — wraps react-native-nfc-manager.
 *
 * All public functions are safe to call on platforms / devices that do not
 * support NFC; they return `false` / `null` rather than throwing.
 */
import NfcManager, { NfcTech, Ndef } from "react-native-nfc-manager";

/** Returns true when the device hardware supports NFC. */
export async function initNfc(): Promise<boolean> {
  try {
    const supported = await NfcManager.isSupported();
    if (!supported) return false;
    await NfcManager.start();
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens an NDEF scan session and waits for a tag.
 * Resolves with the decoded text/URI string, or null on failure / cancel.
 */
export async function readNfcTag(): Promise<string | null> {
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();
    const message = tag?.ndefMessage?.[0];
    if (!message) return null;

    // Decode payload according to TNF
    const payload = message.payload;
    if (!payload || payload.length === 0) return null;

    // TNF 1 = Well-Known, RTD "T" (text) or "U" (URI)
    const tnf = message.tnf;
    const type = message.type;

    // URI record: RTD type byte 0x55 = 'U'
    if (tnf === 1 && type && type[0] === 0x55) {
      const prefixes: Record<number, string> = {
        0x00: "",
        0x01: "http://www.",
        0x02: "https://www.",
        0x03: "http://",
        0x04: "https://",
      };
      const prefixCode = payload[0] ?? 0x00;
      const prefix = prefixes[prefixCode] ?? "";
      const uriBytes = payload.slice(1);
      const uri = prefix + bytesToString(uriBytes);
      return uri;
    }

    // Text record: skip status byte + language code
    if (tnf === 1 && type && type[0] === 0x54) {
      const statusByte = payload[0] ?? 0;
      const langLength = statusByte & 0x3f;
      const textBytes = payload.slice(1 + langLength);
      return bytesToString(textBytes);
    }

    // Fallback: try decoding the whole payload as UTF-8
    return bytesToString(payload.slice(1));
  } catch {
    return null;
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

/**
 * Writes a URI NDEF record to the tag in range.
 * Returns true on success, false on failure / cancel.
 */
export async function writeNfcTag(data: string): Promise<boolean> {
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const bytes = Ndef.encodeMessage([Ndef.uriRecord(data)]);
    if (bytes) {
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
    }
    return true;
  } catch {
    return false;
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

/** Cancels any pending NFC technology request. Safe to call at any time. */
export function cancelNfcScan(): void {
  try {
    NfcManager.cancelTechnologyRequest();
  } catch {
    // Ignore — nothing was active
  }
}

// ── Internal helpers ────────────────────────────────────────────────────────

function bytesToString(bytes: number[]): string {
  return decodeURIComponent(
    bytes
      .map((b) => "%" + b.toString(16).padStart(2, "0"))
      .join("")
  );
}
