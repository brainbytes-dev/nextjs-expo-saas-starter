import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: (
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img src="/zentory-logo.svg" alt="Zentory" width="24" height="24" style={{ objectFit: 'contain' }} />
      <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
        <span style={{ fontWeight: 700 }}>ZEN</span><span style={{ fontWeight: 400 }}>TORY</span>
      </span>
      <span style={{ fontWeight: 400, color: '#6b7280', fontSize: '0.85em' }}>Docs</span>
    </span>
  ),
  project: { link: '' },
  docsRepositoryBase: '',
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Zentory Dokumentation" />
      <meta property="og:description" content="Handbuch für Zentory — Inventar- und Werkzeugverwaltung für Schweizer KMU" />
      <link rel="icon" href="/favicon.ico" />
    </>
  ),
  footer: { content: <span>© {new Date().getFullYear()} Zentory</span> },
  sidebar: { defaultMenuCollapseLevel: 1, toggleButton: true },
  toc: { title: 'Auf dieser Seite' },
  editLink: { component: () => null },
  feedback: { content: null },
  search: { placeholder: 'Dokumentation durchsuchen...' },
  navigation: { prev: true, next: true },
  color: { hue: 163, saturation: 51 },
}

export default config
