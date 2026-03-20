/**
 * CSV template generators for each entity type.
 * Used for "Vorlage herunterladen" in the migration wizard.
 */

export type EntityType = "materials" | "tools" | "suppliers" | "locations"

interface TemplateField {
  header: string
  description: string
  required: boolean
  example: string
}

const MATERIAL_FIELDS: TemplateField[] = [
  { header: "Name", description: "Materialbezeichnung", required: true, example: "Schraube M8x40" },
  { header: "Nummer", description: "Artikelnummer", required: false, example: "MAT-001" },
  { header: "Einheit", description: "Mengeneinheit", required: false, example: "Stk" },
  { header: "Barcode", description: "EAN / Barcode", required: false, example: "7610000000001" },
  { header: "Mindestbestand", description: "Mindestbestand (Zahl)", required: false, example: "50" },
  { header: "Gruppe", description: "Materialgruppe", required: false, example: "Befestigungsmaterial" },
  { header: "Standort", description: "Hauptlagerort", required: false, example: "Lager A" },
  { header: "Hersteller", description: "Hersteller", required: false, example: "Fischer" },
  { header: "Notizen", description: "Zusätzliche Bemerkungen", required: false, example: "Edelstahl A2" },
]

const TOOL_FIELDS: TemplateField[] = [
  { header: "Name", description: "Werkzeugbezeichnung", required: true, example: "Bohrmaschine Hilti TE 6-A22" },
  { header: "Nummer", description: "Inventarnummer", required: false, example: "WZ-001" },
  { header: "Zustand", description: "good / fair / poor / broken", required: false, example: "good" },
  { header: "Standort", description: "Standort", required: false, example: "Werkstatt 1" },
  { header: "Seriennummer", description: "Seriennummer", required: false, example: "SN-2024-0001" },
  { header: "Hersteller", description: "Hersteller", required: false, example: "Hilti" },
  { header: "Barcode", description: "Barcode", required: false, example: "7610000000002" },
  { header: "Notizen", description: "Bemerkungen", required: false, example: "Inkl. 2 Akkus" },
]

const SUPPLIER_FIELDS: TemplateField[] = [
  { header: "Name", description: "Firmenname", required: true, example: "Schrauben Müller AG" },
  { header: "Lieferantennummer", description: "Lieferantennr.", required: false, example: "LF-001" },
  { header: "Kundennummer", description: "Ihre Kundennr. beim Lieferanten", required: false, example: "K-12345" },
  { header: "Kontaktperson", description: "Ansprechpartner", required: false, example: "Hans Muster" },
  { header: "E-Mail", description: "E-Mail-Adresse", required: false, example: "info@mueller-ag.ch" },
  { header: "Telefon", description: "Telefonnummer", required: false, example: "+41 44 123 45 67" },
  { header: "Adresse", description: "Strasse + Nr.", required: false, example: "Industriestrasse 10" },
  { header: "PLZ", description: "Postleitzahl", required: false, example: "8000" },
  { header: "Ort", description: "Stadt", required: false, example: "Zürich" },
  { header: "Land", description: "Land", required: false, example: "Schweiz" },
  { header: "Notizen", description: "Zusätzliche Infos", required: false, example: "Lieferzeit 2-3 Tage" },
]

const LOCATION_FIELDS: TemplateField[] = [
  { header: "Name", description: "Standortbezeichnung", required: true, example: "Lager A" },
  { header: "Typ", description: "warehouse / vehicle / construction_site / office", required: true, example: "warehouse" },
  { header: "Adresse", description: "Standortadresse", required: false, example: "Industriestrasse 10, 8000 Zürich" },
]

const FIELD_MAP: Record<EntityType, TemplateField[]> = {
  materials: MATERIAL_FIELDS,
  tools: TOOL_FIELDS,
  suppliers: SUPPLIER_FIELDS,
  locations: LOCATION_FIELDS,
}

