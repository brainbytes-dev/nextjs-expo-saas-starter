// ─── Industry Template Definitions ──────────────────────────────────────────
//
// Static template data for 6 Swiss industries. Each template defines locations,
// material groups, tool groups, sample materials, sample tools, and custom field
// definitions that should be created when a user selects a template during
// onboarding.
//
// All labels are in German. Material/tool numbers follow Swiss conventions.

export type TemplateLocationType =
  | "warehouse"
  | "vehicle"
  | "site"
  | "station"
  | "practice"
  | "operating_room"

export type TemplateCustomFieldType = "text" | "number" | "date" | "select" | "boolean"
export type TemplateCustomFieldEntity = "material" | "tool"

export interface TemplateLocation {
  name: string
  type: TemplateLocationType
}

export interface TemplateMaterialGroup {
  name: string
  color: string
}

export interface TemplateToolGroup {
  name: string
  color: string
}

export interface TemplateMaterial {
  name: string
  number: string
  unit: string
  groupIndex: number // index into materialGroups array
  manufacturer?: string
  reorderLevel?: number
}

export interface TemplateTool {
  name: string
  number: string
  groupIndex: number // index into toolGroups array
  manufacturer?: string
  condition?: "good" | "damaged" | "repair"
}

export interface TemplateCustomField {
  name: string
  fieldType: TemplateCustomFieldType
  entityType: TemplateCustomFieldEntity
  sortOrder: number
}

export interface IndustryTemplate {
  /** Matches organizations.industry column values */
  industry: string
  label: string
  description: string
  /** Tabler icon name (without "Icon" prefix) for display */
  icon: string
  /** Tailwind color class for the icon background */
  iconColor: string
  locations: TemplateLocation[]
  materialGroups: TemplateMaterialGroup[]
  toolGroups: TemplateToolGroup[]
  materials: TemplateMaterial[]
  tools: TemplateTool[]
  customFields: TemplateCustomField[]
}

// ─── 1. Handwerk / Bau ───────────────────────────────────────────────────────

