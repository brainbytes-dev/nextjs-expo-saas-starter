import { describe, it, expect } from "vitest"
import { parseCSV, toCSV, detectDelimiter } from "@/lib/csv-parser"

describe("csv-parser", () => {
  describe("detectDelimiter", () => {
    it("detects semicolon delimiter (Swiss format)", () => {
      expect(detectDelimiter("Name;Menge;Preis")).toBe(";")
    })

    it("detects comma delimiter", () => {
      expect(detectDelimiter("Name,Menge,Preis")).toBe(",")
    })

    it("defaults to semicolon when equal counts", () => {
      // 0 semicolons, 0 commas => semicolons >= commas => ";"
      expect(detectDelimiter("NurText")).toBe(";")
    })
  })

  describe("parseCSV", () => {
    it("parses semicolon-delimited CSV (Swiss format)", () => {
      const csv = "Name;Menge;Preis\nSchrauben;100;2.50\nMuttern;200;1.20"
      const result = parseCSV(csv)
      expect(result.headers).toEqual(["Name", "Menge", "Preis"])
      expect(result.rows).toHaveLength(2)
      expect(result.rows[0]).toEqual(["Schrauben", "100", "2.50"])
      expect(result.rows[1]).toEqual(["Muttern", "200", "1.20"])
    })

    it("parses comma-delimited CSV", () => {
      const csv = "Name,Qty,Price\nBolts,100,2.50"
      const result = parseCSV(csv)
      expect(result.headers).toEqual(["Name", "Qty", "Price"])
      expect(result.rows[0]).toEqual(["Bolts", "100", "2.50"])
    })

    it("handles BOM (byte order mark)", () => {
      const csv = "\uFEFFName;Menge\nTest;42"
      const result = parseCSV(csv)
      expect(result.headers).toEqual(["Name", "Menge"])
      expect(result.rows[0]).toEqual(["Test", "42"])
    })

    it("handles quoted fields with delimiters inside", () => {
      const csv = 'Name;Beschreibung\n"Schraube; M8";"Sechskant, verzinkt"'
      const result = parseCSV(csv)
      expect(result.headers).toEqual(["Name", "Beschreibung"])
      expect(result.rows[0]).toEqual(["Schraube; M8", "Sechskant, verzinkt"])
    })

    it("handles escaped quotes within quoted fields", () => {
      const csv = 'Name;Notiz\n"Test ""Wert""";"OK"'
      const result = parseCSV(csv)
      expect(result.rows[0]![0]).toBe('Test "Wert"')
    })

    it("handles empty lines by filtering them out", () => {
      const csv = "Name;Menge\n\nSchrauben;10\n\n\nMuttern;20\n"
      const result = parseCSV(csv)
      expect(result.headers).toEqual(["Name", "Menge"])
      expect(result.rows).toHaveLength(2)
    })

    it("returns empty result for empty input", () => {
      const result = parseCSV("")
      expect(result.headers).toEqual([])
      expect(result.rows).toEqual([])
    })

    it("handles Windows-style line endings (CRLF)", () => {
      const csv = "A;B\r\n1;2\r\n3;4"
      const result = parseCSV(csv)
      expect(result.headers).toEqual(["A", "B"])
      expect(result.rows).toHaveLength(2)
    })
  })

  describe("toCSV", () => {
    it("generates output with BOM prefix", () => {
      const result = toCSV(["A"], [["1"]])
      expect(result.charCodeAt(0)).toBe(0xfeff)
    })

    it("uses semicolon delimiter", () => {
      const result = toCSV(["Name", "Menge"], [["Test", "42"]])
      // Strip BOM for easier assertion
      const stripped = result.slice(1)
      expect(stripped).toBe("Name;Menge\r\nTest;42")
    })

    it("escapes fields containing semicolons", () => {
      const result = toCSV(["Name"], [["Schraube; M8"]])
      const stripped = result.slice(1)
      expect(stripped).toBe('Name\r\n"Schraube; M8"')
    })

    it("escapes fields containing quotes", () => {
      const result = toCSV(["Name"], [['Test "Wert"']])
      const stripped = result.slice(1)
      expect(stripped).toBe('Name\r\n"Test ""Wert"""')
    })

    it("roundtrips correctly with parseCSV", () => {
      const headers = ["Name", "Menge", "Preis"]
      const rows = [["Schrauben", "100", "2.50"], ["Muttern", "200", "1.20"]]
      const csv = toCSV(headers, rows)
      const parsed = parseCSV(csv)
      expect(parsed.headers).toEqual(headers)
      expect(parsed.rows).toEqual(rows)
    })
  })
})
