"use client"

import { useTransition } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { IconCheck, IconChevronDown } from "@tabler/icons-react"
import { CircleFlag } from "react-circle-flags"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { useState } from "react"

const LOCALES = [
  { value: "de", label: "Deutsch", flag: "ch" },
  { value: "fr", label: "Français", flag: "ch" },
  { value: "it", label: "Italiano", flag: "ch" },
  { value: "en", label: "English", flag: "gb" },
] as const

type Locale = (typeof LOCALES)[number]["value"]

interface LanguageSwitcherProps {
  compact?: boolean
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale
  const t = useTranslations("languageSwitcher")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const currentLocale = LOCALES.find((l) => l.value === locale) ?? LOCALES[0]

  function handleLocaleChange(next: string) {
    if (next === locale) return
    document.cookie = `locale=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    setOpen(false)
    startTransition(() => {
      router.refresh()
    })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={isPending}
        aria-label={t("label")}
        className={cn(
          "flex items-center gap-2 rounded-md border border-input bg-transparent text-sm transition-colors hover:bg-muted/50 disabled:opacity-50",
          compact ? "h-9 w-9 justify-center p-0" : "h-9 px-3 py-2"
        )}
      >
        <div className="inline-flex items-center justify-center w-5 h-5 shrink-0 overflow-hidden rounded-full">
          <CircleFlag countryCode={currentLocale.flag} height={20} />
        </div>
        {!compact && (
          <>
            <span className="text-sm font-medium">{currentLocale.label}</span>
            <IconChevronDown className="size-3.5 text-muted-foreground" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {LOCALES.map((l) => (
                <CommandItem
                  key={l.value}
                  onSelect={() => handleLocaleChange(l.value)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="inline-flex items-center justify-center w-5 h-5 shrink-0 overflow-hidden rounded-full">
                    <CircleFlag countryCode={l.flag} height={20} />
                  </div>
                  <span className="flex-1">{l.label}</span>
                  <IconCheck
                    className={cn(
                      "size-4 shrink-0",
                      locale === l.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
