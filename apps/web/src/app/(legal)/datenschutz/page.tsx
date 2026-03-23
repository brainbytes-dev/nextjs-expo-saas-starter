import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Datenschutzerklärung von Zentory gemäss nDSG (Schweiz).",
}

export default function DatenschutzPage() {
  return (
    <article className="space-y-12">
      {/* Header */}
      <header className="border-b border-border pb-8">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
          Rechtliches · Datenschutz
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-4">Datenschutzerklärung</h1>
        <p className="font-mono text-xs text-muted-foreground">
          Stand: März 2026 · Gültig für zentory.ch und alle zugehörigen Dienste
        </p>
      </header>

      {/* 1. Verantwortliche Stelle */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          1. Verantwortliche Stelle
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Verantwortlich für die Bearbeitung Ihrer Personendaten im Sinne des schweizerischen
          Datenschutzgesetzes (nDSG) und der europäischen Datenschutz-Grundverordnung (DSGVO) ist:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-5 font-mono text-sm space-y-1">
          <div className="font-bold text-foreground">HR Online Consulting LLC (DBA Zentory)</div>
          <div className="text-muted-foreground">Zürich, Schweiz</div>
          <div className="text-muted-foreground">E-Mail: <a href="mailto:datenschutz@zentory.ch" className="text-primary hover:underline">datenschutz@zentory.ch</a></div>
          <div className="text-muted-foreground">Web: <a href="https://zentory.ch" className="text-primary hover:underline">zentory.ch</a></div>
        </div>
      </section>

      {/* 2. Erhobene Daten */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          2. Welche Daten wir erheben
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Wir erheben und bearbeiten folgende Kategorien von Personendaten:
        </p>

        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold mb-2">2.1 Kontodaten</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Vorname, Nachname</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> E-Mail-Adresse</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Gehashtes Passwort (nie im Klartext gespeichert)</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Benutzerrolle (Admin, Mitarbeiter)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">2.2 Organisationsdaten</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Firmenname, Branche</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Anzahl Mitarbeitende (für Lizenzierung)</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Rechnungsadresse</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">2.3 Inventardaten</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Artikel, Werkzeuge, Fahrzeugbestände (von Ihnen erfasst)</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Buchungshistorie, Standortzuweisungen</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Diese Daten gehören ausschliesslich Ihnen (siehe Abschnitt 9)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">2.4 Nutzungs- und technische Daten</h3>
            <ul className="space-y-1.5 text-sm text-muted-foreground leading-relaxed list-none">
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> IP-Adresse, Browser-Typ, Betriebssystem (anonymisiert)</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Aufgerufene Seiten und Zeitstempel (via PostHog)</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Fehlermeldungen und Performance-Daten (via Sentry)</li>
              <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Seitenaufrufe und Web Vitals (via Vercel Analytics)</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">2.5 Zahlungsdaten</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zahlungsinformationen (Kreditkarte, IBAN) werden <strong className="text-foreground">nicht</strong> auf unseren Servern gespeichert.
              Sie werden direkt und verschlüsselt an Stripe (Web) bzw. RevenueCat (Mobile App) übermittelt.
              Wir speichern lediglich die anonymisierte Transaktions-ID sowie den Abonnementstatus.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Rechtsgrundlagen */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          3. Rechtsgrundlagen der Bearbeitung
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Wir stützen die Bearbeitung Ihrer Personendaten auf folgende Rechtsgrundlagen:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Vertragserfüllung</strong>: Betrieb des Dienstes Zentory gemäss den AGB</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Berechtigte Interessen</strong>: Sicherheit, Missbrauchsverhinderung, Produktverbesserung</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Gesetzliche Pflicht</strong>: Buchführung und Steuerpflichten</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Einwilligung</strong>: Für Marketing-E-Mails (jederzeit widerrufbar)</li>
        </ul>
      </section>

      {/* 4. Drittanbieter */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          4. Eingesetzte Drittanbieter und Datenübermittlungen
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Wir setzen sorgfältig ausgewählte Drittanbieter ein, die alle mit Standardvertragsklauseln
          oder gleichwertigen Garantien abgesichert sind:
        </p>

        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground">Anbieter</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground">Zweck</th>
                <th className="px-4 py-3 text-left font-mono text-[10px] tracking-widest uppercase text-muted-foreground">Serverstandort</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                ["Vercel", "Hosting der Web-Anwendung", "USA / EU (Edge Network)"],
                ["Supabase", "Datenbank (PostgreSQL)", "EU Frankfurt (AWS)"],
                ["PostHog", "Produktanalyse (anonymisiert)", "EU Frankfurt"],
                ["Sentry", "Fehler-Monitoring", "USA (SCCs)"],
                ["Resend", "Transaktions-E-Mails", "USA (SCCs)"],
                ["Stripe", "Zahlungsabwicklung Web", "USA / EU (SCCs)"],
                ["RevenueCat", "In-App-Käufe Mobile", "USA (SCCs)"],
                ["Vercel Analytics", "Web-Vitals (cookiefrei)", "USA (anonymisiert)"],
              ].map(([anbieter, zweck, standort]) => (
                <tr key={anbieter} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{anbieter}</td>
                  <td className="px-4 py-3 text-muted-foreground">{zweck}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{standort}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">SCCs</strong> = EU-Standardvertragsklauseln (Standard Contractual Clauses).
          Wir verkaufen Ihre Daten <strong className="text-foreground">nicht</strong> an Dritte und nutzen sie
          nicht für Werbezwecke ausserhalb unseres Dienstes.
        </p>
      </section>

      {/* 5. Cookies */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          5. Cookies und ähnliche Technologien
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Zentory verwendet folgende Arten von Cookies:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">Session-Cookie</strong>: Notwendig für die Authentifizierung (HttpOnly, Secure, SameSite=Lax). Läuft nach 30 Tagen ab.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">PostHog-Cookie</strong>: Anonymisiertes Analyse-Tracking. Kann in den Einstellungen deaktiviert werden.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary shrink-0 font-mono">—</span>
            <span><strong className="text-foreground">Theme-Cookie</strong>: Speichert Ihre Hell/Dunkel-Präferenz (LocalStorage).</span>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Wir verwenden <strong className="text-foreground">keine</strong> Werbe-Cookies oder Cross-Site-Tracking.
          Vercel Analytics arbeitet cookiefrei und erfasst keine personenbezogenen Daten.
        </p>
      </section>

      {/* 6. Speicherdauer */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          6. Speicherdauer
        </h2>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Kontodaten</strong>: Für die Dauer des Vertragsverhältnisses plus 30 Tage nach Kündigung</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Inventardaten</strong>: Für die Dauer des Abonnements; nach Kündigung Export möglich, danach Löschung</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Zahlungsdaten</strong>: 10 Jahre gemäss Schweizer Buchführungsrecht (OR Art. 958f)</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Log-Daten</strong>: Maximal 90 Tage</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Analyse-Daten</strong>: 12 Monate (anonymisiert)</li>
        </ul>
      </section>

      {/* 7. Ihre Rechte */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          7. Ihre Rechte
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Gemäss nDSG und DSGVO haben Sie folgende Rechte bezüglich Ihrer Personendaten:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Auskunft</strong>: Welche Daten wir über Sie gespeichert haben</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Berichtigung</strong>: Korrektur unrichtiger Daten</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Löschung</strong>: Löschung Ihrer Daten (soweit keine gesetzliche Aufbewahrungspflicht besteht)</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Datenportabilität</strong>: Export Ihrer Daten im maschinenlesbaren Format (JSON/CSV)</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Widerspruch</strong>: Gegen die Bearbeitung auf Basis berechtigter Interessen</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> <strong className="text-foreground">Beschwerde</strong>: Bei der zuständigen Aufsichtsbehörde (EDÖB, edoeb.admin.ch)</li>
        </ul>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="text-foreground font-medium mb-1">Anfrage stellen</p>
          <p className="text-muted-foreground">
            Senden Sie Ihre Datenschutzanfrage an{" "}
            <a href="mailto:datenschutz@zentory.ch" className="text-primary hover:underline font-medium">
              datenschutz@zentory.ch
            </a>
            . Wir antworten innerhalb von 30 Tagen.
          </p>
        </div>
      </section>

      {/* 8. Datensicherheit */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          8. Datensicherheit
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Wir ergreifen angemessene technische und organisatorische Massnahmen zum Schutz Ihrer Daten:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-none">
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Verschlüsselung aller Datenübertragungen via TLS 1.3</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Verschlüsselung der Datenbank at rest (AES-256)</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Rollenbasierte Zugriffskontrolle (RBAC)</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Stündliche Datenbank-Backups mit 30-Tage-Aufbewahrung</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Automatisches Session-Timeout nach Inaktivität</li>
          <li className="flex gap-2"><span className="text-primary shrink-0 font-mono">—</span> Separate Mandantentrennung (keine Datenvermischung zwischen Organisationen)</li>
        </ul>
      </section>

      {/* 9. Dateneigentum */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          9. Dateneigentum
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Alle Inventardaten, die Sie in Zentory erfassen — Artikel, Werkzeuge, Fahrzeuge, Buchungshistorien —
          verbleiben zu 100 % in Ihrem Eigentum. HR Online Consulting LLC (DBA Zentory) nimmt keine Eigentumsrechte daran in Anspruch
          und nutzt diese Daten nicht für eigene Zwecke. Sie können Ihre Daten jederzeit exportieren und
          bei Kündigung innerhalb von 30 Tagen vollständig löschen lassen.
        </p>
      </section>

      {/* 10. Änderungen */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          10. Änderungen dieser Datenschutzerklärung
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen. Bei wesentlichen Änderungen
          informieren wir Sie per E-Mail mindestens 14 Tage vor Inkrafttreten. Das Datum der letzten Änderung
          ist oben auf dieser Seite vermerkt.
        </p>
      </section>

      {/* 11. Kontakt */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold border-b border-border pb-3">
          11. Kontakt
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Für alle Fragen zum Datenschutz wenden Sie sich bitte an:
        </p>
        <div className="rounded-lg border border-border bg-muted/30 p-5 font-mono text-sm space-y-1">
          <div className="font-bold text-foreground">HR Online Consulting LLC (DBA Zentory) — Datenschutz</div>
          <div className="text-muted-foreground">E-Mail: <a href="mailto:datenschutz@zentory.ch" className="text-primary hover:underline">datenschutz@zentory.ch</a></div>
          <div className="text-muted-foreground">Aufsichtsbehörde: <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">EDÖB (edoeb.admin.ch)</a></div>
        </div>
      </section>
    </article>
  )
}
