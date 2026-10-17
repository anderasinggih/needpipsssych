"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { popupHost, scrimStyle } from "@/components/ui/popup-host"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Check, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { BUTTON, BUTTON_PRIMARY, FIELD, ICON_BUTTON, RAISED, THUMB } from "@/components/ui/control-classes"

/* Empty State's popup (2026-10-02 round 2): his note was that the empty state should do
   something real on topic, with the popup. The look is the library Modal's
   (src/components/ui/modal.tsx), copied in so the component ships alone: no outline, the
   raised fill over a dimmed and blurred page, one corner of 36 = 24 (the 48px pills and
   rows) + 12 (the panel's padding), the title 15px medium 12px further in, a 36px close.
   What it does: subscribes an email to market alerts. An email field (48px, its focus is its
   own border brightening, never an outline with a gap), a choice of digest as three 48px rows
   in the control material (the chosen one takes the thumb's fill), then "Not now" and
   "Subscribe" at equal width. Subscribe stays off until the address reads as one. Pressing it
   swaps the body in place for the confirm state: a tick, "Subscribed" in the past tense, where
   and when the first email lands, and one "Done". Both states sit in one grid cell, so the
   panel never changes size between them.
   Keys: focus lands in the email field on open, stays inside (Tab wraps), Enter in the field
   subscribes, Escape and a press on the scrim close, focus goes back to the opener for a
   keyboard user. Motion: the panel rises 10px from 0.98 in 250ms and leaves in 150ms; the
   confirm state swaps in 200ms with a 4px rise. Reduced motion keeps the fades alone.
   No figures are derived here. */

const EASE = [0.16, 1, 0.3, 1] as const
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
/** an address with a name, an @, a domain and a dot: enough to turn Subscribe on */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export interface EmptyStateDigest {
  id: string
  label: string
  /** when it lands, read on the row's right */
  when: string
  /** the confirm line's ending: "lands in you@desk.fund {at}" */
  at: string
}

export const DEFAULT_DIGESTS: EmptyStateDigest[] = [
  { id: "alerts", label: "Price alerts", when: "Instantly", at: "the moment a level on your watchlist is crossed" },
  { id: "close", label: "Daily close", when: "18:00 UTC", at: "every weekday at 18:00 UTC, the first one tonight" },
  { id: "weekly", label: "Weekly recap", when: "Mondays", at: "every Monday at 07:00 UTC" },
]

