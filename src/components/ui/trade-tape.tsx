"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"
import { LiveToggle } from "@/components/ui/live-toggle"
import { usePointed } from "@/components/ui/use-pointed"

/* Trade Tape, rebuilt through the ssych-component skill (2026-09-29).
   What changed against the version before it (in git history), and why:
   · no card, outline or inner shadow: the tape sits on the page. `flush` stays as a prop and
     now only lifts the width cap, since there is no card left to drop
   · the clock is a fixed session clock that steps with each print, so two mounts print the
     same times (it read the wall clock before)
   · sentence case: the symbol, the column heads and the block mark are no longer set in
     capitals or letter-spaced
   · pointing at a print keeps it full and dims the rest
   · the tape names itself to a screen reader, every figure is tabular
   2026-10-02 audit: his call reversed the hover. The tape rests on its seeded prints and
   streams only while the pointer is on it (usePointed); it used to stream from mount and
   pause on hover. The text Pause button and the "Paused, 3 waiting" word that changed width
   became one IconToggle at a fixed width, the same as Tape Flow's: a pulsing green dot
   reading "Live", a filled play mark reading "Play"; it pins the feed on, or pauses it while
   the pointer stays. No prints queue any more, since a stopped feed prints nothing. The
   "Trade tape" title is gone (the name is in the aria-label) and the symbol reads 12px /90;
   heads are 10.5px /45, the time /45, the block mark 9.5px. The width is 440, shared with
   Tape Flow, its family.
   2026-10-02 round 2: his note on the Live control, no green dot. The toggle is the shared
   LiveToggle (live-toggle.tsx), the same as Tape Flow's, in ink without a dot, its look
   picked by the LiveToggleVariant around it; it pins and pauses the feed as before.
   Formulas:
   · a print's price  = the price before × (1 ± r × 0.035%), up on a buy, down on a sell
   · block            a print of 10 × the median size (120) or more
   · edge bar         opacity 25% + size ÷ (6 × median), at most 100% */

const EASE = [0.16, 1, 0.3, 1] as const
const GREEN = "var(--chart-up)"
const RED = "var(--chart-down)"

type Print = { id: number; t: string; price: number; size: number; side: "buy" | "sell"; block: boolean }

const MAX_ROWS = 18
const MEDIAN = 120

const two = (n: number) => String(n).padStart(2, "0")

/** a print from the host's own feed (2026-10-06): time in ms since epoch, newest first */
export type TapePrint = { id: number | string; time: number; price: number; size: number; side: "buy" | "sell" }

export interface TradeTapeProps {
  /** real prints, newest first (2026-10-06): given, the tape shows them instead of its seeded
   *  walk and the live toggle leaves, since the host owns the feed. Blocks are ten times the
   *  feed's own median size */
  feed?: TapePrint[]
  /** places the size is written to; 0 for whole shares, more for crypto */
  sizeDp?: number
  symbol?: string
  /** the price the seeded walk starts from */
  base?: number
  priceDp?: number
  /** lift the width cap, so the tape fills whatever pane holds it */
  flush?: boolean
  /** take the pane's full height; the row count answers to it, so prints reach the bottom edge */
  fill?: boolean
  /** show the symbol beside the toggle; false when the host already names the pane */
  label?: boolean
  /** start with the feed pinned on; at rest (false) it streams only while pointed at */
  initialLive?: boolean
  /** max number of prints to display (default: 18) */
  maxRows?: number
  className?: string
}

/**
 * Live time and sales connected directly to Binance WebSocket (@aggTrade)
 * Real tick-by-tick order execution tape.
 */
