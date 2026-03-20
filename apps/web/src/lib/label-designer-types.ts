// ─── Barcode Label Designer Types ──────────────────────────────────

export type LabelElementType =
  | "text"
  | "barcode"
  | "qrcode"
  | "image"
  | "line"
  | "rectangle"

export type DataBinding =
  | "material_name"
  | "material_number"
  | "material_barcode"
  | "tool_name"
  | "tool_number"
  | "tool_barcode"
  | "tool_serial"
  | "org_name"
  | "location_name"
  | "date_today"
  | "custom_text"

export interface LabelElement {
  id: string
  type: LabelElementType
  x: number // mm from left
  y: number // mm from top
  width: number // mm
  height: number // mm
  // Text properties
  content?: string
  fontSize?: number // pt
  fontWeight?: "normal" | "bold"
  textAlign?: "left" | "center" | "right"
  // Data binding
  dataBinding?: DataBinding
  // Barcode properties
  barcodeFormat?: "code128" | "ean13" | "code39"
  // Image properties
  imageUrl?: string
  // Line/rect properties
  strokeWidth?: number
  rotation?: number
}

export interface LabelTemplate {
  id?: string
  name: string
  width: number // mm
  height: number // mm
  elements: LabelElement[]
}

export interface LabelCanvasState {
  template: LabelTemplate
  selectedElementId: string | null
  isDragging: boolean
}

export const LABEL_SIZES = [
  { label: "Klein (50 x 25 mm)", width: 50, height: 25 },
  { label: "Mittel (100 x 50 mm)", width: 100, height: 50 },
  { label: "Gross (100 x 150 mm)", width: 100, height: 150 },
] as const

export const DATA_BINDING_OPTIONS: { value: DataBinding; label: string }[] = [
  { value: "material_name", label: "Materialname" },
  { value: "material_number", label: "Materialnummer" },
  { value: "material_barcode", label: "Material-Barcode" },
  { value: "tool_name", label: "Werkzeugname" },
  { value: "tool_number", label: "Werkzeugnummer" },
  { value: "tool_barcode", label: "Werkzeug-Barcode" },
  { value: "tool_serial", label: "Seriennummer" },
  { value: "org_name", label: "Organisationsname" },
  { value: "location_name", label: "Lagerort" },
  { value: "date_today", label: "Heutiges Datum" },
  { value: "custom_text", label: "Eigener Text" },
]

export const SAMPLE_DATA: Record<DataBinding, string> = {
  material_name: "Schrauben M8x40",
  material_number: "MAT-00142",
  material_barcode: "4006381333931",
  tool_name: "Bohrmaschine Hilti TE 30",
  tool_number: "WZ-00087",
  tool_barcode: "7610057001234",
  tool_serial: "SN-2024-08-1547",
  org_name: "Müller Elektro AG",
  location_name: "Lager Zürich",
  date_today: new Date().toLocaleDateString("de-CH"),
  custom_text: "Beispieltext",
}
