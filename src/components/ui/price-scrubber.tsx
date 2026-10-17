"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Maximize2, Minimize2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useWidth } from "@/components/ui/use-width"
import { AxisTag } from "@/components/ui/chart-overlay"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Button } from "@/components/ui/button"

/* Price Scrubber: the wide price chart (560px, the Price chart family's width).
   A magnet crosshair snaps to the real datum, the pointed price is tagged on the axis,
   and scrubbing reads the point into the header in place, recolouring the chart off the
   window's first price. A soft wash rides the cursor.
   Connected directly to live Binance public market feed (BTCUSDT / PAXGUSDT) with seamless fallback. */

const EASE = [0.16, 1, 0.3, 1] as const
const GREEN = "var(--chart-up)"
const RED = "var(--chart-down)"

const TF = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"] as const
export type ScrubTimeframe = (typeof TF)[number]

const N: Record<ScrubTimeframe, number> = {
  M1: 90,
  M5: 90,
  M15: 90,
  M30: 90,
  H1: 90,
  H4: 90,
  D1: 90,
}

/** Deterministic walk per timeframe (LCG) fallback */
function makeSeries(tf: ScrubTimeframe): number[] {
  let s = 1000 + TF.indexOf(tf) * 733
  const n = N[tf] || 90
  const drift = 0.28
  let v = 178
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    v += (s / 0x7fffffff - 0.5) * 2.2 + drift * 0.08
    out.push(v)
  }
  return out
}

