import { DEMO_MODE } from "@/lib/demo-mode";

/**
 * Send a WhatsApp message via the Twilio WhatsApp API.
 *
 * Requires env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM  (e.g. "whatsapp:+14155238886")
 *
 * Gracefully skips (logs warning) when env vars are missing or in DEMO_MODE.
 */
export async function sendWhatsAppAlert(
  toPhone: string,
  message: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (DEMO_MODE) {
    console.log(`[DEMO] Would send WhatsApp to ${toPhone}: ${message}`);
    return { success: true, sid: "demo-sid" };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      "[WhatsApp] Twilio env vars not set (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM). Skipping WhatsApp alert."
    );
    return { success: false, error: "Twilio not configured" };
  }

  // Normalise destination — prefix with whatsapp: if not already present
  const to = toPhone.startsWith("whatsapp:") ? toPhone : `whatsapp:${toPhone}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const body = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: message,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json() as { sid?: string; message?: string };

    if (!response.ok) {
      console.error("[WhatsApp] Twilio error:", data.message ?? response.statusText);
      return { success: false, error: data.message ?? "Twilio request failed" };
    }

    return { success: true, sid: data.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[WhatsApp] Failed to send message:", message);
    return { success: false, error: message };
  }
}
