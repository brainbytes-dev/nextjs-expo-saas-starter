import { Logo } from "@/components/logo"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
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
        {/* Primary glow */}
        <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-[0.06] blur-3xl pointer-events-none bg-primary" />

        <a href="/"><Logo iconSize={28} /></a>

        <div className="relative z-10 max-w-sm">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4 text-muted-foreground">
            // Inventarmanagement
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-5 text-foreground">
            Immer wissen,<br />was wo ist.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground font-mono">
            Werkzeuge, Materialien und Fahrzeugbestände —<br />
            lückenlos erfasst und jederzeit abrufbar.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-3 max-w-xs">
          {[
            { label: "Materialien",     value: "1'247", accent: "text-primary" },
            { label: "Werkzeuge",       value: "84",    accent: "text-secondary" },
            { label: "Standorte",       value: "12",    accent: "text-foreground" },
            { label: "Buchungen heute", value: "38",    accent: "text-primary" },
          ].map(({ label, value, accent }) => (
            <div key={label} className="rounded-lg p-4 border border-border bg-background/60">
              <p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase mb-1.5">{label}</p>
              <p className={`text-xl font-bold font-mono ${accent}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-col p-8 md:p-12">
        <div className="flex justify-between items-center lg:hidden mb-8">
          <a href="/"><Logo iconSize={24} /></a>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>

        <p className="text-center font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          © {new Date().getFullYear()} LogistikApp · Schweizer Datenschutz
        </p>
      </div>

    </div>
  )
}
