/**
 * Central company configuration.
 * Change values here → all legal pages (Datenschutz, Impressum, AGB)
 * update automatically.
 */
export const COMPANY = {
  /** Legal entity name */
  name: "HR Online Consulting LLC",
  /** DBA / brand name */
  brand: "Zentory",
  /** Full display name used in legal docs */
  displayName: "HR Online Consulting LLC (DBA Zentory)",

  /** US registered address */
  address: {
    street: "550 Kings Mountain",
    city: "Kings Mountain",
    state: "NC",
    zip: "28086",
    country: "USA",
  },

  /** Tax / registration */
  ein: "61-2199060",

  contact: {
    email: "info@zentory.ch",
    legal: "legal@zentory.ch",
    privacy: "datenschutz@zentory.ch",
    support: "support@zentory.ch",
    phone: "+1 (828) 214-7447",
  },

  web: {
    domain: "zentory.ch",
    url: "https://zentory.ch",
    appUrl: "https://app.zentory.ch",
    odr: "https://ec.europa.eu/consumers/odr/",
  },

  /** Regulatory / legal */
  supervisoryAuthority: {
    name: "EDÖB",
    nameFull: "Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter",
    url: "https://www.edoeb.admin.ch",
  },

  /** Last updated date for legal docs — update when publishing new version */
  legalLastUpdated: "März 2026",
} as const;

export type Company = typeof COMPANY;
