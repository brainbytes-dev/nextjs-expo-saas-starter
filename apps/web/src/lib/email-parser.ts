/**
 * Email Inbox Parser — AI-powered email content extraction
 *
 * Uses OpenAI chat completions with JSON mode to extract structured data
 * from supplier emails: order confirmations, delivery notices, invoices.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedOrder {
  type: "order";
  orderNumber: string | null;
  supplier: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unit: string | null;
    pricePerUnit: number | null;
  }>;
  totalAmount: number | null;
  currency: string | null;
  deliveryDate: string | null;
  notes: string | null;
}

export interface ParsedDelivery {
  type: "delivery";
  trackingNumber: string | null;
  carrier: string | null;
  expectedDate: string | null;
  orderReference: string | null;
  items: Array<{
    name: string;
    quantity: number;
  }>;
  notes: string | null;
}

export interface ParsedInvoice {
  type: "invoice";
  invoiceNumber: string | null;
  supplier: string | null;
  amount: number | null;
  currency: string | null;
  dueDate: string | null;
  orderReference: string | null;
  taxAmount: number | null;
  notes: string | null;
}

export type ParsedEmailResult = ParsedOrder | ParsedDelivery | ParsedInvoice;

export interface EmailClassification {
  type: "order" | "delivery" | "invoice" | "unknown";
  confidence: number;
}

// ---------------------------------------------------------------------------
// OpenAI helpers
// ---------------------------------------------------------------------------

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userMessage: string
): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  return JSON.parse(content);
}

// ---------------------------------------------------------------------------
// Classify Email
// ---------------------------------------------------------------------------

/**
 * Classify an email as order confirmation, delivery notice, invoice, or unknown.
 */
export async function classifyEmail(
  subject: string,
  body: string,
  apiKey: string
): Promise<EmailClassification> {
  const systemPrompt = `Du bist ein E-Mail-Klassifizierer für ein Schweizer Logistik-Unternehmen.
Klassifiziere die E-Mail in eine der folgenden Kategorien:
- "order": Auftragsbestätigung, Bestellbestätigung, Order Confirmation
- "delivery": Lieferavis, Versandbestätigung, Tracking-Info, Delivery Notice
- "invoice": Rechnung, Faktura, Invoice
- "unknown": Nicht zuordenbar

Antworte als JSON: { "type": "order" | "delivery" | "invoice" | "unknown", "confidence": 0.0-1.0 }`;

  const userMessage = `Betreff: ${subject}\n\nInhalt:\n${body.slice(0, 3000)}`;

  const result = await callOpenAI(apiKey, systemPrompt, userMessage);

  return {
    type: (result.type as EmailClassification["type"]) ?? "unknown",
    confidence: typeof result.confidence === "number" ? result.confidence : 0,
  };
}

// ---------------------------------------------------------------------------
// Parse Order Email
// ---------------------------------------------------------------------------

export async function parseOrderEmail(
  body: string,
  apiKey: string
): Promise<ParsedOrder> {
  const systemPrompt = `Du bist ein E-Mail-Parser für Auftragsbestätigungen in einem Schweizer Logistik-Unternehmen.
Extrahiere strukturierte Daten aus der E-Mail.

Antworte als JSON:
{
  "orderNumber": string | null,
  "supplier": string | null,
  "items": [{ "name": string, "quantity": number, "unit": string | null, "pricePerUnit": number | null }],
  "totalAmount": number | null,
  "currency": string | null (z.B. "CHF", "EUR"),
  "deliveryDate": string | null (ISO 8601 Format),
  "notes": string | null
}

Wenn ein Wert nicht erkennbar ist, setze null.
Beträge immer als Zahl ohne Währungszeichen.
Datum immer als ISO 8601 (YYYY-MM-DD).`;

  const result = await callOpenAI(apiKey, systemPrompt, body.slice(0, 4000));

  return {
    type: "order",
    orderNumber: (result.orderNumber as string) ?? null,
    supplier: (result.supplier as string) ?? null,
    items: Array.isArray(result.items)
      ? (result.items as ParsedOrder["items"])
      : [],
    totalAmount:
      typeof result.totalAmount === "number" ? result.totalAmount : null,
    currency: (result.currency as string) ?? null,
    deliveryDate: (result.deliveryDate as string) ?? null,
    notes: (result.notes as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Parse Delivery Email
// ---------------------------------------------------------------------------

export async function parseDeliveryEmail(
  body: string,
  apiKey: string
): Promise<ParsedDelivery> {
  const systemPrompt = `Du bist ein E-Mail-Parser für Lieferavise in einem Schweizer Logistik-Unternehmen.
Extrahiere strukturierte Daten aus der E-Mail.

Antworte als JSON:
{
  "trackingNumber": string | null,
  "carrier": string | null (z.B. "Post CH", "DHL", "DPD", "UPS", "Planzer"),
  "expectedDate": string | null (ISO 8601 Format),
  "orderReference": string | null,
  "items": [{ "name": string, "quantity": number }],
  "notes": string | null
}

Wenn ein Wert nicht erkennbar ist, setze null.
Datum immer als ISO 8601 (YYYY-MM-DD).`;

  const result = await callOpenAI(apiKey, systemPrompt, body.slice(0, 4000));

  return {
    type: "delivery",
    trackingNumber: (result.trackingNumber as string) ?? null,
    carrier: (result.carrier as string) ?? null,
    expectedDate: (result.expectedDate as string) ?? null,
    orderReference: (result.orderReference as string) ?? null,
    items: Array.isArray(result.items)
      ? (result.items as ParsedDelivery["items"])
      : [],
    notes: (result.notes as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Parse Invoice Email
// ---------------------------------------------------------------------------

export async function parseInvoiceEmail(
  body: string,
  apiKey: string
): Promise<ParsedInvoice> {
  const systemPrompt = `Du bist ein E-Mail-Parser für Rechnungen in einem Schweizer Logistik-Unternehmen.
Extrahiere strukturierte Daten aus der E-Mail.

Antworte als JSON:
{
  "invoiceNumber": string | null,
  "supplier": string | null,
  "amount": number | null,
  "currency": string | null (z.B. "CHF", "EUR"),
  "dueDate": string | null (ISO 8601 Format),
  "orderReference": string | null,
  "taxAmount": number | null,
  "notes": string | null
}

Wenn ein Wert nicht erkennbar ist, setze null.
Beträge immer als Zahl ohne Währungszeichen.
Datum immer als ISO 8601 (YYYY-MM-DD).`;

  const result = await callOpenAI(apiKey, systemPrompt, body.slice(0, 4000));

  return {
    type: "invoice",
    invoiceNumber: (result.invoiceNumber as string) ?? null,
    supplier: (result.supplier as string) ?? null,
    amount: typeof result.amount === "number" ? result.amount : null,
    currency: (result.currency as string) ?? null,
    dueDate: (result.dueDate as string) ?? null,
    orderReference: (result.orderReference as string) ?? null,
    taxAmount: typeof result.taxAmount === "number" ? result.taxAmount : null,
    notes: (result.notes as string) ?? null,
  };
}
