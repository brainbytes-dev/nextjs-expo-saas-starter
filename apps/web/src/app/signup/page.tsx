import Link from "next/link"
import { Logo } from "@/components/logo"
import { SignupForm } from "@/components/signup-form"

export default function SignupPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1fr_480px] bg-background">

      {/* Left: Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-14 overflow-hidden bg-muted/40 border-r border-border">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `linear-gradient(color-mix(in oklch, var(--border) 60%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--border) 60%, transparent) 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />
        {/* Secondary glow */}
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-[0.06] blur-3xl pointer-events-none bg-secondary" />

        <Link href="/"><Logo iconSize={28} /></Link>

        <div className="relative z-10 max-w-sm">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4 text-muted-foreground">
            {`// Kostenlos starten`}
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-5 text-foreground">
            In 5 Minuten<br />einsatzbereit.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground font-mono">
            Konto erstellen, Team einladen, Artikel erfassen —<br />
            und schon wissen alle, wo was ist.
          </p>
        </div>

        <div className="relative z-10 flex flex-col gap-3 max-w-xs">
          {[
            "14 Tage kostenlos testen",
            "Keine Kreditkarte nötig",
            "Jederzeit kündbar",
            "Schweizer Datenschutz",
          ].map(item => (
            <div key={item} className="flex items-center gap-3">
              <svg className="size-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-sm font-mono text-muted-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-col p-8 md:p-12">
        <div className="flex justify-between items-center lg:hidden mb-8">
          <Link href="/"><Logo iconSize={24} /></Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <SignupForm />
          </div>
        </div>

        <p className="text-center font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          © {new Date().getFullYear()} LogistikApp · Keine Kreditkarte nötig
        </p>
      </div>

    </div>
  )
}
