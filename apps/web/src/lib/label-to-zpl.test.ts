import { describe, it, expect } from "vitest"
import { labelToZpl } from "@/lib/label-to-zpl"
import type { LabelTemplate, LabelElement } from "@/lib/label-designer-types"

function makeTemplate(
  elements: LabelElement[],
  width = 100,
  height = 50
): LabelTemplate {
  return { name: "Test", width, height, elements }
}

function makeElement(overrides: Partial<LabelElement> & { type: LabelElement["type"] }): LabelElement {
  return {
    id: "el-1",
    x: 10,
    y: 5,
    width: 40,
    height: 10,
    ...overrides,
  }
}

describe("labelToZpl", () => {
  it("wraps output in ^XA and ^XZ", () => {
    const zpl = labelToZpl(makeTemplate([]))
    expect(zpl).toMatch(/^\^XA/)
    expect(zpl).toMatch(/\^XZ$/)
  })

  it("sets correct label size (mm to dots: 1mm = 8 dots at 203dpi)", () => {
    const zpl = labelToZpl(makeTemplate([], 100, 50))
    // 100mm * 8 = 800 dots, 50mm * 8 = 400 dots
    expect(zpl).toContain("^PW800")
    expect(zpl).toContain("^LL400")
  })

  it("generates ZPL for text element", () => {
    const el = makeElement({
      type: "text",
      content: "Hello",
      fontSize: 12,
      textAlign: "left",
    })
    const zpl = labelToZpl(makeTemplate([el]))

    // Position: 10mm*8=80, 5mm*8=40
    expect(zpl).toContain("^FO80,40")
    // Font command
    expect(zpl).toContain("^A0N,")
    // Field data
    expect(zpl).toContain("^FDHello^FS")
  })

  it("generates ZPL for text with center alignment", () => {
    const el = makeElement({
      type: "text",
      content: "Centered",
      textAlign: "center",
    })
    const zpl = labelToZpl(makeTemplate([el]))
    // FB command with C justification
    expect(zpl).toContain(",C")
  })

  it("generates ZPL for Code128 barcode (default)", () => {
    const el = makeElement({
      type: "barcode",
      content: "12345678",
      barcodeFormat: "code128",
    })
    const zpl = labelToZpl(makeTemplate([el]))

    expect(zpl).toContain("^FO80,40")
    // Code 128 command
    expect(zpl).toContain("^BCN,")
    expect(zpl).toContain("^FD12345678^FS")
  })

  it("generates ZPL for EAN-13 barcode", () => {
    const el = makeElement({
      type: "barcode",
      content: "4006381333931",
      barcodeFormat: "ean13",
    })
    const zpl = labelToZpl(makeTemplate([el]))
    expect(zpl).toContain("^BE,")
  })

  it("generates ZPL for Code39 barcode", () => {
    const el = makeElement({
      type: "barcode",
      content: "ABC123",
      barcodeFormat: "code39",
    })
    const zpl = labelToZpl(makeTemplate([el]))
    expect(zpl).toContain("^B3N,")
  })

  it("generates ZPL for QR code", () => {
    const el = makeElement({
      type: "qrcode",
      content: "https://logistikapp.ch/item/123",
    })
    const zpl = labelToZpl(makeTemplate([el]))

    expect(zpl).toContain("^FO80,40")
    // QR code command
    expect(zpl).toContain("^BQN,2,")
    // QR data prefix
    expect(zpl).toContain("^FDMA,")
  })

  it("maps position correctly (mm to dots)", () => {
    const el = makeElement({ type: "text", x: 25, y: 12.5, content: "Pos" })
    const zpl = labelToZpl(makeTemplate([el]))
    // 25*8=200, 12.5*8=100
    expect(zpl).toContain("^FO200,100")
  })

  it("resolves data bindings from provided data", () => {
    const el = makeElement({
      type: "text",
      dataBinding: "material_name",
    })
    const zpl = labelToZpl(makeTemplate([el]), {
      material_name: "Schrauben M8",
      material_number: "",
      material_barcode: "",
      tool_name: "",
      tool_number: "",
      tool_barcode: "",
      tool_serial: "",
      org_name: "",
      location_name: "",
      date_today: "",
      custom_text: "",
    })
    expect(zpl).toContain("^FDSchrauben M8^FS")
  })

  it("generates line element", () => {
    const el = makeElement({ type: "line", strokeWidth: 2 })
    const zpl = labelToZpl(makeTemplate([el]))
    expect(zpl).toContain("^GB")
  })

  it("generates rectangle element", () => {
    const el = makeElement({ type: "rectangle", strokeWidth: 1 })
    const zpl = labelToZpl(makeTemplate([el]))
    expect(zpl).toContain("^GB")
  })

  it("escapes special ZPL characters in content", () => {
    const el = makeElement({ type: "text", content: "Test^Value~Here" })
    const zpl = labelToZpl(makeTemplate([el]))
    expect(zpl).toContain("\\^")
    expect(zpl).toContain("\\~")
  })
})
