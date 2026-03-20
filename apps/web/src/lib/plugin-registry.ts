import type { PluginManifest } from "./plugin-sdk";

// ─── Built-in Plugin Catalogue ──────────────────────────────────────────────

export const BUILTIN_PLUGINS: PluginManifest[] = [
  {
    slug: "csv-import-pro",
    name: "CSV Import Pro",
    description:
      "Erweiterte CSV/Excel-Importe mit Spalten-Mapping, Duplikat-Erkennung und Vorschau. Ideal für Erstbefüllung und periodische Bestandsabgleiche.",
    version: "1.0.0",
    author: "LogistikApp",
    icon: "IconFileImport",
    category: "import",
    events: [
      {
        name: "material.created",
        label: "Material erstellt",
        description: "Wird nach jedem erfolgreichen Import-Datensatz ausgelöst",
      },
    ],
    configSchema: [],
    isBuiltin: true,
  },
  {
    slug: "barcode-label-designer",
    name: "Barcode-Etiketten Designer",
    description:
      "Visueller Editor für Barcode- und QR-Code-Etiketten. Unterstützt Code128, EAN-13, DataMatrix und individuelle Layouts.",
    version: "1.0.0",
    author: "LogistikApp",
    icon: "IconBarcode",
    category: "utility",
    events: [
      {
        name: "material.created",
        label: "Material erstellt",
        description: "Etikett automatisch nach Neuanlage drucken",
      },
      {
        name: "tool.booked",
        label: "Werkzeug gebucht",
        description: "Etikett bei Ein-/Ausbuchung aktualisieren",
      },
    ],
    configSchema: [],
    isBuiltin: true,
  },
  {
    slug: "slack-notifications",
    name: "Slack Benachrichtigungen",
    description:
      "Sende automatische Meldungen an einen Slack-Kanal, wenn Bestände sich ändern oder Kommissionen abgeschlossen werden.",
    version: "1.0.0",
    author: "LogistikApp",
    icon: "IconBrandSlack",
    category: "integration",
    events: [
      {
        name: "stock.changed",
        label: "Bestand geändert",
        description: "Benachrichtigung bei Bestandsänderungen",
      },
      {
        name: "commission.completed",
        label: "Kommission abgeschlossen",
        description: "Benachrichtigung wenn eine Kommission fertig ist",
      },
    ],
    configSchema: [
      {
        key: "webhookUrl",
        label: "Slack Webhook-URL",
        type: "string",
        placeholder: "https://hooks.slack.com/services/...",
        required: true,
      },
    ],
    isBuiltin: true,
  },
];

/** Look up a built-in plugin by slug. */
export function getBuiltinPlugin(slug: string): PluginManifest | undefined {
  return BUILTIN_PLUGINS.find((p) => p.slug === slug);
}
