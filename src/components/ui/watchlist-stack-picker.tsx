"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { FIELD } from "@/components/ui/control-classes"

/* Watchlist Stack's add picker (2026-10-02 audit): the + opens this small menu, the look of
   the dashboards' Select (lab/screen/Select.tsx) copied in so the component ships alone. A
   search field and the tickers not on the list yet; the arrows move, Enter picks, Escape or
   a press outside closes. The menu is the library popover (6% foreground over the
   background, 8% hairline, the popover shadow); its corner is 18 = the 12px row corner +
   its 6px padding. */

const EASE = [0.16, 1, 0.3, 1] as const

export interface PickerItem {
  ticker: string
  name: string
}

export function WatchlistPicker({
  open,
  items,
  onPick,
  onClose,
  renderIcon,
}: {
  open: boolean
  items: PickerItem[]
  onPick: (ticker: string) => void
  onClose: () => void
  renderIcon?: (symbol: string, size: number) => ReactNode
}) {
  const reduced = useReducedMotion()
  const [q, setQ] = useState("")
  const [hi, setHi] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const list = q.trim()
    ? items.filter((o) => `${o.ticker} ${o.name}`.toLowerCase().includes(q.trim().toLowerCase()))
    : items

  useEffect(() => {
    if (!open) return
    setQ("")
    setHi(0)
    const away = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null
      if (!box.current?.contains(t as Node) && !t?.closest("[data-watchlist-add]")) onClose()
    }
    window.addEventListener("pointerdown", away)
    return () => window.removeEventListener("pointerdown", away)
  }, [open, onClose])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault()
      onClose()
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setHi((h) => Math.min(list.length - 1, h + 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHi((h) => Math.max(0, h - 1))
    } else if (e.key === "Enter" && list[hi]) {
      e.preventDefault()
      onPick(list[hi].ticker)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={box}
          key="picker"
          onKeyDown={onKey}
          className="absolute right-0 top-full z-20 mt-1.5 w-[220px] rounded-[18px] border border-foreground/[0.08] p-1.5"
          style={{
            background: "var(--tip-fill, color-mix(in srgb, var(--foreground) 6%, var(--background)))",
            boxShadow: "0 8px 24px var(--card-shadow, rgba(0,0,0,calc(0.35 * var(--shadow-k, 1))))",
            transformOrigin: "top right",
          }}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.15, ease: EASE }}
        >
          <label className={cn("mb-1 flex h-9 items-center gap-2 px-3", FIELD)}>
            <Search size={13} className="shrink-0 text-foreground/60" aria-hidden />
            <input
              aria-label="Search tickers"
              autoFocus
              className="w-full bg-transparent text-[12px] outline-none placeholder:text-foreground/45"
              onChange={(e) => {
                setQ(e.target.value)
                setHi(0)
              }}
              placeholder="Search"
              value={q}
            />
          </label>
          <div role="listbox" aria-label="Tickers to add" className="max-h-[216px] overflow-y-auto">
            {list.length === 0 && <div className="px-2.5 py-2.5 text-[11.5px] text-foreground/60">Nothing left to add</div>}
            {list.map((o, i) => (
              <button
                key={o.ticker}
                type="button"
                role="option"
                aria-selected={i === hi}
                onPointerEnter={() => setHi(i)}
                onClick={() => onPick(o.ticker)}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-[12px] px-2.5 text-left outline-none transition-colors duration-150",
                  i === hi && "bg-foreground/[0.06]",
                )}
              >
                {renderIcon && <span className="grid h-5 w-5 shrink-0 place-items-center">{renderIcon(o.ticker, 20)}</span>}
                <span className="text-[12px] font-medium text-foreground/90">{o.ticker}</span>
                <span className="min-w-0 flex-1 truncate text-[11px] text-foreground/60">{o.name}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
