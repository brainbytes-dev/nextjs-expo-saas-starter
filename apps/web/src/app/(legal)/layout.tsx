import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { Logo, Wordmark } from "@/components/logo"
import { LanguageSwitcher } from "@/components/language-switcher"

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("legalLayout")

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top nav bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Logo />
          <Link
            href="/"
            className="font-mono text-[11px] tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("backToHome")}
          </Link>
          <LanguageSwitcher compact />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            © {new Date().getFullYear()} <Wordmark className="inline" />
          </p>
          <nav className="flex gap-6 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">{t("privacy")}</Link>
            <Link href="/agb"         className="hover:text-foreground transition-colors">{t("terms")}</Link>
            <Link href="/impressum"   className="hover:text-foreground transition-colors">{t("imprint")}</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
