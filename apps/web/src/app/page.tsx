"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo, LogoMark } from "@/components/logo"
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
} from "@tabler/icons-react"

/* ─── Global styles injected at runtime ─────────────────────── */
const STYLES = `
  *, *::before, *::after { cursor: none !important; }

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

  useEffect(() => {
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
  }, [])

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
  { icon: IconPackage,  code: "MAT", title: "Materialien & Bestand",    desc: "Meldebestände, Ablaufdaten, Chargen- und Seriennummern. Vollständige Bestandsführung auf Knopfdruck." },
  { icon: IconTool,     code: "WRK", title: "Werkzeug-Tracking",         desc: "Aus- und Einchecken, Buchungshistorie, Wartungsfristen und Zustandsverfolgung für jedes Gerät." },
  { icon: IconTruck,    code: "FAH", title: "Fahrzeug-Bestände",          desc: "Jedes Fahrzeug als eigener Lagerort. Immer wissen, was im Transporter ist." },
  { icon: IconMapPin,   code: "STO", title: "Mehrere Standorte",          desc: "Lager, Fahrzeuge, Baustellen — alle Bestände zentral in einer Ansicht." },
  { icon: IconShoppingCart, code: "ORD", title: "Bestellwesen",           desc: "Bezugsquellen, Warenkorb und Bestellpositionen — von der Anfrage bis zum Wareneingang." },
  { icon: IconHistory,  code: "HIS", title: "Lückenlose Historie",        desc: "Jede Buchung, jede Änderung — vollständig protokolliert und jederzeit abrufbar." },
]

const PLANS = [
  {
    name: "Starter", price: "CHF 49", per: "/Mo",
    desc: "Für kleine Teams und Einsteiger.",
    features: ["Bis 3 Benutzer", "500 Artikel", "2 Standorte", "E-Mail Support"],
    cta: "Kostenlos starten", href: "/signup", highlight: false,
  },
  {
    name: "Professional", price: "CHF 149", per: "/Mo",
    desc: "Für wachsende Betriebe.",
    features: ["Bis 15 Benutzer", "Unbegrenzte Artikel", "Unbegrenzte Standorte", "Mobile App inklusive", "Prioritäts-Support"],
    cta: "14 Tage testen", href: "/signup", highlight: true,
  },
  {
    name: "Enterprise", price: "Anfrage", per: "",
    desc: "Für Unternehmen mit besonderen Anforderungen.",
    features: ["Unbegrenzte Benutzer", "SSO / SAML", "SLA-Garantie", "API-Zugang", "Dedizierter Support"],
    cta: "Kontakt aufnehmen", href: "/signup", highlight: false,
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
              <a href="#features" className="hover:text-foreground transition-colors">Funktionen</a>
              <a href="#pricing"  className="hover:text-foreground transition-colors">Preise</a>
              <a href="#trust"    className="hover:text-foreground transition-colors">Sicherheit</a>
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
                {["Elektro Müller AG", "Keller Haustechnik GmbH", "Sanitär Huber", "Bau & Service GmbH", "Schreinerei Lüthi", "Transport Bärtschi AG", "Elektro Berger & Co."].map(n => (
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
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">// 01 — Funktionen</div>
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
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">// 02 — In 3 Schritten</div>
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

        {/* ══ SWISS TRUST ════════════════════════════════════════ */}
        <section id="trust" className="py-24 bg-muted dark:bg-[oklch(0.14_0.005_264)]">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4 text-muted-foreground">// 03 — Datensouveränität</div>
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

        {/* ══ PRICING ══════════════════════════════════════ */}
        <section id="pricing" className="mx-auto w-full max-w-7xl px-6 py-24">
          <div className="mb-14 border-b border-border pb-6">
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">// 04 — Preise</div>
            <h2 className="text-3xl lg:text-4xl font-bold">Einfach. Transparent.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-border">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`bg-background p-8 flex flex-col relative ${plan.highlight ? "outline outline-1 outline-primary z-10" : ""}`}
              >
                {plan.highlight && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />}
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">{plan.name}</div>
                <div className="mb-1 font-mono">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.per && <span className="text-sm text-muted-foreground ml-1">{plan.per}</span>}
                </div>
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
            ))}
          </div>
        </section>

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
          <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo iconSize={20} />
            <p className="font-mono text-[10px] tracking-widest text-muted-foreground">
              © {new Date().getFullYear()} LogistikApp · Schweizer Datenschutz
            </p>
            <div className="flex gap-6 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              <Link href="/login"  className="hover:text-foreground transition-colors">Anmelden</Link>
              <Link href="/signup" className="hover:text-foreground transition-colors">Registrieren</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
