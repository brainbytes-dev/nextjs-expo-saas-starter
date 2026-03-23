import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und rechtliche Angaben zu Zentory.",
}

export default function ImpressumPage() {
  return (
    <article className="space-y-12">
      {/* Header */}
      <header className="border-b border-border pb-8">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          Legal · Imprint
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-4">Imprint</h1>
        <p className="font-mono text-xs text-muted-foreground">
          Last updated: March 23, 2026
        </p>
      </header>

      {/* Operator */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Website Operator
        </h2>
        <div className="rounded-lg border border-border bg-muted/30 p-6 font-mono text-sm space-y-3">
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Company</div>
            <div className="font-bold text-foreground text-base">HR Online Consulting LLC</div>
            <div className="text-muted-foreground">(doing business as Zentory)</div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Incorporation</div>
            <div className="text-muted-foreground">
              Incorporated under the laws of the Catawba Indian Nation of the Carolinas,<br />
              Catawba Digital Economic Zone, USA
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Registered Office</div>
            <div className="text-muted-foreground">
              550 Kings Mountain<br />
              Kings Mountain, NC 28086<br />
              USA
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Authorized Representative</div>
            <div className="text-muted-foreground">Henrik Rühe, Managing Member</div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Tax Identification Number (EIN)</div>
            <div className="text-muted-foreground">61-2199060</div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Contact Information
        </h2>
        <div className="rounded-lg border border-border bg-muted/30 p-6 font-mono text-sm space-y-3">
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">E-Mail</div>
            <a href="mailto:legal@zentory.ch" className="text-primary hover:underline">legal@zentory.ch</a>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Support</div>
            <a href="mailto:support@zentory.ch" className="text-primary hover:underline">support@zentory.ch</a>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-1">Website</div>
            <a href="https://zentory.ch" className="text-primary hover:underline">zentory.ch</a>
          </div>
        </div>
      </section>

      {/* Responsibility */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Responsibility for Content
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          In accordance with applicable law, the operator of this platform is responsible for its own content.
          We are not obliged to monitor transmitted third-party information or investigate illegal activity
          unless we have knowledge of a specific infringement. Upon notification, we will remove infringing
          content immediately.
        </p>
      </section>

      {/* Intellectual Property */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Intellectual Property
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All content and works created by the site operator are subject to international copyright law.
          Any duplication, processing, or commercialization requires prior written consent of
          HR Online Consulting LLC.
        </p>
      </section>

      {/* Disclaimer */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Disclaimer
        </h2>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Zentory is an inventory and asset management tool for businesses. The operator assumes
            no liability for decisions made based on data managed within the platform. Users are
            responsible for verifying the accuracy of their inventory data.
          </p>
          <p>
            HR Online Consulting LLC makes no warranty regarding the availability, accuracy, or
            completeness of the platform or its content. Liability claims arising from the use or
            non-use of the information provided are excluded.
          </p>
        </div>
      </section>

      {/* Technical Implementation */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Technical Implementation
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {[
                ["Framework", "Next.js (React)"],
                ["Hosting", "Vercel"],
                ["Database", "PostgreSQL via Supabase (EU Frankfurt)"],
                ["CDN", "Vercel Edge Network"],
                ["TLS", "1.3 (enforced everywhere)"],
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

      {/* Dispute Resolution */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Dispute Resolution
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We are neither willing nor obliged to participate in dispute resolution proceedings
          before a consumer arbitration board.
        </p>
        <p className="font-mono text-[10px] text-muted-foreground">
          Last updated: March 2026
        </p>
      </section>
    </article>
  )
}
