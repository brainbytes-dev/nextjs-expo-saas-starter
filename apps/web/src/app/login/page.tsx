import Link from "next/link"
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

        <Link href="/"><Logo iconSize={28} /></Link>

        <div className="relative z-10 max-w-sm">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4 text-muted-foreground">
            {`// Inventarmanagement`}
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-5 text-foreground">
            Immer wissen,<br />was wo ist.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground font-mono">
            Werkzeuge, Materialien und Fahrzeugbestände —<br />
            lückenlos erfasst und jederzeit abrufbar.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <svg className="size-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Server in der Schweiz · nDSG-konform
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex flex-col p-8 md:p-12">
        <div className="flex justify-between items-center lg:hidden mb-8">
          <Link href="/"><Logo iconSize={24} /></Link>
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
