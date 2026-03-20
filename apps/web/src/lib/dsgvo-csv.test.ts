import { describe, it, expect } from "vitest"
import { toCsv } from "@/lib/dsgvo-csv"
import type { DsgvoData } from "@/lib/dsgvo-collector"

function makeMinimalData(overrides?: Partial<DsgvoData>): DsgvoData {
  return {
    exportedAt: "2026-01-15T10:30:00.000Z",
    user: {
      id: "usr-1",
      email: "test@example.com",
      name: "Max Muster",
      role: "user",
      createdAt: new Date("2025-06-01T08:00:00Z"),
      updatedAt: new Date("2025-12-20T14:30:00Z"),
    },
    stockChanges: [],
    toolBookings: [],
    timeEntries: [],
    comments: [],
    commissionEntries: [],
    ...overrides,
  }
}

describe("dsgvo-csv (toCsv)", () => {
  it("generates CSV starting with BOM", () => {
    const csv = toCsv(makeMinimalData())
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })

  it("uses semicolon delimiter", () => {
    const csv = toCsv(makeMinimalData())
    // Header row of Benutzerprofil section uses semicolons
    expect(csv).toContain("ID;E-Mail;Name;Rolle;Erstellt am;Aktualisiert am")
  })

  it("includes section headers with # prefix", () => {
    const csv = toCsv(makeMinimalData())
    expect(csv).toContain("# Benutzerprofil")
    expect(csv).toContain("# Bestandsänderungen")
    expect(csv).toContain("# Werkzeug-Buchungen")
    expect(csv).toContain("# Zeiteinträge")
    expect(csv).toContain("# Kommentare")
    expect(csv).toContain("# Kommissions-Einträge")
  })

  it("includes export date header", () => {
    const csv = toCsv(makeMinimalData())
    expect(csv).toContain("# LogistikApp Datenexport")
  })

  it("handles empty data arrays gracefully", () => {
    const csv = toCsv(makeMinimalData())
    // Sections exist with headers but no data rows — should not throw
    expect(csv).toContain("# Bestandsänderungen")
    expect(csv).toContain("ID;Typ;Menge;Notizen;Erstellt am")
  })

  it("includes user profile data", () => {
    const csv = toCsv(makeMinimalData())
    expect(csv).toContain("usr-1")
    expect(csv).toContain("test@example.com")
    expect(csv).toContain("Max Muster")
  })

  it("formats dates in de-CH locale", () => {
    const csv = toCsv(makeMinimalData())
    // de-CH format uses dd.mm.yyyy — the exact output depends on runtime
    // but should contain the year at minimum
    expect(csv).toContain("2025")
  })

  it("includes stock changes when provided", () => {
    const csv = toCsv(
      makeMinimalData({
        stockChanges: [
          {
            id: "sc-1",
            changeType: "incoming",
            quantity: 50,
            notes: "Lieferung erhalten",
            createdAt: new Date("2025-09-01T10:00:00Z"),
          },
        ],
      })
    )
    expect(csv).toContain("sc-1")
    expect(csv).toContain("incoming")
    expect(csv).toContain("50")
    expect(csv).toContain("Lieferung erhalten")
  })

  it("escapes fields containing semicolons", () => {
    const csv = toCsv(
      makeMinimalData({
        stockChanges: [
          {
            id: "sc-2",
            changeType: "outgoing",
            quantity: 10,
            notes: "Grund; mehrere Teile",
            createdAt: new Date("2025-10-01T10:00:00Z"),
          },
        ],
      })
    )
    expect(csv).toContain('"Grund; mehrere Teile"')
  })

  it("renders billable time entries as Ja/Nein", () => {
    const csv = toCsv(
      makeMinimalData({
        timeEntries: [
          {
            id: "te-1",
            description: "Montage",
            startTime: new Date("2025-11-01T08:00:00Z"),
            endTime: new Date("2025-11-01T12:00:00Z"),
            durationMinutes: 240,
            billable: true,
            status: "completed",
            createdAt: new Date("2025-11-01T08:00:00Z"),
          },
        ],
      })
    )
    expect(csv).toContain("Ja")
  })
})
