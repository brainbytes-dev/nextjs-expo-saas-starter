const LOCALE_MAP: Record<string, string> = {
  de: "de-CH",
  fr: "fr-CH",
  it: "it-CH",
  en: "en-GB",
}

export function formatDate(dateStr: string | null, locale: string = "de"): string {
  if (!dateStr) return "–"
  return new Date(dateStr).toLocaleDateString(LOCALE_MAP[locale] || "de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric"
  })
}

export function formatDateTime(dateStr: string | null, locale: string = "de"): string {
  if (!dateStr) return "–"
  return new Date(dateStr).toLocaleDateString(LOCALE_MAP[locale] || "de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  })
}

export function formatRelativeTime(dateStr: string, locale: string = "de"): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (locale === "fr") {
    if (mins < 1) return "À l'instant"
    if (mins < 60) return `il y a ${mins} min`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `il y a ${hrs} h`
    return `il y a ${Math.floor(hrs / 24)} j`
  }
  if (locale === "it") {
    if (mins < 1) return "Adesso"
    if (mins < 60) return `${mins} min fa`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} ore fa`
    return `${Math.floor(hrs / 24)} giorni fa`
  }
  if (locale === "en") {
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }
  // German default
  if (mins < 1) return "Gerade eben"
  if (mins < 60) return `vor ${mins} Min.`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `vor ${hrs} Std.`
  return `vor ${Math.floor(hrs / 24)} Tag(en)`
}