const handwerkTemplate: IndustryTemplate = {
  industry: "handwerk",
  label: "Handwerk / Bau",
  description:
    "Für Handwerksbetriebe, Baufirmen und Sanitär-/Elektroinstallateure. Enthält typische Verbrauchsmaterialien, Werkzeug und Fahrzeuglagerverwaltung.",
  icon: "Hammer",
  iconColor: "bg-amber-500/10 text-amber-600",
  locations: [
    { name: "Hauptlager", type: "warehouse" },
    { name: "Fahrzeug 1", type: "vehicle" },
    { name: "Fahrzeug 2", type: "vehicle" },
    { name: "Baustelle", type: "site" },
  ],
  materialGroups: [
    { name: "Elektro", color: "#f59e0b" },
    { name: "Sanitär", color: "#3b82f6" },
    { name: "Befestigung", color: "#6b7280" },
    { name: "Werkstoff", color: "#10b981" },
  ],
  toolGroups: [
    { name: "Elektrowerkzeug", color: "#ef4444" },
    { name: "Handwerkzeug", color: "#8b5cf6" },
    { name: "Messgerät", color: "#06b6d4" },
  ],
  materials: [
    // Befestigung (groupIndex 2)
    { name: "Schrauben M6×40 TX", number: "BEF-001", unit: "Stk", groupIndex: 2, manufacturer: "Würth", reorderLevel: 500 },
    { name: "Dübel Fischer SX 8×40", number: "BEF-002", unit: "Stk", groupIndex: 2, manufacturer: "Fischer", reorderLevel: 200 },
    { name: "Dübel Fischer SX 10×50", number: "BEF-003", unit: "Stk", groupIndex: 2, manufacturer: "Fischer", reorderLevel: 100 },
    { name: "Blindnieten Ø4.8×8 mm", number: "BEF-004", unit: "Stk", groupIndex: 2, manufacturer: "Gesipa", reorderLevel: 200 },
    { name: "Klebeband doppelseitig 50mm", number: "BEF-005", unit: "Rl", groupIndex: 2, manufacturer: "Tesa", reorderLevel: 5 },
    // Elektro (groupIndex 0)
    { name: "Kabel NYM-J 3×1.5 mm²", number: "EL-001", unit: "m", groupIndex: 0, manufacturer: "Huber+Suhner", reorderLevel: 50 },
    { name: "Kabel NYM-J 5×2.5 mm²", number: "EL-002", unit: "m", groupIndex: 0, manufacturer: "Huber+Suhner", reorderLevel: 30 },
    { name: "Leerrohr M20 flexibel", number: "EL-003", unit: "m", groupIndex: 0, reorderLevel: 20 },
    { name: "Schukostecker 16A", number: "EL-004", unit: "Stk", groupIndex: 0, manufacturer: "Legrand", reorderLevel: 10 },
    { name: "Verbindungsdose IP55 85×85", number: "EL-005", unit: "Stk", groupIndex: 0, manufacturer: "OBO Bettermann", reorderLevel: 10 },
    { name: "Kabelbinder 3.6×200 natur", number: "EL-006", unit: "Pkg", groupIndex: 0, reorderLevel: 5 },
    // Sanitär (groupIndex 1)
    { name: "Kupferrohr 15 mm (weich)", number: "SAN-001", unit: "m", groupIndex: 1, manufacturer: "KME", reorderLevel: 10 },
    { name: "Kupferrohr 22 mm (weich)", number: "SAN-002", unit: "m", groupIndex: 1, manufacturer: "KME", reorderLevel: 5 },
    { name: "Pressfitting T-Stück 15 mm", number: "SAN-003", unit: "Stk", groupIndex: 1, manufacturer: "Viega", reorderLevel: 20 },
    { name: "Silikon Sanitär weiß 310ml", number: "SAN-004", unit: "Stk", groupIndex: 1, manufacturer: "Sika", reorderLevel: 10 },
    { name: "Teflon-Band 12mm×12m", number: "SAN-005", unit: "Stk", groupIndex: 1, reorderLevel: 10 },
    // Werkstoff (groupIndex 3)
    { name: "Holzschraube 4×40 PZ2", number: "WS-001", unit: "Stk", groupIndex: 3, manufacturer: "Würth", reorderLevel: 200 },
    { name: "Bauschaum 750ml PU", number: "WS-002", unit: "Stk", groupIndex: 3, manufacturer: "Soudal", reorderLevel: 10 },
    { name: "Silikon Aussen transparent 310ml", number: "WS-003", unit: "Stk", groupIndex: 3, manufacturer: "Sika", reorderLevel: 5 },
    { name: "Malerkrepp 30mm×50m", number: "WS-004", unit: "Rl", groupIndex: 3, manufacturer: "Tesa", reorderLevel: 10 },
  ],
  tools: [
    // Elektrowerkzeug (groupIndex 0)
    { name: "Bohrhammer SDS+ 18V", number: "EW-001", groupIndex: 0, manufacturer: "Hilti", condition: "good" },
    { name: "Akkuschrauber 18V Set", number: "EW-002", groupIndex: 0, manufacturer: "Bosch", condition: "good" },
    { name: "Winkelschleifer 125mm", number: "EW-003", groupIndex: 0, manufacturer: "Makita", condition: "good" },
    { name: "Stichsäge 18V", number: "EW-004", groupIndex: 0, manufacturer: "DeWalt", condition: "good" },
    { name: "Kreissäge 165mm", number: "EW-005", groupIndex: 0, manufacturer: "Festool", condition: "good" },
    { name: "Pressgerät Viega Pressgun 5", number: "EW-006", groupIndex: 0, manufacturer: "Viega", condition: "good" },
    // Handwerkzeug (groupIndex 1)
    { name: "Wasserwaage 80cm", number: "HW-001", groupIndex: 1, manufacturer: "Stabila", condition: "good" },
    { name: "Schraubenzieher-Set Wiha", number: "HW-002", groupIndex: 1, manufacturer: "Wiha", condition: "good" },
    { name: "Schlüsselsatz Wera Joker", number: "HW-003", groupIndex: 1, manufacturer: "Wera", condition: "good" },
    // Messgerät (groupIndex 2)
    { name: "Multimeter Fluke 117", number: "MG-001", groupIndex: 2, manufacturer: "Fluke", condition: "good" },
  ],
  customFields: [
    { name: "Chargennummer", fieldType: "text", entityType: "material", sortOrder: 0 },
  ],
}

// ─── 2. Rettungsdienst / Feuerwehr ───────────────────────────────────────────

