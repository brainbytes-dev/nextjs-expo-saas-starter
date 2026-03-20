"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { ModeToggle } from "@/components/theme/theme-toggle"
import {
  IconBuildingWarehouse,
  IconPackage,
  IconTool,
  IconMapPin,
  IconShoppingCart,
  IconHistory,
  IconTruck,
  IconCheck,
  IconArrowUpRight,
  IconPlugConnected,
  IconScan,
  IconDatabase,
  IconCurrencyFrank,
  IconBarcode,
  IconPrinter,
  IconAntenna,
  IconScale,
  IconNfc,
  IconBluetooth,
  IconDeviceWatch,
  IconKeyboard,
  IconSparkles,
  IconFileSpreadsheet,
  IconTransfer,
  IconUpload,
} from "@tabler/icons-react"
import { BrandLogo } from "@/components/integrations/brand-logo"

/* ─── Global styles injected at runtime ─────────────────────── */
const STYLES = `
  @media (pointer: fine) {
    *, *::before, *::after { cursor: none !important; }
  }

  @keyframes reveal-clip {
    from { clip-path: inset(0 0 100% 0); transform: translateY(12px); opacity: 0; }
    to   { clip-path: inset(0 0 0%   0); transform: translateY(0);    opacity: 1; }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes cell-pulse {
    0%, 100% { opacity: 0.25; }
    50%       { opacity: 0.7; }
  }
  @keyframes scanline {
    0%   { top: -4px; opacity: 0; }
    4%   { opacity: 0.5; }
    96%  { opacity: 0.5; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes blink-cursor {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  .hero-word-1 { animation: reveal-clip 0.9s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
  .hero-word-2 { animation: reveal-clip 0.9s cubic-bezier(0.16,1,0.3,1) 0.20s both; }
  .hero-word-3 { animation: reveal-clip 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
  .hero-word-4 { animation: reveal-clip 0.9s cubic-bezier(0.16,1,0.3,1) 0.50s both; }
  .hero-sub-1  { animation: fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.80s both; }
  .hero-sub-2  { animation: fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 0.95s both; }
  .hero-sub-3  { animation: fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 1.10s both; }

  /* Custom cursor */
  .c-dot  {
    position: fixed; z-index: 9999; pointer-events: none;
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--primary);
    transform: translate(-50%, -50%);
    transition: none;
  }
  .c-ring {
    position: fixed; z-index: 9998; pointer-events: none;
    width: 38px; height: 38px; border-radius: 50%;
    border: 1.5px solid var(--foreground);
    transform: translate(-50%, -50%);
    opacity: 0.28;
    transition: width .22s ease, height .22s ease, border-color .22s ease, opacity .22s ease;
    will-change: transform;
  }
  .c-ring.is-hovering {
    width: 58px; height: 58px;
    border-color: var(--primary);
    opacity: 0.7;
  }

  /* Feature card spotlight */
  .feat-card { position: relative; overflow: hidden; }
  .feat-card::after {
    content: '';
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(circle at var(--mx,50%) var(--my,50%), color-mix(in oklch, var(--primary) 12%, transparent) 0%, transparent 65%);
    opacity: 0; transition: opacity .3s ease;
  }
  .feat-card:hover::after { opacity: 1; }

  /* Blinking terminal cursor */
  .term-blink { animation: blink-cursor 1.1s step-end infinite; }
`

/* ─── Custom Cursor ──────────────────────────────────────────── */
function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [isPointer] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches
  )

  useEffect(() => {
    if (!isPointer) return
    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mx = -200, my = -200
    let rx = -200, ry = -200
    let raf: number

    const onMove = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY
      dot.style.left = mx + "px"
      dot.style.top  = my + "px"
      const t = e.target as Element
      const hovering = !!t.closest("a,button,input,select,textarea,label,[role='button']")
      ring.classList.toggle("is-hovering", hovering)
    }

    const lerp = () => {
      rx += (mx - rx) * 0.13
      ry += (my - ry) * 0.13
      ring.style.left = rx + "px"
      ring.style.top  = ry + "px"
      raf = requestAnimationFrame(lerp)
    }

    window.addEventListener("mousemove", onMove, { passive: true })
    raf = requestAnimationFrame(lerp)
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf) }
  }, [isPointer])

  if (!isPointer) return null

  return (
    <>
      <div ref={dotRef}  className="c-dot"  aria-hidden />
      <div ref={ringRef} className="c-ring" aria-hidden />
    </>
  )
}

/* ─── Scroll Progress + Back-to-top ─────────────────────────── */
function ScrollUI() {
  const barRef    = useRef<HTMLDivElement>(null)
  const ringRef2  = useRef<SVGCircleElement>(null)
  const btnRef    = useRef<HTMLButtonElement>(null)
  const [show, setShow] = useState(false)

  const R    = 22
  const circ = 2 * Math.PI * R

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      const p = total > 0 ? (window.scrollY / total) * 100 : 0

      // Direct DOM writes — no React re-render, perfectly smooth
      if (barRef.current)   barRef.current.style.width = `${p}%`
      if (ringRef2.current) ringRef2.current.style.strokeDashoffset = String(circ * (1 - p / 100))

      setShow(window.scrollY > 280)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [circ])

  return (
    <>
      {/* Top bar — no CSS transition, driven directly by scroll */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-[2px] bg-border">
        <div ref={barRef} className="h-full bg-primary" style={{ width: "0%" }} />
      </div>

      {/* Scroll-to-top */}
      <button
        ref={btnRef}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Zum Seitenanfang"
        className={`fixed bottom-8 right-8 z-50 size-[56px] rounded-full bg-background border border-border flex items-center justify-center group transition-all duration-500 hover:border-primary ${show ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0 pointer-events-none"}`}
      >
        <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={R} fill="none" stroke="var(--border)" strokeWidth="1.5" />
          <circle
            ref={ringRef2}
            cx="28" cy="28" r={R}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ}
          />
        </svg>
        <IconBuildingWarehouse className="size-5 text-muted-foreground group-hover:text-primary transition-colors relative z-10" />
      </button>
    </>
  )
}


/* ─── Inventory grid for hero bg ────────────────────────────── */
const CELLS = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  filled: Math.random() > 0.38,
  level: 0.15 + Math.random() * 0.75,
  value: Math.floor(Math.random() * 900) + 100,
  delay: Math.random() * 5,
  dur: 2.5 + Math.random() * 3,
}))

