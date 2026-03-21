"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"
import { useTourCompleted } from "@/hooks/use-welcome-tour"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/logo"
import { IconArrowLeft, IconArrowRight, IconX } from "@tabler/icons-react"

// ── Tour step definitions ──────────────────────────────────────────────

interface TourStep {
  target: string | null
  titleKey: string
  descriptionKey: string
  needsSidebar?: boolean
  scrollSidebar?: boolean
}

const STEPS: TourStep[] = [
  {
    target: null,
    titleKey: "welcome.title",
    descriptionKey: "welcome.description",
  },
  {
    target: "[data-slot='sidebar']",
    titleKey: "navigation.title",
    descriptionKey: "navigation.description",
    needsSidebar: true,
  },
  {
    target: "a[href='/dashboard/materials']",
    titleKey: "materials.title",
    descriptionKey: "materials.description",
    needsSidebar: true,
    scrollSidebar: true,
  },
  {
    target: "a[href='/dashboard/tools']",
    titleKey: "tools.title",
    descriptionKey: "tools.description",
    needsSidebar: true,
    scrollSidebar: true,
  },
  {
    target: "a[href='/dashboard/time-tracking']",
    titleKey: "timeTracking.title",
    descriptionKey: "timeTracking.description",
    needsSidebar: true,
    scrollSidebar: true,
  },
  {
    target: "a[href='/dashboard/deliveries']",
    titleKey: "deliveries.title",
    descriptionKey: "deliveries.description",
    needsSidebar: true,
    scrollSidebar: true,
  },
  {
    target: "a[href='/dashboard/reports']",
    titleKey: "reports.title",
    descriptionKey: "reports.description",
    needsSidebar: true,
    scrollSidebar: true,
  },
  {
    target: "a[href='/dashboard/settings']",
    titleKey: "settings.title",
    descriptionKey: "settings.description",
    needsSidebar: true,
    scrollSidebar: true,
  },
  {
    target: null,
    titleKey: "finish.title",
    descriptionKey: "finish.description",
  },
]

// ── Positioning helpers ───────────────────────────────────────────────

type Side = "top" | "bottom" | "left" | "right"

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function getTooltipPosition(
  targetRect: Rect,
  tooltipWidth: number,
  tooltipHeight: number,
  padding: number
): { top: number; left: number; side: Side } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cx = targetRect.left + targetRect.width / 2
  const cy = targetRect.top + targetRect.height / 2

  const spaceBelow = vh - (targetRect.top + targetRect.height + padding)
  const spaceAbove = targetRect.top - padding
  const spaceRight = vw - (targetRect.left + targetRect.width + padding)

  if (spaceRight >= tooltipWidth + 16) {
    return {
      top: Math.max(16, Math.min(vh - tooltipHeight - 16, cy - tooltipHeight / 2)),
      left: targetRect.left + targetRect.width + padding + 12,
      side: "right",
    }
  }
  if (spaceBelow >= tooltipHeight + 16) {
    return {
      top: targetRect.top + targetRect.height + padding + 12,
      left: Math.max(16, Math.min(vw - tooltipWidth - 16, cx - tooltipWidth / 2)),
      side: "bottom",
    }
  }
  if (spaceAbove >= tooltipHeight + 16) {
    return {
      top: targetRect.top - padding - tooltipHeight - 12,
      left: Math.max(16, Math.min(vw - tooltipWidth - 16, cx - tooltipWidth / 2)),
      side: "top",
    }
  }
  return {
    top: Math.max(16, Math.min(vh - tooltipHeight - 16, cy - tooltipHeight / 2)),
    left: Math.max(16, targetRect.left - padding - tooltipWidth - 12),
    side: "left",
  }
}

// ── Helper: find element, scroll sidebar if needed ─────────────────────

