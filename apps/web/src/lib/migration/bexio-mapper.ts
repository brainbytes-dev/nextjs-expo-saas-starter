/**
 * bexio API data mappers.
 * Maps bexio entities to LogistikApp schema.
 */

// ─── bexio types (partial, based on bexio API v2/v4) ────────────────────────

export interface BexioArticle {
  id: number
  intern_code: string | null
  intern_name: string
  stock_id?: number | null
  stock_nr?: string | null
  stock_place_id?: number | null
  purchase_price?: string | null
  sale_price?: string | null
  remarks?: string | null
  delivery_price?: string | null
  article_type_id?: number
  // v4 may use different shapes
  [key: string]: unknown
}

export interface BexioContact {
  id: number
  contact_type_id: number // 1 = Firma, 2 = Person
  name_1: string // Firmenname or Nachname
  name_2?: string | null // Vorname
  address?: string | null
  postcode?: string | null
  city?: string | null
  country_id?: number | null
  mail?: string | null
  phone_fixed?: string | null
  phone_mobile?: string | null
  remarks?: string | null
  [key: string]: unknown
}

export interface BexioOrder {
  id: number
  document_nr: string
  title: string | null
  contact_id: number | null
  total_gross?: string | null
  total_net?: string | null
  status_id?: number
  is_valid_from?: string | null
  is_valid_to?: string | null
  [key: string]: unknown
}

// ─── Mapped LogistikApp shapes ──────────────────────────────────────────────

export interface MappedMaterial {
  name: string
  number: string | null
  unit: string | null
  barcode: string | null
  notes: string | null
  manufacturer: string | null
}

export interface MappedSupplier {
  name: string
  supplierNumber: string | null
  email: string | null
  phone: string | null
  address: string | null
  zip: string | null
  city: string | null
  country: string | null
  notes: string | null
}

export interface MappedOrder {
  externalId: string
  number: string
  title: string | null
  totalGross: string | null
  status: string
}

// ─── Mappers ────────────────────────────────────────────────────────────────

export function mapBexioArticle(article: BexioArticle): MappedMaterial {
  return {
    name: article.intern_name || `Artikel ${article.id}`,
    number: article.intern_code || article.stock_nr || null,
    unit: null, // bexio doesn't have a direct unit field on articles
    barcode: null,
    notes: article.remarks || null,
    manufacturer: null,
  }
}

export function mapBexioContact(contact: BexioContact): MappedSupplier {
  const fullName = [contact.name_1, contact.name_2].filter(Boolean).join(" ")
  return {
    name: fullName || `Kontakt ${contact.id}`,
    supplierNumber: null,
    email: contact.mail || null,
    phone: contact.phone_fixed || contact.phone_mobile || null,
    address: contact.address || null,
    zip: contact.postcode || null,
    city: contact.city || null,
    country: null,
    notes: contact.remarks || null,
  }
}

const BEXIO_STATUS: Record<number, string> = {
  5: "draft",
  6: "pending",
  7: "confirmed",
  8: "partially_delivered",
  9: "delivered",
}

export function mapBexioOrder(order: BexioOrder): MappedOrder {
  return {
    externalId: String(order.id),
    number: order.document_nr,
    title: order.title || null,
    totalGross: order.total_gross || null,
    status: BEXIO_STATUS[order.status_id ?? 0] || "draft",
  }
}
