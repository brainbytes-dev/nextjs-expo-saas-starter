import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { COMPANY } from "@/lib/company"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("agb")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  }
}

export default async function AGBPage() {
  const t = await getTranslations("agb")

  return (
    <article className="space-y-12">
      {/* Header */}
      <header className="border-b border-border pb-8">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          {t("breadcrumb")}
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-4">
          {t("title")}
        </h1>
        <p className="font-mono text-xs text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      {/* 1. Geltungsbereich */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s1Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s1P1")} <a href={COMPANY.web.url} className="text-primary hover:underline">{COMPANY.web.domain}</a> {t("s1P1End")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s1P2")}
        </p>
      </section>

      {/* 2. Leistungsbeschreibung */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s2Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s2P1")}
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s2Item1")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s2Item2")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s2Item3")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s2Item4")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s2Item5")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s2Item6")}</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s2P2")}
        </p>
      </section>

      {/* 3. Vertragsabschluss */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s3Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s3P1")}
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s3Item1")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s3Item2")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s3Item3")}</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s3P2")}
        </p>
      </section>

      {/* 4. Abonnement und Preise */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s4Title")}
        </h2>

        <div>
          <h3 className="text-sm font-semibold mb-2">{t("s4_1Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("s4_1P1")} <a href={`${COMPANY.web.url}/#pricing`} className="text-primary hover:underline">{COMPANY.web.domain}/#pricing</a> {t("s4_1P1End")}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">{t("s4_2Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("s4_2P1")}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">{t("s4_3Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("s4_3P1")}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">{t("s4_4Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("s4_4P1")} <strong className="text-foreground">{t("s4_4P1Days")}</strong> {t("s4_4P1End")}
          </p>
        </div>
      </section>

      {/* 5. Pflichten des Kunden */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s5Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s5P1")}
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s5Item1")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s5Item2")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s5Item3")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s5Item4")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s5Item5")}</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s5Item6")}</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s5P2")}
        </p>
      </section>

      {/* 6. Dateneigentum */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s6Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s6P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s6P2")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s6P3")}
        </p>
      </section>

      {/* 7. Verfügbarkeit */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s7Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s7P1")}
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">{t("s7Starter")}</strong>: {t("s7StarterDesc")}</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">{t("s7Pro")}</strong>: {t("s7ProDesc")}</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">{t("s7Enterprise")}</strong>: {t("s7EnterpriseDesc")}</span>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s7P2")}
        </p>
      </section>

      {/* 8. Haftung */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s8Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s8P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s8P2")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s8P3")}
        </p>
      </section>

      {/* 9. Kündigung */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s9Title")}
        </h2>

        <div>
          <h3 className="text-sm font-semibold mb-2">{t("s9_1Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("s9_1P1")} <a href={`mailto:${COMPANY.contact.email}`} className="text-primary hover:underline">{COMPANY.contact.email}</a>.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">{t("s9_2Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("s9_2P1")}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">{t("s9_3Title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("s9_3P1")}
          </p>
        </div>
      </section>

      {/* 10. Geistiges Eigentum */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s10Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s10P1")}
        </p>
      </section>

      {/* 11. Änderungen der AGB */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s11Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s11P1")} <strong className="text-foreground">{t("s11P1Days")}</strong> {t("s11P1End")}
        </p>
      </section>

      {/* 12. Anwendbares Recht */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s12Title")}
        </h2>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>{t("s12P1")}</p>
          <p>
            {t("s12P2")}
            <strong className="text-foreground"> {t("s12P2Jurisdiction")}</strong> {t("s12P2End")}
          </p>
          <p>{t("s12P3")}</p>
        </div>
      </section>

      {/* 13. Schlussbestimmungen */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s13Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s13P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s13P2")}{" "}
          <a href={`mailto:${COMPANY.contact.email}`} className="text-primary hover:underline">{COMPANY.contact.email}</a>
        </p>
      </section>
    </article>
  )
}
