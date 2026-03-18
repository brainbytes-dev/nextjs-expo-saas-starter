/**
 * Voice Command Engine
 *
 * Parses German voice input into structured intents — no AI required for the
 * core set of logistics commands.  All regex patterns are anchored to avoid
 * false positives on longer sentences.
 *
 * Supported patterns (examples):
 *   "Buche 10 Stück Kabel ein"         → stock_in, qty 10, name "Kabel"
 *   "10 Schrauben M8 einbuchen"        → stock_in, qty 10, name "Schrauben M8"
 *   "5 Stück Kabel ausbuchen"          → stock_out, qty 5,  name "Kabel"
 *   "Suche Bohrhammer"                 → lookup,   name "Bohrhammer"
 *   "Werkzeug Bohrhammer auschecken"   → checkout, name "Bohrhammer"
 *   "Bohrhammer einchecken"            → checkin,  name "Bohrhammer"
 */

export type VoiceAction =
  | "stock_in"
  | "stock_out"
  | "lookup"
  | "checkout"
  | "checkin";

export interface VoiceCommand {
  action: VoiceAction;
  materialName?: string;
  quantity?: number;
  location?: string;
  /** Raw recognised text, kept for display */
  rawText: string;
}

// ── Token helpers ─────────────────────────────────────────────────────────────

/** Written-out German number words → numeric value */
const NUMBER_WORDS: Record<string, number> = {
  ein: 1,
  eine: 1,
  einer: 1,
  einem: 1,
  einen: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  fünf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
  zehn: 10,
  elf: 11,
  zwölf: 12,
  dreizehn: 13,
  vierzehn: 14,
  fünfzehn: 15,
  zwanzig: 20,
  dreißig: 30,
  vierzig: 40,
  fünfzig: 50,
  hundert: 100,
};

function parseNumber(token: string): number | null {
  const asInt = parseInt(token, 10);
  if (!isNaN(asInt)) return asInt;
  return NUMBER_WORDS[token.toLowerCase()] ?? null;
}

/** Strip common filler words that appear between quantity and item name */
const UNIT_WORDS = new Set([
  "stück",
  "stk",
  "stk.",
  "mal",
  "meter",
  "m",
  "cm",
  "mm",
  "kg",
  "g",
  "liter",
  "l",
  "paar",
  "sack",
  "säcke",
  "eimer",
  "rolle",
  "rollen",
  "karton",
  "kartons",
]);

// ── Pattern matchers ──────────────────────────────────────────────────────────

/**
 * Try every rule in order.  Returns the first match or null.
 */
