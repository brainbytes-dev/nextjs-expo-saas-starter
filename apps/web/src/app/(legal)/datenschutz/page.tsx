import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

/** Renders one provider entry in the original datenschutz-generator.de inline style:
 *  Name: Service; Dienstanbieter: …; Rechtsgrundlagen: …; Website: link; Datenschutzerklärung: link[. Grundlage Drittlandtransfers: …]
 */
function ProviderEntry({
  name,
  service,
  provider,
  legal,
  website,
  privacyUrl,
  dpf,
  sccUrl,
}: {
  name: string
  service: string
  provider: string
  legal: string
  website: string
  privacyUrl: string
  dpf?: boolean
  sccUrl?: string
}) {
  return (
    <li className="text-sm text-muted-foreground leading-relaxed">
      <strong className="text-foreground">{name}: </strong>
      {service};{" "}
      <strong className="text-foreground">Dienstanbieter:</strong> {provider};{" "}
      <strong className="text-foreground">Rechtsgrundlagen:</strong> {legal};{" "}
      <strong className="text-foreground">Website:</strong>{" "}
      <a href={website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{website}</a>;{" "}
      <strong className="text-foreground">Datenschutzerklärung:</strong>{" "}
      <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{privacyUrl}</a>.
      {(dpf || sccUrl) && (
        <>
          {" "}<strong className="text-foreground">Grundlage Drittlandtransfers:</strong>{" "}
          {dpf && "Data Privacy Framework (DPF)"}
          {dpf && sccUrl && ", "}
          {sccUrl && (
            <a href={sccUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Standardvertragsklauseln</a>
          )}
          .
        </>
      )}
    </li>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("datenschutz")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: false },
  }
}

export default async function DatenschutzPage() {
  const t = await getTranslations("datenschutz")

  return (
    <article className="space-y-12">
      {/* Header */}
      <header className="border-b border-border pb-8">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          {t("breadcrumb")}
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-4">{t("title")}</h1>
        <p className="font-mono text-xs text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      {/* Inhaltsübersicht */}
      <nav className="rounded-lg border border-border bg-muted/30 p-5 space-y-2">
        <h2 className="text-sm font-semibold text-foreground mb-3">{t("tocTitle")}</h2>
        <ol className="space-y-1 text-sm text-muted-foreground list-none columns-1 sm:columns-2">
          {([
            ["m716", t("s0Title")],
            ["m3", t("s1Title")],
            ["mOverview", t("s2Title")],
            ["m2427", t("s3Title")],
            ["m27", t("s4Title")],
            ["m25", t("s5Title")],
            ["m24", t("s6Title")],
            ["m12", t("s7Title")],
            ["m10", t("s8Title")],
            ["m317", t("s9Title")],
            ["m326", t("s10Title")],
            ["m225", t("s11Title")],
            ["m134", t("s12Title")],
            ["m367", t("s13Title")],
            ["m451", t("s14Title")],
            ["m104", t("s15Title")],
            ["m182", t("s16Title")],
            ["m17", t("s17Title")],
            ["m638", t("s18Title")],
            ["m408", t("s19Title")],
            ["m263", t("s20Title")],
            ["m264", t("s21Title")],
            ["m627", t("s22Title")],
            ["m299", t("s23Title")],
            ["m136", t("s24Title")],
            ["m328", t("s25Title")],
            ["m723", t("s26Title")],
            ["m15", t("s27Title")],
            ["m42", t("s28Title")],
          ] as [string, string][]).map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-primary hover:underline text-sm leading-relaxed">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Präambel */}
      <section id="m716" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s0Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s0P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s0P2")}
        </p>
      </section>

      {/* 1. Verantwortlicher */}
      <section id="m3" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s1Title")}
        </h2>
        <div className="rounded-lg border border-border bg-muted/30 p-5 font-mono text-sm space-y-1">
          <div className="font-bold text-foreground">HR Online Consulting LLC (DBA Zentory)</div>
          <div className="text-muted-foreground">Zürich, Schweiz</div>
          <div className="text-muted-foreground">E-Mail: <a href="mailto:datenschutz@zentory.ch" className="text-primary hover:underline">datenschutz@zentory.ch</a></div>
          <div className="text-muted-foreground">Web: <a href="https://zentory.ch" className="text-primary hover:underline">zentory.ch</a></div>
        </div>
      </section>

      {/* 2. Übersicht der Verarbeitungen */}
      <section id="mOverview" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s2Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s2P1")}
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("s2_1Title")}</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed list-none">
              {(["s2_1Item1","s2_1Item2","s2_1Item3","s2_1Item4","s2_1Item5","s2_1Item6","s2_1Item7","s2_1Item8","s2_1Item9","s2_1Item10"] as const).map((k) => (
                <li key={k} className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t(k)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("s2_2Title")}</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed list-none">
              {(["s2_2Item1","s2_2Item2","s2_2Item3","s2_2Item4","s2_2Item5","s2_2Item6"] as const).map((k) => (
                <li key={k} className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t(k)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("s2_3Title")}</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed list-none">
              {(["s2_3Item1","s2_3Item2","s2_3Item3","s2_3Item4","s2_3Item5","s2_3Item6","s2_3Item7","s2_3Item8","s2_3Item9","s2_3Item10","s2_3Item11","s2_3Item12","s2_3Item13","s2_3Item14","s2_3Item15","s2_3Item16","s2_3Item17","s2_3Item18","s2_3Item19","s2_3Item20","s2_3Item21"] as const).map((k) => (
                <li key={k} className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t(k)}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 3. Maßgebliche Rechtsgrundlagen */}
      <section id="m2427" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s3Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s3P1")}
        </p>
      </section>

      {/* 4. Sicherheitsmaßnahmen */}
      <section id="m27" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s4Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s4P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s4P2")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s4P3")}
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s4Item1Bold")}</strong> {t("s4Item1Text")}</span></li>
        </ul>
      </section>

      {/* 5. Übermittlung von personenbezogenen Daten */}
      <section id="m25" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s5Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s5P1")}
        </p>
      </section>

      {/* 6. Internationale Datentransfers */}
      <section id="m24" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s6Title")}
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("s6_1Title")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("s6_1P1")}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("s6_2Title")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("s6_2P1")}</p>
          </div>
        </div>
      </section>

      {/* 7. Allgemeine Informationen zur Datenspeicherung und Löschung */}
      <section id="m12" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s7Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s7P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s7P2")}
        </p>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("s7_1Title")}</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s7_1Item1")}</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s7_1Item2")}</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s7_1Item3")}</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("s7_2Title")}</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s7_2Item1")}</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s7_2Item2")}</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> {t("s7_2Item3")}</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("s7P3")}</p>
        </div>
      </section>

      {/* 8. Rechte der betroffenen Personen */}
      <section id="m10" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s8Title")}
        </h2>
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("s8_1Title")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_1Item1Bold")}</strong>: {t("s8_1Item1Text")}</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_1Item2Bold")}</strong>: {t("s8_1Item2Text")}</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_1Item3Bold")}</strong>: {t("s8_1Item3Text")}</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_1Item4Bold")}</strong>: {t("s8_1Item4Text")}</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_1Item5Bold")}</strong>: {t("s8_1Item5Text")}</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_1Item6Bold")}</strong>: {t("s8_1Item6Text")}</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_1Item7Bold")}</strong>: {t("s8_1Item7Text")}</span></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("s8_2Title")}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_2Item1Bold")}</strong>: {t("s8_2Item1Text")}</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_2Item2Bold")}</strong>: {t("s8_2Item2Text")}</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_2Item3Bold")}</strong>: {t("s8_2Item3Text")}</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s8_2Item4Bold")}</strong>: {t("s8_2Item4Text")}</span></li>
            </ul>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
            <p className="text-foreground font-medium mb-1">{t("s8RequestTitle")}</p>
            <p className="text-muted-foreground">
              {t("s8RequestP1")}{" "}
              <a href="mailto:datenschutz@zentory.ch" className="text-primary hover:underline font-medium">
                datenschutz@zentory.ch
              </a>
              {t("s8RequestP2")}
            </p>
          </div>
        </div>
      </section>

      {/* 9. Geschäftliche Leistungen */}
      <section id="m317" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s9Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s9P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s9P2")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s9P3")}
        </p>
      </section>

      {/* 10. Zahlungsverfahren */}
      <section id="m326" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s10Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s10P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s10P2")}
        </p>
        <ul className="space-y-3 list-none">
          <ProviderEntry
            name="Stripe"
            service={t("s10StripeDesc")}
            provider="Stripe, Inc., 510 Townsend Street, San Francisco, CA 94103, USA"
            legal="Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 S. 1 lit. b) DSG/DSGVO)"
            website="https://stripe.com"
            privacyUrl="https://stripe.com/de/privacy"
            dpf
          />
          <ProviderEntry
            name="Apple Pay"
            service={t("s10ApplePayDesc")}
            provider="Apple Inc., One Apple Park Way, Cupertino, CA 95014, USA"
            legal="Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 S. 1 lit. b) DSG/DSGVO)"
            website="https://www.apple.com/apple-pay/"
            privacyUrl="https://www.apple.com/legal/privacy/de-ww/"
          />
          <ProviderEntry
            name="Google Pay"
            service={t("s10GooglePayDesc")}
            provider="Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland"
            legal="Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 S. 1 lit. b) DSG/DSGVO)"
            website="https://pay.google.com/intl/de_de/about/"
            privacyUrl="https://policies.google.com/privacy"
            dpf
          />
        </ul>
      </section>

      {/* 11. Bereitstellung des Onlineangebots und Webhosting */}
      <section id="m225" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s11Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s11P1")}
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s11Item1Bold")}</strong>: {t("s11Item1Text")}</span></li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s11Item2Bold")}</strong>: {t("s11Item2Text")}</span></li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s11Item3Bold")}</strong>: {t("s11Item3Text")}</span></li>
        </ul>
        <ul className="space-y-3 list-none">
          <ProviderEntry
            name="Vercel"
            service={t("s11VercelDesc")}
            provider="Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://vercel.com"
            privacyUrl="https://vercel.com/legal/privacy-policy"
            dpf
          />
        </ul>
      </section>

      {/* 12. Einsatz von Cookies */}
      <section id="m134" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s12Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s12P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s12P2")}
        </p>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">{t("s12StorageTitle")}</strong>
            <ul className="mt-2 space-y-1.5 list-none">
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s12TempCookieBold")}</strong>: {t("s12TempCookieText")}</span></li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <span><strong className="text-foreground">{t("s12PermCookieBold")}</strong>: {t("s12PermCookieText")}</span></li>
            </ul>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s12P3")}
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">{t("s12Session")}</strong>: {t("s12SessionDesc")}</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">{t("s12PostHog")}</strong>: {t("s12PostHogDesc")}</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">{t("s12Theme")}</strong>: {t("s12ThemeDesc")}</span>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s12P4")} <strong className="text-foreground">{t("s12P4No")}</strong> {t("s12P4End")}
        </p>
      </section>

      {/* 13. Registrierung, Anmeldung und Nutzerkonto */}
      <section id="m367" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s13Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s13P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s13P2")}
        </p>
      </section>

      {/* 14. Single-Sign-On-Anmeldung */}
      <section id="m451" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s14Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s14P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s14P2")}
        </p>
        <ul className="space-y-3 list-none">
          <ProviderEntry
            name="Apple Sign-In"
            service={t("s14AppleDesc")}
            provider="Apple Inc., One Apple Park Way, Cupertino, CA 95014, USA"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://www.apple.com/de/"
            privacyUrl="https://www.apple.com/legal/privacy/de-ww/"
          />
          <ProviderEntry
            name="Google Sign-In"
            service={t("s14GoogleDesc")}
            provider="Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://www.google.de"
            privacyUrl="https://policies.google.com/privacy"
            dpf
          />
          <ProviderEntry
            name="Microsoft Sign-In"
            service={t("s14MicrosoftDesc")}
            provider="Microsoft Ireland Operations Limited, One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, D18 P521, Irland"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://www.microsoft.com/de-de"
            privacyUrl="https://privacy.microsoft.com/de-de/privacystatement"
            dpf
          />
        </ul>
      </section>

      {/* 15. Blogs und Publikationsmedien */}
      <section id="m104" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s15Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s15P1")}
        </p>
      </section>

      {/* 16. Kontakt- und Anfrageverwaltung */}
      <section id="m182" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s16Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s16P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s16P2")}
        </p>
      </section>

      {/* 17. Newsletter und elektronische Benachrichtigungen */}
      <section id="m17" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s17Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s17P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s17P2")}
        </p>
        <ul className="space-y-3 list-none">
          <ProviderEntry
            name="Resend"
            service={t("s17ResendDesc")}
            provider="Resend Inc., 2261 Market Street #5039, San Francisco, CA 94114, USA"
            legal="Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 S. 1 lit. b) DSG/DSGVO), Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://resend.com"
            privacyUrl="https://resend.com/legal/privacy-policy"
            dpf
          />
        </ul>
      </section>

      {/* 18. Werbliche Kommunikation */}
      <section id="m638" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s18Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s18P1")}
        </p>
      </section>

      {/* 19. Umfragen und Befragungen */}
      <section id="m408" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s19Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s19P1")}
        </p>
      </section>

      {/* 20. Webanalyse, Monitoring und Optimierung */}
      <section id="m263" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s20Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s20P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s20P2")}
        </p>
        <ul className="space-y-3 list-none">
          <ProviderEntry
            name="PostHog"
            service={t("s20PostHogDesc")}
            provider="PostHog Inc., 2261 Market Street #5039, San Francisco, CA 94114, USA"
            legal="Einwilligung (Art. 6 Abs. 1 S. 1 lit. a) DSG/DSGVO)"
            website="https://posthog.com"
            privacyUrl="https://posthog.com/privacy"
            dpf
          />
          <ProviderEntry
            name="Sentry"
            service={t("s20SentryDesc")}
            provider="Functional Software, Inc. dba Sentry, 45 Fremont Street, 8th Floor, San Francisco, CA 94105, USA"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://sentry.io"
            privacyUrl="https://sentry.io/privacy/"
            dpf
          />
        </ul>
      </section>

      {/* 21. Onlinemarketing */}
      <section id="m264" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s21Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s21P1")}
        </p>
      </section>

      {/* 22. Affiliate-Programm */}
      <section id="m627" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s22Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s22P1")}
        </p>
      </section>

      {/* 23. Kundenrezensionen */}
      <section id="m299" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s23Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s23P1")}
        </p>
      </section>

      {/* 24. Social Media */}
      <section id="m136" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s24Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s24P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s24P2")}
        </p>
        <ul className="space-y-3 list-none">
          <ProviderEntry
            name="LinkedIn"
            service={t("s24LinkedInDesc")}
            provider="LinkedIn Ireland Unlimited Company, Wilton Plaza, Dublin 2, Irland"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://www.linkedin.com"
            privacyUrl="https://www.linkedin.com/legal/privacy-policy"
            dpf
            sccUrl="https://legal.linkedin.com/dpa"
          />
          <ProviderEntry
            name="X (Twitter)"
            service={t("s24XDesc")}
            provider="X Internet Unlimited Company, One Cumberland Place, Fenian Street, Dublin 2 D02 AX07, Irland"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://x.com"
            privacyUrl="https://x.com/de/privacy"
          />
          <ProviderEntry
            name="Instagram"
            service={t("s24InstagramDesc")}
            provider="Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irland"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://www.instagram.com"
            privacyUrl="https://privacycenter.instagram.com/policy/"
            dpf
          />
          <ProviderEntry
            name="Facebook"
            service={t("s24FacebookDesc")}
            provider="Meta Platforms Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irland"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://www.facebook.com"
            privacyUrl="https://www.facebook.com/privacy/policy/"
            dpf
            sccUrl="https://www.facebook.com/legal/EU_data_transfer_addendum"
          />
          <ProviderEntry
            name="YouTube"
            service={t("s24YouTubeDesc")}
            provider="Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://www.youtube.com"
            privacyUrl="https://policies.google.com/privacy"
            dpf
          />
        </ul>
      </section>

      {/* 25. Plug-ins und eingebettete Inhalte */}
      <section id="m328" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s25Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s25P1")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s25P2")}
        </p>
        <ul className="space-y-3 list-none">
          <ProviderEntry
            name="Google Fonts"
            service={t("s25GoogleFontsDesc")}
            provider="Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://fonts.google.com/"
            privacyUrl="https://policies.google.com/privacy"
            dpf
          />
        </ul>
      </section>

      {/* 26. Management, Organisation und Hilfswerkzeuge */}
      <section id="m723" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s26Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s26P1")}
        </p>
        <ul className="space-y-3 list-none">
          <ProviderEntry
            name="Inngest"
            service={t("s26InngestDesc")}
            provider="Inngest Inc., 340 S Lemon Ave #1824, Walnut, CA 91789, USA"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://www.inngest.com"
            privacyUrl="https://www.inngest.com/privacy"
          />
          <ProviderEntry
            name="Upstash (Redis)"
            service={t("s26UpstashDesc")}
            provider="Upstash, Inc., 201 Spear Street, Suite 1100, San Francisco, CA 94105, USA"
            legal="Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSG/DSGVO)"
            website="https://upstash.com"
            privacyUrl="https://upstash.com/static/trust/privacypolicy.pdf"
            dpf
          />
        </ul>
      </section>

      {/* 27. Änderung und Aktualisierung */}
      <section id="m15" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s27Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s27P1")}
        </p>
      </section>

      {/* 28. Begriffsdefinitionen */}
      <section id="m42" className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s28Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s28P1")}
        </p>
        <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed list-none">
          {(["Affiliate","Bestandsdaten","Inhaltsdaten","Kontaktdaten","Konversionsmessung","MetaDaten","Nutzungsdaten","Personenbezogen","Profile","Protokolldaten","Reichweitenmessung","Remarketing","Standortdaten","Tracking","Verantwortlicher","Verarbeitung","Vertragsdaten","Zahlungsdaten","Zielgruppe"] as const).map((k) => (
            <li key={k} className="flex gap-2">
              <span className="text-primary shrink-0 font-mono">—</span>
              <span><strong className="text-foreground">{t(`s28Term${k}Bold` as Parameters<typeof t>[0])}</strong>: {t(`s28Term${k}Text` as Parameters<typeof t>[0])}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Kontakt */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          {t("s29Title")}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("s29P1")}
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-5 font-mono text-sm space-y-1">
          <div className="font-bold text-foreground">{t("s29Privacy")}</div>
          <div className="text-muted-foreground">E-Mail: <a href="mailto:datenschutz@zentory.ch" className="text-primary hover:underline">datenschutz@zentory.ch</a></div>
          <div className="text-muted-foreground">{t("s29Authority")} <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">EDÖB (edoeb.admin.ch)</a></div>
        </div>
      </section>
      {/* Quelle */}
      <footer className="border-t border-border pt-6 text-center">
        <p className="text-xs text-muted-foreground">
          <a
            href="https://datenschutz-generator.de/"
            title="Rechtstext von Dr. Schwenke - für weitere Informationen bitte anklicken."
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="hover:underline"
          >
            Erstellt mit kostenlosem Datenschutz-Generator.de von Dr. Thomas Schwenke
          </a>
        </p>
      </footer>
    </article>
  )
}
