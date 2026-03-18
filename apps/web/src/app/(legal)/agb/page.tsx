import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen",
  description: "AGB von LogistikApp — SaaS-Inventarverwaltung für Schweizer KMU.",
}

export default function AGBPage() {
  return (
    <article className="space-y-12">
      {/* Header */}
      <header className="border-b border-border pb-8">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          Rechtliches · AGB
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-4">
          Allgemeine Geschäftsbedingungen
        </h1>
        <p className="font-mono text-xs text-muted-foreground">
          Stand: März 2026 · BrainBytes GmbH, Zürich · Anwendbar auf alle LogistikApp-Abonnements
        </p>
      </header>

      {/* 1. Geltungsbereich */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          1. Geltungsbereich
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Diese Allgemeinen Geschäftsbedingungen (nachfolgend «AGB») regeln das Vertragsverhältnis zwischen
          der BrainBytes GmbH (nachfolgend «Anbieter») und dem Kunden (nachfolgend «Kunde») bezüglich der
          Nutzung der SaaS-Plattform LogistikApp unter <a href="https://logistikapp.ch" className="text-primary hover:underline">logistikapp.ch</a> und
          der zugehörigen mobilen Applikation.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Abweichende Bedingungen des Kunden gelten nur, wenn der Anbieter diesen ausdrücklich und schriftlich
          zugestimmt hat. Mit der Registrierung oder Nutzung des Dienstes akzeptiert der Kunde diese AGB.
        </p>
      </section>

      {/* 2. Leistungsbeschreibung */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          2. Leistungsbeschreibung
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          LogistikApp ist eine cloudbasierte Software-as-a-Service-Lösung für die Inventar- und
          Werkzeugverwaltung von kleinen und mittleren Unternehmen (KMU). Der Dienst umfasst:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Verwaltung von Materialien, Werkzeugen, Fahrzeugbeständen und Schlüsseln</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Standort- und Buchungsverwaltung für mehrere Lagerorte</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Buchungshistorie und Rückverfolgung</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Bestellwesen und Lieferantenverwaltung</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Mobile App für iOS und Android (je nach Abonnement)</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Integrationen mit Drittanbieter-Systemen (je nach Abonnement)</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der Anbieter behält sich vor, den Funktionsumfang weiterzuentwickeln und anzupassen. Wesentliche
          Einschränkungen bestehender Funktionen werden dem Kunden mit einer Frist von 30 Tagen mitgeteilt.
        </p>
      </section>

      {/* 3. Vertragsabschluss */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          3. Vertragsabschluss und Registrierung
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der Vertrag kommt zustande, wenn der Kunde ein Konto erstellt und diese AGB akzeptiert.
          Mit der Registrierung versichert der Kunde, dass er:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Volljährig und geschäftsfähig ist oder im Namen einer juristischen Person handelt</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Korrekte und vollständige Angaben macht</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Zugangsdaten vertraulich behandelt und nicht an Dritte weitergibt</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der Anbieter kann die Registrierung ohne Angabe von Gründen ablehnen oder ein bestehendes Konto
          sperren, wenn ein begründeter Verdacht auf missbräuchliche Nutzung besteht.
        </p>
      </section>

      {/* 4. Abonnement und Preise */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          4. Abonnement und Preise
        </h2>

        <div>
          <h3 className="text-sm font-semibold mb-2">4.1 Abonnementmodell</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            LogistikApp wird als monatliches oder jährliches Abonnement angeboten. Die aktuellen Preise
            sind auf der Webseite unter <a href="https://logistikapp.ch/#pricing" className="text-primary hover:underline">logistikapp.ch/#pricing</a> einsehbar.
            Alle Preise sind in CHF und exklusive Mehrwertsteuer angegeben.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">4.2 Testphase</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Neukunden erhalten eine kostenlose Testphase von 14 Tagen. Für die Testphase ist keine
            Kreditkarte erforderlich. Nach Ablauf der Testphase wechselt das Konto automatisch in
            den kostenlosen Starter-Plan oder wird deaktiviert, sofern kein kostenpflichtiges
            Abonnement gewählt wurde.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">4.3 Zahlung</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Die Abonnementgebühr wird monatlich oder jährlich im Voraus per Kreditkarte (via Stripe)
            in Rechnung gestellt. Bei Zahlungsverzug behält sich der Anbieter vor, den Zugang nach
            einer Frist von 7 Tagen zu sperren.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">4.4 Preisanpassungen</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Der Anbieter kann Preise mit einer Ankündigungsfrist von <strong className="text-foreground">30 Tagen</strong> anpassen.
            Preisanpassungen werden dem Kunden per E-Mail mitgeteilt. Der Kunde kann den Vertrag
            innerhalb der Ankündigungsfrist ohne Mehrkosten kündigen.
          </p>
        </div>
      </section>

      {/* 5. Pflichten des Kunden */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          5. Pflichten und Verantwortung des Kunden
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der Kunde verpflichtet sich:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Den Dienst nur für rechtmässige Zwecke zu nutzen</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Keine Schadsoftware, Viren oder schädlichen Code einzuschleusen</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Die Zugangsdaten sicher aufzubewahren und nicht weiterzugeben</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Den Anbieter unverzüglich zu informieren, wenn Zugangsdaten kompromittiert wurden</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Die Nutzungsrechte der eingeladenen Benutzer zu verwalten und zu kontrollieren</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Sicherzustellen, dass eingeladene Benutzer diese AGB einhalten</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Für alle Handlungen von Benutzern, die unter dem Konto des Kunden agieren, übernimmt der
          Kunde die vollständige Verantwortung.
        </p>
      </section>

      {/* 6. Dateneigentum */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          6. Dateneigentum und Datenverarbeitung
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Alle vom Kunden in LogistikApp eingegebenen Daten (Inventardaten, Buchungshistorien,
          Organisationsdaten) bleiben zu 100 % Eigentum des Kunden. Der Anbieter verarbeitet
          diese Daten ausschliesslich zur Erbringung der vertraglich vereinbarten Leistungen.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der Kunde gewährt dem Anbieter das notwendige Recht zur technischen Verarbeitung
          (Speicherung, Backup, Übertragung) zum Betrieb des Dienstes.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der Anbieter handelt als Auftragsverarbeiter im Sinne von Art. 9 nDSG. Auf Anfrage
          wird ein separater Auftragsverarbeitungsvertrag (AVV) zur Verfügung gestellt.
        </p>
      </section>

      {/* 7. Verfügbarkeit */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          7. Verfügbarkeit und Wartung
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der Anbieter strebt eine hohe Verfügbarkeit des Dienstes an. Es gelten folgende Bedingungen:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">Starter-Plan</strong>: Best-Effort-Verfügbarkeit, kein SLA</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">Professional-Plan</strong>: Angestrebte Verfügbarkeit von 99,5 % monatlich</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">Enterprise-Plan</strong>: Verfügbarkeits-SLA gemäss separater Vereinbarung</span>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Geplante Wartungsarbeiten werden im Voraus angekündigt. Notfallwartungen können ohne
          Vorankündigung durchgeführt werden. Ausfälle ausserhalb der Kontrolle des Anbieters
          (Force Majeure) begründen keinen Anspruch auf Rückerstattung.
        </p>
      </section>

      {/* 8. Haftung */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          8. Haftungsbeschränkung
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der Anbieter haftet für Schäden, die durch grobe Fahrlässigkeit oder Vorsatz verursacht wurden.
          Für leichte Fahrlässigkeit haftet der Anbieter nur bei Verletzung wesentlicher Vertragspflichten.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Die Haftung des Anbieters ist in jedem Fall auf die vom Kunden in den letzten 12 Monaten
          bezahlten Abonnementgebühren beschränkt. Eine Haftung für entgangenen Gewinn, mittelbare
          Schäden oder Folgeschäden ist ausgeschlossen, soweit gesetzlich zulässig.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der Anbieter übernimmt keine Haftung für den Inhalt der vom Kunden erfassten Daten sowie
          für Schäden durch Fehlbedienung oder unberechtigten Zugriff durch Dritte, sofern der Anbieter
          die erforderlichen Sicherheitsmassnahmen getroffen hat.
        </p>
      </section>

      {/* 9. Kündigung */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          9. Laufzeit und Kündigung
        </h2>

        <div>
          <h3 className="text-sm font-semibold mb-2">9.1 Ordentliche Kündigung</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Monatliche Abonnements können jederzeit zum Ende des laufenden Abrechnungszeitraums
            gekündigt werden. Jährliche Abonnements können mit einer Frist von 30 Tagen vor
            Ablauf des Vertragsjahres gekündigt werden. Die Kündigung erfolgt über die
            Kontoeinstellungen oder per E-Mail an <a href="mailto:info@logistikapp.ch" className="text-primary hover:underline">info@logistikapp.ch</a>.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">9.2 Ausserordentliche Kündigung</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Beide Parteien können den Vertrag aus wichtigem Grund fristlos kündigen. Wichtige Gründe
            seitens des Anbieters umfassen insbesondere wiederholten Zahlungsverzug, schwerwiegende
            Verstösse gegen diese AGB oder missbräuchliche Nutzung des Dienstes.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">9.3 Datenlöschung nach Kündigung</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nach Kündigung hat der Kunde 30 Tage Zeit, seine Daten zu exportieren. Danach werden
            alle Kundendaten unwiderruflich gelöscht, mit Ausnahme von Daten, die gesetzlichen
            Aufbewahrungspflichten unterliegen.
          </p>
        </div>
      </section>

      {/* 10. Geistiges Eigentum */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          10. Geistiges Eigentum
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          LogistikApp und alle zugehörigen Marken, Logos, Software, Quellcodes und Inhalte sind
          ausschliessliches Eigentum der BrainBytes GmbH und urheberrechtlich geschützt.
          Das Abonnement gewährt dem Kunden ein nicht-exklusives, nicht-übertragbares Nutzungsrecht
          für die Dauer des Abonnements. Reverse Engineering, Dekompilierung oder Versuche, den
          Quellcode abzuleiten, sind untersagt.
        </p>
      </section>

      {/* 11. Änderungen der AGB */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          11. Änderungen der AGB
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Der Anbieter kann diese AGB mit einer Ankündigungsfrist von <strong className="text-foreground">30 Tagen</strong> anpassen.
          Kunden werden per E-Mail informiert. Widerspricht der Kunde nicht innerhalb der Frist,
          gelten die neuen AGB als akzeptiert. Im Falle des Widerspruchs können beide Parteien
          den Vertrag kündigen.
        </p>
      </section>

      {/* 12. Anwendbares Recht */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          12. Anwendbares Recht und Gerichtsstand
        </h2>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 text-sm space-y-2">
          <p className="text-foreground font-medium">Diese AGB unterliegen ausschliesslich Schweizer Recht.</p>
          <p className="text-muted-foreground">
            Für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist der Gerichtsstand
            <strong className="text-foreground"> Zürich, Schweiz</strong> vereinbart, unter Ausschluss
            anderer Gerichtsstände.
          </p>
          <p className="text-muted-foreground">
            Die Anwendung des UN-Kaufrechts (CISG) ist ausdrücklich ausgeschlossen.
          </p>
        </div>
      </section>

      {/* 13. Schlussbestimmungen */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          13. Schlussbestimmungen
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sollten einzelne Bestimmungen dieser AGB ungültig oder nicht durchsetzbar sein, bleiben
          die übrigen Bestimmungen in Kraft. Die ungültige Bestimmung wird durch eine wirksame Regelung
          ersetzt, die dem wirtschaftlichen Zweck der ursprünglichen Bestimmung am nächsten kommt.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Für Fragen zu diesen AGB wenden Sie sich an:{" "}
          <a href="mailto:info@logistikapp.ch" className="text-primary hover:underline">info@logistikapp.ch</a>
        </p>
      </section>
    </article>
  )
}