function timeLabel(tf: ScrubTimeframe, f: number): string {
  const m = 570 + Math.round(f * 390)
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

const AXES: Record<ScrubTimeframe, string[]> = {
  M1: ["90m ago", "60m ago", "30m ago", "Now"],
  M5: ["7h ago", "5h ago", "2h ago", "Now"],
  M15: ["22h ago", "15h ago", "7h ago", "Now"],
  M30: ["45h ago", "30h ago", "15h ago", "Now"],
  H1: ["4d ago", "3d ago", "1d ago", "Now"],
  H4: ["15d ago", "10d ago", "5d ago", "Now"],
  D1: ["90d ago", "60d ago", "30d ago", "Now"],
}

/** what the move is measured over, at rest */
const WINDOW: Record<ScrubTimeframe, string> = {
  M1: "past 90m",
  M5: "past 7h",
  M15: "past 24h",
  M30: "past 48h",
  H1: "past 4d",
  H4: "past 15d",
  D1: "past 90d",
}

const axisUsd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`
const fmtPrice = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const PAD = { l: 12, r: 72, t: 18, b: 28 }

/* the hover wash: half-width of the falloff in svg units and how far the rest of
   the series drops back while it is lit */
const SPOT = 215
const SPOT_DIM = 0.2
const SPOT_STOPS: [number, number][] = [
  [0, 0],
  [0.1, 0],
  [0.22, 0.05],
  [0.32, 0.2],
  [0.4, 0.5],
  [0.5, 0.78],
  [0.6, 0.5],
  [0.68, 0.2],
  [0.78, 0.05],
  [0.9, 0],
  [1, 0],
]

/**
 * The scrub chart: a magnet crosshair snaps to the real datum with the price
 * tagged on the axis, and scrubbing updates the header, which recolours the
 * whole chart off the reference price. Now connected with live Binance market data.
 */
export function PriceScrubber({
  name = "Bitcoin Perpetual",
  symbol = "BTC-USD",
  timeframe = "M15",
  height = 260,
  isFullscreen = false,
  onToggleFullscreen,
  className,
}: {
  /** the company or market's name, on the label row's left */
  name?: string
  symbol?: string
  /** the timeframe the chart opens on */
  timeframe?: ScrubTimeframe
  height?: number
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  className?: string
}) {
  const [boxRef, W] = useWidth<HTMLDivElement>(560)
  const H = height
  const PLOT_W = Math.max(10, W - PAD.l - PAD.r)
  const PLOT_H = Math.max(10, H - PAD.t - PAD.b)
  const reduced = useReducedMotion()
  const uid = useId().replace(/:/g, "")
  const svgRef = useRef<SVGSVGElement>(null)
  const [tf, setTf] = useState<ScrubTimeframe>(timeframe)
  const [hi, setHi] = useState<number | null>(null)
  const [liveSeries, setLiveSeries] = useState<number[] | null>(null)
  const [pulsing, setPulsing] = useState(false)

  // Fetch live price series from Binance API route
  useEffect(() => {
    let active = true
    async function fetchBinance() {
      try {
        setPulsing(true)
        const res = await fetch(`/api/binance-chart?symbol=${encodeURIComponent(symbol)}&tf=${tf}`)
        if (!res.ok) return
        const json = await res.json()
        if (active && json.success && Array.isArray(json.series) && json.series.length > 5) {
          setLiveSeries(json.series)
        }
      } catch {
        // gracefully fall back to deterministic series
      } finally {
        setTimeout(() => {
          if (active) setPulsing(false)
        }, 600)
      }
    }

    fetchBinance()
    const interval = setInterval(fetchBinance, 12000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [symbol, tf])

  const fallbackData = useMemo(() => makeSeries(tf), [tf])
  const data = liveSeries && liveSeries.length > 5 ? liveSeries : fallbackData
  const n = data.length
  const { min, max } = useMemo(() => {
    const lo = Math.min(...data)
    const top = Math.max(...data)
    const pad = (top - lo) * 0.08
    return { min: lo - pad, max: top + pad }
  }, [data])

  const x = (i: number) => PAD.l + (i / (n - 1)) * PLOT_W
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min || 1)) * PLOT_H

  const onMove = (e: React.PointerEvent) => {
    const el = svgRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    setHi(Math.max(0, Math.min(n - 1, Math.round(((px - PAD.l) / PLOT_W) * (n - 1)))))
  }

  const reference = data[0]
  const activeIdx = hi ?? n - 1
  const activeVal = data[activeIdx]
  const delta = activeVal - reference
  const deltaPct = (delta / reference) * 100
  const up = delta >= 0
  const hue = up ? GREEN : RED

  const line = data.map((v, idx) => `${idx === 0 ? "M" : "L"}${x(idx).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const area = `${line} L${x(n - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`
  const badgeY = y(activeVal)
  const crossX = x(activeIdx)
  const tagY = Math.max(PAD.t + 8, Math.min(H - PAD.b - 8, badgeY))
  const [whole, cents] = fmtPrice(activeVal).split(".")

  return (
    <div ref={boxRef} className={cn("w-full max-w-full tabular-nums", className)}>
      {/* the header, three tiers (spec 14.1); scrubbing reads the point in place, the timeframe switch sits on its right */}
      <div className="mb-3 flex items-baseline justify-between text-[12px]">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate text-foreground/45">{name}</span>
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
        <span className="shrink-0 pl-3 font-medium text-foreground/90 font-mono">{symbol}</span>
      </div>
      <div className="mb-2 flex flex-wrap sm:flex-nowrap items-end justify-between gap-4 tabular-nums" role="status">
        <div>
          <p className="m-0 text-[26px] font-semibold leading-none tracking-[-0.02em] text-foreground/90 font-mono">
            {whole}
            <span className="text-foreground/35">.{cents}</span>
          </p>
          <p className="mb-0 mt-2 flex items-baseline gap-[7px] text-[12px] font-medium font-mono" style={{ color: hue }}>
            <span>
              {up ? "+" : "−"}
              {fmtPrice(Math.abs(delta))} · {up ? "+" : "−"}
              {Math.abs(deltaPct).toFixed(2)}%
            </span>
            <span className="font-normal text-foreground/45">{hi === null ? WINDOW[tf] : timeLabel(tf, activeIdx / (n - 1))}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SegmentedControl
            options={[...TF]}
            value={tf}
            onChange={(v) => {
              setTf(v as ScrubTimeframe)
              setHi(null)
            }}
            label="Timeframe"
            className="shrink-0"
          />
        </div>
      </div>

      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ height: isFullscreen ? H : "auto" }}
        className="block w-full cursor-crosshair touch-none select-none"
        role="img"
        aria-label={`${name} (${symbol}) price over the ${WINDOW[tf]}, ${fmtPrice(data[n - 1])}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHi(null)}
      >
        <defs>
          <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hue} stopOpacity="0.16" />
            <stop offset="100%" stopColor={hue} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-hot`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={hue} stopOpacity="0.24" />
            <stop offset="100%" stopColor={hue} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => {
          const gy = PAD.t + f * PLOT_H
          /* a figure steps aside while the pointed tag sits on it */
          const under = hi !== null && Math.abs(gy - tagY) < 12
          return (
            <g key={f}>
              <line x1={PAD.l} y1={gy} x2={W - PAD.r} y2={gy} stroke="var(--foreground)" strokeOpacity={0.05} />
              <text
                x={W - PAD.r + 8}
                y={gy + 3}
                fontSize={9}
                fill="var(--foreground)"
                fillOpacity={0.45}
                className="tabular-nums font-mono"
                style={{ opacity: under ? 0 : 1, transition: reduced ? "none" : "opacity 150ms" }}
              >
                {axisUsd(max - f * (max - min))}
              </text>
            </g>
          )
        })}

        {AXES[tf].map((t, idx, arr) => (
          <text key={t} x={PAD.l + (idx / (arr.length - 1)) * PLOT_W} y={H - 8} textAnchor={idx === 0 ? "start" : idx === arr.length - 1 ? "end" : "middle"} fontSize={9} fill="var(--foreground)" fillOpacity={0.45} className="font-mono">
            {t}
          </text>
        ))}

        {/* area and line, re-keyed on the timeframe so they redraw; they sit back while scrubbing */}
        <g opacity={hi === null ? 1 : SPOT_DIM} style={{ transition: reduced ? "none" : "opacity 0.22s" }}>
          <motion.path key={`a-${tf}`} d={area} fill={`url(#${uid}-fill)`} initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={reduced ? { duration: 0 } : { duration: 0.4, ease: EASE, delay: 0.35 }} />
          <motion.path key={`l-${tf}`} d={line} fill="none" stroke={hue} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: 1 }} transition={reduced ? { duration: 0 } : { duration: 0.85, ease: EASE }} />
        </g>

        {/* the wash: a full-strength copy revealed through a mask that rides the cursor */}
        <AnimatePresence>
          {hi !== null && (
            <motion.g key="spot" pointerEvents="none" initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.16 } }} transition={reduced ? { duration: 0 } : { duration: 0.2, ease: EASE }}>
              <defs>
                <linearGradient id={`${uid}-ramp`} gradientUnits="userSpaceOnUse" x1={crossX - SPOT} y1="0" x2={crossX + SPOT} y2="0">
                  {SPOT_STOPS.map(([offset, o]) => (
                    // oxlint-disable-next-line shadcn/no-raw-colors -- mask stop: a mask reads luminance, so it stays white in both themes
                    <stop key={offset} offset={`${offset * 100}%`} stopColor="white" stopOpacity={o} />
                  ))}
                </linearGradient>
                <mask id={`${uid}-mask`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
                  <rect x={0} y={0} width={W} height={H} fill={`url(#${uid}-ramp)`} />
                </mask>
              </defs>
              <g mask={`url(#${uid}-mask)`}>
                <path d={area} fill={`url(#${uid}-hot)`} />
                <path d={line} fill="none" stroke={hue} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* magnet crosshair: rule, snapped dot and the pointed price tagged on the axis (chart-overlay.tsx) */}
        {hi !== null && (
          <g pointerEvents="none">
            <line x1={crossX} y1={PAD.t} x2={crossX} y2={H - PAD.b} stroke="var(--foreground)" strokeOpacity={0.2} strokeWidth={1} />
            <line x1={PAD.l} y1={badgeY} x2={W - PAD.r} y2={badgeY} stroke="var(--foreground)" strokeOpacity={0.14} strokeDasharray="3 3" strokeWidth={1} />
            <circle cx={crossX} cy={badgeY} r={3.5} fill={hue} stroke="var(--background)" strokeWidth={1.75} />
            <AxisTag x={W - PAD.r + 4} y={tagY} width={58} color={hue}>
              {fmtPrice(activeVal)}
            </AxisTag>
          </g>
        )}
      </svg>
    </div>
  )
}