export function EmptyStateDialog({
  open,
  onClose,
  title = "Market alerts by email",
  body = "Pick what lands in your inbox. One click unsubscribes.",
  digests = DEFAULT_DIGESTS,
  defaultDigest,
  onSubscribe,
}: {
  open: boolean
  onClose: () => void
  title?: string
  body?: ReactNode
  digests?: EmptyStateDigest[]
  defaultDigest?: string
  onSubscribe?: (email: string, digest: EmptyStateDigest) => void
}) {
  const reduced = useReducedMotion()
  const uid = useId()
  const panel = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  const opener = useRef<Element | null>(null)
  const keyboard = useRef(false)
  const close = useRef(onClose)
  close.current = onClose
  /* the document's body, or the [data-popup-root] box the dialog is drawn in (the library's
     Browse all card), so it opens inside the component area (ui/popup-host.ts) */
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => setHost(popupHost(anchor.current)), [])

  const [email, setEmail] = useState("")
  const [digest, setDigest] = useState(defaultDigest ?? digests[1]?.id ?? digests[0]?.id ?? "")
  const [done, setDone] = useState(false)
  const valid = EMAIL.test(email.trim())
  const chosen = digests.find((d) => d.id === digest) ?? digests[0]

  /* on open: a fresh form, focus in the field; on close: back to the opener for a keyboard user */
  useEffect(() => {
    if (!open) return
    setDone(false)
    const doc = anchor.current?.ownerDocument ?? document
    opener.current = doc.activeElement
    keyboard.current = !!(opener.current as HTMLElement | null)?.matches?.(":focus-visible")
    const id = window.setTimeout(() => field.current?.focus({ preventScroll: true }), 30)
    return () => {
      window.clearTimeout(id)
      const back = opener.current
      if (keyboard.current && back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true })
    }
  }, [open])

  const subscribe = () => {
    if (!valid || !chosen) return
    onSubscribe?.(email.trim(), chosen)
    setDone(true)
    window.setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-done]")?.focus({ preventScroll: true }), 30)
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      close.current()
      return
    }
    if (e.key !== "Tab" || !panel.current) return
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest("[inert]"))
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = panel.current.ownerDocument.activeElement
    if (e.shiftKey && (active === first || !panel.current.contains(active))) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const swap = (on: boolean) => ({
    initial: false as const,
    animate: { opacity: on ? 1 : 0, y: on || reduced ? 0 : 4 },
    transition: reduced ? { duration: 0.15 } : { duration: 0.2, ease: EASE },
  })

  const dialog = (
    <motion.div
      key="panel"
      ref={panel}
      role="dialog"
      aria-modal
      aria-labelledby={`${uid}-title`}
      onKeyDown={onKey}
      initial={{ opacity: 0, y: reduced ? 0 : 10, scale: reduced ? 1 : 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: reduced ? 0 : 6, scale: reduced ? 1 : 0.98, transition: { duration: 0.15 } }}
      transition={reduced ? { duration: 0.15 } : { duration: 0.25, ease: EASE }}
      /* 36 = 24 (the 48px pills and rows) + 12 (p-3) */
      className={cn("relative w-full max-w-[400px] overflow-hidden rounded-[36px] p-3 text-foreground", RAISED)}
    >
      <div className="mb-3 flex items-center gap-2.5 pl-3 pt-1">
        <p id={`${uid}-title`} className="min-w-0 flex-1 text-[15px] font-medium text-foreground/90">
          {title}
        </p>
        <button
          type="button"
          onClick={() => close.current()}
          aria-label="Close"
          className={cn("grid h-9 w-9 shrink-0 place-items-center active:scale-[0.97] motion-reduce:active:scale-100", ICON_BUTTON, "transition-[color,background-color,scale]")}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* the form and the confirm state share one cell, so the panel keeps its size */}
      <div className="grid [grid-template-areas:'s'] *:[grid-area:s]">
        <motion.div {...swap(!done)} inert={done} aria-hidden={done || undefined}>
          <p className="px-3 text-[13px] leading-relaxed text-foreground/70">{body}</p>
          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault()
              subscribe()
            }}
          >
            <label htmlFor={`${uid}-email`} className="sr-only">
              Email
            </label>
            <input
              ref={field}
              id={`${uid}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@desk.fund"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              /* focus is the field's own edge brightening: no outline, no ring with a gap */
              className={cn(FIELD, "block h-12 w-full px-5 text-[14px] outline-none focus:border-foreground/[0.2]")}
            />
            <div role="radiogroup" aria-label="Digest" className="mt-3 flex flex-col gap-1">
              {digests.map((d) => {
                const on = d.id === digest
                return (
                  <button
                    key={d.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setDigest(d.id)}
                    className={cn(
                      "flex h-12 w-full items-center justify-between rounded-[24px] px-5 text-left text-[13px] outline-none transition-[color,background-color] duration-150 focus-visible:bg-foreground/[0.06]",
                      on ? cn(THUMB, "text-foreground/90") : "text-foreground/60 hover:bg-foreground/[0.04] hover:text-foreground/90",
                    )}
                  >
                    <span className="font-medium">{d.label}</span>
                    <span className={cn("text-[11.5px] tabular-nums", on ? "text-foreground/60" : "text-foreground/45")}>{d.when}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => close.current()} className={cn("h-12 px-5 text-[14px] font-medium", BUTTON)}>
                Not now
              </button>
              <button type="submit" disabled={!valid} className={BUTTON_PRIMARY}>
                Subscribe
              </button>
            </div>
          </form>
        </motion.div>

        <motion.div {...swap(done)} inert={!done} aria-hidden={!done || undefined} className="flex flex-col" role="status">
          <div className="flex flex-1 flex-col items-center justify-center px-3 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--chart-up)_14%,transparent)] text-[var(--chart-up)]">
              <Check className="h-5 w-5" strokeWidth={2.2} aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-medium text-foreground/90">Subscribed</p>
            <p className="mt-1.5 max-w-[300px] text-[13px] leading-relaxed text-foreground/70">
              {done && chosen ? (
                <>
                  {chosen.label} lands in <span className="text-foreground/90">{email.trim()}</span> {chosen.at}.
                </>
              ) : (
                " "
              )}
            </p>
          </div>
          <button type="button" data-done="" onClick={() => close.current()} className={cn(BUTTON_PRIMARY, "mt-5")}>
            Done
          </button>
        </motion.div>
      </div>
    </motion.div>
  )

  return (
    <>
      <span ref={anchor} hidden />
      {host &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                key="scrim"
                className="fixed inset-0 z-[100] grid place-items-center bg-foreground/[0.2] p-4 backdrop-blur-sm dark:bg-background/70"
                /* in a Browse all card the scrim covers the part of the card that shows
                   (ui/popup-host.ts); elsewhere undefined, the plain inset-0 */
                style={scrimStyle(host)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.15 }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) close.current()
                }}
              >
                {dialog}
              </motion.div>
            )}
          </AnimatePresence>,
          host,
        )}
    </>
  )
}
