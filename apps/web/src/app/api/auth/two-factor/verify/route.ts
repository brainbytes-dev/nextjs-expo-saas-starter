import { NextResponse } from "next/server";
import { getSession } from "@/app/api/_helpers/auth";
import { twoFactorSecrets } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// ─── Base32 decode ───────────────────────────────────────────────────────────
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(encoded: string): Buffer {
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of encoded.toUpperCase()) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

// ─── TOTP generation (RFC 6238) ─────────────────────────────────────────────
function hotpGenerate(secret: string, counter: number, digits: number): string {
  const secretBuffer = base32Decode(secret);

  // Counter as 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);

  const hmac = crypto.createHmac("sha1", secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return (code % Math.pow(10, digits)).toString().padStart(digits, "0");
}

// Verify with +-1 time window for clock drift
function verifyTOTP(secret: string, code: string): boolean {
  const timeStep = 30;
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  for (let i = -1; i <= 1; i++) {
    const expected = hotpGenerate(secret, counter + i, 6);
    if (expected === code) return true;
  }
  return false;
}

// ─── POST /api/auth/two-factor/verify ────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const result = await getSession();
    if ("error" in result && result.error instanceof Response) return result.error;
    const { session, db } = result as { session: NonNullable<typeof result.session>; db: NonNullable<typeof result.db> };
    const userId = session.user.id;

    const body = await request.json();
    const { code } = body as { code?: string };

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Bitte einen gültigen 6-stelligen Code eingeben." },
        { status: 400 }
      );
    }

    // Get stored secret
    const [record] = await db
      .select()
      .from(twoFactorSecrets)
      .where(eq(twoFactorSecrets.userId, userId))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: "Zwei-Faktor-Authentifizierung ist nicht eingerichtet." },
        { status: 400 }
      );
    }

    // If already enabled, just verify (used for login verification)
    if (record.enabled) {
      const valid = verifyTOTP(record.secret, code);
      if (!valid) {
        return NextResponse.json({ error: "Ungültiger Code." }, { status: 400 });
      }
      return NextResponse.json({ verified: true });
    }

    // First-time verification during setup
    const valid = verifyTOTP(record.secret, code);
    if (!valid) {
      return NextResponse.json(
        { error: "Ungültiger Code. Bitte erneut versuchen." },
        { status: 400 }
      );
    }

    // Generate 10 recovery codes (8-char hex strings)
    const recoveryCodes: string[] = [];
    const hashedCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString("hex");
      recoveryCodes.push(code);
      hashedCodes.push(
        crypto.createHash("sha256").update(code).digest("hex")
      );
    }

    // Enable 2FA and store hashed recovery codes
    await db
      .update(twoFactorSecrets)
      .set({
        enabled: true,
        verifiedAt: new Date(),
        recoveryCodes: hashedCodes,
        usedRecoveryCodes: [],
        updatedAt: new Date(),
      })
      .where(eq(twoFactorSecrets.userId, userId));

    return NextResponse.json({
      verified: true,
      enabled: true,
      recoveryCodes, // Return plaintext ONCE
    });
  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json(
      { error: "Fehler bei der Verifizierung." },
      { status: 500 }
    );
  }
}