const rettungsdienstTemplate: IndustryTemplate = {
  industry: "rettungsdienst",
  label: "Rettungsdienst / Feuerwehr",
  description:
    "Für Rettungsdienste, Feuerwehren und Sanitätsorganisationen. Verwaltet Medikamente, Verbrauchsmaterial und Rettungsgeräte mit Ablaufdatum-Tracking.",
  icon: "Ambulance",
  iconColor: "bg-red-500/10 text-red-600",
  locations: [
    { name: "Station", type: "warehouse" },
    { name: "RTW 1", type: "vehicle" },
    { name: "RTW 2", type: "vehicle" },
    { name: "NEF", type: "vehicle" },
  ],
  materialGroups: [
    { name: "Medikamente", color: "#ef4444" },
    { name: "Verbrauchsmaterial", color: "#f59e0b" },
    { name: "Verbandmaterial", color: "#3b82f6" },
  ],
  toolGroups: [
    { name: "Medizingeräte", color: "#10b981" },
    { name: "Rettungsgeräte", color: "#ef4444" },
  ],
  materials: [
    // Medikamente (groupIndex 0)
    { name: "Infusionslösung NaCl 0.9% 500ml", number: "MED-001", unit: "Stk", groupIndex: 0, manufacturer: "B. Braun", reorderLevel: 20 },
    { name: "Infusionslösung Ringer 500ml", number: "MED-002", unit: "Stk", groupIndex: 0, manufacturer: "B. Braun", reorderLevel: 10 },
    { name: "Glucose 5% 500ml", number: "MED-003", unit: "Stk", groupIndex: 0, manufacturer: "Baxter", reorderLevel: 10 },
    { name: "Adrenalin 1mg/ml Amp.", number: "MED-004", unit: "Stk", groupIndex: 0, manufacturer: "Sintetica", reorderLevel: 5 },
    { name: "Midazolam 5mg/ml 3ml", number: "MED-005", unit: "Stk", groupIndex: 0, manufacturer: "Sintetica", reorderLevel: 5 },
    // Verbrauchsmaterial (groupIndex 1)
    { name: "Einmalhandschuhe Nitril M", number: "VM-001", unit: "Pkg", groupIndex: 1, manufacturer: "Hartmann", reorderLevel: 10 },
    { name: "Einmalhandschuhe Nitril L", number: "VM-002", unit: "Pkg", groupIndex: 1, manufacturer: "Hartmann", reorderLevel: 10 },
    { name: "Beatmungsbeutel Erwachsene", number: "VM-003", unit: "Stk", groupIndex: 1, manufacturer: "Laerdal", reorderLevel: 2 },
    { name: "Venenverweilkanüle 18G (grün)", number: "VM-004", unit: "Stk", groupIndex: 1, manufacturer: "BD", reorderLevel: 20 },
    { name: "Venenverweilkanüle 16G (grau)", number: "VM-005", unit: "Stk", groupIndex: 1, manufacturer: "BD", reorderLevel: 20 },
    { name: "Infusionsset 180cm", number: "VM-006", unit: "Stk", groupIndex: 1, reorderLevel: 10 },
    { name: "Absaugkatheter CH14", number: "VM-007", unit: "Stk", groupIndex: 1, reorderLevel: 5 },
    // Verbandmaterial (groupIndex 2)
    { name: "Pflaster assortiert 100er", number: "VB-001", unit: "Pkg", groupIndex: 2, manufacturer: "Hansaplast", reorderLevel: 5 },
    { name: "Mullbinde 6cm×4m", number: "VB-002", unit: "Stk", groupIndex: 2, reorderLevel: 10 },
    { name: "Druckverband 10×8cm", number: "VB-003", unit: "Stk", groupIndex: 2, reorderLevel: 10 },
  ],
  tools: [
    // Medizingeräte (groupIndex 0)
    { name: "Defibrillator LIFEPAK 15", number: "MG-001", groupIndex: 0, manufacturer: "Physio-Control", condition: "good" },
    { name: "Beatmungsgerät Hamilton T1", number: "MG-002", groupIndex: 0, manufacturer: "Hamilton Medical", condition: "good" },
    { name: "Absaugpumpe Laerdal Compact", number: "MG-003", groupIndex: 0, manufacturer: "Laerdal", condition: "good" },
    { name: "Pulsoximeter Nonin 9590", number: "MG-004", groupIndex: 0, manufacturer: "Nonin", condition: "good" },
    { name: "EKG-Monitor Schiller ARGUS PRO", number: "MG-005", groupIndex: 0, manufacturer: "Schiller", condition: "good" },
    // Rettungsgeräte (groupIndex 1)
    { name: "Spineboard Ferno 59", number: "RG-001", groupIndex: 1, manufacturer: "Ferno", condition: "good" },
    { name: "Schaufeltrage Ferno 65", number: "RG-002", groupIndex: 1, manufacturer: "Ferno", condition: "good" },
    { name: "Vakuummatratze SKED", number: "RG-003", groupIndex: 1, condition: "good" },
  ],
  customFields: [
    { name: "Ablaufdatum", fieldType: "date", entityType: "material", sortOrder: 0 },
    { name: "Chargennummer", fieldType: "text", entityType: "material", sortOrder: 1 },
  ],
}

