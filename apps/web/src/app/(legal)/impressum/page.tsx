import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und rechtliche Angaben zu LogistikApp von BrainBytes GmbH.",
}

export default function ImpressumPage() {
  return (
    <article className="space-y-12">
      {/* Header */}
      <header className="border-b border-border pb-8">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          Rechtliches · Impressum
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-4">Impressum</h1>
        <p className="font-mono text-xs text-muted-foreground">
          Angaben gemäss Schweizer Recht und EU-Impressumspflicht
        </p>
      </header>

      {/* Gesellschaft */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Betreiber dieser Website
        </h2>
        <div className="rounded-lg border border-border bg-muted/30 p-6 font-mono text-sm space-y-3">
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Firma</div>
            <div className="font-bold text-foreground text-base">BrainBytes GmbH</div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Adresse</div>
            <div className="text-muted-foreground">
              Musterstrasse 1<br />
              8001 Zürich<br />
              Schweiz
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">UID</div>
            <div className="text-muted-foreground">CHE-XXX.XXX.XXX MWST</div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Handelsregister</div>
            <div className="text-muted-foreground">Handelsregister des Kantons Zürich</div>
          </div>
        </div>
      </section>

      {/* Kontakt */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Kontakt
        </h2>
        <div className="rounded-lg border border-border bg-muted/30 p-6 font-mono text-sm space-y-3">
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">E-Mail allgemein</div>
            <a href="mailto:info@logistikapp.ch" className="text-primary hover:underline">info@logistikapp.ch</a>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">E-Mail Datenschutz</div>
            <a href="mailto:datenschutz@logistikapp.ch" className="text-primary hover:underline">datenschutz@logistikapp.ch</a>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Support</div>
            <a href="mailto:support@logistikapp.ch" className="text-primary hover:underline">support@logistikapp.ch</a>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Website</div>
            <a href="https://logistikapp.ch" className="text-primary hover:underline">logistikapp.ch</a>
          </div>
        </div>
      </section>

      {/* Haftungsausschluss */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Haftungsausschluss
        </h2>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Inhalt der Website</h3>
            <p>
              BrainBytes GmbH übernimmt keinerlei Gewähr für die Aktualität, Korrektheit, Vollständigkeit
              oder Qualität der bereitgestellten Informationen. Haftungsansprüche gegen BrainBytes GmbH
              wegen Schäden materieller oder immaterieller Art, die durch die Nutzung oder Nichtnutzung
              der dargebotenen Informationen entstanden sind, sind grundsätzlich ausgeschlossen.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Verweise und Links</h3>
            <p>
              Bei direkten oder indirekten Verweisen auf fremde Webseiten («Hyperlinks»), die ausserhalb
              des Verantwortungsbereichs von BrainBytes GmbH liegen, tritt eine Haftungsverpflichtung
              ausschliesslich dann in Kraft, wenn BrainBytes GmbH von den Inhalten Kenntnis hat und
              es ihr technisch möglich und zumutbar wäre, die Nutzung im Falle rechtswidriger Inhalte
              zu verhindern.
            </p>
          </div>
        </div>
      </section>

      {/* Urheberrecht */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Urheberrecht
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Die durch BrainBytes GmbH erstellten Inhalte und Werke auf dieser Website unterliegen dem
          Schweizer Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
          Verwertung ausserhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung
          von BrainBytes GmbH.
        </p>
      </section>

      {/* Technische Umsetzung */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Technische Umsetzung
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {[
                ["Framework", "Next.js (React)"],
                ["Hosting", "Vercel"],
                ["Datenbank", "PostgreSQL via Supabase (EU Frankfurt)"],
                ["CDN", "Vercel Edge Network"],
                ["TLS", "1.3 (überall erzwungen)"],
              ].map(([key, value]) => (
                <tr key={key} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] tracking-widest uppercase text-muted-foreground w-40">{key}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rechtliches */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Anwendbares Recht
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Dieses Impressum sowie die Nutzung dieser Website unterstehen Schweizer Recht.
          Gerichtsstand ist Zürich, Schweiz.
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          Stand: März 2026
        </p>
      </section>
    </article>
  )
}