/* ─── Data ───────────────────────────────────────────────────── */
const FEATURES = [
  { icon: IconPackage,        code: "INV", title: "Inventarverwaltung",          desc: "Material, Werkzeuge, Schlüssel — alles an einem Ort. EAN-Lookup aus 8 Datenbanken mit über 100 Mio. Produkten." },
  { icon: IconTool,           code: "WRK", title: "Werkzeug-Tracking",         desc: "Aus- und Einchecken, Wartungskalender, Kalibrierung, Checklisten und lückenlose Buchungshistorie." },
  { icon: IconTruck,          code: "LFG", title: "Lieferverfolgung",          desc: "Kanban-Board mit Drag & Drop. Schweizer Spediteure: Post, DHL, DPD, Planzer. Tracking-Links inklusive." },
  { icon: IconMapPin,         code: "STO", title: "Standorte & Karte",         desc: "Lager, Fahrzeuge, Baustellen — GPS-Karte, Grundriss-Ansicht und Geofencing für Auto-Checkin." },
  { icon: IconShoppingCart,   code: "ORD", title: "Bestellwesen",              desc: "Warenkorb, Bestellpositionen, Lieferantenpreise und automatische Nachbestellung bei Unterschreitung." },
  { icon: IconHistory,        code: "ZEI", title: "Zeiterfassung",             desc: "Live-Timer, Stundensätze, Wochenauswertung und CSV-Export. Projekte und Kommissionen zuweisbar." },
]

const PLANS = [
  {
    name: "Starter",
    monthly: 59, yearly: 49,
    desc: "Für kleine Teams und Einsteiger.",
    features: [
      "Bis 5 Benutzer",
      "Bis 3 Standorte",
      "Bis 500 Artikel",
      "Material- & Werkzeugverwaltung",
      "Barcode-Scanner (Kamera + Handscanner)",
      "Kommissionen & Warenkorb",
      "Bestellwesen & Wareneingang",
      "Mobile App (iOS & Android)",
      "E-Mail Support",
    ],
    cta: "Kostenlos starten", href: "/signup", highlight: false,
  },
  {
    name: "Professional",
    monthly: 199, yearly: 169,
    desc: "Für wachsende Betriebe mit Vollausstattung.",
    features: [
      "Alles aus Starter, plus:",
      "Bis 25 Benutzer",
      "Unbegrenzte Standorte & Artikel",
      "Zeiterfassung mit Live-Timer",
      "Lieferverfolgung (Kanban)",
      "Garantieansprüche-Workflow",
      "Bestandsoptimierung (KI)",
      "Budget- & Kostenstellen",
      "Umbuchungen zwischen Standorten",
      "Kunden- & Lieferanten-Portal",
      "Erweiterte Berichte & PDF-Export",
      "Wartungskalender + iCal",
      "KI-Fotorkennung & Prognose",
      "Offline-Modus + Sync",
      "Prioritäts-Support",
    ],
    cta: "14 Tage testen", href: "/signup", highlight: true,
  },
  {
    name: "Enterprise",
    monthly: -1, yearly: -1,
    desc: "Für Unternehmen mit individuellen Anforderungen.",
    features: [
      "Alles aus Professional, plus:",
      "Unbegrenzte Benutzer",
      "UHF RFID Reader-Support",
      "Workflow Engine & Automatisierungen",
      "Public API & Webhooks",
      "Custom Branding (Logo & Farben)",
      "SSO / SAML / Azure AD",
      "Multi-Company Reporting",
      "Genehmigungsworkflows",
      "Etikettendrucker (Zebra ZPL)",
      "Bluetooth-Waagen",
      "Grundriss-Ansicht",
      "Branchen-Templates",
      "SLA-Garantie 99.9%",
      "Prioritäts-Support",
      "Zugang zu allen zukünftigen Features",
      "…und vieles mehr",
    ],
    cta: "Kontakt aufnehmen", href: "mailto:sales@logistikapp.ch", highlight: false,
  },
]

const TRUST_SPECS = [
  ["RECHTSRAHMEN",    "nDSG / DSGVO"],
  ["SERVERSTANDORT",  "Zürich, Schweiz"],
  ["ZERTIFIZIERUNG",  "ISO 27001"],
  ["US CLOUD ACT",    "Nicht anwendbar"],
  ["BACKUP-FREQUENZ", "Stündlich"],
  ["UPTIME SLA",      "99.9 %"],
]

const LIVE_INTEGRATIONS = [
  { name: "bexio",   desc: "Buchhaltung & ERP",         color: "#E4312B", short: "bx",  badge: "CH #1" },
  { name: "Abacus",  desc: "AbaNinja / Abacus ERP",     color: "#003087", short: "ac",  badge: "Verfügbar" },
  { name: "Vertec",  desc: "CRM & Projektplanung",       color: "#FF6900", short: "vt",  badge: "Verfügbar" },
  { name: "Zebra",   desc: "ZPL Etikettendruck",         color: "#1a1a1a", short: "zbr", badge: "Verfügbar" },
  { name: "Stripe",  desc: "Online-Zahlungen",           color: "#635BFF", short: "str", badge: "Verfügbar" },
  { name: "WhatsApp",desc: "Benachrichtigungen",          color: "#25D366", short: "wa",  badge: "Verfügbar" },
  { name: "Zapier",  desc: "2000+ App-Verbindungen",     color: "#FF4A00", short: "zp",  badge: "Verfügbar" },
  { name: "Webhooks",desc: "13 Event-Typen, HMAC-signiert", color: "#1a1a1a", short: "wh", badge: "Verfügbar" },
]

const UPCOMING_INTEGRATIONS = [
  { name: "SAP Business One", color: "#008FD3", short: "sap" },
  { name: "Microsoft Teams",  color: "#6264A7", short: "ms"  },
  { name: "Procore",          color: "#F37021", short: "pc"  },
  { name: "Geotab",           color: "#E31837", short: "gt"  },
  { name: "Make",             color: "#6D00CC", short: "mk"  },
  { name: "QuickBooks",       color: "#2CA01C", short: "qb"  },
]