// ─── 3. Arztpraxis / Zahnarztpraxis ──────────────────────────────────────────

const arztpraxisTemplate: IndustryTemplate = {
  industry: "arztpraxis",
  label: "Arztpraxis / Zahnarztpraxis",
  description:
    "Für Arzt- und Zahnarztpraxen. Verwaltet Medikamente, Verbrauchsmaterial und Geräte inklusive Sterilisations- und Ablaufdatum-Tracking.",
  icon: "Stethoscope",
  iconColor: "bg-blue-500/10 text-blue-600",
  locations: [
    { name: "Praxis", type: "practice" },
    { name: "Lager", type: "warehouse" },
    { name: "Behandlungsraum 1", type: "practice" },
    { name: "Behandlungsraum 2", type: "practice" },
    { name: "Behandlungsraum 3", type: "practice" },
  ],
  materialGroups: [
    { name: "Medikamente", color: "#ef4444" },
    { name: "Verbrauchsmaterial", color: "#f59e0b" },
    { name: "Labor", color: "#8b5cf6" },
  ],
  toolGroups: [
    { name: "Medizingeräte", color: "#3b82f6" },
    { name: "Dentalgeräte", color: "#10b981" },
  ],
  materials: [
    // Medikamente (groupIndex 0)
    { name: "Lidocain 1% Inj.-Lösung 20ml", number: "MED-001", unit: "Stk", groupIndex: 0, manufacturer: "Sintetica", reorderLevel: 10 },
    { name: "Paracetamol 500mg Tabl. 100er", number: "MED-002", unit: "Pkg", groupIndex: 0, reorderLevel: 3 },
    { name: "Ibuprofen 400mg Tabl. 50er", number: "MED-003", unit: "Pkg", groupIndex: 0, reorderLevel: 3 },
    // Verbrauchsmaterial (groupIndex 1)
    { name: "Einmalhandschuhe Latex S", number: "VM-001", unit: "Pkg", groupIndex: 1, manufacturer: "Hartmann", reorderLevel: 5 },
    { name: "Einmalhandschuhe Latex M", number: "VM-002", unit: "Pkg", groupIndex: 1, manufacturer: "Hartmann", reorderLevel: 10 },
    { name: "Desinfektionstücher Mikrobac", number: "VM-003", unit: "Pkg", groupIndex: 1, manufacturer: "Bode Chemie", reorderLevel: 5 },
    { name: "Spritzen 5ml Luer-Lock", number: "VM-004", unit: "Stk", groupIndex: 1, manufacturer: "BD", reorderLevel: 50 },
    { name: "Kanülen 0.9×40mm", number: "VM-005", unit: "Stk", groupIndex: 1, manufacturer: "BD", reorderLevel: 50 },
    { name: "Blutentnahmeröhrchen EDTA 4ml", number: "VM-006", unit: "Stk", groupIndex: 1, manufacturer: "Sarstedt", reorderLevel: 30 },
    { name: "Mundschutz OP Typ IIR 50er", number: "VM-007", unit: "Pkg", groupIndex: 1, reorderLevel: 5 },
    // Labor (groupIndex 2)
    { name: "Schnelltest Streptokokken A", number: "LAB-001", unit: "Stk", groupIndex: 2, manufacturer: "Roche", reorderLevel: 10 },
    { name: "Blutzucker-Teststreifen 50er", number: "LAB-002", unit: "Pkg", groupIndex: 2, manufacturer: "Roche", reorderLevel: 5 },
  ],
  tools: [
    // Medizingeräte (groupIndex 0)
    { name: "Ultraschallgerät Mindray DP-10", number: "MG-001", groupIndex: 0, manufacturer: "Mindray", condition: "good" },
    { name: "EKG-Gerät Schiller AT-2 Plus", number: "MG-002", groupIndex: 0, manufacturer: "Schiller", condition: "good" },
    { name: "Blutdruckmessgerät Welch Allyn", number: "MG-003", groupIndex: 0, manufacturer: "Welch Allyn", condition: "good" },
    { name: "Pulsoxymetrie Nellcor PM10N", number: "MG-004", groupIndex: 0, manufacturer: "Nellcor", condition: "good" },
    { name: "Sterilisator Melag Vacuklav 43B", number: "MG-005", groupIndex: 0, manufacturer: "Melag", condition: "good" },
  ],
  customFields: [
    { name: "Ablaufdatum", fieldType: "date", entityType: "material", sortOrder: 0 },
    { name: "Sterilisationsdatum", fieldType: "date", entityType: "tool", sortOrder: 0 },
  ],
}

