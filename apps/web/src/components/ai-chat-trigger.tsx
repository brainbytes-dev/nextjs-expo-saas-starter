"use client"

import { useState, useEffect, useCallback } from "react"
import { IconSparkles } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { AiChatPanel } from "@/components/ai-chat-panel"

export function AiChatTrigger() {
  const [open, setOpen] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)

  // Check if org has an API key configured
  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((data: { hasKey?: boolean }) => {
        setHasApiKey(data.hasKey === true)
      })
      .catch(() => {})
  }, [])

  // Keyboard shortcut: Cmd+J / Ctrl+J
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    },
    []
  )

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      {/* Floating Action Button */}
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        title="KI-Assistent (⌘J)"
      >
        <IconSparkles className="size-6" />
        {/* Pulsing dot when API key is configured */}
        {hasApiKey && (
          <span className="absolute -top-0.5 -right-0.5 flex size-3.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-3.5 rounded-full bg-green-500" />
          </span>
        )}
        {/* Gray dot when no API key */}
        {!hasApiKey && (
          <span className="absolute -top-0.5 -right-0.5 flex size-3.5">
            <span className="relative inline-flex size-3.5 rounded-full bg-gray-400" />
          </span>
        )}
      </Button>

      {/* Chat Panel */}
      <AiChatPanel open={open} onOpenChange={setOpen} />
    </>
  )
}
