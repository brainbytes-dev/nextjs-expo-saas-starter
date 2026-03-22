"use client"

import { useState, useMemo } from "react"
import { IconCheck, IconChevronDown, IconClock } from "@tabler/icons-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

// Get all IANA timezones, grouped by region
function getAllTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone")
  } catch {
    // Fallback for older browsers
    return [
      "Europe/Zurich", "Europe/Berlin", "Europe/Vienna", "Europe/Paris",
      "Europe/Rome", "Europe/London", "Europe/Madrid", "Europe/Amsterdam",
      "Europe/Brussels", "Europe/Warsaw", "Europe/Istanbul",
      "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
      "America/Sao_Paulo", "America/Toronto",
      "Asia/Tokyo", "Asia/Shanghai", "Asia/Dubai", "Asia/Singapore",
      "Australia/Sydney", "Pacific/Auckland",
      "UTC",
    ]
  }
}

// Priority timezones shown first
const PRIORITY_TIMEZONES = [
  "Europe/Zurich",
  "Europe/Berlin",
  "Europe/Vienna",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/London",
]

function formatTimezoneLabel(tz: string): string {
  const parts = tz.split("/")
  const city = (parts[parts.length - 1] ?? "").replace(/_/g, " ")
  const region = parts[0] ?? ""
  try {
    const offset = new Intl.DateTimeFormat("en", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? ""
    return `${city} (${offset})`
  } catch {
    return `${region}/${city}`
  }
}

interface TimezoneSelectProps {
  value?: string
  onChange?: (timezone: string) => void
  defaultValue?: string
  disabled?: boolean
}

export function TimezoneSelect({
  value,
  onChange,
  defaultValue = "Europe/Zurich",
  disabled = false,
}: TimezoneSelectProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(value || defaultValue)

  const allTimezones = useMemo(() => getAllTimezones(), [])

  const grouped = useMemo(() => {
    const priority = PRIORITY_TIMEZONES.filter((tz) => allTimezones.includes(tz))
    const rest = allTimezones.filter((tz) => !PRIORITY_TIMEZONES.includes(tz))
    return { priority, rest }
  }, [allTimezones])

  function handleSelect(tz: string) {
    setSelected(tz)
    onChange?.(tz)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm hover:bg-muted/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <IconClock className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{formatTimezoneLabel(selected)}</span>
        </div>
        <IconChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command className="max-h-[300px]">
          <CommandList>
            <div className="sticky top-0 z-10 bg-popover">
              <CommandInput placeholder="Zeitzone suchen..." />
            </div>
            <CommandEmpty>Keine Zeitzone gefunden.</CommandEmpty>
            <CommandGroup heading="Empfohlen">
              {grouped.priority.map((tz) => (
                <CommandItem
                  key={tz}
                  onSelect={() => handleSelect(tz)}
                  className="flex items-center gap-2"
                >
                  <span className="flex-1 truncate">{formatTimezoneLabel(tz)}</span>
                  <IconCheck
                    className={cn("size-4 shrink-0", selected === tz ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Alle Zeitzonen">
              {grouped.rest.map((tz) => (
                <CommandItem
                  key={tz}
                  onSelect={() => handleSelect(tz)}
                  className="flex items-center gap-2"
                >
                  <span className="flex-1 truncate">{formatTimezoneLabel(tz)}</span>
                  <IconCheck
                    className={cn("size-4 shrink-0", selected === tz ? "opacity-100" : "opacity-0")}
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