// ─── 4. Spital / Klinik ───────────────────────────────────────────────────────

const spitalTemplate: IndustryTemplate = {
  industry: "spital",
  label: "Spital / Klinik",
  description:
    "Für Spitäler, Kliniken und stationäre Einrichtungen. Umfangreiches Inventar mit MDR-Klassifizierung, Chargen- und Sterilisations-Tracking.",
  icon: "BuildingHospital",
  iconColor: "bg-emerald-500/10 text-emerald-600",
  locations: [
    { name: "Zentrallager", type: "warehouse" },
    { name: "Station A", type: "station" },
    { name: "Station B", type: "station" },
    { name: "OP-Saal 1", type: "operating_room" },
    { name: "Notaufnahme", type: "station" },
  ],
  materialGroups: [
    { name: "Medikamente", color: "#ef4444" },
    { name: "Verbrauchsmaterial", color: "#f59e0b" },
    { name: "Sterilgut", color: "#3b82f6" },
    { name: "Implantate", color: "#8b5cf6" },
  ],
  toolGroups: [
    { name: "Medizingeräte", color: "#10b981" },
    { name: "OP-Instrumente", color: "#ef4444" },
    { name: "Pflegehilfsmittel", color: "#06b6d4" },
  ],
  materials: [
    // Medikamente (groupIndex 0)
    { name: "NaCl 0.9% Infusion 1000ml", number: "MED-001", unit: "Stk", groupIndex: 0, manufacturer: "B. Braun", reorderLevel: 50 },
    { name: "Heparin 5000 IE/ml Amp. 5ml", number: "MED-002", unit: "Stk", groupIndex: 0, manufacturer: "Rotexmedica", reorderLevel: 20 },
    { name: "Propofol 1% 50ml", number: "MED-003", unit: "Stk", groupIndex: 0, manufacturer: "Fresenius Kabi", reorderLevel: 10 },
    { name: "Morphin 10mg/ml Amp.", number: "MED-004", unit: "Stk", groupIndex: 0, manufacturer: "Sintetica", reorderLevel: 10 },
    // Verbrauchsmaterial (groupIndex 1)
    { name: "Einmalhandschuhe Nitril S 100er", number: "VM-001", unit: "Pkg", groupIndex: 1, reorderLevel: 20 },
    { name: "Einmalhandschuhe Nitril M 100er", number: "VM-002", unit: "Pkg", groupIndex: 1, reorderLevel: 30 },
    { name: "Einmalhandschuhe Nitril L 100er", number: "VM-003", unit: "Pkg", groupIndex: 1, reorderLevel: 20 },
    { name: "Spritzen 2ml Luer-Lock", number: "VM-004", unit: "Stk", groupIndex: 1, manufacturer: "BD", reorderLevel: 100 },
    { name: "Spritzen 10ml Luer-Lock", number: "VM-005", unit: "Stk", groupIndex: 1, manufacturer: "BD", reorderLevel: 100 },
    { name: "Kanülen 0.6×25mm (blau)", number: "VM-006", unit: "Stk", groupIndex: 1, manufacturer: "BD", reorderLevel: 100 },
    { name: "Venenverweilkanüle 20G (rosa)", number: "VM-007", unit: "Stk", groupIndex: 1, manufacturer: "BD", reorderLevel: 50 },
    { name: "Urinalkatheter Foley CH16 2-Weg", number: "VM-008", unit: "Stk", groupIndex: 1, reorderLevel: 20 },
    { name: "Magenablaufsonde CH18", number: "VM-009", unit: "Stk", groupIndex: 1, reorderLevel: 10 },
    // Sterilgut (groupIndex 2)
    { name: "OP-Handschuhe steril 7.0", number: "SG-001", unit: "Paar", groupIndex: 2, reorderLevel: 10 },
    { name: "OP-Handschuhe steril 7.5", number: "SG-002", unit: "Paar", groupIndex: 2, reorderLevel: 10 },
    { name: "OP-Kittel steril Gr. M", number: "SG-003", unit: "Stk", groupIndex: 2, reorderLevel: 10 },
    { name: "Abdecktuch steril 75×90cm", number: "SG-004", unit: "Stk", groupIndex: 2, reorderLevel: 20 },
    // Implantate (groupIndex 3)
    { name: "Nahtmaterial Vicryl 2-0 45cm", number: "IMP-001", unit: "Stk", groupIndex: 3, manufacturer: "Ethicon", reorderLevel: 20 },
    { name: "Nahtmaterial PDS II 0 70cm", number: "IMP-002", unit: "Stk", groupIndex: 3, manufacturer: "Ethicon", reorderLevel: 10 },
    { name: "Titan-Schraube 3.5×14mm", number: "IMP-003", unit: "Stk", groupIndex: 3, manufacturer: "DePuy Synthes", reorderLevel: 5 },
  ],
  tools: [
    // Medizingeräte (groupIndex 0)
    { name: "Defibrillator Philips HeartStart XL+", number: "MG-001", groupIndex: 0, manufacturer: "Philips", condition: "good" },
    { name: "Beatmungsgerät Dräger Evita 600", number: "MG-002", groupIndex: 0, manufacturer: "Dräger", condition: "good" },
    { name: "Infusionspumpe B. Braun Infusomat", number: "MG-003", groupIndex: 0, manufacturer: "B. Braun", condition: "good" },
    { name: "Spritzenpumpe B. Braun Perfusor", number: "MG-004", groupIndex: 0, manufacturer: "B. Braun", condition: "good" },
    { name: "Patientenmonitor Mindray iMEC 12", number: "MG-005", groupIndex: 0, manufacturer: "Mindray", condition: "good" },
    // OP-Instrumente (groupIndex 1)
    { name: "Skalpell-Set Hartmann steril", number: "OP-001", groupIndex: 1, manufacturer: "Hartmann", condition: "good" },
    { name: "Elektrokauter Bovie Aaron 950", number: "OP-002", groupIndex: 1, manufacturer: "Bovie", condition: "good" },
    { name: "Laparoskopie-Turm Storz", number: "OP-003", groupIndex: 1, manufacturer: "Karl Storz", condition: "good" },
    // Pflegehilfsmittel (groupIndex 2)
    { name: "Rollstuhl Invacare Action 1R", number: "PH-001", groupIndex: 2, manufacturer: "Invacare", condition: "good" },
    { name: "Gehbock Höhe verstellbar", number: "PH-002", groupIndex: 2, condition: "good" },
  ],
  customFields: [
    { name: "Ablaufdatum", fieldType: "date", entityType: "material", sortOrder: 0 },
    { name: "Chargennummer", fieldType: "text", entityType: "material", sortOrder: 1 },
    { name: "Sterilisationsdatum", fieldType: "date", entityType: "tool", sortOrder: 0 },
    { name: "MDR-Klasse", fieldType: "select", entityType: "tool", sortOrder: 1 },
  ],
}

