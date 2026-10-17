"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { useInView, useReducedMotion } from "motion/react"
import { Maximize2, Minimize2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useWidth } from "@/components/ui/use-width"
import { AxisTag, ChartCard } from "@/components/ui/chart-overlay"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Button } from "@/components/ui/button"

/* Candlestick, in the trading terminal's chart language from SSYCH Vault.
   · many thin candles, the wick a 1px line, the body ~62% of a slot; direction is the only hue
   · solid faint gridlines with dollar figures on the right
   · a dashed guide at the last close, across the whole plot
   · the crosshair: a rule on the candle, a dashed rule on its close, a dot where they meet,
     the close as an outlined tag on the axis, and a card beside the cursor reading the bar's
     time, open, high, low, close and change
   · a volume pane under its own hairline, the same hue at 0.6
   · dates along the foot
   Connected with Binance live klines. */

const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)"
const UP = "var(--chart-up)"
const DOWN = "var(--chart-candle-down, var(--chart-down))"

export const TRADING_TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"] as const
export type TradingTimeframe = (typeof TRADING_TIMEFRAMES)[number]

export interface Candle {
  o: number
  h: number
  l: number
  c: number
  /** relative volume */
  v: number
  time?: number
}

/** Deterministic walk fallback so every render agrees */
const DEFAULT_CANDLES: Candle[] = (() => {
  let s = 20260729
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  const out: Candle[] = []
  let close = 67200
  for (let i = 0; i < 90; i++) {
    const o = close
    const move = (rnd() - 0.46) * 120
    const c = o + move
    const h = Math.max(o, c) + rnd() * 65
    const l = Math.min(o, c) - rnd() * 65
    const v = 0.35 + rnd() * 0.8 + Math.abs(move) * 0.01
    out.push({ o, h, l, c, v })
    close = c
  }
  return out
})()

/** the price axis on the right, the date row under the volume pane */
const AXIS_W = 58
const DATE_H = 20
const GAP = 10
const PRICE_TOP = 8
const DATES = 5

const shares = (v: number) =>
  v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : `${Math.round(v)}`
