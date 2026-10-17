"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/* Tip: the library's small tooltip for an icon control or a cut-off name (2026-10-02 audit).
   Written once for Browser Window and shared by Alert Stack, so each of them
   still installs in one command (the registry ships an imported ui helper beside them).
   The look is the library popover (spec 14.6): radius 12, the 8% hairline, a 6% fill over
   the page and the popover shadow; text 11px /90, sentence case. It waits a beat so a
   pointer crossing the component opens nothing (`delay`), opens on keyboard focus too,
   closes on leave, blur and Escape, and it is the only tooltip: no native `title` beside it.
   It never takes the pointer, so it cannot get in the way of the control under it. */

const POPOVER_BG = "var(--tip-fill, color-mix(in srgb, var(--foreground) 6%, var(--background)))"
const POPOVER_SHADOW = "0 8px 24px var(--card-shadow, rgba(0,0,0,0.35))"

const SIDE = {
  top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
  left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
} as const

export function Tip({
  tip,
  children,
  side = "top",
  delay = 320,
  disabled = false,
  className,
}: {
  tip: ReactNode
  children: ReactNode
  side?: keyof typeof SIDE
  /** ms the pointer rests before it opens; a long hover reveal uses ~700 */
  delay?: number
  /** nothing to reveal (the name is not cut off): never opens */
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const id = useId()
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", esc)
    return () => window.removeEventListener("keydown", esc)
  }, [open])
  const show = () => {
    if (disabled) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setOpen(true), delay)
  }
  const hide = () => {
    window.clearTimeout(timer.current)
    setOpen(false)
  }
  return (
    <span
      className={cn("relative inline-flex", className)}
      aria-describedby={open ? id : undefined}
      onPointerEnter={(e) => e.pointerType !== "touch" && show()}
      onPointerLeave={hide}
      onPointerDown={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 w-max max-w-[260px] rounded-[12px] border border-foreground/[0.08] px-2.5 py-1.5 text-left text-[11px] font-normal leading-[1.4] text-foreground/90",
            SIDE[side],
          )}
          style={{ background: POPOVER_BG, boxShadow: POPOVER_SHADOW }}
        >
          {tip}
        </span>
      )}
    </span>
  )
}