/* ─── Cost Calculator ───────────────────────────────────────── */
function CostCalculator() {
  const [employees, setEmployees] = useState(5)
  const [minutesPerDay, setMinutesPerDay] = useState(20)
  const [hourlyRate, setHourlyRate] = useState(65)

  // Annual cost: employees * minutesPerDay/60 * hourlyRate * 220 working days
  const annualCost = Math.round(employees * (minutesPerDay / 60) * hourlyRate * 220)
  const formattedCost = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(annualCost)

  const sliders = [
    { label: "Mitarbeitende suchen täglich", value: employees, min: 1, max: 50, step: 1, unit: "Personen", onChange: (v: number) => setEmployees(v) },
    { label: "Suchzeit pro Person täglich", value: minutesPerDay, min: 5, max: 120, step: 5, unit: "Minuten", onChange: (v: number) => setMinutesPerDay(v) },
    { label: "Ø Stundenlohn", value: hourlyRate, min: 30, max: 150, step: 5, unit: "CHF/h", onChange: (v: number) => setHourlyRate(v) },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-8 space-y-8">
      {/* Sliders */}
      <div className="space-y-6">
        {sliders.map(({ label, value, min, max, step, unit, onChange }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[11px] tracking-[0.1em] uppercase text-muted-foreground">{label}</label>
              <span className="font-mono text-sm font-bold text-foreground">
                {value} <span className="text-muted-foreground font-normal text-[11px]">{unit}</span>
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={e => onChange(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary"
              style={{
                background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((value - min) / (max - min)) * 100}%, var(--border) ${((value - min) / (max - min)) * 100}%, var(--border) 100%)`
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[9px] text-muted-foreground/50">{min}</span>
              <span className="font-mono text-[9px] text-muted-foreground/50">{max}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Result */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">
          Dein jährlicher Verlust durch Suchzeiten
        </p>
        <div className="text-4xl font-bold text-primary font-mono">
          {formattedCost}
        </div>
        <p className="font-mono text-[10px] text-muted-foreground mt-2">
          {employees} Pers. × {minutesPerDay} Min/Tag × CHF {hourlyRate}/h × 220 Arbeitstage
        </p>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link href="/signup">
          <Button className="font-mono text-[11px] tracking-widest uppercase gap-2">
            Jetzt kostenlos einsparen →
          </Button>
        </Link>
        <p className="font-mono text-[10px] text-muted-foreground mt-2">14 Tage kostenlos · Keine Kreditkarte</p>
      </div>
    </div>
  )
}

/* ─── Pricing Section with yearly toggle ─────────────────────── */
function PricingSection() {
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="mb-10 border-b border-border pb-6">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{`// 08 — Preise`}</div>
        <h2 className="text-3xl lg:text-4xl font-bold">Einfach. Transparent.</h2>
      </div>

      {/* Toggle — centered above cards */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-1 p-1 rounded-full border border-border bg-muted/30">
          <button
            onClick={() => setYearly(false)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!yearly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            Monatlich
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${yearly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            Jährlich
            <span className="text-[9px] font-bold bg-primary text-white rounded-full px-2 py-0.5">−15%</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-border">
        {PLANS.map(plan => {
          const isEnterprise = plan.monthly < 0
          const price = isEnterprise ? "ab CHF 699" : `CHF ${yearly ? plan.yearly : plan.monthly}`
          const per = isEnterprise ? "/Mo" : yearly ? "/Mo (jährl.)" : "/Mo"
          const yearlyTotal = isEnterprise ? null : plan.yearly * 12
          const monthlyTotal = isEnterprise ? null : plan.monthly * 12
          const savings = monthlyTotal && yearlyTotal ? monthlyTotal - yearlyTotal : 0

          return (
            <div
              key={plan.name}
              className={`bg-background p-8 flex flex-col relative ${plan.highlight ? "outline outline-1 outline-primary z-10" : ""}`}
            >
              {plan.highlight && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />}
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">{plan.name}</div>
              <div className="mb-1 font-mono">
                <span className="text-4xl font-bold">{price}</span>
                {per && <span className="text-sm text-muted-foreground ml-1">{per}</span>}
              </div>
              {yearly && savings > 0 && (
                <p className="text-xs text-primary font-mono font-semibold mb-2">
                  CHF {savings} pro Jahr gespart
                </p>
              )}
              {yearly && yearlyTotal && (
                <p className="text-[10px] text-muted-foreground font-mono mb-6">
                  CHF {yearlyTotal}/Jahr · statt CHF {monthlyTotal}
                </p>
              )}
              {!yearly && <div className="mb-8" />}
              <p className="text-xs text-muted-foreground mb-8">{plan.desc}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <IconCheck className="size-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={plan.href}>
                <Button className="w-full font-mono text-[11px] tracking-widest uppercase" variant={plan.highlight ? "default" : "outline"}>
                  {plan.cta}
                </Button>
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ─── Migration Section ─────────────────────────────────────── */
function MigrationSection() {
  const sources = [
    { name: "Excel / CSV", short: "XLS", color: "#217346", desc: "Beliebige Tabellen importieren" },
    { name: "bexio", short: "BX", color: "#0073E6", desc: "Direkte API-Verbindung" },
    { name: "PROFFIX", short: "PF", color: "#E30613", desc: "Export-Anleitung + Import" },
    { name: "SAP Business One", short: "SAP", color: "#0FAAFF", desc: "CSV-Export + Import" },
  ]

  return (
    <section id="migration" className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">{`// 06 — Migration`}</div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight text-foreground">
            Wechseln Sie<br />
            in <span className="text-primary">5 Minuten.</span>
          </h2>
          <p className="font-mono text-sm leading-relaxed max-w-md text-muted-foreground mb-8">
            Egal ob Excel, bexio, PROFFIX oder SAP — Ihre Daten sind in Minuten importiert.
            Unser Import-Assistent führt Sie Schritt für Schritt.
          </p>

          {/* AI feature callout */}
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 mb-8">
            <IconSparkles className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-0.5">KI-gestütztes Column Mapping</p>
              <p className="text-xs text-muted-foreground">
                Spalten werden automatisch erkannt und den richtigen Feldern zugeordnet.
                Manuelle Zuordnung ist jederzeit möglich.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard/migration">
              <Button className="font-mono text-[11px] tracking-widest uppercase gap-2">
                <IconTransfer className="size-3.5" />
                Jetzt migrieren
              </Button>
            </Link>
            <Link href="/dashboard/import">
              <Button variant="outline" className="font-mono text-[11px] tracking-widest uppercase gap-2">
                <IconUpload className="size-3.5" />
                CSV importieren
              </Button>
            </Link>
          </div>
        </div>

        {/* Source cards */}
        <div className="grid grid-cols-2 gap-3">
          {sources.map((source) => (
            <div
              key={source.name}
              className="relative border border-border rounded-lg p-5 bg-background group hover:border-primary/50 transition-colors duration-200"
            >
              <div className="flex items-start gap-3 mb-3">
                <BrandLogo name={source.name} fallbackColor={source.color} fallbackShort={source.short} size={36} />
                <div>
                  <div className="text-sm font-semibold leading-none mb-1">{source.name}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{source.desc}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <IconFileSpreadsheet className="size-3 text-muted-foreground" />
                <span className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">Import bereit</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Peripherals Section ────────────────────────────────────── */
function PeripheralsSection() {
  const peripherals = [
    { name: "Handscanner", desc: "Zebra, Honeywell, Datalogic — USB & Bluetooth", icon: IconBarcode },
    { name: "Etikettendrucker", desc: "Zebra ZPL, Brother QL — Barcode-Labels drucken", icon: IconPrinter },
    { name: "RFID Reader", desc: "UHF RFID für Paletten & Container (Zebra, Impinj)", icon: IconAntenna },
    { name: "Bluetooth-Waagen", desc: "Material wiegen bei Ein-/Ausgang", icon: IconScale },
    { name: "NFC Tags", desc: "Werkzeuge und Standorte taggen", icon: IconNfc },
    { name: "iBeacons", desc: "Indoor-Positionierung im Lager", icon: IconBluetooth },
    { name: "Apple Watch", desc: "Quick Scan, Timer, Checkin/Checkout", icon: IconDeviceWatch },
    { name: "Industrie-Keypads", desc: "F-Tasten für Schnellaktionen (Cherry, X-Keys)", icon: IconKeyboard },
  ]

  return (
    <section id="peripherals" className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="mb-10 border-b border-border pb-6">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{`// 07 — Hardware`}</div>
        <h2 className="text-3xl lg:text-4xl font-bold">Jedes Gerät. Sofort einsatzbereit.</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl">Einstecken, verbinden, loslegen — keine Treiber, keine Konfiguration. LogistikApp unterstützt alle gängigen Lager-Peripheriegeräte.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
        {peripherals.map(p => (
          <div key={p.name} className="bg-background p-6 flex flex-col gap-2">
            <p.icon className="size-6 text-primary" />
            <h3 className="font-semibold text-sm">{p.name}</h3>
            <p className="text-xs text-muted-foreground">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Feature Comparison Section ─────────────────────────────── */
function FeatureComparisonSection() {
  const categories = [
    {
      name: "Alle Pläne",
      features: [
        { name: "Materialverwaltung", starter: true, pro: true, enterprise: true },
        { name: "Werkzeug-Tracking", starter: true, pro: true, enterprise: true },
        { name: "Schlüsselverwaltung", starter: true, pro: true, enterprise: true },
        { name: "Kommissionen", starter: true, pro: true, enterprise: true },
        { name: "Bestellwesen", starter: true, pro: true, enterprise: true },
        { name: "Barcode Scanner (Kamera + Handscanner)", starter: true, pro: true, enterprise: true },
        { name: "Mobile App (iOS & Android)", starter: true, pro: true, enterprise: true },
        { name: "EAN-Produkterkennung (100M+)", starter: true, pro: true, enterprise: true },
        { name: "Datenimport (CSV/Excel)", starter: true, pro: true, enterprise: true },
        { name: "Datenexport (CSV/JSON)", starter: true, pro: true, enterprise: true },
        { name: "QR-Codes für Standorte", starter: true, pro: true, enterprise: true },
        { name: "Mehrsprachig (DE, FR, IT)", starter: true, pro: true, enterprise: true },
        { name: "DSGVO Datenexport", starter: true, pro: true, enterprise: true },
      ],
    },
    {
      name: "Professional + Enterprise",
      features: [
        { name: "Zeiterfassung & Timer", starter: false, pro: true, enterprise: true },
        { name: "Lieferverfolgung (Kanban)", starter: false, pro: true, enterprise: true },
        { name: "Kommissionen-Kanban", starter: false, pro: true, enterprise: true },
        { name: "Garantieansprüche-Workflow", starter: false, pro: true, enterprise: true },
        { name: "Bestandsoptimierung (KI)", starter: false, pro: true, enterprise: true },
        { name: "Budgets & Kostenstellen", starter: false, pro: true, enterprise: true },
        { name: "Umbuchungen", starter: false, pro: true, enterprise: true },
        { name: "Kunden- & Lieferanten-Portal", starter: false, pro: true, enterprise: true },
        { name: "PDF-Lieferscheine", starter: false, pro: true, enterprise: true },
        { name: "Wartungskalender + iCal", starter: false, pro: true, enterprise: true },
        { name: "KI-Fotorkennung & Prognose", starter: false, pro: true, enterprise: true },
        { name: "Wiederkehrende Bestellungen", starter: false, pro: true, enterprise: true },
        { name: "Schichtübergabe", starter: false, pro: true, enterprise: true },
        { name: "KI Column-Mapping (Import)", starter: false, pro: true, enterprise: true },
        { name: "Foto-Galerie", starter: false, pro: true, enterprise: true },
        { name: "Offline-Modus + Sync", starter: false, pro: true, enterprise: true },
        { name: "bexio Migration", starter: false, pro: true, enterprise: true },
        { name: "Echtzeit-Kollaboration", starter: false, pro: true, enterprise: true },
      ],
    },
    {
      name: "Nur Enterprise",
      features: [
        { name: "UHF RFID Reader", starter: false, pro: false, enterprise: true },
        { name: "Workflow Engine & Automatisierungen", starter: false, pro: false, enterprise: true },
        { name: "Genehmigungsworkflows", starter: false, pro: false, enterprise: true },
        { name: "Public API & Webhooks", starter: false, pro: false, enterprise: true },
        { name: "Custom Branding (Logo & Farben)", starter: false, pro: false, enterprise: true },
        { name: "SSO / SAML / Azure AD", starter: false, pro: false, enterprise: true },
        { name: "Multi-Company Reporting", starter: false, pro: false, enterprise: true },
        { name: "KI-Wartungsprognose", starter: false, pro: false, enterprise: true },
        { name: "Supply Chain Dashboard", starter: false, pro: false, enterprise: true },
        { name: "Etiketten-Designer (Drag-Drop)", starter: false, pro: false, enterprise: true },
        { name: "Etiketten-Massendruck", starter: false, pro: false, enterprise: true },
        { name: "E-Mail Inbox Parser (KI)", starter: false, pro: false, enterprise: true },
        { name: "2FA / MFA (TOTP)", starter: false, pro: false, enterprise: true },
        { name: "IP-Zugriffsbeschränkung", starter: false, pro: false, enterprise: true },
        { name: "Datenhaltungs-Richtlinien", starter: false, pro: false, enterprise: true },
        { name: "Plugin Marketplace", starter: false, pro: false, enterprise: true },
        { name: "Siri / Google Assistant", starter: false, pro: false, enterprise: true },
        { name: "Etikettendrucker (Zebra ZPL)", starter: false, pro: false, enterprise: true },
        { name: "Bluetooth-Waagen", starter: false, pro: false, enterprise: true },
        { name: "Grundriss-Ansicht", starter: false, pro: false, enterprise: true },
        { name: "Branchen-Templates", starter: false, pro: false, enterprise: true },
        { name: "White-Label / Reseller", starter: false, pro: false, enterprise: true },
        { name: "SLA 99.9%", starter: false, pro: false, enterprise: true },
      ],
    },
  ]

  return (
    <section id="comparison" className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="mb-10 border-b border-border pb-6">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{`// 09 — Vergleich`}</div>
        <h2 className="text-3xl lg:text-4xl font-bold">Alle Funktionen im Überblick</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 pr-4 font-mono text-xs text-muted-foreground w-1/3">Funktion</th>
              <th className="text-center py-4 px-4 font-mono text-xs text-muted-foreground">Starter</th>
              <th className="text-center py-4 px-4 font-mono text-xs text-primary font-bold">Professional</th>
              <th className="text-center py-4 px-4 font-mono text-xs text-muted-foreground">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <Fragment key={cat.name}>
                <tr>
                  <td colSpan={4} className="pt-6 pb-2 font-mono text-[10px] tracking-[0.2em] uppercase text-primary font-bold">{cat.name}</td>
                </tr>
                {cat.features.map(f => (
                  <tr key={f.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 text-muted-foreground">{f.name}</td>
                    <td className="text-center py-3 px-4">{typeof f.starter === "string" ? <span className="text-xs font-mono">{f.starter}</span> : f.starter ? <IconCheck className="size-4 text-primary mx-auto" /> : <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="text-center py-3 px-4">{typeof f.pro === "string" ? <span className="text-xs font-mono">{f.pro}</span> : f.pro ? <IconCheck className="size-4 text-primary mx-auto" /> : <span className="text-muted-foreground/30">—</span>}</td>
                    <td className="text-center py-3 px-4">{typeof f.enterprise === "string" ? <span className="text-xs font-mono">{f.enterprise}</span> : f.enterprise ? <IconCheck className="size-4 text-primary mx-auto" /> : <span className="text-muted-foreground/30">—</span>}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ─── Page ───────────────────────────────────────────────────── */
export default function LandingPage() {
  const [navSolid, setNavSolid] = useState(false)

  useEffect(() => {
    const fn = () => setNavSolid(window.scrollY > 32)
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])

  return (
    <>
      <style>{STYLES}</style>
      <CustomCursor />
      <ScrollUI />

      <div className="flex min-h-screen flex-col bg-background text-foreground overflow-x-hidden">

        {/* ══ NAV ══════════════════════════════════════════ */}
        <header className={`sticky top-[2px] z-50 transition-all duration-300 ${navSolid ? "bg-background/95 backdrop-blur-md border-b border-border" : "bg-transparent"}`}>
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <Logo />
            <nav className="hidden md:flex items-center gap-8 font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground">
              <a href="#features"      className="hover:text-foreground transition-colors">Funktionen</a>
              <a href="#scan"         className="hover:text-foreground transition-colors">Scan</a>
              <a href="#integrations" className="hover:text-foreground transition-colors">Integrationen</a>
              <a href="#pricing"      className="hover:text-foreground transition-colors">Preise</a>
              <a href="#peripherals"  className="hover:text-foreground transition-colors">Hardware</a>
              <a href="#comparison"   className="hover:text-foreground transition-colors">Vergleich</a>
              <a href="#trust"        className="hover:text-foreground transition-colors">Sicherheit</a>
              <a href="#migration"    className="hover:text-foreground transition-colors">Migration</a>
            </nav>
            <div className="flex items-center gap-1.5">
              <ModeToggle />
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-mono text-[11px] tracking-widest uppercase">Anmelden</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="font-mono text-[11px] tracking-widest uppercase gap-1.5">
                  Starten <IconArrowUpRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* ══ HERO ═════════════════════════════════════════ */}
        <section className="relative min-h-[calc(100vh-56px)] flex flex-col justify-center overflow-hidden">

          {/* Crosshair grid */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
            backgroundSize: "72px 72px",
            opacity: 0.45,
          }} />

          {/* Inventory cell visualization (right half) */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 pointer-events-none overflow-hidden opacity-[0.18] dark:opacity-[0.22]">
            <div className="grid grid-cols-8 gap-1 p-6 h-full content-center">
              {CELLS.map(cell => (
                <div
                  key={cell.id}
                  className="relative border border-border rounded-sm overflow-hidden"
                  style={{
                    height: "46px",
                    ...(cell.filled ? {
                      animationName: "cell-pulse",
                      animationDuration: `${cell.dur}s`,
                      animationDelay: `${cell.delay}s`,
                      animationTimingFunction: "ease-in-out",
                      animationIterationCount: "infinite",
                    } : {}),
                  }}
                >
                  {cell.filled && (
                    <>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary"
                        style={{ height: `${cell.level * 100}%`, opacity: 0.5 }}
                      />
                      <span className="absolute top-0.5 left-0.5 text-[7px] font-mono text-primary leading-none">
                        {cell.value}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Scanline sweep */}
          <div
            className="absolute left-0 right-0 h-[1px] pointer-events-none z-10"
            style={{
              background: `linear-gradient(90deg, transparent, var(--primary), transparent)`,
              animation: "scanline 9s linear infinite",
              opacity: 0.35,
            }}
          />

          {/* Content */}
          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-12">
            <div className="grid lg:grid-cols-[1fr_auto] gap-16 items-center">

              {/* Left: Headline */}
              <div className="max-w-3xl">
                {/* Label */}
                <div className="hero-sub-1 flex items-center gap-3 mb-10">
                  <span className="size-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                  <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                    Schweizer Inventar-Software für KMU
                  </span>
                </div>

                {/* Staggered words */}
                <div className="mb-10">
                  {[
                    { text: "IMMER",   cls: "hero-word-1" },
                    { text: "WISSEN,", cls: "hero-word-2" },
                    { text: "WAS",     cls: "hero-word-3" },
                    { text: "WO IST.", cls: "hero-word-4", accent: true },
                  ].map(({ text, cls, accent }) => (
                    <div key={text} className="overflow-hidden leading-[0.88]">
                      <div className={`font-bold tracking-tight ${cls}`} style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}>
                        {accent ? <span className="text-primary">{text}</span> : text}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="hero-sub-2 font-mono text-sm text-muted-foreground leading-relaxed max-w-lg mb-10">
                  Werkzeuge, Materialien, Fahrzeugbestände und Schlüssel —<br />
                  alles in einer App. Für Handwerksbetriebe und Serviceteams<br />
                  in der ganzen Schweiz.
                </p>

                <div className="hero-sub-3 flex flex-wrap gap-3 mb-4">
                  <Link href="/signup">
                    <Button size="lg" className="font-mono text-xs tracking-widest uppercase gap-2 px-7 h-12">
                      14 Tage kostenlos <IconArrowUpRight className="size-4" />
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button size="lg" variant="outline" className="font-mono text-xs tracking-widest uppercase h-12 px-7">
                      Demo ansehen
                    </Button>
                  </Link>
                </div>

                <p className="hero-sub-3 font-mono text-[10px] text-muted-foreground tracking-widest">
                  — Keine Kreditkarte · Setup in 5 Minuten
                </p>
              </div>

              {/* Right: Terminal readout */}
              <div className="hidden lg:block w-72">
                <div
                  className="border border-border rounded-lg overflow-hidden bg-background/70 backdrop-blur-sm"
                  style={{ animation: "fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 1.0s both" }}
                >
                  {/* Terminal header */}
                  <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/50">
                    <span className="size-2.5 rounded-full bg-destructive/60" />
                    <span className="size-2.5 rounded-full bg-primary/60" />
                    <span className="size-2.5 rounded-full bg-secondary/60" />
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground tracking-widest">SYSTEM STATUS</span>
                  </div>

                  {/* Rows */}
                  <div className="p-4 space-y-0 font-mono">
                    {[
                      { code: "MAT_TOTAL",  label: "Materialien",      val: "1'247", unit: "Artikel"  },
                      { code: "WRK_TOTAL",  label: "Werkzeuge",        val: "84",    unit: "Geräte"   },
                      { code: "LOC_ACTIVE", label: "Standorte",        val: "12",    unit: "aktiv"    },
                      { code: "BOOK_TODAY", label: "Buchungen heute",  val: "38",    unit: "Vorgänge" },
                    ].map(({ code, label, val, unit }, i) => (
                      <div
                        key={code}
                        className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                        style={{ animation: `fade-up 0.6s cubic-bezier(0.16,1,0.3,1) ${1.1 + i * 0.12}s both` }}
                      >
                        <div>
                          <div className="text-[9px] text-muted-foreground tracking-widest uppercase">{code}</div>
                          <div className="text-[11px] text-muted-foreground">{label}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold text-primary">{val}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground term-blink">█</span>
                      <span className="text-[10px] text-muted-foreground tracking-widest">SYSTEM BEREIT</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Geo label */}
          <div
            className="absolute bottom-8 left-6 font-mono text-[10px] text-muted-foreground flex items-center gap-3"
            style={{ animation: "fade-up 0.8s cubic-bezier(0.16,1,0.3,1) 1.4s both" }}
          >
            <span>47.3769°N, 8.5417°E</span>
            <span className="text-border">·</span>
            <span>ZÜRICH, CH</span>
            <span className="text-border">·</span>
            <span className="text-primary">● LIVE</span>
          </div>
        </section>

        {/* ══ MARQUEE ══════════════════════════════════════ */}
        <div className="border-y border-border py-3.5 overflow-hidden bg-muted/20">
          <div style={{ animation: "marquee 22s linear infinite", whiteSpace: "nowrap", display: "flex" }}>
            {[0, 1].map(r => (
              <div key={r} className="flex items-center gap-12 pr-12">
                {["Schreinerei", "Maurer", "Sanitär", "Elektro", "Feuerwehr", "Rettungsdienste", "Metallbau", "Haustechnik", "Tiefbau", "Gärtnerei", "Holzbau", "Gebäudereinigung", "Malerei", "Fahrzeugflotten"].map(n => (
                  <span key={n + r} className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground whitespace-nowrap">
                    {n}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ══ VALUE PROPS ══════════════════════════════════════ */}
        <section className="mx-auto w-full max-w-7xl px-6 py-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {[
              { icon: IconPackage,      title: "Alles an einem Ort",     desc: "Materialien, Werkzeuge, Schlüssel — eine App, keine Zettelwirtschaft." },
              { icon: IconMapPin,       title: "Mehrere Standorte",       desc: "Lager, Fahrzeuge und Baustellen immer im Blick — ohne Raterei." },
              { icon: IconTruck,        title: "Mobil einsetzbar",        desc: "Vom Büro oder direkt auf der Baustelle — funktioniert auf jedem Gerät." },
              { icon: IconHistory,      title: "Lückenlose Rückverfolgung", desc: "Wer hat was, wann und wohin bewegt? Die Historie antwortet immer." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-background p-8">
                <Icon className="size-6 text-primary mb-4" />
                <div className="font-bold text-sm mb-2">{title}</div>
                <div className="font-mono text-xs text-muted-foreground leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ FEATURES ═════════════════════════════════════ */}
        <section id="features" className="mx-auto w-full max-w-7xl px-6 pb-24">
          <div className="mb-14 flex items-end justify-between border-b border-border pb-6">
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{`// 01 — Funktionen`}</div>
              <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                Alles was ein<br />
                <span className="text-primary">Handwerksbetrieb</span> braucht.
              </h2>
            </div>
            <div className="hidden md:flex flex-col items-end font-mono text-[10px] tracking-widest text-muted-foreground">
              <div>06 MODULE</div>
              <div>01 SYSTEM</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {FEATURES.map(f => (
              <div
                key={f.code}
                className="feat-card bg-background p-8 group"
                onMouseMove={e => {
                  const r = e.currentTarget.getBoundingClientRect()
                  e.currentTarget.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`)
                  e.currentTarget.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`)
                }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="size-10 border border-border rounded flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-all duration-200">
                    <f.icon className="size-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                  </div>
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground">{f.code}</span>
                </div>
                <h3 className="font-bold text-base mb-2 group-hover:text-primary transition-colors duration-200">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                <div className="mt-6 h-px bg-border group-hover:bg-primary transition-colors duration-300" />
              </div>
            ))}
          </div>
        </section>

        {/* ══ HOW IT WORKS ═════════════════════════════════ */}
        <section className="border-y border-border bg-muted/20 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{`// 02 — In 3 Schritten`}</div>
              <h2 className="text-3xl lg:text-4xl font-bold">In 5 Minuten einsatzbereit.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-0 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-8 left-[16.666%] right-[16.666%] h-px bg-border" />
              {[
                { n: "01", title: "Konto erstellen",   desc: "Registrierung in unter einer Minute. Keine Kreditkarte erforderlich." },
                { n: "02", title: "Team & Artikel",    desc: "Mitarbeiter einladen, Lagerorte definieren, Artikel und Werkzeuge erfassen." },
                { n: "03", title: "Sofort produktiv",  desc: "Buchungen tätigen, Bestände prüfen, Bestellungen auslösen — vom ersten Tag an." },
              ].map(({ n, title, desc }) => (
                <div key={n} className="p-8">
                  <div className="size-16 border border-border rounded flex items-center justify-center font-mono text-2xl font-bold text-primary bg-background mb-6 relative z-10">
                    {n}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ CALCULATOR ══════════════════════════════════════════ */}
        <section id="calculator" className="mx-auto w-full max-w-7xl px-6 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">
                {`// 03 — Versteckte Kosten`}
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
                Was kostet dich<br />dein <span className="text-primary">Chaos?</span>
              </h2>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed max-w-md">
                Verlorene Werkzeuge, Suchzeiten, Doppelbestellungen — diese Kosten erscheinen nie auf einer Rechnung.
                Berechne deinen jährlichen Verlust.
              </p>
            </div>

            {/* Right: Calculator */}
            <CostCalculator />
          </div>
        </section>

        {/* ══ SCAN & ERKENNUNG ════════════════════════════════ */}
        <section id="scan" className="relative py-28 overflow-hidden bg-background text-foreground border-y border-border">
          {/* Animated scan grid background */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `linear-gradient(color-mix(in oklch, var(--primary) 8%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--primary) 8%, transparent) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }} />

          {/* Sweeping scanline */}
          <div
            className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
            style={{
              background: `linear-gradient(90deg, transparent, #F97316, transparent)`,
              animation: "scanline 6s linear infinite",
              boxShadow: "0 0 20px 4px rgba(249,115,22,0.3)",
            }}
          />

          <div className="relative z-10 mx-auto max-w-7xl px-6">
            {/* Section header */}
            <div className="mb-16 text-center">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10">
                <IconScan className="size-3.5 text-primary" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-primary">Killer Feature</span>
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold mb-6 leading-[0.95] tracking-tight">
                Barcode scannen.<br />
                <span className="text-primary">Produkt erkannt.</span>
              </h2>
              <p className="font-mono text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Über 100 Millionen Produkte sofort erkannt — Lebensmittel, Baumaterial,
                Medikamente, Chemikalien, Kosmetik und mehr. Kein manuelles Tippen.
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden mb-16 max-w-2xl mx-auto">
              {[
                { icon: IconScan, value: "< 2s", label: "Erkennung", sub: "Barcode scannen, fertig" },
                { icon: IconDatabase, value: "100M+", label: "Produkte", sub: "Sofort erkannt" },
                { icon: IconCurrencyFrank, value: "0.—", label: "Aufpreis", sub: "Im Abo enthalten" },
              ].map(({ icon: Icon, value, label, sub }) => (
                <div key={label} className="bg-card p-6 text-center">
                  <Icon className="size-5 text-primary mx-auto mb-3" />
                  <div className="text-3xl font-bold text-foreground font-mono mb-1">{value}</div>
                  <div className="text-[11px] font-semibold text-foreground/80 mb-0.5">{label}</div>
                  <div className="font-mono text-[9px] text-muted-foreground/60 tracking-widest uppercase">{sub}</div>
                </div>
              ))}
            </div>

            {/* Benefits grid — what the customer gets */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16">
              {[
                { icon: "🏗️", title: "Baumaterial", desc: "Schrauben, Zement, Rohre — alles erkannt" },
                { icon: "🧴", title: "Kosmetik & Hygiene", desc: "Reinigungsmittel, Pflegeprodukte" },
                { icon: "💊", title: "Medikamente", desc: "PZN-Codes, Arzneimittel, Chemikalien" },
                { icon: "🔧", title: "Werkzeuge & Geräte", desc: "Elektrowerkzeug, Maschinen, Zubehör" },
                { icon: "🍎", title: "Lebensmittel", desc: "Gastronomie, Catering, Kantinen" },
                { icon: "💡", title: "Elektromaterial", desc: "Kabel, Schalter, Leuchtmittel" },
                { icon: "🏥", title: "Medizinprodukte", desc: "Praxisbedarf, Labormaterial" },
                { icon: "📦", title: "Alles andere", desc: "Wenn's einen Barcode hat, erkennen wir's" },
              ].map(item => (
                <div
                  key={item.title}
                  className="group relative border border-border rounded-lg p-5 bg-muted/30 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
                >
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <div className="text-sm font-semibold text-foreground/90 mb-1">{item.title}</div>
                  <div className="font-mono text-[11px] text-muted-foreground leading-snug">{item.desc}</div>
                </div>
              ))}
            </div>

            {/* How it works mini */}
            <div className="max-w-3xl mx-auto mb-16">
              <div className="flex items-center gap-0 justify-center">
                {[
                  { step: "1", label: "Barcode scannen", desc: "Kamera auf Produkt" },
                  { step: "2", label: "Automatisch erkannt", desc: "8 DBs in < 2 Sek." },
                  { step: "3", label: "Material angelegt", desc: "Name, Hersteller, alles" },
                ].map((s, i) => (
                  <div key={s.step} className="flex items-center">
                    <div className="text-center px-6">
                      <div className="size-10 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center font-mono text-sm font-bold text-primary mx-auto mb-2">
                        {s.step}
                      </div>
                      <div className="text-xs font-semibold text-foreground/80 mb-0.5">{s.label}</div>
                      <div className="font-mono text-[9px] text-muted-foreground/60">{s.desc}</div>
                    </div>
                    {i < 2 && (
                      <div className="w-12 h-px bg-gradient-to-r from-primary/40 to-primary/10 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link href="/signup">
                <Button size="lg" className="font-mono text-[11px] tracking-widest uppercase gap-2 px-10 h-12 bg-primary hover:bg-primary/90 text-white border-0">
                  Kostenlos testen <IconArrowUpRight className="size-4" />
                </Button>
              </Link>
              <p className="font-mono text-[10px] text-muted-foreground/60 mt-4 tracking-widest">
                Im Abo enthalten · Keine Zusatzkosten · Unbegrenzte Scans
              </p>
            </div>
          </div>
        </section>

        {/* ══ INTEGRATIONS ═════════════════════════════════════ */}
        <section id="integrations" className="border-y border-border bg-muted/20 py-24">
          <div className="mx-auto max-w-7xl px-6">

            {/* Header */}
            <div className="mb-14 flex items-end justify-between border-b border-border pb-6">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{`// 04 — Integrationen`}</div>
                <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                  Nahtlos in Ihre<br />
                  <span className="text-primary">bestehende Umgebung.</span>
                </h2>
              </div>
              <div className="hidden md:flex flex-col items-end font-mono text-[10px] tracking-widest text-muted-foreground">
                <div className="text-primary">8 VERFÜGBAR</div>
                <div>6+ GEPLANT</div>
              </div>
            </div>

            {/* Live integrations */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Jetzt verfügbar</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {LIVE_INTEGRATIONS.map(integration => (
                  <div key={integration.name} className="relative border border-border rounded-lg p-5 bg-background group hover:border-primary/50 transition-colors duration-200">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary rounded-t-lg" />
                    <div className="flex items-start gap-3 mb-3">
                      <BrandLogo name={integration.name} fallbackColor={integration.color} fallbackShort={integration.short} size={36} />
                      <div>
                        <div className="text-sm font-semibold leading-none mb-0.5">{integration.name}</div>
                        <div className="text-xs text-muted-foreground leading-snug">{integration.desc}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary" />
                      <span className="font-mono text-[9px] tracking-widest uppercase text-primary">{integration.badge}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming integrations */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="size-1.5 rounded-full bg-border" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">In Entwicklung</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {UPCOMING_INTEGRATIONS.map(integration => (
                  <div key={integration.name} className="opacity-50 border border-border rounded-lg p-3 bg-background flex flex-col items-center gap-2 text-center">
                    <BrandLogo name={integration.name} fallbackColor={integration.color} fallbackShort={integration.short} size={32} />
                    <span className="font-mono text-[9px] text-muted-foreground leading-tight">{integration.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <Link href="/dashboard/settings/integrations">
                <Button variant="outline" className="font-mono text-[11px] tracking-widest uppercase gap-2">
                  <IconPlugConnected className="size-3.5" />
                  Alle Integrationen ansehen
                </Button>
              </Link>
              <span className="font-mono text-[10px] text-muted-foreground">14+ Integrationen · Buchhaltung, ERP, Automation, Webhooks</span>
            </div>
          </div>
        </section>

        {/* ══ SWISS TRUST ════════════════════════════════════════ */}
        <section id="trust" className="py-24 bg-muted dark:bg-[oklch(0.14_0.005_264)]">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4 text-muted-foreground">{`// 05 — Datensouveränität`}</div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight text-foreground">
                  Ihre Daten<br />
                  gehören <span className="text-primary">Ihnen.</span>
                </h2>
                <p className="font-mono text-sm leading-relaxed max-w-md text-muted-foreground">
                  LogistikApp speichert ausnahmslos alle Daten auf Servern in der Schweiz.
                  Vollständig konform mit dem revidierten Datenschutzgesetz (nDSG).
                </p>
              </div>

              {/* Spec sheet */}
              <div className="font-mono space-y-0">
                {TRUST_SPECS.map(([key, val]) => (
                  <div key={key} className="flex items-center py-3.5 border-b border-border">
                    <span className="text-[10px] tracking-[0.18em] w-44 shrink-0 text-muted-foreground">{key}</span>
                    <div className="flex-1 mx-4 h-px bg-border" />
                    <span className="text-[11px] font-bold tracking-wider text-foreground">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══ MIGRATION ═════════════════════════════════════ */}
        <MigrationSection />

        {/* ══ PERIPHERALS ════════════════════════════════════ */}
        <PeripheralsSection />

        {/* ══ PRICING ══════════════════════════════════════ */}
        <PricingSection />

        {/* ══ FEATURE COMPARISON ═════════════════════════════ */}
        <FeatureComparisonSection />

        {/* ══ CTA ══════════════════════════════════════════ */}
        <section className="mx-auto w-full max-w-7xl px-6 pb-24">
          <div className="relative overflow-hidden border border-primary/20 rounded-lg p-16 text-center">
            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: `linear-gradient(color-mix(in oklch, var(--primary) 18%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--primary) 18%, transparent) 1px, transparent 1px)`,
              backgroundSize: "44px 44px",
            }} />
            <div className="absolute inset-0 bg-primary/3 pointer-events-none" />

            <div className="relative z-10">
              <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-4">READY TO START?</div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">Bereit loszulegen?</h2>
              <p className="font-mono text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                14 Tage kostenlos — ohne Kreditkarte, ohne Verpflichtung.
              </p>
              <Link href="/signup">
                <Button size="lg" className="font-mono text-[11px] tracking-widest uppercase gap-2 px-10 h-12">
                  Jetzt starten <IconArrowUpRight className="size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ══ FOOTER ═══════════════════════════════════════ */}
        <footer className="border-t border-border">
          <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col gap-4">
            {/* Top row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Logo iconSize={20} />
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
                © {new Date().getFullYear()} BrainBytes GmbH · LogistikApp
              </p>
              <div className="flex gap-6 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                <a href="#migration" className="hover:text-foreground transition-colors">Migration</a>
                <a href="#peripherals" className="hover:text-foreground transition-colors">Hardware</a>
                <a href="#comparison" className="hover:text-foreground transition-colors">Vergleich</a>
                <Link href="/login"  className="hover:text-foreground transition-colors">Anmelden</Link>
                <Link href="/signup" className="hover:text-foreground transition-colors">Registrieren</Link>
              </div>
            </div>
            {/* Legal row */}
            <div className="flex items-center justify-center gap-6 border-t border-border pt-4">
              <Link href="/datenschutz" className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors">Datenschutz</Link>
              <span className="text-border font-mono text-[10px]">·</span>
              <Link href="/agb" className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors">AGB</Link>
              <span className="text-border font-mono text-[10px]">·</span>
              <Link href="/impressum" className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors">Impressum</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