// ─── 5. Gastronomie / Hotellerie ─────────────────────────────────────────────

const gastronomieTemplate: IndustryTemplate = {
  industry: "gastronomie",
  label: "Gastronomie / Hotellerie",
  description:
    "Für Restaurants, Hotels und Catering-Betriebe. Verwaltet Lebensmittel, Getränke, Reinigungsmittel und Küchengeräte mit Ablaufdatum-Tracking.",
  icon: "ChefHat",
  iconColor: "bg-orange-500/10 text-orange-600",
  locations: [
    { name: "Küche", type: "warehouse" },
    { name: "Keller", type: "warehouse" },
    { name: "Lager", type: "warehouse" },
    { name: "Bar", type: "warehouse" },
  ],
  materialGroups: [
    { name: "Lebensmittel", color: "#f59e0b" },
    { name: "Getränke", color: "#3b82f6" },
    { name: "Reinigung", color: "#10b981" },
  ],
  toolGroups: [
    { name: "Küchengeräte", color: "#ef4444" },
    { name: "Servicegeräte", color: "#8b5cf6" },
  ],
  materials: [
    // Lebensmittel (groupIndex 0)
    { name: "Mehl Weizenmehl Typ 550 25kg", number: "LM-001", unit: "kg", groupIndex: 0, reorderLevel: 25 },
    { name: "Zucker weiss 25kg", number: "LM-002", unit: "kg", groupIndex: 0, reorderLevel: 10 },
    { name: "Speisesalz jodiert 2kg", number: "LM-003", unit: "kg", groupIndex: 0, reorderLevel: 5 },
    { name: "Pflanzenöl kaltgepresst 5L", number: "LM-004", unit: "L", groupIndex: 0, reorderLevel: 5 },
    { name: "Butter ungesalzen 250g", number: "LM-005", unit: "Stk", groupIndex: 0, reorderLevel: 20 },
    { name: "Vollmilch 3.5% 1L", number: "LM-006", unit: "L", groupIndex: 0, reorderLevel: 20 },
    { name: "Sahne 35% 1L", number: "LM-007", unit: "L", groupIndex: 0, reorderLevel: 10 },
    // Getränke (groupIndex 1)
    { name: "Mineralwasser 0.5L PET 24er", number: "GT-001", unit: "Pkg", groupIndex: 1, reorderLevel: 5 },
    { name: "Mineral mit Kohlensäure 1L 12er", number: "GT-002", unit: "Pkg", groupIndex: 1, reorderLevel: 5 },
    { name: "Orangensaft 100% 1L 12er", number: "GT-003", unit: "Pkg", groupIndex: 1, reorderLevel: 3 },
    { name: "Rotwein Dôle du Valais 6er", number: "GT-004", unit: "Pkg", groupIndex: 1, reorderLevel: 3 },
    { name: "Weisswein Fendant 6er", number: "GT-005", unit: "Pkg", groupIndex: 1, reorderLevel: 3 },
    { name: "Lagerbier 0.5L 24er", number: "GT-006", unit: "Pkg", groupIndex: 1, reorderLevel: 5 },
    // Reinigung (groupIndex 2)
    { name: "Geschirrspülmittel 5L", number: "RE-001", unit: "L", groupIndex: 2, reorderLevel: 5 },
    { name: "Desinfektionsmittel Sterilium 1L", number: "RE-002", unit: "L", groupIndex: 2, manufacturer: "Bode Chemie", reorderLevel: 3 },
    { name: "Müllbeutel 120L schwarz 25er", number: "RE-003", unit: "Pkg", groupIndex: 2, reorderLevel: 5 },
  ],
  tools: [
    // Küchengeräte (groupIndex 0)
    { name: "Kombidämpfer Rational iCombi Pro", number: "KG-001", groupIndex: 0, manufacturer: "Rational", condition: "good" },
    { name: "Küchenmaschine KitchenAid 6.9L", number: "KG-002", groupIndex: 0, manufacturer: "KitchenAid", condition: "good" },
    { name: "Vakuumiergerät Multivac", number: "KG-003", groupIndex: 0, manufacturer: "Multivac", condition: "good" },
    { name: "Stabmixer Bamix 200W", number: "KG-004", groupIndex: 0, manufacturer: "Bamix", condition: "good" },
    // Servicegeräte (groupIndex 1)
    { name: "Kaffeemaschine Franke A400", number: "SG-001", groupIndex: 1, manufacturer: "Franke", condition: "good" },
    { name: "Glasreiniger Hobart FRPS", number: "SG-002", groupIndex: 1, manufacturer: "Hobart", condition: "good" },
  ],
  customFields: [
    { name: "Ablaufdatum", fieldType: "date", entityType: "material", sortOrder: 0 },
    { name: "Allergene", fieldType: "text", entityType: "material", sortOrder: 1 },
  ],
}

