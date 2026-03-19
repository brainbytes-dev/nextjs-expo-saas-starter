"use client"

import * as React from "react"
import { IconEye, IconEyeOff } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

/**
 * A drop-in replacement for <Input type="password"> that renders an inline
 * eye toggle button on the right side. All standard <input> props are forwarded
 * so it integrates directly with react-hook-form's `register()` spread.
 */
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        data-slot="input"
        className={cn(
          // Match the base Input styling exactly
          "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 pr-10 text-base shadow-xs transition-[color,box-shadow] outline-none",
          "selection:bg-primary selection:text-primary-foreground",
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm dark:bg-input/30",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
        title={visible ? "Passwort verbergen" : "Passwort anzeigen"}
        onClick={() => setVisible((v) => !v)}
        className={cn(
          "absolute inset-y-0 right-0 flex items-center px-3",
          "text-muted-foreground transition-colors hover:text-foreground",
          // Don't interfere when the input itself is disabled
          "peer-disabled:pointer-events-none"
        )}
      >
        {visible ? (
          <IconEyeOff className="size-4 shrink-0" aria-hidden />
        ) : (
          <IconEye className="size-4 shrink-0" aria-hidden />
        )}
      </button>
    </div>
  )
})

PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
