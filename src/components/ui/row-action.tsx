"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

/* Row action: an action that lives on a table row, and the way the row leaves after it
   (2026-10-02, out of Positions Table and the trading terminal).

   RowAction   a real button in the row's own last column, so it never sits over a figure.
               It comes up (4px, 150ms) on row hover or keyboard focus (the row carries
               `group`), and is always shown where there is no hover. Once pressed it turns
               to a tick and the past tense ("Closed").
   useRowExit  the hold: the row washes in the colour of its result and keeps its "Closed"
               for 420ms, then `onDone` takes it out of the list.
   rowExit     the motion the row's wrapper leaves with: 16px right as it fades while its
               height folds away (300ms), so the rows under it close up. Reduced motion
               keeps a fade.
   rowWash     the 10% wash in the result's colour. */

const LIFT_SPRING = { type: "spring", stiffness: 500, damping: 30 } as const
const SMOOTH = [0.22, 1, 0.36, 1] as const
/** how long a finished row holds its "Closed" before it leaves */
export const ROW_HOLD_MS = 420

export function useRowExit(hold = ROW_HOLD_MS) {
  const [leaving, setLeaving] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  /** hold row `id` in its finished state, then run `onDone` (which removes it) */
  const start = useCallback(
    (id: string, onDone: () => void) => {
      if (leaving) return
      setLeaving(id)
      timer.current = window.setTimeout(() => {
        onDone()
        setLeaving(null)
      }, hold)
    },
    [hold, leaving],
  )
  return { leaving, start }
}

export const rowExit = (reduced: boolean | null) =>
  reduced
    ? { opacity: 0, transition: { duration: 0.15 } }
    : { opacity: 0, x: 16, height: 0, transition: { duration: 0.3, ease: SMOOTH, height: { duration: 0.3, ease: SMOOTH, delay: 0.08 } } }

export const rowWash = (color: string) => `color-mix(in srgb, ${color} 10%, transparent)`

export function RowAction({
  done,
  disabled,
  onClick,
  label = "Close",
  doneLabel = "Closed",
  tone = "var(--foreground)",
  "aria-label": ariaLabel,
  children,
}: {
  /** the action has gone through: the button reads the past tense with a tick */
  done: boolean
  disabled?: boolean
  onClick: () => void
  label?: string
  doneLabel?: string
  /** the tick's colour: the result's hue */
  tone?: string
  "aria-label"?: string
  children?: ReactNode
}) {
  const reduced = useReducedMotion()
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileTap={reduced ? undefined : { scale: 0.97, transition: LIFT_SPRING }}
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[10.5px] font-medium text-foreground/90 outline-none",
        "transition-[opacity,transform,translate,background-color,color] duration-150 ease-out",
        done
          ? "translate-y-0 opacity-100"
          : "translate-y-1 bg-foreground/[0.08] opacity-0 hover:bg-foreground/[0.14] focus-visible:translate-y-0 focus-visible:bg-foreground/[0.14] focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
      )}
    >
      {done ? (
        <>
          <Check size={11} strokeWidth={2.2} aria-hidden style={{ color: tone }} />
          {doneLabel}
        </>
      ) : (
        children ?? label
      )}
    </motion.button>
  )
}
