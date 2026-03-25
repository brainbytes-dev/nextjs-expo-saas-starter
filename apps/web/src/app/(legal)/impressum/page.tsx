import type { Metadata } from "next"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { COMPANY } from "@/lib/company"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("impressum")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  }
}

export default async function ImpressumPage() {
  const t = await getTranslations("impressum")

  return (
    <article className="space-y-12">
      {/* Header */}
      <header className="border-b border-border pb-8">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          {t("breadcrumb")}
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-4">{t("title")}</h1>
      </header>

      {/* Kontaktadresse */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("contactTitle")}
        </h2>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            <span className="font-bold text-foreground">{COMPANY.name}</span> (DBA {COMPANY.brand})<br />
            {t("companyInfo")}<br />
            {COMPANY.address.street}, {COMPANY.address.city}, {COMPANY.address.state} {COMPANY.address.zip}, {COMPANY.address.country}
          </p>
          <p>
            {t("managingDirector")}<br />
            EIN (Tax ID): {COMPANY.ein}
          </p>
          <p>
            {t("phone")}: <a href={`tel:${COMPANY.contact.phone}`} className="text-primary hover:underline">{COMPANY.contact.phone}</a><br />
            {t("email")}: <a href={`mailto:${COMPANY.contact.legal}`} className="text-primary hover:underline">{COMPANY.contact.legal}</a>
          </p>
          <p>
            {t("vatExempt")}
          </p>
          <p>
            {t("odrPlatform")}{" "}
            <a href={COMPANY.web.odr} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {COMPANY.web.odr}
            </a>
            . {t("odrDisclaimer")}
          </p>
        </div>
      </section>

      {/* Haftungsausschluss */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("disclaimerTitle")}
        </h2>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>{t("disclaimerP1")}</p>
          <p>{t("disclaimerP2")}</p>
          <p>{t("disclaimerP3")}</p>
        </div>
      </section>

      {/* Haftung für Links */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("linksTitle")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("linksP1")}
        </p>
      </section>

      {/* Urheberrechte */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("copyrightTitle")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("copyrightP1")}
        </p>
      </section>

      {/* Datenschutz */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("privacyTitle")}
        </h2>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>{t("privacyP1")}</p>
          <p>
            {t("privacyP2")}{" "}
            <Link href="/datenschutz" className="text-primary hover:underline">
              {t("privacyLink")}
            </Link>.
          </p>
        </div>
      </section>

      <footer className="border-t border-border pt-6">
        <p className="font-mono text-[10px] text-muted-foreground">
          {t("lastUpdated")}
        </p>
      </footer>
    </article>
  )
}
