// ---------------------------------------------------------------------------
// Lieferschein PDF — Delivery note generator
//
// Opens a new window with A4-optimised HTML and triggers window.print().
// No server round-trip, no PDF library dependency — the OS print dialog
// handles "Save as PDF".
// ---------------------------------------------------------------------------

export interface LieferscheinOrg {
  name: string
  address?: string | null
  zip?: string | null
  city?: string | null
  country?: string | null
  logo?: string | null
}

export interface LieferscheinEntry {
  /** Display position number (1-based) */
  position: number
  articleNumber: string
  name: string
  quantity: number
  unit: string
  notes?: string | null
}

export interface LieferscheinData {
  /** Internal system number, e.g. "K-2025-001" */
  number: string
  /** Optional customer-visible number */
  manualNumber?: string | null
  commissionName: string
  customerName?: string | null
  customerAddress?: string | null
  /** Delivery destination label */
  targetLocation: string
  responsible: string
  createdAt: string   // ISO date string
  entries: LieferscheinEntry[]
  /** Optional base64 PNG data URL embedded from signature canvas */
  signature?: string | null
  signedAt?: Date | null
  signedBy?: string | null
  org: LieferscheinOrg
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function esc(str: string | null | undefined): string {
  if (str == null) return ""
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatDateTime(d: Date): string {
  return d.toLocaleString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ---------------------------------------------------------------------------
// HTML builder
// ---------------------------------------------------------------------------

function buildHtml(data: LieferscheinData): string {
  const today = new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const numberLabel = data.manualNumber
    ? `${esc(data.number)} / ${esc(data.manualNumber)}`
    : esc(data.number)

  // Address block
  const addressParts = [
    data.org.address,
    [data.org.zip, data.org.city].filter(Boolean).join(" "),
    data.org.country && data.org.country !== "CH" ? data.org.country : null,
  ].filter(Boolean)

  const orgAddressHtml = addressParts.map((p) => `${esc(p)}<br>`).join("")

  // Customer block
  const customerLines = [
    data.customerName,
    data.customerAddress,
  ].filter(Boolean)
  const customerHtml =
    customerLines.length > 0
      ? customerLines.map((l) => `${esc(l)}<br>`).join("")
      : "<em>—</em>"

  // Logo
  const logoHtml = data.org.logo
    ? `<img src="${esc(data.org.logo)}" alt="Logo" class="logo" />`
    : `<div class="logo-fallback">${esc(data.org.name)}</div>`

  // Entries table rows
  const entryRows = data.entries
    .map(
      (e) => `
      <tr>
        <td class="center">${esc(String(e.position))}</td>
        <td>${esc(e.articleNumber)}</td>
        <td>${esc(e.name)}${e.notes ? `<div class="entry-notes">${esc(e.notes)}</div>` : ""}</td>
        <td class="right">${esc(String(e.quantity))}</td>
        <td>${esc(e.unit)}</td>
      </tr>`,
    )
    .join("")

  const totalQty = data.entries.reduce((s, e) => s + e.quantity, 0)

  // Signature block
  const signatureHtml = data.signature
    ? `
    <div class="signature-block filled">
      <div class="sig-label">Empfangen von:</div>
      <img src="${data.signature}" alt="Unterschrift" class="sig-image" />
      <div class="sig-meta">
        ${data.signedBy ? `<strong>${esc(data.signedBy)}</strong>&emsp;` : ""}
        ${data.signedAt ? formatDateTime(data.signedAt) : ""}
      </div>
    </div>`
    : `
    <div class="signature-block">
      <div class="sig-row">
        <div class="sig-field">
          <div class="sig-line"></div>
          <div class="sig-label">Empfangen von</div>
        </div>
        <div class="sig-field">
          <div class="sig-line"></div>
          <div class="sig-label">Datum / Unterschrift</div>
        </div>
      </div>
    </div>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Lieferschein ${esc(data.number)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 20mm 15mm;
      @bottom-center {
        content: "${esc(data.org.name)} | Lieferschein ${esc(data.number)} | Seite " counter(page) " von " counter(pages);
        font-size: 8px;
        color: #888;
      }
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      font-size: 10px;
      color: #111;
      margin: 0;
      padding: 0;
      line-height: 1.5;
    }

    /* ── Header ─────────────────────────────────────────────────── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
      border-bottom: 2px solid #111;
      margin-bottom: 14px;
    }
    .logo { max-height: 50px; max-width: 160px; object-fit: contain; }
    .logo-fallback {
      font-size: 16px;
      font-weight: 700;
      color: #111;
      letter-spacing: -0.5px;
    }
    .doc-title {
      text-align: right;
    }
    .doc-title h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 2px 0;
      letter-spacing: -0.3px;
    }
    .doc-title .number {
      font-size: 11px;
      font-family: ui-monospace, "SF Mono", Consolas, monospace;
      color: #444;
    }
    .doc-title .date {
      font-size: 9px;
      color: #666;
      margin-top: 2px;
    }

    /* ── Address grid ───────────────────────────────────────────── */
    .address-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .address-box h2 {
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #666;
      margin: 0 0 4px 0;
      padding-bottom: 2px;
      border-bottom: 1px solid #e0e0e0;
    }
    .address-box p {
      margin: 0;
      font-size: 10px;
      line-height: 1.6;
    }

    /* ── Commission metadata ────────────────────────────────────── */
    .meta-strip {
      display: flex;
      gap: 24px;
      background: #f7f7f7;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 16px;
      font-size: 9px;
    }
    .meta-item { display: flex; flex-direction: column; gap: 1px; }
    .meta-item .meta-key {
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #888;
      font-weight: 600;
    }
    .meta-item .meta-val { font-weight: 500; color: #111; }

    /* ── Items table ────────────────────────────────────────────── */
    .section-label {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #555;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin-bottom: 12px;
    }
    thead th {
      background: #1a1a1a;
      color: #fff;
      padding: 5px 7px;
      text-align: left;
      font-weight: 600;
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
    }
    thead th.center { text-align: center; }
    thead th.right  { text-align: right; }
    tbody td {
      border-bottom: 1px solid #ececec;
      padding: 5px 7px;
      vertical-align: top;
    }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) td { background: #fafafa; }
    td.center { text-align: center; }
    td.right  { text-align: right; }
    .entry-notes {
      font-size: 8px;
      color: #888;
      margin-top: 2px;
      font-style: italic;
    }
    tfoot td {
      border-top: 2px solid #111;
      padding: 5px 7px;
      font-weight: 600;
      font-size: 9.5px;
      background: #f7f7f7;
    }

    /* ── Signature ──────────────────────────────────────────────── */
    .signature-block {
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .sig-row {
      display: flex;
      gap: 40px;
      margin-top: 6px;
    }
    .sig-field { flex: 1; }
    .sig-line {
      height: 1px;
      background: #111;
      margin-bottom: 4px;
      margin-top: 40px; /* space for signing */
    }
    .sig-label {
      font-size: 8px;
      color: #666;
      text-align: center;
    }
    .signature-block.filled .sig-label {
      font-size: 9px;
      color: #444;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .signature-block.filled .sig-image {
      max-height: 80px;
      max-width: 260px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      display: block;
      margin-bottom: 4px;
    }
    .sig-meta {
      font-size: 8.5px;
      color: #555;
    }

    /* ── Footer ─────────────────────────────────────────────────── */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      border-top: 1px solid #ccc;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5px;
      color: #888;
    }

    /* ── Print overrides ─────────────────────────────────────────── */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .footer { display: none; } /* @page handles this on supporting browsers */
    }
    @media screen {
      body { padding: 20px; max-width: 794px; margin: 0 auto; background: #f0f0f0; }
      .page { background: #fff; padding: 30px; box-shadow: 0 2px 12px rgba(0,0,0,.15); }
    }
  </style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="logo-wrap">${logoHtml}</div>
    <div class="doc-title">
      <h1>Lieferschein</h1>
      <div class="number">${numberLabel}</div>
      <div class="date">Datum: ${esc(formatDate(data.createdAt))}</div>
    </div>
  </div>

  <!-- Address grid -->
  <div class="address-grid">
    <div class="address-box">
      <h2>Absender</h2>
      <p>${esc(data.org.name)}<br>${orgAddressHtml}</p>
    </div>
    <div class="address-box">
      <h2>Empfänger / Kunde</h2>
      <p>${customerHtml}</p>
    </div>
    <div class="address-box">
      <h2>Lieferadresse</h2>
      <p>${esc(data.targetLocation)}</p>
    </div>
  </div>

  <!-- Meta strip -->
  <div class="meta-strip">
    <div class="meta-item">
      <span class="meta-key">Kommission</span>
      <span class="meta-val">${esc(data.commissionName)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-key">Verantwortlich</span>
      <span class="meta-val">${esc(data.responsible)}</span>
    </div>
    <div class="meta-item">
      <span class="meta-key">Druckdatum</span>
      <span class="meta-val">${today}</span>
    </div>
    ${
      data.manualNumber
        ? `<div class="meta-item">
      <span class="meta-key">Ref.-Nr.</span>
      <span class="meta-val">${esc(data.manualNumber)}</span>
    </div>`
        : ""
    }
  </div>

  <!-- Items -->
  <div class="section-label">Positionen</div>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:36px">Pos.</th>
        <th style="width:100px">Artikelnr.</th>
        <th>Bezeichnung</th>
        <th class="right" style="width:56px">Menge</th>
        <th style="width:48px">Einheit</th>
      </tr>
    </thead>
    <tbody>
      ${entryRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="text-align:right">Gesamt:</td>
        <td class="right">${esc(String(totalQty))}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <!-- Signature -->
  ${signatureHtml}
</div>

<div class="footer">
  <span>${esc(data.org.name)}${data.org.address ? ` · ${esc(data.org.address)}` : ""}${data.org.zip ? ` · ${esc(data.org.zip)} ${esc(data.org.city ?? "")}` : ""}</span>
  <span>Lieferschein ${esc(data.number)} · Erstellt am ${today}</span>
</div>

<script>
  // Fire print after fonts/images have loaded
  window.addEventListener("load", function () {
    window.print();
  });
<\/script>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Public API: single commission
// ---------------------------------------------------------------------------

/**
 * Open a new print window with a styled Lieferschein for a single commission.
 * Call this from a "Lieferschein drucken" button click handler.
 */
export function printLieferschein(data: LieferscheinData): void {
  const html = buildHtml(data)
  const win = window.open("", "_blank", "width=900,height=1100")
  if (!win) {
    console.warn("printLieferschein: popup blocked — could not open print window.")
    return
  }
  win.document.write(html)
  win.document.close()
}

// ---------------------------------------------------------------------------
// Public API: batch (multiple commissions → one print job, page breaks)
// ---------------------------------------------------------------------------

/**
 * Print multiple Lieferscheine in a single browser print job.
 * Each commission gets its own A4 page separated by CSS page-break.
 */
export function printLieferscheinBatch(items: LieferscheinData[]): void {
  if (items.length === 0) return
  if (items.length === 1) {
    printLieferschein(items[0])
    return
  }

  // Build each doc, then strip <html>/<head>/<body> wrappers and concatenate
  // with page-break divs so the browser treats them as one document.
  const pages = items.map((data, idx) => {
    const html = buildHtml(data)
    // Extract just the <body> content
    const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/)
    const bodyContent = bodyMatch ? bodyMatch[1] : html
    const breakStyle = idx > 0 ? 'style="page-break-before:always;"' : ""
    return `<div class="ls-page" ${breakStyle}>${bodyContent}</div>`
  })

  // Reuse CSS from first doc's <style>
  const styleMatch = buildHtml(items[0]).match(/<style>([\s\S]*?)<\/style>/)
  const css = styleMatch ? styleMatch[1] : ""

  const combined = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <title>Lieferscheine (${items.length})</title>
  <style>${css}
    .ls-page { page-break-inside: avoid; }
  </style>
</head>
<body>
${pages.join("\n")}
<script>
  window.addEventListener("load", function () { window.print(); });
<\/script>
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=1100")
  if (!win) return
  win.document.write(combined)
  win.document.close()
}

// ---------------------------------------------------------------------------
// Utility: build LieferscheinEntry list from commission entries API response
// ---------------------------------------------------------------------------

export interface RawCommissionEntry {
  id: string
  materialName?: string | null
  materialNumber?: string | null
  materialUnit?: string | null
  toolName?: string | null
  toolNumber?: string | null
  quantity?: number | null
  notes?: string | null
}

export function buildLieferscheinEntries(
  raw: RawCommissionEntry[],
): LieferscheinEntry[] {
  return raw.map((e, idx) => ({
    position: idx + 1,
    articleNumber: e.materialNumber ?? e.toolNumber ?? "—",
    name: e.materialName ?? e.toolName ?? "Unbekannt",
    quantity: e.quantity ?? 1,
    unit: e.materialUnit ?? "Stk",
    notes: e.notes,
  }))
}
