"use client"

import { useState } from "react"
import { IconShieldLock, IconChevronDown, IconChevronUp, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"

const DISMISSED_KEY = "logistikapp-ai-privacy-dismissed"

export function AiPrivacyNotice() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem(DISMISSED_KEY) === "true"
  })
  const [expanded, setExpanded] = useState(false)

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem(DISMISSED_KEY, "true")
  }

  if (dismissed) return null

  return (
    <div className="mx-3 mt-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 p-3 text-xs text-blue-800 dark:text-blue-300">
      <div className="flex items-start gap-2">
        <IconShieldLock className="mt-0.5 size-4 shrink-0" />
        <div className="flex-1">
          <p>
            Ihre Daten werden direkt an OpenAI gesendet. LogistikApp speichert
            keine Chat-Verläufe. Sie nutzen Ihren eigenen API-Schlüssel.
          </p>

          {expanded && (
            <div className="mt-2 space-y-1 text-blue-700 dark:text-blue-400">
              <p>
                Die KI-Anfragen werden über Ihren persönlichen OpenAI
                API-Schlüssel abgewickelt. Wir fungieren lediglich als
                Vermittler und speichern weder Ihre Nachrichten noch die
                Antworten auf unseren Servern.
              </p>
              <p>
                Die Datenschutzrichtlinien von OpenAI gelten für die
                Verarbeitung Ihrer Daten.{" "}
                <a
                  href="https://openai.com/policies/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900 dark:hover:text-blue-200"
                >
                  Mehr erfahren
                </a>
              </p>
            </div>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium"
          >
            {expanded ? (
              <>
                Weniger anzeigen <IconChevronUp className="size-3" />
              </>
            ) : (
              <>
                Mehr erfahren <IconChevronDown className="size-3" />
              </>
            )}
          </button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-blue-600 hover:text-blue-800 dark:text-blue-400"
          onClick={handleDismiss}
        >
          <IconX className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
