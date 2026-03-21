# LogistikApp — Brand Brief

## Produkt

**LogistikApp** ist eine Schweizer SaaS-Plattform für Inventar- und Lagerverwaltung, konzipiert für kleine und mittlere Unternehmen (KMU) im DACH-Raum. Die Plattform umfasst eine Web-App, eine Mobile App (iOS & Android) und eine umfangreiche Dokumentation.

## Zielgruppe

- Handwerksbetriebe (Elektriker, Sanitär, Bau)
- Rettungsdienste & Feuerwehr
- Arztpraxen & Spitäler
- Industriebetriebe & Lager
- Facility Management

**Typischer User**: Lagerverwalter, Polier, Werkstattleiter, 30-55 Jahre, technisch mittel-affin, arbeitet mit Tablet/Smartphone im Lager.

## Aktueller Stand

- **Name**: LogistikApp (Arbeitstitel — Rebrand erwünscht)
- **Domain**: logistikapp.ch (noch nicht aktiv)
- **Primärfarbe**: Orange `#F97316` (oklch-basiert in Tailwind CSS)
- **Akzentfarbe**: Cyan `#06b6d4`
- **Schriften**: Geist Sans + Geist Mono (Google Fonts)
- **Logo**: Einfaches Package-Icon (IconBuildingWarehouse) + "LogistikApp" Text
- **Dark Mode**: Vollständig implementiert (Light + Dark)

## Wettbewerber

| Tool | Preis | Stärke | Schwäche |
|------|-------|--------|----------|
| bexio | CHF 49-109 | CH Marktführer Buchhaltung | Keine Lagerverwaltung |
| PROFFIX | CHF 150+ | Desktop, etabliert | Veraltet, teuer |
| SAP B1 | CHF 500+/User | Enterprise | Zu komplex für KMU |
| Excel | Gratis | Bekannt | Kein Tracking, keine App |

## Unsere Positionierung

**"Zu gross für Excel, zu klein für SAP."**

LogistikApp schliesst die Lücke zwischen Excel-Tabellen und Enterprise-ERP-Systemen. Premium-Features zum KMU-Preis.

## Pricing

| Tier | Preis |
|------|-------|
| Starter | CHF 59/Mo (CHF 49 jährlich) |
| Professional | CHF 199/Mo (CHF 169 jährlich) |
| Enterprise | ab CHF 699/Mo |

## Feature-Highlights (für Marketing)

- **130+ Features** in Web + Mobile
- **Barcode Scanner** mit automatischer Produkterkennung (100M+ Produkte)
- **AI Copilot** — natürliche Sprache für Lageroperationen
- **8 Hardware-Integrationen** (Handscanner, Etikettendrucker, RFID, Waagen, NFC, Beacons, Watch, Keypads)
- **Kunden- & Lieferanten-Portal** (Token-basiert)
- **10 Sprachen** (DE, FR, IT, EN + 6 weitere vorbereitet)
- **Plugin Marketplace**
- **Echtzeit-Kollaboration**
- **Migration in 5 Minuten** (Excel, bexio, PROFFIX, SAP)
- **DSGVO-konform**, Serverstandort Zürich

## Technologie

- Web: Next.js 16 + shadcn/ui + Tailwind v4
- Mobile: Expo Router + NativewindUI
- Backend: Supabase PostgreSQL + Drizzle ORM
- Auth: Better-Auth + 2FA (TOTP)
- Payments: Stripe
- Docs: Nextra 3 (150+ Seiten)
- Tests: 159 (Vitest + Playwright)

## Brand-Anforderungen (für Agentur)

### Gesucht:
1. **Neuer Name** — kurz, einprägsam, international verständlich, .ch Domain verfügbar
2. **Logo** — modern, clean, sofort als "Lager/Inventar" erkennbar, funktioniert in 16px Favicon
3. **Farbpalette** — Primary + Accent + Semantic Colors (success/warning/error), Dark Mode kompatibel
4. **Typografie** — Display Font + Body Font, Web-tauglich (Google Fonts oder self-hosted)
5. **Icon-Style** — für Feature-Icons, Marketing, App Store
6. **Brand Guidelines** PDF

### Marke soll wirken:
- **Professionell** aber nicht corporate/langweilig
- **Schweizerisch** (Qualität, Präzision, Vertrauen) ohne Klischee
- **Modern** (SaaS, Cloud, Mobile-first)
- **Zugänglich** (nicht einschüchternd für Handwerker)

### Nicht:
- Keine generischen blauen Gradients
- Kein "AI-Slop" Look (kein Purple/Blue Standard)
- Nicht zu tech-lastig (kein Coding/Developer Vibe)

## Vorhandene Assets

- 19 Web-Screenshots (Light + Dark): `apps/web/screenshots/`
- 9 Mobile-Screenshots (iPhone): `docs/screenshots/app/`
- Favicon: 32x32 PNG
- App Store Listing Texte: `docs/app-store-listings.md`
- Social Media Kampagne: `docs/social-media-campaign.md`
- Landing Page live: Vercel (noch mit Arbeitstitel)

## Kontakt

BrainBytes GmbH — Schweiz