/** Get template fields for an entity type. */
export function getTemplateFields(entityType: EntityType): TemplateField[] {
  return FIELD_MAP[entityType] ?? []
}

/** Get CSV header row for a template. */
export function getTemplateHeaders(entityType: EntityType): string[] {
  return getTemplateFields(entityType).map((f) => f.header)
}

/** Generate a full CSV template with BOM + header + example row. */
export function generateTemplate(entityType: EntityType): string {
  const BOM = "\uFEFF"
  const fields = getTemplateFields(entityType)
  const headers = fields.map((f) => f.header).join(";")
  const examples = fields.map((f) => f.example).join(";")
  return BOM + headers + "\r\n" + examples + "\r\n"
}

/** Human-readable entity type label. */
export function getEntityLabel(entityType: EntityType): string {
  const labels: Record<EntityType, string> = {
    materials: "Materialien",
    tools: "Werkzeuge",
    suppliers: "Lieferanten",
    locations: "Standorte",
  }
  return labels[entityType]
}

/** Target field definitions for column mapping. */
export interface TargetField {
  key: string
  label: string
  required: boolean
}

export function getTargetFields(entityType: EntityType): TargetField[] {
  return getTemplateFields(entityType).map((f) => ({
    key: f.header.toLowerCase().replace(/[^a-z0-9äöü]/g, "_"),
    label: f.header,
    required: f.required,
  }))
}

/** Known column name aliases for smart auto-mapping. */
const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["name", "bezeichnung", "beschreibung", "artikel", "artikelbezeichnung", "artikelname", "material", "werkzeug", "tool", "firma", "firmenname", "lieferant", "standort"],
  nummer: ["nummer", "number", "nr", "artikelnummer", "art_nr", "artnr", "inventarnummer", "inv_nr", "lieferantennummer", "lf_nr"],
  einheit: ["einheit", "unit", "me", "mengeneinheit"],
  barcode: ["barcode", "ean", "ean13", "gtin", "upc"],
  mindestbestand: ["mindestbestand", "min_bestand", "minbestand", "min_stock", "reorder", "reorder_level", "meldebestand"],
  gruppe: ["gruppe", "group", "kategorie", "category", "warengruppe", "materialgruppe"],
  standort: ["standort", "location", "lagerort", "lager", "ort"],
  hersteller: ["hersteller", "manufacturer", "marke", "brand"],
  notizen: ["notizen", "notes", "bemerkungen", "kommentar", "comment"],
  zustand: ["zustand", "condition", "status", "state"],
  seriennummer: ["seriennummer", "serial", "serial_number", "sn"],
  lieferantennummer: ["lieferantennummer", "lf_nr", "supplier_number", "supplier_no"],
  kundennummer: ["kundennummer", "kd_nr", "customer_number", "customer_no"],
  kontaktperson: ["kontaktperson", "ansprechpartner", "contact", "contact_person"],
  e_mail: ["e_mail", "email", "mail", "e-mail"],
  telefon: ["telefon", "phone", "tel", "telephone", "fon"],
  adresse: ["adresse", "address", "strasse", "street"],
  plz: ["plz", "zip", "postleitzahl", "postal_code"],
  ort: ["ort", "city", "stadt", "place"],
  land: ["land", "country"],
  typ: ["typ", "type", "art"],
}

/** Auto-map CSV column headers to target fields based on known aliases. */
export function autoMapColumns(
  csvHeaders: string[],
  entityType: EntityType
): Record<string, string> {
  const targetFields = getTargetFields(entityType)
  const mapping: Record<string, string> = {}

  for (const csvHeader of csvHeaders) {
    const normalized = csvHeader.toLowerCase().trim().replace(/[^a-zäöü0-9]/g, "_")

    for (const target of targetFields) {
      // Already mapped this target
      if (Object.values(mapping).includes(target.key)) continue

      const aliases = COLUMN_ALIASES[target.key] ?? [target.key]
      if (aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized))) {
        mapping[csvHeader] = target.key
        break
      }
    }
  }

  return mapping
}