function findAndScrollToTarget(selector: string, scrollSidebar?: boolean): Element | null {
  const selectors = selector.split(",").map((s) => s.trim())
  let el: Element | null = null
  for (const sel of selectors) {
    try { el = document.querySelector(sel) } catch { /* invalid selector */ }
    if (el) break
  }

  if (el && scrollSidebar) {
    // Scroll the sidebar container so the element is visible
    const sidebarContent = el.closest("[data-slot='sidebar-content']") || el.closest("[data-sidebar='content']") || el.closest("nav")?.parentElement
    if (sidebarContent) {
      const elRect = el.getBoundingClientRect()
      const containerRect = sidebarContent.getBoundingClientRect()
      if (elRect.top < containerRect.top || elRect.bottom > containerRect.bottom) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }

  return el
}

// ── Tour component ────────────────────────────────────────────────────

export function WelcomeTour() {
  const t = useTranslations("tour")
  const { completed, markCompleted } = useTourCompleted()
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [spotlight, setSpotlight] = useState<Rect | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; side: Side } | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  // Auto-start on first visit
  useEffect(() => {
    if (!completed) {
      const timer = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(timer)
    }
  }, [completed])

  // Listen for manual tour restart
  useEffect(() => {
    const handler = () => {
      setStep(0)
      setActive(true)
    }
    window.addEventListener("restart-welcome-tour", handler)
    return () => window.removeEventListener("restart-welcome-tour", handler)
  }, [])

  // Find and position spotlight for current step
  const positionStep = useCallback(() => {
    const currentStep = STEPS[step]
    if (!currentStep) return

    if (!currentStep.target) {
      setSpotlight(null)
      setTooltipPos(null)
      return
    }

    // On mobile, try to open sidebar if needed
    if (currentStep.needsSidebar && window.innerWidth < 768) {
      const trigger = document.querySelector("button[data-sidebar='trigger']") as HTMLButtonElement | null
      if (trigger) trigger.click()
    }

    // Small delay to let sidebar open/scroll
    const delay = currentStep.scrollSidebar ? 100 : 0
    setTimeout(() => {
      const el = findAndScrollToTarget(currentStep.target!, currentStep.scrollSidebar)

      if (!el) {
        setSpotlight(null)
        setTooltipPos(null)
        return
      }

      // Wait a tick for scroll to settle
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect()
        const pad = 6
        const spotlightRect: Rect = {
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        }
        setSpotlight(spotlightRect)

        const tw = Math.min(360, window.innerWidth - 32)
        const th = 200
        const pos = getTooltipPosition(spotlightRect, tw, th, pad)
        setTooltipPos(pos)
      })
    }, delay)
  }, [step])

  useEffect(() => {
    if (!active) return
    const raf = requestAnimationFrame(() => setIsTransitioning(true))
    const timer = setTimeout(() => {
      positionStep()
      setIsTransitioning(false)
    }, 250)

    const handleReposition = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(positionStep)
    }
    window.addEventListener("resize", handleReposition)
    window.addEventListener("scroll", handleReposition, true)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      window.removeEventListener("resize", handleReposition)
      window.removeEventListener("scroll", handleReposition, true)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active, step, positionStep])

  const handleNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      markCompleted()
      setActive(false)
    }
  }, [step, markCompleted])

  const handlePrev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1)
  }, [step])

  const handleClose = useCallback(() => {
    markCompleted()
    setActive(false)
  }, [markCompleted])

  // Keyboard navigation
  useEffect(() => {
    if (!active) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [active, handleClose, handleNext, handlePrev])

  if (!active) return null

  const currentStep = STEPS[step]
  const isFirstStep = step === 0
  const isLastStep = step === STEPS.length - 1
  const isCenterOverlay = !currentStep?.target || !spotlight

  return createPortal(
    <div className="fixed inset-0 z-[9999]" aria-modal="true" role="dialog">
      {/* SVG overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.left} y={spotlight.top}
                width={spotlight.width} height={spotlight.height}
                rx="8" ry="8" fill="black"
                className="transition-all duration-300 ease-out"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0,0,0,0.6)" mask="url(#tour-spotlight-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={handleClose}
        />
      </svg>

      {/* Spotlight border ring */}
      {spotlight && (
        <div
          className="absolute rounded-lg ring-2 ring-primary/60 ring-offset-2 ring-offset-transparent pointer-events-none transition-all duration-300 ease-out"
          style={{ top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height }}
        />
      )}

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className={`
          absolute z-[10000] w-[360px] max-w-[calc(100vw-32px)]
          rounded-xl border border-border bg-background shadow-2xl
          transition-all duration-300 ease-out
          ${isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"}
        `}
        style={
          isCenterOverlay
            ? { top: "50%", left: "50%", transform: `translate(-50%, -50%) ${isTransitioning ? "scale(0.95)" : "scale(1)"}` }
            : tooltipPos
              ? { top: tooltipPos.top, left: tooltipPos.left }
              : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
        }
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors z-10"
          aria-label={t("closeTour")}
        >
          <IconX className="size-4" />
        </button>

        <div className="p-5">
          {(isFirstStep || isLastStep) && (
            <div className="flex justify-center mb-4">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <LogoMark className="size-7 text-primary" />
              </div>
            </div>
          )}

          <h3 className="text-base font-semibold text-foreground pr-6">{currentStep ? t(currentStep.titleKey) : ""}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{currentStep ? t(currentStep.descriptionKey) : ""}</p>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("stepOf", { current: step + 1, total: STEPS.length })}
            </span>
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button variant="ghost" size="sm" onClick={handlePrev} className="gap-1 h-8 text-xs">
                  <IconArrowLeft className="size-3" />{t("back")}
                </Button>
              )}
              {isFirstStep && (
                <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 text-xs">
                  {t("closeTour")}
                </Button>
              )}
              <Button size="sm" onClick={handleNext} className="gap-1 h-8 text-xs">
                {isLastStep ? t("getStarted") : t("next")}
                {!isLastStep && <IconArrowRight className="size-3" />}
              </Button>
            </div>
          </div>

          <div className="flex justify-center gap-1.5 mt-3">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === step ? "w-4 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
