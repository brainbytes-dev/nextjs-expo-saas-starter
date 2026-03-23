import type { Metadata } from "next"
import Link from "next/link"

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
          Rechtliches · Impressum
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-4">Impressum</h1>
      </header>

      {/* Kontaktadresse */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Kontaktadresse
        </h2>
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-sm space-y-3 leading-relaxed">
          <p className="font-bold text-foreground text-base">
            HR Online Consulting LLC (DBA Zentory)
          </p>
          <p className="text-muted-foreground">
            Incorporated under the laws of the Catawba Indian Nation of the Carolinas,<br />
            Catawba Digital Economic Zone<br />
            550 Kings Mountain<br />
            Kings Mountain, NC 28086, USA
          </p>
          <p className="text-muted-foreground">
            Geschäftsführer: Henrik Rühe, Managing Member
          </p>
          <p className="text-muted-foreground">
            EIN (Tax ID): 61-2199060
          </p>
          <div className="pt-2 space-y-1 text-muted-foreground">
            <p>Telefonnummer: +41 (0)76 123456</p>
            <p>E-Mail Adresse: <a href="mailto:legal@zentory.ch" className="text-primary hover:underline">legal@zentory.ch</a></p>
          </div>
          <p className="text-muted-foreground pt-2 text-xs">
            Mehrwertsteuerbefreit gemäss Art. 10 Abs. 2a Bundesgesetz über die Mehrwertsteuer (MWSTG) vom 12. Juni 2009
          </p>
          <p className="text-muted-foreground text-xs">
            Online-Plattform der Europäischen Kommission zur Streitbeilegung (OS) für Verbraucher:{" "}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              https://ec.europa.eu/consumers/odr/
            </a>
            . Wir sind nicht bereit und nicht verpflichtet, an einem Streitschlichtungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </div>
      </section>

      {/* Haftungsausschluss */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Haftungsausschluss
        </h2>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Der Autor behält sich das Recht vor, keine Verantwortung für die Richtigkeit, Genauigkeit,
            Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen zu übernehmen.
          </p>
          <p>
            Haftungsansprüche gegen den Autor wegen Schäden materieller oder immaterieller Art, welche
            aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten Informationen,
            durch Missbrauch der Verbindung oder durch technische Störungen entstanden sind, werden ausgeschlossen.
          </p>
          <p>
            Alle Angebote sind freibleibend und unverbindlich. Der Autor behält es sich ausdrücklich vor,
            Teile der Seiten oder das gesamte Angebot ohne gesonderte Ankündigung zu verändern, zu ergänzen,
            zu löschen oder die Veröffentlichung zeitweise oder endgültig einzustellen.
          </p>
        </div>
      </section>

      {/* Haftung für Links */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Haftung für Links
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Verweise und Links auf Webseiten Dritter liegen ausserhalb unseres Verantwortungsbereiches.
          Jegliche Verantwortung für solche Websites wird abgelehnt. Der Zugang und die Benutzung
          solcher Websites erfolgt auf eigenes Risiko des Benutzers.
        </p>
      </section>

      {/* Urheberrechte */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Urheberrechte
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Das Urheberrecht und alle anderen Rechte an Inhalten, Bildern, Fotos oder anderen Dateien
          auf der Website gehören ausschliesslich HR Online Consulting LLC (DBA Zentory) oder den
          speziell genannten Rechteinhabern. Für die Reproduktion jeglicher Elemente muss im Voraus
          die schriftliche Zustimmung der Urheberrechtsinhaber eingeholt werden.
        </p>
      </section>

      {/* Datenschutz */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          Datenschutz
        </h2>
        <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Gestützt auf Artikel 13 der Schweizerischen Bundesverfassung und die Datenschutzbestimmungen
            des Bundes (Datenschutzgesetz, DSG) hat jede Person Anspruch auf den Schutz ihrer Privatsphäre
            und auf Schutz vor Missbrauch ihrer persönlichen Daten. Wir halten uns an diese Bestimmungen.
            Persönliche Daten werden streng vertraulich behandelt und nicht verkauft oder an Dritte weitergegeben.
          </p>
          <p>
            In enger Zusammenarbeit mit unseren Hosting-Providern sind wir bestrebt, die Datenbanken so weit
            wie möglich vor unberechtigtem Zugriff, Verlust, Missbrauch oder Fälschung zu schützen. Weitere
            Informationen zum Datenschutz entnehmen Sie bitte unserer{" "}
            <Link href="/datenschutz" className="text-primary hover:underline">
              Datenschutzerklärung
            </Link>.
          </p>
        </div>
      </section>

      <footer className="border-t border-border pt-6">
        <p className="font-mono text-[10px] text-muted-foreground">
          Stand: März 2026
        </p>
      </footer>
    </article>
  )
}
