"use client"

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Member {
  userId: string
  userName: string | null
  userEmail: string
  userImage: string | null
}

export interface MentionInputHandle {
  /** Clear the textarea and mention state. */
  reset(): void
  /** Current text value. */
  getValue(): string
  /** Array of mentioned user IDs. */
  getMentions(): string[]
}

interface MentionInputProps {
  /** Members that can be @-mentioned. */
  members: Member[]
  /** Controlled placeholder text. */
  placeholder?: string
  /** Called whenever the text changes. */
  onChange?: (value: string) => void
  /** Called when user presses Ctrl+Enter / Cmd+Enter. */
  onSubmit?: () => void
  disabled?: boolean
  className?: string
  rows?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Returns the @-trigger substring immediately before the caret, or null.
 * e.g. "Hello @jo" at caret position 9 → "@jo"
 */
function getMentionQuery(text: string, caretPos: number): string | null {
  const before = text.slice(0, caretPos)
  const match = before.match(/@(\w*)$/)
  return match ? match[0] : null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(
  function MentionInput(
    {
      members,
      placeholder = "Kommentar schreiben…",
      onChange,
      onSubmit,
      disabled = false,
      className,
      rows = 3,
    },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [value, setValue] = useState("")
    const [mentions, setMentions] = useState<string[]>([])

    // Dropdown state
    const [query, setQuery] = useState<string | null>(null)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Filtered members matching the current @query
    const filteredMembers = query
      ? members.filter((m) => {
          const name = (m.userName ?? m.userEmail).toLowerCase()
          const q = query.slice(1).toLowerCase() // strip the "@"
          return name.includes(q)
        })
      : []

    // Expose handle
    useImperativeHandle(ref, () => ({
      reset() {
        setValue("")
        setMentions([])
        setDropdownOpen(false)
        setQuery(null)
      },
      getValue() {
        return value
      },
      getMentions() {
        return mentions
      },
    }))

    // Notify parent of value changes
    useEffect(() => {
      onChange?.(value)
    }, [value, onChange])

    // Close dropdown on outside click
    useEffect(() => {
      function handleClick(e: MouseEvent) {
        if (
          textareaRef.current &&
          !textareaRef.current.contains(e.target as Node)
        ) {
          setDropdownOpen(false)
        }
      }
      document.addEventListener("mousedown", handleClick)
      return () => document.removeEventListener("mousedown", handleClick)
    }, [])

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value
        const caret = e.target.selectionStart ?? newValue.length
        setValue(newValue)

        const trigger = getMentionQuery(newValue, caret)
        if (trigger !== null) {
          setQuery(trigger)
          setDropdownOpen(true)
          setSelectedIndex(0)
        } else {
          setDropdownOpen(false)
          setQuery(null)
        }
      },
      []
    )

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (dropdownOpen && filteredMembers.length > 0) {
          if (e.key === "ArrowDown") {
            e.preventDefault()
            setSelectedIndex((i) =>
              Math.min(i + 1, filteredMembers.length - 1)
            )
            return
          }
          if (e.key === "ArrowUp") {
            e.preventDefault()
            setSelectedIndex((i) => Math.max(i - 1, 0))
            return
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault()
            insertMention(filteredMembers[selectedIndex]!)
            return
          }
          if (e.key === "Escape") {
            setDropdownOpen(false)
            return
          }
        }

        // Ctrl+Enter or Cmd+Enter → submit
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault()
          onSubmit?.()
        }
      },
      [dropdownOpen, filteredMembers, selectedIndex, onSubmit]
    )

    const insertMention = useCallback(
      (member: Member) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const caret = textarea.selectionStart ?? value.length
        const before = value.slice(0, caret)
        const after = value.slice(caret)

        // Replace the @trigger with "@DisplayName "
        const displayName = member.userName ?? member.userEmail
        const replaced = before.replace(/@(\w*)$/, `@${displayName} `)
        const newValue = replaced + after

        setValue(newValue)
        setMentions((prev) =>
          prev.includes(member.userId) ? prev : [...prev, member.userId]
        )
        setDropdownOpen(false)
        setQuery(null)

        // Restore caret after the inserted mention
        requestAnimationFrame(() => {
          textarea.selectionStart = replaced.length
          textarea.selectionEnd = replaced.length
          textarea.focus()
        })
      },
      [value]
    )

    // Render @-mentions in blue inside a read-only overlay is complex; instead
    // we highlight them by post-processing. For simplicity we use a plain
    // textarea — the @Name text is visually plain but functionally tracked in
    // the `mentions` array. A full rich-text approach would require contenteditable.
    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={cn(
            "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "resize-none",
            className
          )}
        />

        {/* @-mention dropdown */}
        {dropdownOpen && filteredMembers.length > 0 && (
          <ul
            role="listbox"
            className="absolute bottom-full left-0 z-50 mb-1 w-56 rounded-md border bg-popover shadow-md"
          >
            {filteredMembers.slice(0, 8).map((member, idx) => (
              <li
                key={member.userId}
                role="option"
                aria-selected={idx === selectedIndex}
                onMouseDown={(e) => {
                  // Prevent textarea blur before the click registers
                  e.preventDefault()
                  insertMention(member)
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                  idx === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {member.userImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.userImage}
                    alt=""
                    className="size-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground uppercase">
                    {(member.userName ?? member.userEmail).slice(0, 2)}
                  </span>
                )}
                <span className="truncate">
                  {member.userName ?? member.userEmail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
)