const usd = (v: number) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const axisUsd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`
const day = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
const stamp = (t: number) =>
  `${new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} ${new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`
const DEFAULT_START = Date.UTC(2026, 9, 11, 0, 0, 0)

export function Candlestick({
  name = "Bitcoin Perpetual",
  symbol = "BTC-USD",
  timeframe = "M15",
  candles: initialCandles,
  start: initialStart = DEFAULT_START,
  interval = 15 * 60 * 1000,
  volumeUnit = 1000,
  markers = [],
  height = 260,
  isFullscreen = false,
  onToggleFullscreen,
  className,
}: {
  height?: number
  markers?: { at: number; side: "buy" | "sell" }[]
  name?: string
  symbol?: string
  timeframe?: TradingTimeframe
  candles?: Candle[]
  start?: number
  interval?: number
  volumeUnit?: number
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  className?: string
}) {
  const rawClipId = useId()
  const clipId = rawClipId.replace(/:/g, "")
  const [boxRef, W] = useWidth<HTMLDivElement>(560)
  const PLOT_W = W - AXIS_W
  const H = height
  const VOL_H = Math.round(H * 0.18)
  const PRICE_BOT = H - DATE_H - VOL_H - GAP
  const VOL_BOT = H - DATE_H
  const reduced = useReducedMotion() ?? false
  const svgRef = useRef<SVGSVGElement>(null)
  const seen = useInView(svgRef, { once: true, amount: 0.3 })
  const shown = seen || reduced
  const [hi, setHi] = useState<number | null>(null)
  const [tf, setTf] = useState<TradingTimeframe>(timeframe)

  // Interactive Scales:
  // vZoom: vertical price scale multiplier (1.0 = auto)
  const [vZoom, setVZoom] = useState<number>(1.0)
  // visibleCount: number of candles visible in the viewport (horizontal zoom, default 60)
  const [visibleCount, setVisibleCount] = useState<number>(60)
  // panOffset: horizontal scroll offset (0 = current live bars, positive = scrolled into historical past)
  const [panOffset, setPanOffset] = useState<number>(0)

  // Drag states for Chart Pan, Vertical Axis Drag, and Date/Time Axis Drag
  const [isChartDragging, setIsChartDragging] = useState<boolean>(false)
  const [chartDragStartX, setChartDragStartX] = useState<number | null>(null)
  const [chartDragStartPan, setChartDragStartPan] = useState<number>(0)

  const [dragStartY, setDragStartY] = useState<number | null>(null)
  const [dragStartZoom, setDragStartZoom] = useState<number>(1.0)

  const [dateDragStartX, setDateDragStartX] = useState<number | null>(null)
  const [dateDragStartVisible, setDateDragStartVisible] = useState<number>(60)

  const [liveCandles, setLiveCandles] = useState<Candle[] | null>(null)
  const [pulsing, setPulsing] = useState(false)

  // 1. Vertical Price Axis drag (TradingView vertical scale stretching)
  const onAxisPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragStartY(e.clientY)
    setDragStartZoom(vZoom)
  }

  const onAxisPointerMove = (e: React.PointerEvent) => {
    if (dragStartY === null) return
    const deltaY = e.clientY - dragStartY
    const factor = Math.exp(deltaY * 0.008)
    const nextZoom = Math.max(0.25, Math.min(4.0, dragStartZoom * factor))
    setVZoom(nextZoom)
  }

  const onAxisPointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    setDragStartY(null)
  }

  // 2. Horizontal Date Axis drag (TradingView time-scale stretching)
  const onDatePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDateDragStartX(e.clientX)
    setDateDragStartVisible(visibleCount)
  }

  const onDatePointerMove = (e: React.PointerEvent) => {
    if (dateDragStartX === null) return
    const deltaX = e.clientX - dateDragStartX
    // Dragging right zooms in (fewer bars), dragging left zooms out (more bars)
    const factor = Math.exp(-deltaX * 0.005)
    const nextCount = Math.round(Math.max(15, Math.min(220, dateDragStartVisible * factor)))
    setVisibleCount(nextCount)
  }

  const onDatePointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    setDateDragStartX(null)
  }

  // 3. Chart Body Drag (TradingView Pan / Geser candle kiri-kanan)
  const onChartPointerDown = (e: React.PointerEvent) => {
    // Only drag on primary left click
    if (e.button !== 0) return
    setIsChartDragging(true)
    setChartDragStartX(e.clientX)
    setChartDragStartPan(panOffset)
    try {
      svgRef.current?.setPointerCapture(e.pointerId)
    } catch {}
  }

  // 4. Mouse Wheel Zoom (Scroll horizontally zooms candle density)
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.altKey || e.shiftKey) {
      // Alt/Shift wheel zooms vertical price
      const factor = e.deltaY > 0 ? 1.08 : 0.92
      setVZoom((z) => Math.max(0.25, Math.min(4.0, z * factor)))
    } else {
      // Normal wheel zooms candle count (Horizontal Zoom TradingView)
      const zoomFactor = e.deltaY > 0 ? 1.12 : 0.88
      setVisibleCount((vc) => Math.round(Math.max(15, Math.min(220, vc * zoomFactor))))
    }
  }

  // Fetch live klines from Binance API and subscribe to direct Binance WebSocket for instant ticks (<100ms)
  useEffect(() => {
    let active = true
    const binanceSym = symbol.toUpperCase().includes("BTC") ? "btcusdt" : "paxgusdt"
    const tfInterval = tf === "M1" ? "1m" : tf === "M5" ? "5m" : tf === "M15" ? "15m" : tf === "M30" ? "30m" : tf === "H1" ? "1h" : tf === "H4" ? "4h" : tf === "D1" ? "1d" : "15m"

    async function loadKlines() {
      try {
        setPulsing(true)
        const res = await fetch(`/api/binance-chart?symbol=${encodeURIComponent(symbol)}&tf=${tf}`)
        if (!res.ok) return
        const json = await res.json()
        if (active && json.success && Array.isArray(json.candles) && json.candles.length > 5) {
          const mapped: Candle[] = json.candles.map((k: { open: number; high: number; low: number; close: number; volume: number; time: number }) => ({
            o: k.open,
            h: k.high,
            l: k.low,
            c: k.close,
            v: k.volume,
            time: k.time,
          }))
          setLiveCandles(mapped)
        }
      } catch {
        // fallback to default candles
      } finally {
        setTimeout(() => {
          if (active) setPulsing(false)
        }, 300)
      }
    }

    loadKlines()

    // Real-time direct WebSocket connection to Binance Stream
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSym}@kline_${tfInterval}`)
      ws.onmessage = (event) => {
        if (!active) return
        try {
          const data = JSON.parse(event.data)
          if (!data.k) return
          const k = data.k
          const tickCandle: Candle = {
            time: Math.floor(k.t / 1000),
            o: parseFloat(k.o),
            h: parseFloat(k.h),
            l: parseFloat(k.l),
            c: parseFloat(k.c),
            v: parseFloat(k.v),
          }

          setPulsing(true)
          setTimeout(() => {
            if (active) setPulsing(false)
          }, 150)

          setLiveCandles((prev) => {
            if (!prev || prev.length === 0) return [tickCandle]
            const last = prev[prev.length - 1]
            const lastTime = last?.time ?? 0
            const tickTime = tickCandle?.time ?? 0
            // If the tick belongs to the current candle time bucket, update last candle in place
            if (last && Math.abs(lastTime - tickTime) < 60) {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...last,
                c: tickCandle.c,
                h: Math.max(last.h, tickCandle.h),
                l: Math.min(last.l, tickCandle.l),
                v: tickCandle.v,
              }
              return updated
            } else {
              // New candle period started
              return [...prev.slice(1), tickCandle]
            }
          })
        } catch {}
      }
    } catch {}

    const timer = setInterval(loadKlines, 30000) // Fallback background sync
    return () => {
      active = false
      clearInterval(timer)
      if (ws) {
        try {
          ws.close()
        } catch {}
      }
    }
  }, [symbol, tf])

  const allCandles = liveCandles || initialCandles || DEFAULT_CANDLES
  const totalAvailable = allCandles.length

  // Calculate visible viewport slice based on visibleCount and panOffset
  // Clamp panOffset: cannot pan further into future than 0, cannot pan further into past than totalAvailable - visibleCount
  const maxPan = Math.max(0, totalAvailable - Math.min(totalAvailable, visibleCount))
  const clampedPan = Math.max(0, Math.min(maxPan, panOffset))

  const endIndex = totalAvailable - clampedPan
  const startIndex = Math.max(0, endIndex - visibleCount)
  const visibleCandles = allCandles.slice(startIndex, endIndex)
  const n = visibleCandles.length

  const { pMin, pMax, vMax, ticks } = useMemo(() => {
    let lo = Number.POSITIVE_INFINITY
    let top = Number.NEGATIVE_INFINITY
    let vm = 0
    for (const d of visibleCandles) {
      lo = Math.min(lo, d.l)
      top = Math.max(top, d.h)
      vm = Math.max(vm, d.v)
    }
    const pad = (top - lo) * 0.06 || 1
    const baseA = lo - pad
    const baseB = top + pad
    const mid = (baseA + baseB) / 2
    const span = (baseB - baseA) * vZoom
    const a = mid - span / 2
    const b = mid + span / 2
    return { pMin: a, pMax: b, vMax: vm || 1, ticks: [0.1, 0.37, 0.63, 0.9].map((f) => b - f * (b - a)) }
  }, [visibleCandles, vZoom])

  const step = PLOT_W / Math.max(1, n)
  const bodyW = Math.max(1.5, Math.min(14, step * 0.68))
  const cx = (i: number) => (i + 0.5) * step
  const yP = (v: number) => PRICE_TOP + (1 - (v - pMin) / (pMax - pMin || 1)) * (PRICE_BOT - PRICE_TOP)
  const yV = (v: number) => VOL_BOT - (v / vMax) * (VOL_H - 4)
  const time = (i: number) => visibleCandles[i]?.time || (initialStart + (startIndex + i) * interval)

  // Handle pointer move across chart (both Crosshair inspection and Pan drag)
  const onPointerMove = (e: React.PointerEvent) => {
    const el = svgRef.current
    if (!el || n === 0) return

    if (isChartDragging && chartDragStartX !== null) {
      // Calculate how many candle bars were dragged based on pixel delta
      const deltaPx = e.clientX - chartDragStartX
      const deltaBars = Math.round(deltaPx / step)
      // Dragging right reveals past bars (increase panOffset), dragging left pulls back to live bars
      const newPan = Math.max(0, Math.min(maxPan, chartDragStartPan + deltaBars))
      setPanOffset(newPan)
      setHi(null)
      return
    }

    // Normal crosshair hover move
    const r = el.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    if (px >= 0 && px <= PLOT_W) {
      setHi(Math.max(0, Math.min(n - 1, Math.floor(px / step))))
    } else {
      setHi(null)
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (isChartDragging) {
      setIsChartDragging(false)
      setChartDragStartX(null)
      try {
        svgRef.current?.releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  const first = visibleCandles[0] ?? { o: 0, h: 0, l: 0, c: 0, v: 0 }
  const last = visibleCandles[n - 1] ?? first
  const runMove = last.c - first.o
  const runPct = first.o ? (runMove / first.o) * 100 : 0
  const runUp = runMove >= 0
  const active = hi !== null ? visibleCandles[hi] : null
  const up = active ? active.c >= active.o : runUp
  const hue = up ? UP : DOWN
  const barPct = active && active.o ? ((active.c - active.o) / active.o) * 100 : 0
  const sign = (v: number) => (v >= 0 ? "+" : "−")
  const tagY = active ? Math.max(PRICE_TOP + 8, Math.min(PRICE_BOT - 8, yP(active.c))) : 0
  const fade = reduced ? "none" : "opacity 160ms"
  const stagger = Math.min(0.015, 0.3 / Math.max(1, n))
  const grow = (i: number) => (reduced ? "none" : `transform 0.4s ${EASE_CSS} ${(i * stagger).toFixed(3)}s, opacity 0.4s ${EASE_CSS} ${(i * stagger).toFixed(3)}s`)
  const dates = Array.from({ length: DATES }, (_, k) => Math.round((k / (DATES - 1)) * (n - 1)))
  const flip = hi !== null && cx(hi) > PLOT_W * 0.6
  const [closeWhole, closeCents] = usd(last.c).split(".")
  const lastY = yP(last.c)
  const lastHidden = active !== null && Math.abs(lastY - tagY) < 13
  const isViewModified = Math.abs(vZoom - 1.0) > 0.05 || panOffset > 0 || visibleCount !== 60

  return (
    <div ref={boxRef} className={cn("w-full max-w-full tabular-nums", className)}>
      {/* Header with name, symbol, last price, and subtle realtime heartbeat pulse strip */}
      <div className="mb-2 flex items-baseline justify-between text-[12px]">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate text-foreground/45">{name}</span>
          {/* Subtle institutional websocket heartbeat strip */}
          <span
            title="Binance realtime feed connected"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] text-foreground/40"
          >
            <span
              className={cn(
                "h-1 w-3 rounded-full transition-all duration-300",
                pulsing
                  ? "bg-emerald-400 opacity-100 shadow-[0_0_8px_#34c28a]"
                  : "bg-emerald-500/30 opacity-60",
              )}
            />
          </span>
        </div>
        <span className="shrink-0 pl-3 font-medium text-foreground/90">{symbol}</span>
      </div>

      <div className="mb-3 flex flex-wrap sm:flex-nowrap items-end justify-between gap-3">
        <div>
          <p className="m-0 text-[26px] font-semibold leading-none tracking-[-0.02em] text-foreground/90">
            {closeWhole}
            <span className="text-foreground/35">.{closeCents}</span>
          </p>
          <p className="mb-0 mt-2 flex items-baseline gap-[7px] text-[12px] font-medium" style={{ color: runUp ? UP : DOWN }}>
            <span>
              {sign(runMove)}
              {usd(Math.abs(runMove))} · {sign(runPct)}
              {Math.abs(runPct).toFixed(2)}%
            </span>
            <span className="font-normal text-foreground/45">tf: {tf}</span>
          </p>
        </div>

        {/* Timeframe switch: M1, M5, M15, M30, H1, H4, D1 */}
        {/* Controls: Timeframe switch and Fullscreen toggle icon */}
        <div className="flex items-center gap-2 shrink-0">
          <SegmentedControl
            options={[...TRADING_TIMEFRAMES]}
            value={tf}
            onChange={(v) => {
              setTf(v as TradingTimeframe)
              setHi(null)
            }}
            label="Trading Timeframe"
            className="shrink-0 overflow-x-auto scrollbar-none"
          />
        </div>
      </div>

      <div className="relative">
        {/* Reset View & Recenter Pill (Active whenever zoomed or panned) */}
        {isViewModified && (
          <div className="absolute top-2 right-16 z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setVZoom(1.0)
                setPanOffset(0)
                setVisibleCount(60)
              }}
              className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 backdrop-blur-md transition-all shadow-md flex items-center gap-1.5"
              title="Reset zoom & pan back to latest live bar"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Reset View ({visibleCount} bars{panOffset > 0 ? ` · -${panOffset} historical` : ""})</span>
            </button>
          </div>
        )}

        <svg
          ref={svgRef}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className={cn(
            "block h-auto w-full select-none touch-none",
            isChartDragging ? "cursor-grabbing" : "cursor-crosshair"
          )}
          role="img"
          aria-label={`${name} (${symbol}) candlestick chart, ${n} bars. Last close ${usd(last.c)}, ${sign(runPct)}${Math.abs(runPct).toFixed(2)}% across the run`}
          onPointerDown={onChartPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => {
            setHi(null)
            setIsChartDragging(false)
          }}
          onWheel={onWheel}
        >
          <defs>
            {/* Clipping path for price candles & markers to prevent any bleed into volume or date panes */}
            <clipPath id={`price-clip-${clipId}`}>
              <rect x={0} y={PRICE_TOP} width={PLOT_W} height={Math.max(1, PRICE_BOT - PRICE_TOP)} />
            </clipPath>
            {/* Clipping path for volume pane */}
            <clipPath id={`vol-clip-${clipId}`}>
              <rect x={0} y={PRICE_BOT + GAP} width={PLOT_W} height={Math.max(1, VOL_BOT - PRICE_BOT - GAP)} />
            </clipPath>
          </defs>

          {/* Price gridlines and right scale */}
          {ticks.map((t) => {
            const gy = yP(t)
            if (gy < PRICE_TOP || gy > PRICE_BOT) return null
            const under = (active !== null && Math.abs(gy - tagY) < 12) || Math.abs(gy - lastY) < 11
            return (
              <g key={t}>
                <line x1={0} x2={PLOT_W} y1={gy} y2={gy} stroke="var(--foreground)" strokeOpacity={0.05} strokeWidth={1} />
                <text x={W - 4} y={gy + 3} textAnchor="end" fontSize={9} fill="var(--foreground)" fillOpacity={0.45} style={{ opacity: under ? 0 : 1, transition: fade }}>
                  {axisUsd(t)}
                </text>
              </g>
            )
          })}

          {/* Price pane bottom hairline boundary */}
          <line x1={0} x2={PLOT_W} y1={PRICE_BOT} y2={PRICE_BOT} stroke="var(--foreground)" strokeOpacity={0.06} strokeWidth={1} />

          {/* Volume pane floor line */}
          <line x1={0} x2={W} y1={VOL_BOT} y2={VOL_BOT} stroke="var(--foreground)" strokeOpacity={0.08} strokeWidth={1} />

          {/* Last-close horizontal guide */}
          <line x1={0} x2={PLOT_W} y1={lastY} y2={lastY} stroke={runUp ? UP : DOWN} strokeOpacity={0.4} strokeDasharray="2 4" strokeWidth={1} />
          <text
            x={W - 4}
            y={lastY + 3}
            textAnchor="end"
            fontSize={9}
            fill="var(--foreground)"
            pointerEvents="none"
            style={{ opacity: lastHidden ? 0 : 1, transition: fade }}
          >
            <tspan fontWeight={500} fillOpacity={0.9}>
              {axisUsd(last.c)}
            </tspan>
            <tspan fillOpacity={0.45}> Last</tspan>
          </text>

          {/* Dedicated Interactive Vertical Price Axis Drag Zone (TradingView style price scale drag) */}
          <rect
            x={PLOT_W}
            y={PRICE_TOP}
            width={AXIS_W}
            height={PRICE_BOT - PRICE_TOP}
            fill="transparent"
            className="cursor-ns-resize"
            onPointerDown={onAxisPointerDown}
            onPointerMove={onAxisPointerMove}
            onPointerUp={onAxisPointerUp}
            onPointerCancel={onAxisPointerUp}
          />

          {/* Volume bars layer (strictly clipped inside volume pane) */}
          <g clipPath={`url(#vol-clip-${clipId})`}>
            {visibleCandles.map((d, i) => {
              const barHue = d.c >= d.o ? UP : DOWN
              const dim = hi !== null && hi !== i
              return (
                <rect
                  key={`vol-${i}`}
                  x={cx(i) - bodyW / 2}
                  y={yV(d.v)}
                  width={bodyW}
                  height={Math.max(0, VOL_BOT - yV(d.v))}
                  fill={barHue}
                  fillOpacity={0.6}
                  style={{
                    opacity: dim ? 0.35 : 1,
                    transformOrigin: `0px ${VOL_BOT}px`,
                    transform: shown ? "none" : "scaleY(0)",
                    transition: grow(i),
                  }}
                />
              )
            })}
          </g>

          {/* Candlestick wicks, bodies and signal markers (strictly clipped inside price pane) */}
          <g clipPath={`url(#price-clip-${clipId})`}>
            {visibleCandles.map((d, i) => {
              const barHue = d.c >= d.o ? UP : DOWN
              const dim = hi !== null && hi !== i
              const top = yP(Math.max(d.o, d.c))
              const bodyH = Math.max(1, Math.abs(yP(d.o) - yP(d.c)))
              return (
                <g key={`candle-${i}`} style={{ opacity: dim ? 0.45 : 1, transition: fade }}>
                  {/* Candle wick and body */}
                  <g
                    style={{
                      transformOrigin: `0px ${((yP(d.h) + yP(d.l)) / 2).toFixed(1)}px`,
                      transform: shown ? "none" : "scaleY(0.6)",
                      opacity: shown ? 1 : 0,
                      transition: grow(i),
                    }}
                  >
                    <line x1={cx(i)} y1={yP(d.h)} x2={cx(i)} y2={yP(d.l)} stroke={barHue} strokeWidth={1} />
                    <rect x={cx(i) - bodyW / 2} y={top} width={bodyW} height={bodyH} fill={barHue} />
                  </g>
                </g>
              )
            })}

            {/* Signal markers if present */}
            {markers.filter((m) => m.at >= startIndex && m.at < endIndex).map((m) => {
              const localIdx = m.at - startIndex
              const d = visibleCandles[localIdx]
              if (!d) return null
              const x = cx(localIdx)
              const y = m.side === "buy" ? yP(d.l) + 9 : yP(d.h) - 9
              const tip = m.side === "buy" ? -1 : 1
              return (
                <path
                  key={`${m.side}${m.at}`}
                  d={`M ${x} ${y + tip * 4} L ${x - 4.5} ${y - tip * 3.5} L ${x + 4.5} ${y - tip * 3.5} Z`}
                  fill={m.side === "buy" ? UP : DOWN}
                  style={{ opacity: shown ? 1 : 0, transition: fade }}
                />
              )
            })}
          </g>

          {/* Dedicated Date timeline footer (opaque protective plate + dates) */}
          <g>
            <rect
              x={0}
              y={VOL_BOT}
              width={W}
              height={DATE_H}
              fill="var(--background)"
              fillOpacity={0.96}
            />
            {dates.map((i, k) => (
              <text
                key={`${i}-${k}`}
                x={k === 0 ? 4 : k === DATES - 1 ? PLOT_W - 4 : cx(i)}
                y={H - 5}
                textAnchor={k === 0 ? "start" : k === DATES - 1 ? "end" : "middle"}
                fontSize={9}
                fill="var(--foreground)"
                fillOpacity={0.5}
                fontWeight={500}
                pointerEvents="none"
              >
                {day(time(i))}
              </text>
            ))}

            {/* Dedicated Interactive Horizontal Date Axis Drag Zone (TradingView style time-scale stretch) */}
            <rect
              x={0}
              y={VOL_BOT}
              width={PLOT_W}
              height={DATE_H}
              fill="transparent"
              className="cursor-ew-resize"
              onPointerDown={onDatePointerDown}
              onPointerMove={onDatePointerMove}
              onPointerUp={onDatePointerUp}
              />
          </g>

          {/* Crosshair & Snapped Axis Tag */}
          {active && hi !== null && (
            <g pointerEvents="none">
              <line x1={cx(hi)} y1={PRICE_TOP - 8} x2={cx(hi)} y2={VOL_BOT} stroke="var(--foreground)" strokeOpacity={0.18} strokeWidth={1} />
              <line x1={0} y1={yP(active.c)} x2={PLOT_W} y2={yP(active.c)} stroke="var(--foreground)" strokeOpacity={0.14} strokeDasharray="3 3" strokeWidth={1} />
              <circle cx={cx(hi)} cy={yP(active.c)} r={3} fill={hue} stroke="var(--background)" strokeWidth={1.5} />
              <AxisTag x={PLOT_W + 2} y={tagY} width={AXIS_W - 4} color={hue}>
                {axisUsd(active.c)}
              </AxisTag>
            </g>
          )}
        </svg>

        {/* Hover inspection card */}
        <ChartCard
          open={active !== null && hi !== null}
          x={hi !== null ? `${(cx(hi) / W) * 100}%` : "0%"}
          flip={flip}
          heading={hi !== null ? stamp(time(hi)) : ""}
          rows={
            active
              ? [
                  { label: "Open", value: usd(active.o) },
                  { label: "High", value: usd(active.h) },
                  { label: "Low", value: usd(active.l) },
                  { label: "Close", value: usd(active.c) },
                  { label: "Volume", value: shares(active.v * volumeUnit) },
                  { label: "Change", value: `${sign(barPct)}${Math.abs(barPct).toFixed(2)}%`, color: hue },
                ]
              : []
          }
        />
      </div>
    </div>
  )
}