// ─── 6. Facility Management ───────────────────────────────────────────────────

const facilityTemplate: IndustryTemplate = {
  industry: "facility",
  label: "Facility Management",
  description:
    "Für Gebäudetechnik, Hauswartung und Reinigungsunternehmen. Verwaltet Reinigungsmittel, Verbrauchsmaterial und Wartungswerkzeug.",
  icon: "Building",
  iconColor: "bg-slate-500/10 text-slate-600",
  locations: [
    { name: "Technikraum", type: "warehouse" },
    { name: "Gebäude A", type: "site" },
    { name: "Gebäude B", type: "site" },
  ],
  materialGroups: [
    { name: "Reinigungsmittel", color: "#3b82f6" },
    { name: "Verbrauchsmaterial", color: "#f59e0b" },
    { name: "Leuchtmittel", color: "#f59e0b" },
  ],
  toolGroups: [
    { name: "Reinigungsgeräte", color: "#10b981" },
    { name: "Wartungswerkzeug", color: "#8b5cf6" },
  ],
  materials: [
    // Reinigungsmittel (groupIndex 0)
    { name: "Bodenreiniger Diversey Taski 5L", number: "RM-001", unit: "L", groupIndex: 0, manufacturer: "Diversey", reorderLevel: 5 },
    { name: "Allzweckreiniger Dr. Schnell 5L", number: "RM-002", unit: "L", groupIndex: 0, manufacturer: "Dr. Schnell", reorderLevel: 5 },
    { name: "WC-Reiniger 1L", number: "RM-003", unit: "L", groupIndex: 0, reorderLevel: 10 },
    { name: "Glasreiniger 500ml Spray", number: "RM-004", unit: "Stk", groupIndex: 0, reorderLevel: 5 },
    { name: "Handreinigungsmittel Hartmann 500ml", number: "RM-005", unit: "Stk", groupIndex: 0, manufacturer: "Hartmann", reorderLevel: 10 },
    // Verbrauchsmaterial (groupIndex 1)
    { name: "Müllbeutel 35L grau 25er", number: "VM-001", unit: "Pkg", groupIndex: 1, reorderLevel: 10 },
    { name: "Müllbeutel 120L schwarz 25er", number: "VM-002", unit: "Pkg", groupIndex: 1, reorderLevel: 5 },
    { name: "Papierhandtuch 2-lagig 250er", number: "VM-003", unit: "Pkg", groupIndex: 1, reorderLevel: 10 },
    { name: "Toilettenpapier 3-lagig 250 Bl. 8er", number: "VM-004", unit: "Pkg", groupIndex: 1, reorderLevel: 10 },
    { name: "Seifenspender-Patrone 1L", number: "VM-005", unit: "Stk", groupIndex: 1, reorderLevel: 5 },
    { name: "Einmalhandschuhe Vinyl S 100er", number: "VM-006", unit: "Pkg", groupIndex: 1, reorderLevel: 5 },
    // Leuchtmittel (groupIndex 2)
    { name: "LED-Leuchtmittel E27 9W 3000K", number: "LM-001", unit: "Stk", groupIndex: 2, reorderLevel: 10 },
    { name: "LED-Röhre T8 60cm 9W", number: "LM-002", unit: "Stk", groupIndex: 2, reorderLevel: 10 },
    { name: "Notleuchte LED 3h Autonomie", number: "LM-003", unit: "Stk", groupIndex: 2, reorderLevel: 5 },
  ],
  tools: [
    // Reinigungsgeräte (groupIndex 0)
    { name: "Einscheibenmaschine Columbus CA 30", number: "RG-001", groupIndex: 0, manufacturer: "Columbus", condition: "good" },
    { name: "Sauger Kärcher WD 5 Premium", number: "RG-002", groupIndex: 0, manufacturer: "Kärcher", condition: "good" },
    { name: "Hochdruckreiniger Kärcher HD 5/15", number: "RG-003", groupIndex: 0, manufacturer: "Kärcher", condition: "good" },
    { name: "Dampfreiniger Kärcher SC 5", number: "RG-004", groupIndex: 0, manufacturer: "Kärcher", condition: "good" },
    // Wartungswerkzeug (groupIndex 1)
    { name: "Multimeter Fluke 115", number: "WW-001", groupIndex: 1, manufacturer: "Fluke", condition: "good" },
    { name: "Rohrzange Ridgid 36\"", number: "WW-002", groupIndex: 1, manufacturer: "Ridgid", condition: "good" },
    { name: "Leiter Hailo ProfiStep 3×9", number: "WW-003", groupIndex: 1, manufacturer: "Hailo", condition: "good" },
  ],
  customFields: [
    { name: "Letzte Wartung", fieldType: "date", entityType: "tool", sortOrder: 0 },
    { name: "Nächste Wartung", fieldType: "date", entityType: "tool", sortOrder: 1 },
  ],
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  handwerk: handwerkTemplate,
  rettungsdienst: rettungsdienstTemplate,
  arztpraxis: arztpraxisTemplate,
  spital: spitalTemplate,
  gastronomie: gastronomieTemplate,
  facility: facilityTemplate,
}

export function getTemplate(industry: string): IndustryTemplate | null {
  return INDUSTRY_TEMPLATES[industry] ?? null
}

/** Summary counts shown in the preview card before applying */
export interface TemplateSummary {
  locations: number
  materialGroups: number
  toolGroups: number
  materials: number
  tools: number
  customFields: number
}

export function getTemplateSummary(template: IndustryTemplate): TemplateSummary {
  return {
    locations: template.locations.length,
    materialGroups: template.materialGroups.length,
    toolGroups: template.toolGroups.length,
    materials: template.materials.length,
    tools: template.tools.length,
    customFields: template.customFields.length,
  }
}
