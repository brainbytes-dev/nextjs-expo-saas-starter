"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo, Wordmark } from "@/components/logo"
import { ModeToggle } from "@/components/theme/theme-toggle"
import { LanguageSwitcher } from "@/components/language-switcher"
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

  /* ─── Mobile Menu ─────────────────────────────────── */
  .burger-line {
    display: block; width: 22px; height: 1.5px;
    background: currentColor; border-radius: 1px;
    transition: transform 0.35s cubic-bezier(0.77,0,0.18,1), opacity 0.25s ease;
  }
  .burger-open .burger-line:nth-child(1) {
    transform: translateY(6px) rotate(45deg);
  }
  .burger-open .burger-line:nth-child(2) {
    opacity: 0; transform: scaleX(0);
  }
  .burger-open .burger-line:nth-child(3) {
    transform: translateY(-6px) rotate(-45deg);
  }
  .mobile-overlay {
    position: fixed; inset: 0; z-index: 45;
    background: oklch(0.13 0.01 170 / 0.96);
    backdrop-filter: blur(24px) saturate(1.4);
    opacity: 0; pointer-events: none;
    transition: opacity 0.35s cubic-bezier(0.16,1,0.3,1);
  }
  .mobile-overlay.is-open { opacity: 1; pointer-events: auto; }
  .mobile-overlay .mob-link {
    opacity: 0; transform: translateY(20px);
    transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1);
  }
  .mobile-overlay.is-open .mob-link {
    opacity: 1; transform: translateY(0);
  }
  .mobile-overlay.is-open .mob-link:nth-child(1) { transition-delay: 0.08s; }
  .mobile-overlay.is-open .mob-link:nth-child(2) { transition-delay: 0.13s; }
  .mobile-overlay.is-open .mob-link:nth-child(3) { transition-delay: 0.18s; }
  .mobile-overlay.is-open .mob-link:nth-child(4) { transition-delay: 0.23s; }
  .mobile-overlay.is-open .mob-link:nth-child(5) { transition-delay: 0.28s; }
  .mobile-overlay.is-open .mob-link:nth-child(6) { transition-delay: 0.33s; }
  .mobile-overlay.is-open .mob-link:nth-child(7) { transition-delay: 0.38s; }
  .mobile-overlay.is-open .mob-link:nth-child(8) { transition-delay: 0.43s; }
  .mobile-overlay .mob-actions {
    opacity: 0; transform: translateY(12px);
    transition: opacity 0.4s ease 0.45s, transform 0.4s cubic-bezier(0.16,1,0.3,1) 0.45s;
  }
  .mobile-overlay.is-open .mob-actions {
    opacity: 1; transform: translateY(0);
  }
  .mob-link a {
    display: flex; align-items: baseline; gap: 12px;
    padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
    text-decoration: none; color: rgba(255,255,255,0.7);
    transition: color 0.2s ease;
  }
  .mob-link a:hover { color: #fff; }
  .mob-link .mob-num {
    font-family: var(--font-mono); font-size: 11px;
    letter-spacing: 0.1em; color: rgba(255,255,255,0.25);
    min-width: 28px;
  }
  .mob-link .mob-label { font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
`

/* ─── Custom Cursor ──────────────────────────────────────────── */
function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [isPointer] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(pointer: fine)").matches : false
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
  const t = useTranslations("landing")
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
        aria-label={t("scrollToTop")}
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
const FEATURES_META = [
  { icon: IconPackage,        code: "INV", titleKey: "featInvTitle", descKey: "featInvDesc" },
  { icon: IconTool,           code: "WRK", titleKey: "featWrkTitle", descKey: "featWrkDesc" },
  { icon: IconTruck,          code: "LFG", titleKey: "featLfgTitle", descKey: "featLfgDesc" },
  { icon: IconMapPin,         code: "STO", titleKey: "featStoTitle", descKey: "featStoDesc" },
  { icon: IconShoppingCart,   code: "ORD", titleKey: "featOrdTitle", descKey: "featOrdDesc" },
  { icon: IconHistory,        code: "ZEI", titleKey: "featZeiTitle", descKey: "featZeiDesc" },
]

const PLANS = [
  {
    name: "Starter",
    monthly: 59, yearly: 49,
    desc: "priceStarterDesc",
    features: Array.from({length: 9}, (_, i) => `priceFeat_starter_${i}`),
    cta: "priceStarterCta", href: "/signup", highlight: false,
  },
  {
    name: "Professional",
    monthly: 199, yearly: 169,
    desc: "priceProDesc",
    features: Array.from({length: 15}, (_, i) => `priceFeat_pro_${i}`),
    cta: "priceProCta", href: "/signup", highlight: true,
  },
  {
    name: "Enterprise",
    monthly: -1, yearly: -1,
    desc: "priceEnterpriseDesc",
    features: Array.from({length: 17}, (_, i) => `priceFeat_ent_${i}`),
    cta: "priceEnterpriseCta", href: "mailto:sales@zentory.ch", highlight: false,
  },
]

const TRUST_SPEC_KEYS = [
  ["trustLegalFramework", "trustLegalFrameworkVal"],
  ["trustServer",         "trustServerVal"],
  ["trustCert",           "trustCertVal"],
  ["trustCloudAct",       "trustCloudActVal"],
  ["trustBackup",         "trustBackupVal"],
  ["trustUptime",         "trustUptimeVal"],
]

const LIVE_INTEGRATIONS = [
  { name: "bexio",   descKey: "intBexioDesc",     color: "#E4312B", short: "bx",  badgeKey: "intBadgeChNo1" },
  { name: "Abacus",  descKey: "intAbacusDesc",    color: "#003087", short: "ac",  badgeKey: "intBadgeAvailable" },
  { name: "Vertec",  descKey: "intVertecDesc",     color: "#FF6900", short: "vt",  badgeKey: "intBadgeAvailable" },
  { name: "Zebra",   descKey: "intZebraDesc",      color: "#1a1a1a", short: "zbr", badgeKey: "intBadgeAvailable" },
  { name: "Stripe",  descKey: "intStripeDesc",     color: "#635BFF", short: "str", badgeKey: "intBadgeAvailable" },
  { name: "WhatsApp",descKey: "intWhatsAppDesc",   color: "#25D366", short: "wa",  badgeKey: "intBadgeAvailable" },
  { name: "Zapier",  descKey: "intZapierDesc",     color: "#FF4A00", short: "zp",  badgeKey: "intBadgeAvailable" },
  { name: "Webhooks",descKey: "intWebhooksDesc",   color: "#1a1a1a", short: "wh",  badgeKey: "intBadgeAvailable" },
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
  const t = useTranslations("landing")
  const [employees, setEmployees] = useState(5)
  const [minutesPerDay, setMinutesPerDay] = useState(20)
  const [hourlyRate, setHourlyRate] = useState(65)

  // Annual cost: employees * minutesPerDay/60 * hourlyRate * 220 working days
  const annualCost = Math.round(employees * (minutesPerDay / 60) * hourlyRate * 220)
  const formattedCost = new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF", maximumFractionDigits: 0 }).format(annualCost)

  const sliders = [
    { label: t("calcSliderEmployees"), value: employees, min: 1, max: 50, step: 1, unit: t("calcUnitPersons"), onChange: (v: number) => setEmployees(v) },
    { label: t("calcSliderTime"), value: minutesPerDay, min: 5, max: 120, step: 5, unit: t("calcUnitMinutes"), onChange: (v: number) => setMinutesPerDay(v) },
    { label: t("calcSliderRate"), value: hourlyRate, min: 30, max: 150, step: 5, unit: t("calcUnitRate"), onChange: (v: number) => setHourlyRate(v) },
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
          {t("calcResultLabel")}
        </p>
        <div className="text-4xl font-bold text-primary font-mono">
          {formattedCost}
        </div>
        <p className="font-mono text-[10px] text-muted-foreground mt-2">
          {t("calcResultFormula", { employees, minutes: minutesPerDay, rate: hourlyRate })}
        </p>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link href={`${APP_URL}/signup`}>
          <Button className="font-mono text-[11px] tracking-widest uppercase gap-2">
            {t("calcCta")}
          </Button>
        </Link>
        <p className="font-mono text-[10px] text-muted-foreground mt-2">{t("calcCtaSub")}</p>
      </div>
    </div>
  )
}

/* ─── Pricing Section with yearly toggle ─────────────────────── */
function PricingSection() {
  const t = useTranslations("landing")
  const [yearly, setYearly] = useState(false)

  return (
    <section id="pricing" className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="mb-10 border-b border-border pb-6">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{t("priceCode")}</div>
        <h2 className="text-3xl lg:text-4xl font-bold">{t("priceHeading")}</h2>
      </div>

      {/* Toggle — centered above cards */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center gap-1 p-1 rounded-full border border-border bg-muted/30">
          <button
            onClick={() => setYearly(false)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!yearly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            {t("priceMonthly")}
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${yearly ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            {t("priceYearly")}
            <span className="text-[9px] font-bold bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">{t("priceDiscount")}</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-px bg-border">
        {PLANS.map(plan => {
          const isEnterprise = plan.monthly < 0
          const price = isEnterprise ? t("priceFrom") : `CHF ${yearly ? plan.yearly : plan.monthly}`
          const per = isEnterprise ? t("pricePerMonth") : yearly ? t("pricePerMonthYearly") : t("pricePerMonth")
          const yearlyTotal = isEnterprise ? null : plan.yearly * 12
          const monthlyTotal = isEnterprise ? null : plan.monthly * 12
          const savings = monthlyTotal && yearlyTotal ? monthlyTotal - yearlyTotal : 0

          return (
            <div
              key={plan.name}
              className={`bg-background p-8 flex flex-col relative ${plan.highlight ? "outline outline-1 outline-primary z-10" : ""}`}
            >
              {plan.highlight && <div className="absolute top-0 left-0 right-0 h-[2px] bg-secondary" />}
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">{plan.name}</div>
              <div className="mb-1 font-mono">
                <span className="text-4xl font-bold">{price}</span>
                {per && <span className="text-sm text-muted-foreground ml-1">{per}</span>}
              </div>
              {yearly && savings > 0 && (
                <p className="text-xs text-primary font-mono font-semibold mb-2">
                  {t("priceSavedPerYear", { amount: savings })}
                </p>
              )}
              {yearly && yearlyTotal != null && monthlyTotal != null && (
                <p className="text-[10px] text-muted-foreground font-mono mb-6">
                  {t("priceYearlyBilling", { yearly: yearlyTotal, monthly: monthlyTotal })}
                </p>
              )}
              {!yearly && <div className="mb-8" />}
              <p className="text-xs text-muted-foreground mb-8">{t(plan.desc)}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <IconCheck className="size-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">{t(f)}</span>
                  </li>
                ))}
              </ul>
              <Link href={plan.href}>
                <Button className={`w-full font-mono text-[11px] tracking-widest uppercase ${plan.highlight ? "bg-secondary hover:bg-secondary/90 text-secondary-foreground" : ""}`} variant={plan.highlight ? "default" : "outline"}>
                  {t(plan.cta)}
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
  const t = useTranslations("landing")
  const sources = [
    { name: "Excel / CSV", short: "XLS", color: "#217346", desc: t("migExcelDesc") },
    { name: "bexio", short: "BX", color: "#0073E6", desc: t("migBexioDesc") },
    { name: "PROFFIX", short: "PF", color: "#E30613", desc: t("migProffixDesc") },
    { name: "SAP Business One", short: "SAP", color: "#0FAAFF", desc: t("migSapDesc") },
  ]

  return (
    <section id="migration" className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-4">{t("migCode")}</div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight text-foreground">
            {t("migHeading1")}<br />
            {t("migHeading2")} <span className="text-primary">{t("migHeadingAccent")}</span>
          </h2>
          <p className="font-mono text-sm leading-relaxed max-w-md text-muted-foreground mb-8">
            {t("migDesc")}
          </p>

          {/* AI feature callout */}
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 mb-8">
            <IconSparkles className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-0.5">{t("migAiTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {t("migAiDesc")}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href={`${APP_URL}/dashboard/migration`}>
              <Button className="font-mono text-[11px] tracking-widest uppercase gap-2">
                <IconTransfer className="size-3.5" />
                {t("migCtaMigrate")}
              </Button>
            </Link>
            <Link href={`${APP_URL}/dashboard/import`}>
              <Button variant="outline" className="font-mono text-[11px] tracking-widest uppercase gap-2">
                <IconUpload className="size-3.5" />
                {t("migCtaImport")}
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
                <span className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">{t("migReady")}</span>
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
  const t = useTranslations("landing")
  const peripherals = [
    { name: t("perScanner"), desc: t("perScannerDesc"), icon: IconBarcode },
    { name: t("perPrinter"), desc: t("perPrinterDesc"), icon: IconPrinter },
    { name: t("perRfid"), desc: t("perRfidDesc"), icon: IconAntenna },
    { name: t("perScale"), desc: t("perScaleDesc"), icon: IconScale },
    { name: t("perNfc"), desc: t("perNfcDesc"), icon: IconNfc },
    { name: t("perBeacon"), desc: t("perBeaconDesc"), icon: IconBluetooth },
    { name: t("perWatch"), desc: t("perWatchDesc"), icon: IconDeviceWatch },
    { name: t("perKeypad"), desc: t("perKeypadDesc"), icon: IconKeyboard },
  ]

  return (
    <section id="peripherals" className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="mb-10 border-b border-border pb-6">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{t("perCode")}</div>
        <h2 className="text-3xl lg:text-4xl font-bold">{t("perHeading")}</h2>
        <p className="text-muted-foreground mt-2 max-w-2xl">{t("perDesc")}</p>
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
  const t = useTranslations("landing")
  const categories = [
    {
      name: "compCatAll",
      features: [
        { name: `compFeat_all_0`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_1`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_2`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_3`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_4`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_5`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_6`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_7`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_8`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_9`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_10`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_11`, starter: true, pro: true, enterprise: true },
        { name: `compFeat_all_12`, starter: true, pro: true, enterprise: true },
      ],
    },
    {
      name: "compCatPro",
      features: [
        { name: `compFeat_pro_0`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_1`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_2`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_3`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_4`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_5`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_6`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_7`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_8`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_9`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_10`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_11`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_12`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_13`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_14`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_15`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_16`, starter: false, pro: true, enterprise: true },
        { name: `compFeat_pro_17`, starter: false, pro: true, enterprise: true },
      ],
    },
    {
      name: "compCatEnt",
      features: [
        { name: `compFeat_ent_0`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_1`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_2`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_3`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_4`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_5`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_6`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_7`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_8`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_9`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_10`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_11`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_12`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_13`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_14`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_15`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_16`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_17`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_18`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_19`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_20`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_21`, starter: false, pro: false, enterprise: true },
        { name: `compFeat_ent_22`, starter: false, pro: false, enterprise: true },
      ],
    },
  ]

  return (
    <section id="comparison" className="mx-auto w-full max-w-7xl px-6 py-24">
      <div className="mb-10 border-b border-border pb-6">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{t("compCode")}</div>
        <h2 className="text-3xl lg:text-4xl font-bold">{t("compHeading")}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 pr-4 font-mono text-xs text-muted-foreground w-1/3">{t("compFeatureCol")}</th>
              <th className="text-center py-4 px-4 font-mono text-xs text-muted-foreground">Starter</th>
              <th className="text-center py-4 px-4 font-mono text-xs text-primary font-bold">Professional</th>
              <th className="text-center py-4 px-4 font-mono text-xs text-muted-foreground">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <Fragment key={cat.name}>
                <tr>
                  <td colSpan={4} className="pt-6 pb-2 font-mono text-[10px] tracking-[0.2em] uppercase text-primary font-bold">{t(cat.name)}</td>
                </tr>
                {cat.features.map(f => (
                  <tr key={f.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 pr-4 text-muted-foreground">{t(f.name)}</td>
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
// All links pointing into the app use this base URL so that
// users land on app.zentory.ch (not zentory.ch/dashboard etc.)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.zentory.ch"

export default function LandingPage() {
  const t = useTranslations("landing")
  const [navSolid, setNavSolid] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    const fn = () => setNavSolid(window.scrollY > 32)
    window.addEventListener("scroll", fn, { passive: true })
    return () => window.removeEventListener("scroll", fn)
  }, [])

  // Mobile menu: Escape key + body scroll lock
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileMenuOpen(false) }
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", onEsc)
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onEsc) }
  }, [mobileMenuOpen])

  const softwareAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Zentory",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, iOS, Android",
    "description": "Inventar- und Werkzeugverwaltung für Schweizer KMU",
    "url": "https://zentory.ch",
    "offers": [
      {
        "@type": "Offer",
        "name": "Starter",
        "price": "59",
        "priceCurrency": "CHF",
        "priceValidUntil": "2027-12-31",
        "url": "https://zentory.ch/#pricing"
      },
      {
        "@type": "Offer",
        "name": "Professional",
        "price": "199",
        "priceCurrency": "CHF",
        "priceValidUntil": "2027-12-31",
        "url": "https://zentory.ch/#pricing"
      }
    ],
    "publisher": {
      "@type": "Organization",
      "name": "HR Online Consulting LLC",
      "url": "https://zentory.ch",
      "logo": "https://zentory.ch/zentory-logo.svg"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1"
    }
  }

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Zentory",
    "legalName": "HR Online Consulting LLC",
    "url": "https://zentory.ch",
    "logo": "https://zentory.ch/zentory-logo.svg",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@zentory.ch",
      "contactType": "customer support"
    },
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "550 Kings Mountain",
      "addressLocality": "Kings Mountain",
      "addressRegion": "NC",
      "postalCode": "28086",
      "addressCountry": "US"
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <CustomCursor />
      <ScrollUI />

      <div className="flex min-h-screen flex-col bg-background text-foreground">

        {/* ══ NAV ══════════════════════════════════════════ */}
        <header className={`sticky top-0 z-50 transition-all duration-300 ${navSolid ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"}`}>
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
            <Logo />
            <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-muted-foreground">
              <a href="#features"      className="hover:text-foreground transition-colors">{t("navFeatures")}</a>
              <a href="#scan"          className="hover:text-foreground transition-colors">{t("navScan")}</a>
              <a href="#integrations"  className="hover:text-foreground transition-colors">{t("navIntegrations")}</a>
              <a href="#trust"         className="hover:text-foreground transition-colors">{t("navSecurity")}</a>
              <a href="#peripherals"   className="hover:text-foreground transition-colors">{t("navHardware")}</a>
              <a href="#pricing"       className="hover:text-foreground transition-colors">{t("navPricing")}</a>
            </nav>
            <div className="flex items-center gap-1.5">
              <LanguageSwitcher compact />
              <ModeToggle />
              <Link href={`${APP_URL}/login`} className="hidden lg:inline-flex">
                <Button variant="ghost" size="sm" className="text-sm">{t("navLogin")}</Button>
              </Link>
              <Link href={`${APP_URL}/signup`} className="hidden lg:inline-flex">
                <Button size="sm" className="text-sm gap-1.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                  {t("navStart")} <IconArrowUpRight className="size-3.5" />
                </Button>
              </Link>
              {/* Burger — mobile only */}
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className={`lg:hidden flex flex-col items-center justify-center gap-[5px] size-9 rounded-md hover:bg-muted/50 transition-colors ${mobileMenuOpen ? "burger-open" : ""}`}
                aria-label="Menu"
              >
                <span className="burger-line" />
                <span className="burger-line" />
                <span className="burger-line" />
              </button>
            </div>
          </div>
        </header>

        {/* ══ MOBILE MENU OVERLAY ═════════════════════════════ */}
        <div
          className={`mobile-overlay lg:hidden ${mobileMenuOpen ? "is-open" : ""}`}
          onClick={(e) => { if (e.target === e.currentTarget) setMobileMenuOpen(false) }}
        >
          {/* Grid texture */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }} />

          <div className="relative h-full flex flex-col justify-between px-8 pt-20 pb-10">
            {/* Nav links */}
            <nav className="flex flex-col">
              {[
                { href: "#features",     label: t("navFeatures"),      num: "01" },
                { href: "#scan",         label: t("navScan"),          num: "02" },
                { href: "#integrations", label: t("navIntegrations"),  num: "03" },
                { href: "#trust",        label: t("navSecurity"),      num: "04" },
                { href: "#peripherals",  label: t("navHardware"),      num: "05" },
                { href: "#pricing",      label: t("navPricing"),       num: "06" },
              ].map((item) => (
                <div key={item.href} className="mob-link">
                  <a href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <span className="mob-num">{item.num}</span>
                    <span className="mob-label">{item.label}</span>
                  </a>
                </div>
              ))}
            </nav>

            {/* Bottom: CTA + controls */}
            <div className="mob-actions space-y-6">
              <div className="flex gap-3">
                <Link href={`${APP_URL}/login`} className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full h-12 text-sm border-white/20 text-white hover:bg-white/10 hover:text-white">
                    {t("navLogin")}
                  </Button>
                </Link>
                <Link href={`${APP_URL}/signup`} className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full h-12 text-sm gap-1.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    {t("navStart")} <IconArrowUpRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LanguageSwitcher compact />
                  {/* Inline theme toggle — always white on dark overlay */}
                  <button
                    type="button"
                    aria-label="Toggle theme"
                    onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    className="flex size-9 items-center justify-center rounded-md text-white hover:bg-white/10 transition-colors"
                  >
                    {resolvedTheme === "dark"
                      ? <Sun className="size-5" />
                      : <Moon className="size-5" />}
                  </button>
                </div>
                <span className="font-mono text-[10px] tracking-[0.2em] text-white/20 uppercase">zentory.ch</span>
              </div>
            </div>
          </div>
        </div>

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
                    {t("heroLabel")}
                  </span>
                </div>

                {/* Staggered words */}
                <div className="mb-10">
                  {[
                    { text: t("heroWord1"), cls: "hero-word-1" },
                    { text: t("heroWord2"), cls: "hero-word-2" },
                    { text: t("heroWord3"), cls: "hero-word-3" },
                    { text: t("heroWord4"), cls: "hero-word-4", accent: true },
                  ].map(({ text, cls, accent }) => (
                    <div key={text} className="overflow-hidden leading-[0.88]">
                      <div className={`font-bold tracking-tight ${cls}`} style={{ fontSize: "clamp(2.5rem, 7vw, 6rem)" }}>
                        {accent ? <span className="text-primary">{text}</span> : text}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="hero-sub-2 font-mono text-sm text-muted-foreground leading-relaxed max-w-lg mb-10">
                  {t("heroSub").split("\n").map((line, i) => <Fragment key={i}>{i > 0 && <br />}{line}</Fragment>)}
                </p>

                <div className="hero-sub-3 flex flex-wrap gap-3 mb-4">
                  <Link href={`${APP_URL}/signup`}>
                    <Button size="lg" className="font-mono text-xs tracking-widest uppercase gap-2 px-7 h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                      {t("heroCta")} <IconArrowUpRight className="size-4" />
                    </Button>
                  </Link>
                  <Link href={`${APP_URL}/dashboard`}>
                    <Button size="lg" variant="outline" className="font-mono text-xs tracking-widest uppercase h-12 px-7">
                      {t("heroDemo")}
                    </Button>
                  </Link>
                </div>

                <p className="hero-sub-3 font-mono text-[10px] text-muted-foreground tracking-widest">
                  {t("heroNote")}
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
                      { code: "MAT_TOTAL",  label: t("termMaterials"),      val: "1'247", unit: t("termArticles")  },
                      { code: "WRK_TOTAL",  label: t("termTools"),        val: "84",    unit: t("termDevices")   },
                      { code: "LOC_ACTIVE", label: t("termLocations"),        val: "12",    unit: t("termActive")    },
                      { code: "BOOK_TODAY", label: t("termBookingsToday"),  val: "38",    unit: t("termTransactions") },
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
                      <span className="text-[10px] text-muted-foreground tracking-widest">{t("termReady")}</span>
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
                {([t("marqueeSchreinerei"), t("marqueeMaurer"), t("marqueeSanitaer"), t("marqueeElektro"), t("marqueeFeuerwehr"), t("marqueeRettungsdienste"), t("marqueeMetallbau"), t("marqueeHaustechnik"), t("marqueeTiefbau"), t("marqueeGaertnerei"), t("marqueeHolzbau"), t("marqueeGebaeudereinigung"), t("marqueeMalerei"), t("marqueeFahrzeugflotten")] as string[]).map(n => (
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
              { icon: IconPackage,      title: t("vpAllInOne"),     desc: t("vpAllInOneDesc") },
              { icon: IconMapPin,       title: t("vpLocations"),       desc: t("vpLocationsDesc") },
              { icon: IconTruck,        title: t("vpMobile"),        desc: t("vpMobileDesc") },
              { icon: IconHistory,      title: t("vpTraceability"), desc: t("vpTraceabilityDesc") },
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
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{t("featSectionCode")}</div>
              <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                {t("featHeading1")}<br />
                <span className="text-primary">{t("featHeading2")}</span> {t("featHeading3")}
              </h2>
            </div>
            <div className="hidden md:flex flex-col items-end font-mono text-[10px] tracking-widest text-muted-foreground">
              <div>{t("featModules")}</div>
              <div>{t("featSystem")}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {FEATURES_META.map(f => (
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
                <h3 className="font-bold text-base mb-2 group-hover:text-primary transition-colors duration-200">{t(f.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(f.descKey)}</p>
                <div className="mt-6 h-px bg-border group-hover:bg-primary transition-colors duration-300" />
              </div>
            ))}
          </div>
        </section>

        {/* ══ HOW IT WORKS ═════════════════════════════════ */}
        <section className="border-y border-border bg-muted/20 py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14">
              <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{t("howCode")}</div>
              <h2 className="text-3xl lg:text-4xl font-bold">{t("howHeading")}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-0 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-8 left-[16.666%] right-[16.666%] h-px bg-border" />
              {[
                { n: "01", title: t("howStep1Title"),   desc: t("howStep1Desc") },
                { n: "02", title: t("howStep2Title"),    desc: t("howStep2Desc") },
                { n: "03", title: t("howStep3Title"),  desc: t("howStep3Desc") },
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
                {t("calcCode")}
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
                {t("calcHeading1")}<br />{t("calcHeading2")} <span className="text-primary">{t("calcHeadingAccent")}</span>
              </h2>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed max-w-md">
                {t("calcDesc")}
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
              background: `linear-gradient(90deg, transparent, var(--brand-primary, hsl(var(--primary))), transparent)`,
              animation: "scanline 6s linear infinite",
              boxShadow: "0 0 20px 4px hsl(var(--accent) / 0.3)",
            }}
          />

          <div className="relative z-10 mx-auto max-w-7xl px-6">
            {/* Section header */}
            <div className="mb-16 text-center">
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full border border-secondary/30 bg-secondary/10">
                <IconScan className="size-3.5 text-secondary" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-secondary">{t("scanBadge")}</span>
              </div>
              <h2 className="text-4xl lg:text-6xl font-bold mb-6 leading-[0.95] tracking-tight">
                {t("scanHeading1")}<br />
                <span className="text-primary">{t("scanHeading2")}</span>
              </h2>
              <p className="font-mono text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                {t("scanDesc")}
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden mb-16 max-w-2xl mx-auto">
              {[
                { icon: IconScan, value: "< 2s", label: t("scanStatRecognition"), sub: t("scanStatRecognitionSub") },
                { icon: IconDatabase, value: "100M+", label: t("scanStatProducts"), sub: t("scanStatProductsSub") },
                { icon: IconCurrencyFrank, value: "0.—", label: t("scanStatSurcharge"), sub: t("scanStatSurchargeSub") },
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
                { icon: "🏗️", title: t("scanCatConstruction"), desc: t("scanCatConstructionDesc") },
                { icon: "🧴", title: t("scanCatCosmetics"), desc: t("scanCatCosmeticsDesc") },
                { icon: "💊", title: t("scanCatMedicine"), desc: t("scanCatMedicineDesc") },
                { icon: "🔧", title: t("scanCatTools"), desc: t("scanCatToolsDesc") },
                { icon: "🍎", title: t("scanCatFood"), desc: t("scanCatFoodDesc") },
                { icon: "💡", title: t("scanCatElectric"), desc: t("scanCatElectricDesc") },
                { icon: "🏥", title: t("scanCatMedical"), desc: t("scanCatMedicalDesc") },
                { icon: "📦", title: t("scanCatOther"), desc: t("scanCatOtherDesc") },
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
                  { step: "1", label: t("scanStep1"), desc: t("scanStep1Desc") },
                  { step: "2", label: t("scanStep2"), desc: t("scanStep2Desc") },
                  { step: "3", label: t("scanStep3"), desc: t("scanStep3Desc") },
                ].map((s, i) => (
                  <div key={s.step} className="flex items-center">
                    <div className="text-center px-6">
                      <div className="size-10 rounded-full border border-secondary/40 bg-secondary/10 flex items-center justify-center font-mono text-sm font-bold text-secondary mx-auto mb-2">
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
              <Link href={`${APP_URL}/signup`}>
                <Button size="lg" className="font-mono text-[11px] tracking-widest uppercase gap-2 px-10 h-12 bg-secondary hover:bg-secondary/90 text-secondary-foreground border-0">
                  {t("scanCta")} <IconArrowUpRight className="size-4" />
                </Button>
              </Link>
              <p className="font-mono text-[10px] text-muted-foreground/60 mt-4 tracking-widest">
                {t("scanCtaSub")}
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
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">{t("intCode")}</div>
                <h2 className="text-3xl lg:text-4xl font-bold leading-tight">
                  {t("intHeading1")}<br />
                  <span className="text-primary">{t("intHeading2")}</span>
                </h2>
              </div>
              <div className="hidden md:flex flex-col items-end font-mono text-[10px] tracking-widest text-muted-foreground">
                <div className="text-primary">{t("intAvailable")}</div>
                <div>{t("intPlanned")}</div>
              </div>
            </div>

            {/* Live integrations */}
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t("intNowAvailable")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {LIVE_INTEGRATIONS.map(integration => (
                  <div key={integration.name} className="relative border border-border rounded-lg p-5 bg-background group hover:border-primary/50 transition-colors duration-200">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-secondary rounded-t-lg" />
                    <div className="flex items-start gap-3 mb-3">
                      <BrandLogo name={integration.name} fallbackColor={integration.color} fallbackShort={integration.short} size={36} />
                      <div>
                        <div className="text-sm font-semibold leading-none mb-0.5">{integration.name}</div>
                        <div className="text-xs text-muted-foreground leading-snug">{t(integration.descKey)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-primary" />
                      <span className="font-mono text-[9px] tracking-widest uppercase text-primary">{t(integration.badgeKey)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming integrations */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="size-1.5 rounded-full bg-border" />
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{t("intInDevelopment")}</span>
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
              <Link href={`${APP_URL}/dashboard/settings/integrations`}>
                <Button variant="outline" className="font-mono text-[11px] tracking-widest uppercase gap-2">
                  <IconPlugConnected className="size-3.5" />
                  {t("intViewAll")}
                </Button>
              </Link>
              <span className="font-mono text-[10px] text-muted-foreground">{t("intCount")}</span>
            </div>
          </div>
        </section>

        {/* ══ SWISS TRUST ════════════════════════════════════════ */}
        <section id="trust" className="py-24 bg-muted dark:bg-[oklch(0.14_0.005_264)]">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              <div>
                <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4 text-muted-foreground">{t("trustCode")}</div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight text-foreground">
                  {t("trustHeading1")}<br />
                  {t("trustHeading2")} <span className="text-primary">{t("trustHeadingAccent")}</span>
                </h2>
                <p className="font-mono text-sm leading-relaxed max-w-md text-muted-foreground">
                  {t("trustDesc")}
                </p>
              </div>

              {/* Spec sheet */}
              <div className="font-mono space-y-0">
                {TRUST_SPEC_KEYS.map(([keyId, valId]) => (
                  <div key={keyId} className="flex items-center py-3.5 border-b border-border">
                    <span className="text-[10px] tracking-[0.18em] w-44 shrink-0 text-muted-foreground">{t(keyId)}</span>
                    <div className="flex-1 mx-4 h-px bg-border" />
                    <span className="text-[11px] font-bold tracking-wider text-foreground">{t(valId)}</span>
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
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">{t("ctaReady")}</h2>
              <p className="font-mono text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                {t("ctaDesc")}
              </p>
              <Link href={`${APP_URL}/signup`}>
                <Button size="lg" className="font-mono text-[11px] tracking-widest uppercase gap-2 px-10 h-12">
                  {t("ctaButton")} <IconArrowUpRight className="size-4" />
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
                © {new Date().getFullYear()} <Wordmark className="inline" />
              </p>
              <div className="flex gap-6 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                <a href="#migration" className="hover:text-foreground transition-colors">{t("footerMigration")}</a>
                <a href="#peripherals" className="hover:text-foreground transition-colors">{t("footerHardware")}</a>
                <a href="#comparison" className="hover:text-foreground transition-colors">{t("footerComparison")}</a>
                <Link href={`${APP_URL}/login`}  className="hover:text-foreground transition-colors">{t("footerLogin")}</Link>
                <Link href={`${APP_URL}/signup`} className="hover:text-foreground transition-colors">{t("footerSignup")}</Link>
              </div>
            </div>
            {/* Legal row */}
            <div className="flex items-center justify-center gap-6 border-t border-border pt-4">
              <Link href="/datenschutz" target="_blank" className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors">{t("footerPrivacy")}</Link>
              <span className="text-border font-mono text-[10px]">·</span>
              <Link href="/agb" target="_blank" className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors">{t("footerTerms")}</Link>
              <span className="text-border font-mono text-[10px]">·</span>
              <Link href="/impressum" target="_blank" className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors">{t("footerImprint")}</Link>
              <span className="text-border font-mono text-[10px]">·</span>
              <button onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))} className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors">{t("footerCookies")}</button>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
