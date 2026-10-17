"use client"

import { useCallback, useId, useMemo, useRef, useState } from "react"
import { motion, useInView, useReducedMotion } from "motion/react"
import { Maximize2, Minimize2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { useWidth } from "@/components/ui/use-width"
import { Button } from "@/components/ui/button"

/* Price Target Fan, pure ssych component from SSYCH_COMPONENTS_VAULT.md
   - History price line up to "Now"
   - Fan out projections: High, Mean, Low targets
   - Responsive width (w-full max-w-full)
*/

const EASE = [0.16, 1, 0.3, 1] as const
const GREEN = "var(--chart-up, #34d399)"
const RED = "var(--chart-down, #f87171)"

const ink = (c: string) => `oklch(from ${c} min(l, var(--ink-l, 1)) c h)`
const fmtDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })
const signedPct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`

export interface PriceTarget {
  key: string
  price: number
  analysts: number
  color?: string
}

const PAD = { l: 12, r: 84, t: 18, b: 30 }

function buildHistory(current: number): number[] {
  let s = 17
  let v = 150
  const out: number[] = []
  for (let i = 0; i < 48; i++) {
    s = (s * 16807) % 2147483647
    v = v + (s / 2147483647 - 0.44) * 4.2
    out.push(v)
  }
  const lo = Math.min(...out)
  const hi = Math.max(...out)
  const scaled = out.map((x) => 158 + ((x - lo) / (hi - lo)) * 26)
  const shift = current - scaled[scaled.length - 1]
  return scaled.map((x) => x + shift)
}

export interface PriceTargetFanProps {
  label?: string
  title?: string
  symbol?: string
  current?: number
  targets?: [PriceTarget, PriceTarget, PriceTarget]
  dates?: { start: string; mid: string; horizon: string }
  history?: number[]
  height?: number
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  asOf?: Date
  className?: string
}

export function PriceTargetFan({
  label = "Quant Projection Fan",
  title = "Quant Projection Fan",
  symbol = "XAU/USD",
  current = 2654.8,
  targets = [
    { key: "High TP2", price: 2682.0, analysts: 12 },
    { key: "Mean TP1", price: 2668.5, analysts: 28 },
    { key: "Invalidation SL", price: 2638.0, analysts: 5 },
  ],
  dates = { start: "4W Ago", mid: "2W Ago", horizon: "Target Horizon" },
  history,
  height = 260,
  isFullscreen = false,
  onToggleFullscreen,
  asOf,
  className,
}: PriceTargetFanProps) {
  const [boxRef, W] = useWidth<HTMLDivElement>(640)
  const H = height
  const reduced = useReducedMotion()
  const uid = useId().replace(/:/g, "")
  const clipId = `${uid}-fan`
  const fadeId = `${uid}-fade`
  const svgRef = useRef<SVGSVGElement>(null)
  const [scrub, setScrub] = useState<number | null>(null)
  const [hotT, setHotT] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const seen = useInView(rootRef, { once: true, amount: 0.3 })
  const play = !!reduced || seen
  const histClipId = `${uid}-hist`

  const hist = useMemo(() => (history && history.length > 5 ? history : buildHistory(current)), [history, current])
  const yLo = Math.min(...hist, ...targets.map((t) => t.price))
  const yHi = Math.max(...hist, ...targets.map((t) => t.price))
  const yPad = Math.max((yHi - yLo) * 0.08, 0.5)
  const yMin = yLo - yPad
  const yMax = yHi + yPad
  const y = useCallback((v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b), [yMin, yMax, H])
  const pct = (p: number) => ((p - current) / current) * 100
  const fmt = (p: number) => `$${p.toFixed(2)}`

  const geo = useMemo(() => {
    const histW = (W - PAD.l - PAD.r) * 0.56
    const hx = (i: number) => PAD.l + (i / (hist.length - 1)) * histW
    const nowX = hx(hist.length - 1)
    const nowY = y(current)
    const endX = W - PAD.r
    const line = hist.map((v, i) => `${i === 0 ? "M" : "L"}${hx(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
    const proj = targets.map((t, i) => {
      const ty = y(t.price)
      const cx = nowX + (endX - nowX) * 0.5
      const cy = nowY + (ty - nowY) * 0.15
      const color = t.color ?? (t.price >= current ? GREEN : RED)
      return { ...t, color, strength: i === 1 ? 1 : 0.6, ty, d: `M${nowX},${nowY} Q${cx},${cy} ${endX},${ty}`, cx, cy }
    })
    return { hx, nowX, nowY, endX, line, proj }
  }, [hist, targets, current, y, W])

  const onMove = (e: React.PointerEvent) => {
    const el = svgRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    if (px > geo.nowX + 6) {
      const py = ((e.clientY - r.top) / r.height) * H
      const t = Math.min(1, (px - geo.nowX) / (geo.endX - geo.nowX))
      const ys = geo.proj.map((p) => (1 - t) * (1 - t) * geo.nowY + 2 * (1 - t) * t * p.cy + t * t * p.ty)
      let nearest = 0
      let best = Number.POSITIVE_INFINITY
      ys.forEach((cy, i) => {
        const d = Math.abs(py - cy)
        if (d < best) {
          best = d
          nearest = i
        }
      })
      const spread = Math.max(...ys) - Math.min(...ys)
      setHotT(spread < 24 ? null : nearest)
      setScrub(null)
      return
    }
    setHotT(null)
    const histW = geo.nowX - PAD.l
    setScrub(Math.max(0, Math.min(hist.length - 1, Math.round(((px - PAD.l) / histW) * (hist.length - 1)))))
  }
  const onLeave = () => {
    setScrub(null)
    setHotT(null)
  }

  const when = (i: number) => {
    const ago = hist.length - 1 - i
    if (asOf) {
      const d = new Date(asOf)
      d.setDate(d.getDate() - ago * 7)
      return fmtDate.format(d)
    }
    return ago === 0 ? "Now" : `${ago} ${ago === 1 ? "week" : "weeks"} ago`
  }

  const mean = geo.proj[1]
  const head =
    hotT !== null
      ? {
          price: geo.proj[hotT].price,
          move: pct(geo.proj[hotT].price),
          hue: geo.proj[hotT].color,
          note: `${geo.proj[hotT].key} target (${geo.proj[hotT].analysts} models agreed)`,
        }
      : scrub !== null
        ? { price: hist[scrub], move: null, hue: GREEN, note: when(scrub) }
        : { price: mean.price, move: pct(mean.price), hue: mean.color, note: `${mean.key} (${mean.analysts} models agreed)` }

  const mode = hotT !== null ? `target-${hotT}` : scrub !== null ? "scrub" : "rest"
  const [headWhole, headCents] = fmt(head.price).split(".")

  const grid = useMemo(() => {
    const span = yMax - yMin
    const mag = 10 ** Math.floor(Math.log10(span / 3.2))
    const step = [1, 2, 2.5, 5, 10, 25, 50, 100].map((m) => m * mag).find((s) => span / s <= 4.2) ?? 10 * mag
    const out: number[] = []
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) out.push(v)
    return { step, out }
  }, [yMin, yMax])

  const still = reduced ? { duration: 0 } : undefined
  const morph = still ?? { duration: 0.35, ease: EASE }
  const fanW = geo.endX - geo.nowX + 40

  return (
    <div ref={boxRef} className={cn("w-full max-w-full tabular-nums", className)}>
      {/* Header */}
      <div className="mb-2 flex items-baseline justify-between text-[12px]">
        <span className="truncate text-foreground/45">{title}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="pl-3 font-medium text-foreground/90 font-mono">{symbol}</span>
        </div>
      </div>
      <div role="status">
        <motion.div
          key={mode}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.15, ease: EASE }}
        >
          <p className="m-0 text-[26px] font-semibold leading-none tracking-[-0.02em] text-foreground/90 font-mono">
            {headWhole}
            <span className="text-foreground/35">.{headCents}</span>
          </p>
          <p className="mb-0 mt-2 flex items-baseline gap-[7px] text-[12px] font-medium font-mono">
            {head.move !== null && <span style={{ color: head.hue }}>{signedPct(head.move)}</span>}
            <span className="font-normal text-foreground/45">{head.note}</span>
          </p>
        </motion.div>
      </div>

      {/* SVG Canvas */}
      <div className="relative mt-4" onPointerMove={onMove} onPointerLeave={onLeave}>
        <svg
          ref={svgRef}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ height: isFullscreen ? H : "auto" }}
          className="w-full max-w-full block cursor-crosshair touch-none select-none overflow-visible"
          role="img"
          aria-label={`${label}: mean target ${fmt(mean.price)}`}
        >
          <defs>
            <linearGradient id={fadeId} gradientUnits="userSpaceOnUse" x1={0} y1={PAD.t} x2={0} y2={H - PAD.b}>
              <stop offset="0" stopColor="var(--foreground)" stopOpacity={0} />
              <stop offset="0.45" stopColor="var(--foreground)" stopOpacity={0.16} />
              <stop offset="1" stopColor="var(--foreground)" stopOpacity={0.16} />
            </linearGradient>
            <clipPath id={histClipId}>
              <motion.rect
                x={PAD.l - 4}
                y={0}
                height={H}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: play ? geo.nowX - PAD.l + 8 : 0 }}
                transition={still ?? { duration: 0.6, ease: EASE }}
              />
            </clipPath>
            <clipPath id={clipId}>
              <motion.rect
                x={geo.nowX}
                y={0}
                height={H}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: play ? fanW : 0 }}
                transition={still ?? { duration: 0.4, ease: EASE, delay: 0.45 }}
              />
            </clipPath>
          </defs>

          {/* Gridlines */}
          {grid.out.map((v) => (
            <g key={v}>
              <motion.line
                x1={PAD.l}
                x2={geo.endX}
                stroke="var(--foreground)"
                strokeOpacity={0.06}
                strokeWidth={1}
                initial={false}
                animate={{ y1: y(v), y2: y(v) }}
                transition={morph}
              />
              <motion.text
                x={geo.endX + 10}
                fontSize={9}
                fontFamily="monospace"
                fill="var(--foreground)"
                fillOpacity={0.45}
                initial={false}
                animate={{ attrY: y(v) + 3, opacity: geo.proj.some((p) => Math.abs(p.ty - y(v)) < 12) ? 0 : 1 }}
                transition={morph}
              >
                ${Math.round(v)}
              </motion.text>
            </g>
          ))}

          {/* Date Axis */}
          {[
            { x: geo.hx(0), t: dates.start, a: "start" as const },
            { x: geo.hx(24), t: dates.mid, a: "middle" as const },
            { x: geo.nowX, t: "Now", a: "middle" as const },
            { x: geo.endX, t: dates.horizon, a: "middle" as const },
          ].map((d) => (
            <text key={d.t} x={d.x} y={H - 8} textAnchor={d.a} fontSize={9} fontFamily="monospace" fill="var(--foreground)" fillOpacity={0.45}>
              {d.t}
            </text>
          ))}

          {/* Now Divider */}
          <line x1={geo.nowX} y1={PAD.t} x2={geo.nowX} y2={H - PAD.b} stroke={`url(#${fadeId})`} strokeWidth={1} strokeDasharray="3 3" />

          {/* History Line */}
          <motion.path
            fill="none"
            stroke="var(--foreground)"
            strokeOpacity={0.85}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={`url(#${histClipId})`}
            initial={false}
            animate={{ d: geo.line }}
            transition={morph}
          />

          {/* Projections Fan */}
          <g clipPath={`url(#${clipId})`} pointerEvents="none">
            {geo.proj.map((p, i) => {
              const on = hotT === i
              const dim = hotT !== null && !on
              return (
                <g key={p.key} style={{ opacity: dim ? 0.35 : 1, transition: reduced ? "none" : "opacity 160ms" }}>
                  <motion.path
                    fill="none"
                    initial={false}
                    animate={{ d: p.d }}
                    transition={morph}
                    stroke={p.color}
                    strokeWidth={on ? 1.8 : 1.3}
                    vectorEffect="non-scaling-stroke"
                    strokeOpacity={on ? 1 : p.strength}
                    strokeDasharray="2 4"
                    strokeLinecap="round"
                  />
                  {on && (
                    <motion.path
                      d={p.d}
                      fill="none"
                      stroke={p.color}
                      strokeWidth={1.8}
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      initial={{ pathLength: reduced ? 1 : 0 }}
                      animate={{ pathLength: 1 }}
                      transition={still ?? { duration: 0.3, ease: EASE }}
                    />
                  )}
                  <motion.circle
                    cx={geo.endX}
                    r={on ? 4.5 : 3.5}
                    fill={p.color}
                    fillOpacity={on ? 1 : p.strength}
                    initial={false}
                    animate={{ cy: p.ty }}
                    transition={morph}
                  />
                  <text
                    x={geo.endX + 10}
                    y={p.ty + 3}
                    fontSize={9.5}
                    fontFamily="monospace"
                    fill={p.color}
                    fontWeight={on ? 600 : 500}
                  >
                    ${Math.round(p.price)} {p.key}
                  </text>
                </g>
              )
            })}
          </g>

          {/* Now Landing Dot */}
          <circle cx={geo.nowX} cy={geo.nowY} r={3.5} fill="var(--foreground)" />
        </svg>
      </div>
    </div>
  )
}
