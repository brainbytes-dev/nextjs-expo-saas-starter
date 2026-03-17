import { Suspense } from "react"
import { BexioCard } from "@/components/integrations/bexio-card"
import { AbacusCard } from "@/components/integrations/abacus-card"
import { VertecCard } from "@/components/integrations/vertec-card"
import { ZebraCard } from "@/components/integrations/zebra-card"
import { BrandLogo } from "@/components/integrations/brand-logo"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

// ── Integration catalogue ─────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: "accounting",
    label: "Buchhaltung & ERP",
    desc: "Materialverbrauch direkt in Rechnungen und Offerten",
    integrations: [
      { name: "SAP Business One", desc: "ERP für mittlere und grosse Unternehmen",     color: "#008FD3", short: "sap" },
      { name: "QuickBooks",    desc: "Buchhaltung für internationale KMU",              color: "#2CA01C", short: "qb" },
    ],
  },
  {
    id: "construction",
    label: "Bau & Handwerk",
    desc: "Materialfluss direkt im Bauprojekt verfolgen",
    integrations: [
      { name: "Procore",       desc: "Bauprojektmanagement — Material & Kostenkontrolle", color: "#F37021", short: "pc", badge: "Neu" },
      { name: "PlanGrid",      desc: "Autodesk Build — Pläne, RFIs, Bestandslisten",   color: "#E84A27", short: "pg" },
      { name: "Abacus AbaBau", desc: "Kalkulation, BUKO und Bauabrechnung",             color: "#003087", short: "bau" },
    ],
  },
  {
    id: "healthcare",
    label: "Gesundheit & Rettungsdienste",
    desc: "Lotnummern, Ablaufdaten und Medizinprodukte-Tracking",
    integrations: [
      { name: "ORBIS",         desc: "KIS-System — weit verbreitet in DACH-Spitälern", color: "#005A9C", short: "or", badge: "Enterprise" },
      { name: "SAP IS-H",      desc: "SAP Healthcare — Standard in Schweizer Spitälern", color: "#008FD3", short: "sh", badge: "Enterprise" },
      { name: "Azure AD / Entra", desc: "SSO für Spitäler und Kantonsorganisationen (SAML)", color: "#0078D4", short: "az", badge: "SSO" },
    ],
  },
  {
    id: "fleet",
    label: "Fahrzeuge & Flotten",
    desc: "Fahrzeug-Lagerort automatisch aus GPS-Position ableiten",
    integrations: [
      { name: "Geotab",        desc: "GPS-Flottenmanagement — Fahrzeug als Lagerort", color: "#E31837", short: "gt" },
      { name: "FleetComplete", desc: "Schweizer Flottenmanagement & Fahrtenbuch",      color: "#005F9E", short: "fc" },
      { name: "TomTom Telematics", desc: "Echtzeitposition & Fahrzeugstatus",          color: "#FF6600", short: "tt" },
    ],
  },
  {
    id: "communication",
    label: "Kommunikation & Alerts",
    desc: "Meldebestand, überfällige Werkzeuge und Buchungen als Push",
    integrations: [
      { name: "Microsoft Teams", desc: "Alerts in Teams-Kanäle — ideal für Spitäler & Behörden", color: "#6264A7", short: "ms", badge: "Beliebt" },
      { name: "Slack",         desc: "Team-Benachrichtigungen & Workflows",            color: "#4A154B", short: "sl" },
      { name: "WhatsApp",      desc: "Meldebestand & Alerts direkt aufs Handy",        color: "#25D366", short: "wa" },
    ],
  },
  {
    id: "automation",
    label: "Automatisierung",
    desc: "LogistikApp mit beliebigen Tools verbinden",
    integrations: [
      { name: "Zapier",        desc: "1'000+ Apps verbinden — keine Programmierkenntnisse", color: "#FF4A00", short: "zp", badge: "Beliebt" },
      { name: "Make",          desc: "Früher Integromat — visueller Workflow-Builder",  color: "#6D00CC", short: "mk" },
      { name: "REST API",      desc: "Direktintegration für eigene Systeme (Enterprise)", color: "#1a1a1a", short: "api", badge: "Enterprise" },
    ],
  },
  {
    id: "hardware",
    label: "Hardware & Scanner",
    desc: "Physische Etiketten und Scanner direkt einbinden",
    integrations: [
      { name: "Brother",       desc: "Desktop-Etikettendrucker für kleine Lager",      color: "#003087", short: "br" },
      { name: "RFID / NFC",    desc: "Berührungsloses Tracking für grosse Bestände",    color: "#2D9CDB", short: "rf", badge: "Enterprise" },
    ],
  },
] as const

const BADGE_COLORS: Record<string, string> = {
  "Beliebt":    "bg-primary/10 text-primary border-primary/20",
  "Enterprise": "bg-secondary/10 text-secondary border-secondary/20",
  "SSO":        "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Neu":        "bg-orange-500/10 text-orange-600 border-orange-500/20",
}

function BexioCardSkeleton() {
  return (
    <div className="rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-8 w-36 rounded-md" />
    </div>
  )
}

function IntegrationPlaceholder({
  name, desc, color, short, badge,
}: { name: string; desc: string; color: string; short: string; badge?: string }) {
  return (
    <div
      className="rounded-xl border border-border/50 p-5 opacity-50 cursor-not-allowed select-none"
      aria-disabled="true"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <BrandLogo name={name} fallbackColor={color} fallbackShort={short} />
          <div>
            <div className="text-sm font-medium leading-none">{name}</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</div>
          </div>
        </div>
        {badge && (
          <Badge variant="outline" className={`text-[9px] px-1.5 shrink-0 ${BADGE_COLORS[badge] ?? ""}`}>
            {badge}
          </Badge>
        )}
      </div>
      <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        In Entwicklung
      </div>
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <div className="space-y-10 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
          Einstellungen
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Integrationen</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Verbinde LogistikApp mit deinen bestehenden Tools — Buchhaltung, ERP, Flottenmanagement, Spitalsysteme und mehr.
        </p>
      </div>

      {/* Active */}
      <section>
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
          ● Verfügbar
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<BexioCardSkeleton />}>
            <BexioCard />
          </Suspense>
          <Suspense fallback={<BexioCardSkeleton />}>
            <AbacusCard />
          </Suspense>
          <VertecCard />
          <ZebraCard />
        </div>
      </section>

      {/* Categories */}
      {CATEGORIES.map(cat => (
        <section key={cat.id}>
          <div className="mb-4">
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {cat.label}
            </h2>
            <p className="text-xs text-muted-foreground/60 font-mono mt-0.5">{cat.desc}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cat.integrations.map(i => (
              <IntegrationPlaceholder key={i.name} {...i} />
            ))}
          </div>
        </section>
      ))}

      {/* Request integration */}
      <section className="border border-dashed border-border rounded-xl p-6 text-center">
        <p className="text-sm font-medium mb-1">Dein Tool fehlt?</p>
        <p className="text-xs text-muted-foreground font-mono mb-4">
          Wir priorisieren Integrationen nach Nachfrage. Sag uns was du brauchst.
        </p>
        <a
          href="mailto:integrations@logistikapp.ch?subject=Integration%20Anfrage"
          className="inline-flex items-center gap-2 text-xs font-mono text-primary hover:underline"
        >
          integrations@logistikapp.ch →
        </a>
      </section>
    </div>
  )
}
