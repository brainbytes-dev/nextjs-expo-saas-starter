"use client"

import { IconInfoCircle } from "@tabler/icons-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InfoTooltipProps {
  text: string
  side?: "top" | "bottom" | "left" | "right"
}

export function InfoTooltip({ text, side = "top" }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center size-5 rounded-full text-muted-foreground/50 hover:text-primary/70 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Info"
        >
          <IconInfoCircle className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[260px]">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
