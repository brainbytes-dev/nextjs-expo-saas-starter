import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const SUPPORTED_LOCALES = ["de", "fr", "en", "it", "es", "pt", "pl", "tr", "nl", "ja"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(value: string | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  const locale: Locale = isValidLocale(cookieLocale) ? cookieLocale : "de";

  const messages = (await import(`./messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
