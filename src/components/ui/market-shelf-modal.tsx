"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { popupHost, scrimStyle } from "@/components/ui/popup-host"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { X } from "lucide-react"

import { ICON_BUTTON } from "@/components/ui/control-classes"

/* Market Shelf's "See all" (2026-10-02 audit): the dashboards' Modal (lab/screen/Modal.tsx)
   copied in so the component ships alone. A centred popup over a blurred screen, one 8%
   hairline, corner 36 = the 24px corner of its 48px rows + its 12px padding. Escape and the
   backdrop close it, focus moves to the first row on open and back to the opener on close,
   Tab stays inside. It portals into the document the shelf lives in, so a preview iframe
   keeps it. */

const EASE = [0.16, 1, 0.3, 1] as const

export function ShelfModal({
  open,
  title,
  onClose,
  host,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  /** any element of the shelf: the modal goes into its document */
  host: HTMLElement | null
  children: ReactNode
}) {
  const reduced = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return
    const doc = host?.ownerDocument ?? document
    opener.current = doc.activeElement as HTMLElement | null
    const id = window.setTimeout(() => box.current?.querySelector<HTMLElement>("button:not([data-close])")?.focus({ preventScroll: true }), 30)
    return () => {
      window.clearTimeout(id)
      opener.current?.focus?.({ preventScroll: true })
    }
  }, [open, host])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      close.current()
    }
    if (e.key !== "Tab" || !box.current) return
    const f = [...box.current.querySelectorAll<HTMLElement>("button")].filter((el) => !el.hasAttribute("disabled"))
    if (!f.length) return
    const active = box.current.ownerDocument.activeElement
    if (e.shiftKey && active === f[0]) {
      e.preventDefault()
      f[f.length - 1].focus()
    } else if (!e.shiftKey && active === f[f.length - 1]) {
      e.preventDefault()
      f[0].focus()
    }
  }

  /* the shelf's document body, or the [data-popup-root] box it is drawn in (the library's
     Browse all card), so the modal opens inside the component area (ui/popup-host.ts) */
  const target = popupHost(host)
  if (!target) return null
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
          /* in a Browse all card: the part of the card that shows (ui/popup-host.ts) */
          style={scrimStyle(target)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.15 }}
          onPointerDown={(e) => e.target === e.currentTarget && close.current()}
        >
          <motion.div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onKeyDown={onKey}
            /* corner 36 = the rows' 24 + the 12px padding */
            className="max-h-[calc(100dvh-32px)] w-full max-w-[400px] overflow-y-auto rounded-[36px] border border-foreground/[0.08] bg-background p-3 text-foreground tabular-nums dark:bg-[color-mix(in_srgb,var(--foreground)_6%,var(--background))]"
            initial={{ opacity: 0, y: reduced ? 0 : 10, scale: reduced ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduced ? 0 : 6, scale: reduced ? 1 : 0.98, transition: { duration: 0.15 } }}
            transition={reduced ? { duration: 0.15 } : { duration: 0.25, ease: EASE }}
          >
            <div className="mb-2 flex items-center justify-between pl-3 pt-1">
              <span className="text-[15px] font-medium text-foreground/90">{title}</span>
              <button type="button" data-close aria-label="Close" onClick={onClose} className={`h-9 w-9 ${ICON_BUTTON}`}>
                <X size={16} aria-hidden />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    target,
  )
}
