export function getTooltips(t: (key: string) => string) {
  return {
    // Materials
    materialMinStock: t("tooltips.materialMinStock"),
    materialBarcode: t("tooltips.materialBarcode"),
    materialUnit: t("tooltips.materialUnit"),

    // Tools
    toolStatus: t("tooltips.toolStatus"),
    toolCalibration: t("tooltips.toolCalibration"),

    // Orders
    orderAutoReorder: t("tooltips.orderAutoReorder"),

    // Time Tracking
    timeTrackingBillable: t("tooltips.timeTrackingBillable"),
    timeTrackingRate: t("tooltips.timeTrackingRate"),

    // Delivery
    deliveryOverdue: t("tooltips.deliveryOverdue"),
    deliveryCarrier: t("tooltips.deliveryCarrier"),

    // Stock
    stockSafetyFactor: t("tooltips.stockSafetyFactor"),
    stockLookbackDays: t("tooltips.stockLookbackDays"),

    // Settings
    settingsWebhook: t("tooltips.settingsWebhook"),
    settingsRbac: t("tooltips.settingsRbac"),
    settingsApiKey: t("tooltips.settingsApiKey"),

    // Portals
    portalVendor: t("tooltips.portalVendor"),
    portalCustomer: t("tooltips.portalCustomer"),
    portalExpiry: t("tooltips.portalExpiry"),

    // Scanner
    scannerKeyboardWedge: t("tooltips.scannerKeyboardWedge"),

    // General
    csvExport: t("tooltips.csvExport"),
    bulkActions: t("tooltips.bulkActions"),
  }
}

// Fallback for files not yet using i18n
export const TOOLTIPS = {
  // Materials
  materialMinStock: "Mindestbestand: Bei Unterschreitung wird eine Warnung angezeigt.",
  materialBarcode: "EAN/GTIN Barcode. Scannen Sie den Barcode des Produkts f\u00fcr automatische Erkennung.",
  materialUnit: "Mengeneinheit f\u00fcr dieses Material (z.B. Stk, m, kg, Liter).",

  // Tools
  toolStatus: "Aktueller Status: Verf\u00fcgbar, Ausgeliehen, In Wartung oder Defekt.",
  toolCalibration: "N\u00e4chstes Kalibrierungsdatum. \u00dcberf\u00e4llige Kalibrierungen werden rot markiert.",

  // Orders
  orderAutoReorder: "Automatische Nachbestellung wenn der Mindestbestand unterschritten wird.",

  // Time Tracking
  timeTrackingBillable: "Abrechenbare Stunden werden in der Monatsauswertung ber\u00fccksichtigt.",
  timeTrackingRate: "Stundensatz in CHF f\u00fcr die Abrechnung.",

  // Delivery
  deliveryOverdue: "Lieferungen die das erwartete Lieferdatum \u00fcberschritten haben.",
  deliveryCarrier: "Schweizer Spediteure: Post, DHL, DPD, Planzer, Camion Transport.",

  // Stock
  stockSafetyFactor: "Sicherheitsfaktor: 1.5 = 50% Puffer \u00fcber dem berechneten Mindestbestand.",
  stockLookbackDays: "Analyse-Zeitraum: Wie viele Tage Verbrauchsdaten f\u00fcr die Berechnung verwendet werden.",

  // Settings
  settingsWebhook: "Webhooks senden HTTP-Benachrichtigungen an externe Systeme bei \u00c4nderungen.",
  settingsRbac: "Rollenbasierte Zugriffskontrolle: Definieren Sie wer was sehen und bearbeiten darf.",
  settingsApiKey: "API-Schl\u00fcssel f\u00fcr die Integration mit externen Systemen (ERP, Buchhaltung).",

  // Portals
  portalVendor: "Lieferanten-Portal: Ihre Lieferanten k\u00f6nnen Bestellungen einsehen und best\u00e4tigen.",
  portalCustomer: "Kunden-Portal: Ihre Kunden k\u00f6nnen den Kommissions-Fortschritt verfolgen.",
  portalExpiry: "Nach Ablauf kann der Token-Link nicht mehr verwendet werden.",

  // Scanner
  scannerKeyboardWedge: "Keyboard-Wedge: Der Scanner 'tippt' den Barcode als Tastatureingabe. Funktioniert mit jedem USB/Bluetooth-Scanner.",

  // General
  csvExport: "Export als CSV-Datei (Semikolon-getrennt, UTF-8 mit BOM f\u00fcr Excel-Kompatibilit\u00e4t).",
  bulkActions: "W\u00e4hlen Sie mehrere Eintr\u00e4ge mit den Checkboxen aus f\u00fcr Sammelaktionen.",
} as const