export function TradeTape({
  feed,
  sizeDp = 2,
  symbol = "BTC-USD",
  base = 67412.50,
  priceDp = 2,
  flush = false,
  fill = false,
  label = true,
  initialLive = true,
  maxRows = 18,
  className,
}: TradeTapeProps) {
  const reduced = useReducedMotion()
  const pointed = usePointed()
  const [hot, setHot] = useState<number | null>(null)
  const [mode, setMode] = useState<"auto" | "on" | "off">("on")
  const live = mode === "on"
  const [wsConnected, setWsConnected] = useState(false)

  const idRef = useRef(1)
  const [prints, setPrints] = useState<Print[]>([])
  const [intro, setIntro] = useState(true)

  const binanceSym = useMemo(() => {
    const upper = symbol.toUpperCase()
    if (upper.includes("XAU") || upper.includes("GOLD") || upper.includes("PAXG")) return "paxgusdt"
    if (upper.includes("BTC")) return "btcusdt"
    if (upper.includes("ETH")) return "ethusdt"
    return "btcusdt"
  }, [symbol])

  const listRef = useRef<HTMLDivElement>(null)
  const [rows, setRows] = useState(maxRows)
  const rowsRef = useRef(maxRows)
  rowsRef.current = rows

  // 1. Initial Load: Fetch real recent trades from Binance API on mount or symbol switch
  useEffect(() => {
    let active = true
    async function loadRecentTrades() {
      try {
        const res = await fetch(`/api/binance-trades?symbol=${binanceSym}&limit=${rowsRef.current}`)
        if (!res.ok) return
        const data = await res.json()
        if (active && data.success && Array.isArray(data.trades) && data.trades.length > 0) {
          setPrints(data.trades.slice(0, rowsRef.current))
        }
      } catch (err) {
        console.warn("Could not fetch initial trades from Binance:", err)
      }
    }

    loadRecentTrades()
    const t = setTimeout(() => setIntro(false), 500)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [binanceSym])

  // 2. Real Binance WebSocket connection (@aggTrade)
  useEffect(() => {
    if (!live) {
      setWsConnected(false)
      return
    }

    let ws: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isDisposed = false

    function connectWs() {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSym}@aggTrade`)

        ws.onopen = () => {
          if (!isDisposed) setWsConnected(true)
        }

        ws.onmessage = (event) => {
          try {
            const d = JSON.parse(event.data)
            const price = parseFloat(d.p)
            const size = parseFloat(d.q)
            // d.m: isBuyerMaker (true = sell taker, false = buy taker)
            const side: "buy" | "sell" = d.m ? "sell" : "buy"
            const block = size >= (binanceSym === "btcusdt" ? 0.8 : 3.0)
            const date = new Date(d.T || Date.now())
            const t = `${two(date.getUTCHours())}:${two(date.getUTCMinutes())}:${two(date.getUTCSeconds())}`

            const print: Print = {
              id: idRef.current++,
              t,
              price,
              size,
              side,
              block,
            }

            setPrints((prev) => [print, ...prev].slice(0, rowsRef.current))
          } catch {}
        }

        ws.onerror = () => {
          if (!isDisposed) setWsConnected(false)
        }

        ws.onclose = () => {
          if (!isDisposed) {
            setWsConnected(false)
            reconnectTimeout = setTimeout(connectWs, 2500)
          }
        }
      } catch {
        if (!isDisposed) setWsConnected(false)
      }
    }

    connectWs()

    // Backup polling fallback if WebSocket is blocked by client firewall
    const pollInterval = setInterval(async () => {
      if (ws && ws.readyState === WebSocket.OPEN) return
      try {
        const res = await fetch(`/api/binance-trades?symbol=${binanceSym}&limit=10`)
        if (!res.ok) return
        const data = await res.json()
        if (data.success && Array.isArray(data.trades)) {
          setPrints((prev) => {
            const existingIds = new Set(prev.map((p) => p.id))
            const newTrades = data.trades.filter((t: any) => !existingIds.has(t.id))
            if (newTrades.length === 0) return prev
            return [...newTrades, ...prev].slice(0, rowsRef.current)
          })
        }
      } catch {}
    }, 2000)

    return () => {
      isDisposed = true
      clearInterval(pollInterval)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (ws) {
        try {
          ws.close()
        } catch {}
      }
    }
  }, [live, binanceSym])


  /* the host's feed, when given: its own median sets the block size and the weight bars */
  const sizes = feed ? [...feed.map((f) => f.size)].sort((a, b) => a - b) : []
  const median = feed ? sizes[Math.floor(sizes.length / 2)] || 1 : MEDIAN
  const shown: Print[] = feed
    ? feed.slice(0, rows).map((f, i) => ({
        id: typeof f.id === "number" ? f.id : i + 1,
        t: new Date(f.time).toLocaleTimeString("en-GB", { hour12: false }),
        price: f.price,
        size: f.size,
        side: f.side,
        block: f.size >= median * 10,
      }))
    : prints

  return (
    <div
      ref={pointed.ref}
      {...pointed.bind}
      className={cn("w-full overflow-hidden tabular-nums", fill && "flex h-full min-h-0 flex-col", !flush && "max-w-[440px]", className)}
      role="group"
      aria-label={`Trade tape, ${symbol}${shown[0] ? `, last ${shown[0].price.toFixed(priceDp)}` : ""}${feed ? "" : `, ${live ? "live" : "paused"}`}`}
      onPointerLeave={() => {
        pointed.bind.onPointerLeave()
        setHot(null)
      }}
    >
      <div className={cn("flex shrink-0 items-center px-3 pb-2", label ? "justify-between" : "justify-end")}>
        {label && (
          <span className="text-[12px] font-medium text-foreground/90 font-mono">{symbol}</span>
        )}
        {/* live-toggle.tsx, the same toggle as Tape Flow: ink only, one fixed width */}
        {!feed && (
          <span className="-mr-2">
            <LiveToggle live={live} onLiveChange={(next) => setMode(next ? "on" : "off")} />
          </span>
        )}
      </div>

      <div className="grid shrink-0 grid-cols-3 border-b border-foreground/[0.05] px-3 pb-1.5 text-[10.5px] text-foreground/45">
        <span>Time</span>
        <span className="text-right">Price</span>
        <span className="text-right">Size</span>
      </div>

      <div ref={listRef} className={fill ? "min-h-0 flex-1 overflow-hidden" : "pt-1"} role="log" aria-label={`${symbol} prints`} aria-live="off">
        <AnimatePresence initial={false}>
          {shown.map((p, i) => {
            const hue = p.side === "buy" ? GREEN : RED
            const dim = hot !== null && hot !== p.id
            const delay = intro ? Math.min(i, 7) * 0.035 : 0
            return (
              <motion.div
                key={p.id}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                animate={{ opacity: dim ? 0.45 : 1, y: 0 }}
                transition={
                  reduced
                    ? { duration: 0.15, delay }
                    : { duration: 0.28, ease: EASE, delay, opacity: { duration: 0.18, ease: EASE, delay } }
                }
                onPointerEnter={() => setHot(p.id)}
                className="relative grid grid-cols-3 items-center px-3 py-[3px] text-[10.5px]"
                style={p.block ? { background: `color-mix(in srgb, ${hue} 8%, transparent)` } : undefined}
              >
                {/* the print's weight: the same hue, stronger for a larger size */}
                <span aria-hidden className="absolute inset-y-[2px] left-0 w-[2px] rounded-full" style={{ background: hue, opacity: Math.min(1, 0.25 + p.size / (median * 6)) }} />
                <span className="text-foreground/45">{p.t}</span>
                <span className="text-right" style={{ color: hue }}>
                  {p.price.toFixed(priceDp)}
                </span>
                <span className={cn("text-right", p.block ? "font-semibold text-foreground/90" : "text-foreground/60")}>
                  {p.size.toLocaleString("en-US", { minimumFractionDigits: sizeDp, maximumFractionDigits: sizeDp })}
                  {p.block && (
                    <span className="ms-1 text-[9.5px] font-medium" style={{ color: hue }}>
                      block
                    </span>
                  )}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
