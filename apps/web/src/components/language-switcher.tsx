"use client"

import { useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { IconLanguage } from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const LOCALES = [
  { value: "de", label: "Deutsch", flag: "DE" },
  { value: "fr", label: "Français", flag: "FR" },
  { value: "en", label: "English", flag: "EN" },
  { value: "it", label: "Italiano", flag: "IT" },
] as const

type Locale = (typeof LOCALES)[number]["value"]

interface LanguageSwitcherProps {
  /** Render as a compact icon button (e.g. in a sidebar footer). */
  compact?: boolean
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale
  const t = useTranslations("languageSwitcher")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const currentLocale = LOCALES.find((l) => l.value === locale) ?? LOCALES[0]

  function handleLocaleChange(next: string) {
    if (next === locale) return

    // Persist in a cookie so request.ts picks it up on the next render.
    // SameSite=Lax is safe here; no sensitive data in this cookie.
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          disabled={isPending}
          aria-label={t("label")}
          className="gap-2"
        >
          {compact ? (
            <IconLanguage className="size-4 shrink-0" />
          ) : (
            <>
              <IconLanguage className="size-4 shrink-0" />
              <span className="text-xs font-medium tabular-nums">
                {currentLocale.flag}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-40">
        <DropdownMenuRadioGroup value={locale} onValueChange={handleLocaleChange}>
          {LOCALES.map((l) => (
            <DropdownMenuRadioItem key={l.value} value={l.value}>
              <span className="mr-2 text-xs font-mono text-muted-foreground">
                {l.flag}
              </span>
              {l.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