export function parseVoiceCommand(text: string): VoiceCommand | null {
  const raw = text.trim();
  const t = raw.toLowerCase();

  // Normalise common homophones / speech-recognition quirks
  const normalised = t
    .replace(/\bein buchen\b/g, "einbuchen")
    .replace(/\baus buchen\b/g, "ausbuchen")
    .replace(/\bein checken\b/g, "einchecken")
    .replace(/\baus checken\b/g, "auschecken")
    .replace(/\bein zubuchen\b/g, "einbuchen")
    .replace(/\baus zubuchen\b/g, "ausbuchen");

  // ── Rule 1: "Buche <qty> [Stück] <name> ein" ───────────────────────────────
  {
    const m = normalised.match(
      /^(?:buche\s+)(\S+)\s+(?:stück\s+|stk\.?\s+)?(.+?)\s+ein(?:buchen)?$/
    );
    if (m) {
      const qty = parseNumber(m[1]);
      if (qty !== null) {
        return {
          action: "stock_in",
          quantity: qty,
          materialName: cleanName(m[2]),
          rawText: raw,
        };
      }
    }
  }

  // ── Rule 2: "<qty> [Stück] <name> einbuchen" ───────────────────────────────
  {
    const m = normalised.match(
      /^(\S+)\s+(?:stück\s+|stk\.?\s+)?(.+?)\s+einbuchen$/
    );
    if (m) {
      const qty = parseNumber(m[1]);
      if (qty !== null) {
        return {
          action: "stock_in",
          quantity: qty,
          materialName: cleanName(m[2]),
          rawText: raw,
        };
      }
    }
  }

  // ── Rule 3: "Buche <qty> [Stück] <name> aus" ──────────────────────────────
  {
    const m = normalised.match(
      /^(?:buche\s+)(\S+)\s+(?:stück\s+|stk\.?\s+)?(.+?)\s+aus(?:buchen)?$/
    );
    if (m) {
      const qty = parseNumber(m[1]);
      if (qty !== null) {
        return {
          action: "stock_out",
          quantity: qty,
          materialName: cleanName(m[2]),
          rawText: raw,
        };
      }
    }
  }

  // ── Rule 4: "<qty> [Stück] <name> ausbuchen" ──────────────────────────────
  {
    const m = normalised.match(
      /^(\S+)\s+(?:stück\s+|stk\.?\s+)?(.+?)\s+ausbuchen$/
    );
    if (m) {
      const qty = parseNumber(m[1]);
      if (qty !== null) {
        return {
          action: "stock_out",
          quantity: qty,
          materialName: cleanName(m[2]),
          rawText: raw,
        };
      }
    }
  }

  // ── Rule 5: "Suche <name>" ─────────────────────────────────────────────────
  {
    const m = normalised.match(/^(?:suche|suchen|finde|zeige)\s+(.+)$/);
    if (m) {
      return {
        action: "lookup",
        materialName: cleanName(m[1]),
        rawText: raw,
      };
    }
  }

  // ── Rule 6: "[Werkzeug] <name> auschecken / checkout" ─────────────────────
  {
    const m = normalised.match(
      /^(?:werkzeug\s+)?(.+?)\s+(?:auschecken|checkout|ausgeben|ausleihen)$/
    );
    if (m) {
      return {
        action: "checkout",
        materialName: cleanName(m[1]),
        rawText: raw,
      };
    }
  }

  // ── Rule 7: "[Werkzeug] <name> einchecken / checkin" ──────────────────────
  {
    const m = normalised.match(
      /^(?:werkzeug\s+)?(.+?)\s+(?:einchecken|checkin|zurückgeben|zurück)$/
    );
    if (m) {
      return {
        action: "checkin",
        materialName: cleanName(m[1]),
        rawText: raw,
      };
    }
  }

  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanName(raw: string): string {
  // Strip leading/trailing unit words
  const tokens = raw.trim().split(/\s+/);
  const filtered = tokens.filter((t) => !UNIT_WORDS.has(t.toLowerCase()));
  // Capitalise first letter
  const joined = (filtered.length > 0 ? filtered : tokens).join(" ");
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** Human-readable German label for an action */
export function actionLabel(action: VoiceAction): string {
  switch (action) {
    case "stock_in":
      return "Einbuchen";
    case "stock_out":
      return "Ausbuchen";
    case "lookup":
      return "Suche";
    case "checkout":
      return "Werkzeug ausgeben";
    case "checkin":
      return "Werkzeug zurück";
  }
}

/** TTS confirmation text after an action was executed */
export function ttsConfirmation(cmd: VoiceCommand): string {
  const qty = cmd.quantity ? `${cmd.quantity} ` : "";
  const name = cmd.materialName ?? "Artikel";
  switch (cmd.action) {
    case "stock_in":
      return `${qty}${name} eingebucht`;
    case "stock_out":
      return `${qty}${name} ausgebucht`;
    case "lookup":
      return `Suche nach ${name}`;
    case "checkout":
      return `${name} ausgegeben`;
    case "checkin":
      return `${name} zurückgebucht`;
  }
}

// ── Demo preset commands ───────────────────────────────────────────────────────

/** Used in demo mode: cycles through preset voice commands */
export const DEMO_VOICE_PRESETS: Array<{ text: string; label: string }> = [
  {
    text: "Buche 10 Stück Kabel ein",
    label: "10× Kabel einbuchen",
  },
  {
    text: "Suche Bohrhammer",
    label: "Bohrhammer suchen",
  },
  {
    text: "5 Schrauben M8 ausbuchen",
    label: "5× Schrauben M8 ausbuchen",
  },
  {
    text: "Werkzeug Flex auschecken",
    label: "Flex auschecken",
  },
  {
    text: "Bohrhammer einchecken",
    label: "Bohrhammer zurückgeben",
  },
];
