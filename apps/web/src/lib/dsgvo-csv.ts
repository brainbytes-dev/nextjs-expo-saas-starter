import type { DsgvoData } from "./dsgvo-collector";

const BOM = "\uFEFF";
const SEP = ";";

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Wrap in quotes if it contains separator, quotes, or newlines
  if (str.includes(SEP) || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  try {
    return new Intl.DateTimeFormat("de-CH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return String(date);
  }
}

function buildSection(
  title: string,
  headers: string[],
  rows: string[][]
): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push(headers.map(escapeField).join(SEP));
  for (const row of rows) {
    lines.push(row.map(escapeField).join(SEP));
  }
  lines.push(""); // blank line between sections
  return lines.join("\n");
}

/**
 * Converts DSGVO collected data to CSV format with semicolon delimiter
 * and BOM for Excel compatibility.
 */
export function toCsv(data: DsgvoData): string {
  const sections: string[] = [];

  // Header
  sections.push(
    `# LogistikApp Datenexport — ${formatDate(data.exportedAt)}`
  );
  sections.push("");

  // User profile
  sections.push(
    buildSection(
      "Benutzerprofil",
      ["ID", "E-Mail", "Name", "Rolle", "Erstellt am", "Aktualisiert am"],
      [
        [
          data.user.id,
          data.user.email,
          data.user.name ?? "",
          data.user.role,
          formatDate(data.user.createdAt),
          formatDate(data.user.updatedAt),
        ],
      ]
    )
  );

  // Stock changes
  sections.push(
    buildSection(
      "Bestandsänderungen",
      ["ID", "Typ", "Menge", "Notizen", "Erstellt am"],
      data.stockChanges.map((s) => [
        s.id,
        s.changeType,
        String(s.quantity),
        s.notes ?? "",
        formatDate(s.createdAt),
      ])
    )
  );

  // Tool bookings
  sections.push(
    buildSection(
      "Werkzeug-Buchungen",
      ["ID", "Typ", "Notizen", "Erstellt am"],
      data.toolBookings.map((b) => [
        b.id,
        b.bookingType,
        b.notes ?? "",
        formatDate(b.createdAt),
      ])
    )
  );

  // Time entries
  sections.push(
    buildSection(
      "Zeiteinträge",
      [
        "ID",
        "Beschreibung",
        "Startzeit",
        "Endzeit",
        "Dauer (Min.)",
        "Verrechenbar",
        "Status",
        "Erstellt am",
      ],
      data.timeEntries.map((t) => [
        t.id,
        t.description ?? "",
        formatDate(t.startTime),
        formatDate(t.endTime),
        t.durationMinutes != null ? String(t.durationMinutes) : "",
        t.billable ? "Ja" : "Nein",
        t.status,
        formatDate(t.createdAt),
      ])
    )
  );

  // Comments
  sections.push(
    buildSection(
      "Kommentare",
      ["ID", "Entitätstyp", "Entitäts-ID", "Inhalt", "Erstellt am"],
      data.comments.map((c) => [
        c.id,
        c.entityType,
        c.entityId,
        c.body,
        formatDate(c.createdAt),
      ])
    )
  );

  // Commission entries
  sections.push(
    buildSection(
      "Kommissions-Einträge",
      [
        "ID",
        "Kommission-ID",
        "Kommission",
        "Menge",
        "Gepickt",
        "Status",
        "Notizen",
        "Erstellt am",
      ],
      data.commissionEntries.map((e) => [
        e.id,
        e.commissionId,
        e.commissionName,
        e.quantity != null ? String(e.quantity) : "",
        e.pickedQuantity != null ? String(e.pickedQuantity) : "",
        e.status ?? "",
        e.notes ?? "",
        formatDate(e.createdAt),
      ])
    )
  );

  return BOM + sections.join("\n");
}
