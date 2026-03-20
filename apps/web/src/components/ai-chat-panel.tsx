"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import {
  IconRobot,
  IconSend,
  IconX,
  IconTrash,
  IconExternalLink,
  IconAlertCircle,
  IconLoader2,
} from "@tabler/icons-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AiPrivacyNotice } from "@/components/ai-privacy-notice"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  functionResults?: FunctionResult[]
}

interface FunctionResult {
  name: string
  result: {
    message?: string
    error?: boolean
    link?: string
    orderId?: string
    [key: string]: unknown
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY_PREFIX = "logistikapp-ai-chat-"
const MAX_STORED_MESSAGES = 50

const SUGGESTED_PROMPTS = [
  "Wie viel Zement haben wir?",
  "Welche Werkzeuge sind überfällig?",
  "Bestell 50 Schrauben M8 bei Hilti nach",
  "Zeig mir Materialien unter Meldebestand",
]

// ---------------------------------------------------------------------------
// Markdown-Light Renderer
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): string {
  return (
    text
      // Code blocks
      .replace(
        /```(\w*)\n([\s\S]*?)```/g,
        '<pre class="my-2 rounded-md bg-muted p-3 text-xs overflow-x-auto"><code>$2</code></pre>'
      )
      // Inline code
      .replace(
        /`([^`]+)`/g,
        '<code class="rounded bg-muted px-1 py-0.5 text-xs">$1</code>'
      )
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Unordered lists
      .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
      // Wrap consecutive <li> elements in <ul>
      .replace(
        /((?:<li[^>]*>.*?<\/li>\n?)+)/g,
        '<ul class="my-1 space-y-0.5">$1</ul>'
      )
      // Line breaks
      .replace(/\n/g, "<br>")
  )
}

// ---------------------------------------------------------------------------
// Action Card
// ---------------------------------------------------------------------------

function ActionCard({ result }: { result: FunctionResult }) {
  const data = result.result
  if (data.error) return null

  const actionLabels: Record<string, string> = {
    create_order: "Bestellung erstellt",
    book_stock_change: "Bestandsänderung gebucht",
    search_materials: "Materialien gefunden",
    search_tools: "Werkzeuge gefunden",
    get_stock_level: "Bestand abgefragt",
    get_low_stock_items: "Meldebestand geprüft",
    get_overdue_tools: "Wartung geprüft",
  }

  const label = actionLabels[result.name] ?? result.name

  return (
    <div className="my-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-green-800 dark:text-green-300">
        <div className="size-2 rounded-full bg-green-500" />
        {label}
      </div>
      {data.link && (
        <a
          href={data.link as string}
          className="mt-1.5 inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 hover:underline"
        >
          Details anzeigen <IconExternalLink className="size-3" />
        </a>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        }`}
      >
        {!isUser && message.functionResults && message.functionResults.length > 0 && (
          <div className="mb-2">
            {message.functionResults.map((fr, i) => (
              <ActionCard key={i} result={fr} />
            ))}
          </div>
        )}

        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none [&_br]:block [&_br]:content-[''] [&_br]:mt-1"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}

        <div
          className={`mt-1 text-[10px] ${
            isUser
              ? "text-primary-foreground/60"
              : "text-muted-foreground"
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString("de-CH", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AiChatPanel({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const pathname = usePathname()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get orgId on mount
  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((orgs: { id: string }[]) => {
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrgId(orgs[0]!.id)
        }
      })
      .catch(() => {})
  }, [])

  // Load messages from localStorage
  useEffect(() => {
    if (!orgId) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + orgId)
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[]
        setMessages(parsed)
      }
    } catch {
      // Ignore parse errors
    }
  }, [orgId])

  // Save messages to localStorage
  useEffect(() => {
    if (!orgId || messages.length === 0) return
    try {
      const toStore = messages.slice(-MAX_STORED_MESSAGES)
      localStorage.setItem(STORAGE_KEY_PREFIX + orgId, JSON.stringify(toStore))
    } catch {
      // Storage full — ignore
    }
  }, [messages, orgId])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Send message
  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim()
      if (!content || isLoading) return

      setInput("")
      setError(null)

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: Date.now(),
      }

      const updatedMessages = [...messages, userMsg]
      setMessages(updatedMessages)
      setIsLoading(true)

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            context: pathname,
          }),
        })

        // Non-streaming error
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(
            errData.error ?? `Fehler ${res.status}`
          )
        }

        const contentType = res.headers.get("content-type") ?? ""

        // Handle SSE streaming response
        if (contentType.includes("text/event-stream")) {
          const reader = res.body?.getReader()
          if (!reader) throw new Error("Kein Stream verfügbar")

          const decoder = new TextDecoder()
          let assistantContent = ""
          let functionResults: FunctionResult[] = []
          const assistantId = crypto.randomUUID()

          // Add placeholder message
          setMessages((prev) => [
            ...prev,
            {
              id: assistantId,
              role: "assistant",
              content: "",
              timestamp: Date.now(),
            },
          ])

          let buffer = ""

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""

            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith("data: ")) continue

              const data = trimmed.slice(6)
              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)

                if (parsed.type === "functions") {
                  functionResults = parsed.data as FunctionResult[]
                } else if (parsed.type === "content") {
                  assistantContent += parsed.data
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            content: assistantContent,
                            functionResults,
                          }
                        : m
                    )
                  )
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }

          // Final update
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: assistantContent || "Ich konnte leider keine Antwort generieren.",
                    functionResults,
                  }
                : m
            )
          )
        } else {
          // Non-streaming JSON response (fallback)
          const data = await res.json()
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.content ?? "Keine Antwort erhalten.",
              timestamp: Date.now(),
              functionResults: data.functionResults ?? [],
            },
          ])
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Ein Fehler ist aufgetreten."
        setError(msg)
      } finally {
        setIsLoading(false)
      }
    },
    [input, isLoading, messages, pathname]
  )

  // Clear chat
  function clearChat() {
    setMessages([])
    setError(null)
    if (orgId) {
      localStorage.removeItem(STORAGE_KEY_PREFIX + orgId)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        {/* Header */}
        <SheetHeader className="flex-none border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                <IconRobot className="size-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold">
                  KI-Assistent
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  Powered by OpenAI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={clearChat}
                title="Neuer Chat"
              >
                <IconTrash className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onOpenChange(false)}
              >
                <IconX className="size-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Privacy Notice */}
        <AiPrivacyNotice />

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <IconRobot className="size-8 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1">
                Hallo! Wie kann ich helfen?
              </h3>
              <p className="text-xs text-muted-foreground mb-6 max-w-[260px]">
                Fragen Sie mich nach Beständen, Werkzeugen, Bestellungen oder
                lassen Sie mich Buchungen durchführen.
              </p>

              <div className="grid gap-2 w-full max-w-[300px]">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-lg border bg-card px-3 py-2 text-left text-xs hover:bg-accent transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {isLoading &&
                messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <IconLoader2 className="size-3.5 animate-spin" />
                        Denke nach...
                      </div>
                    </div>
                  </div>
                )}
            </>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <IconAlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p>{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-1 underline hover:no-underline"
              >
                Schliessen
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex-none border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage()
            }}
            className="flex items-center gap-2"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nachricht eingeben..."
              disabled={isLoading}
              className="flex-1 text-sm"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              <IconSend className="size-4" />
            </Button>
          </form>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            KI kann Fehler machen. Überprüfen Sie wichtige Informationen.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
