"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import {
  BarChart3,
  Layers,
  BookOpen,
  Target,
  AlertTriangle,
  Cpu,
  Zap,
  LineChart,
  TrendingUp,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react"

import { cn } from "@/lib/utils"

// Ssych UI Suite (Pure Official Components)
import { AppNavbar } from "@/components/layout/app-navbar"
import { Button } from "@/components/ui/button"
import { VitalsStrip } from "@/components/ui/vitals-strip"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { PriceScrubber } from "@/components/ui/price-scrubber"
import { Candlestick } from "@/components/ui/candlestick"
import { ViewSwitch, type ViewOption } from "@/components/ui/view-switch"
import { DepthChart } from "@/components/ui/depth-chart"
import { OrderBook } from "@/components/ui/order-book"
import { useBinanceDepth } from "@/components/ui/use-binance-depth"
import { TradeTape } from "@/components/ui/trade-tape"
import { SankeyFlow } from "@/components/ui/sankey-flow"
import { FlowBars } from "@/components/ui/flow-bars"
import { RatingsRadar } from "@/components/ui/ratings-radar"
import { RadialGauge } from "@/components/ui/radial-gauge"
import { AgentRunTimeline } from "@/components/ui/agent-run-timeline"
import { KpiCardRow } from "@/components/ui/kpi-card-row"
import { ReturnsCalendar } from "@/components/ui/returns-calendar"
import { PriceTargetFan, type PriceTarget } from "@/components/ui/price-target-fan"
import { SignalCard, SignalDetailModal, type SignalMappingData } from "@/components/signal/signal-card"
import { useAuth } from "@/lib/auth-context"
import { type PairTelemetryData } from "@/lib/telemetry-store"

type TradingPair = "XAU-USD" | "BTC-USD"
type ChartDisplayMode = "candle" | "line" | "fan"



export default function MainInterfacePage() {
  const { user, adminConfig } = useAuth()
  const [activePair, setActivePair] = useState<TradingPair>("XAU-USD")
  const depthData = useBinanceDepth(activePair)
  const [chartMode, setChartMode] = useState<ChartDisplayMode>("candle") // default candle
  const [consoleTab, setConsoleTab] = useState<"book" | "depth" | "tape" | "sankey">("book")
  const [blotterTab, setBlotterTab] = useState<"deliberation" | "flow-bars" | "council-radar" | "returns">("deliberation")

  // Check if current user is logged in, free tier, or subscribed
  const isAuthenticated = !!user
  const isFreeTier = !isAuthenticated || user?.tier === "Free"
  // For demo/quant feed, XAU-USD is signal index 1, BTC-USD is signal index 2
  const signalIndex = activePair === "XAU-USD" ? 1 : 2

  const userTierQuota = user
    ? user.role === "Super Admin" || user.tier === "Admin" || user.tier === "Enterprise"
      ? adminConfig.enterpriseTierActiveQuota
      : user.tier === "Monthly"
      ? adminConfig.monthlyTierActiveQuota
      : user.tier === "Weekly"
      ? adminConfig.weeklyTierActiveQuota
      : adminConfig.freeTierActiveQuota
    : adminConfig.freeTierActiveQuota

  const hasAccessToSignal =
    isAuthenticated && (userTierQuota >= 999 || signalIndex <= userTierQuota || user?.role === "Super Admin")

  // Modal State for inspecting active signal reason & price mapping
  const [modalSignal, setModalSignal] = useState<SignalMappingData | null>(null)

  // Fullscreen Chart State & Container Ref
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(720)
  const chartCardRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (chartCardRef.current?.requestFullscreen) {
        chartCardRef.current.requestFullscreen().catch(() => {})
      }
      setIsFullscreen(true)
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    const handleResize = () => {
      setViewportHeight(window.innerHeight)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      window.removeEventListener("resize", handleResize)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Dynamic Chart Height based on fullscreen state
  const chartHeight = isFullscreen ? Math.max(520, viewportHeight - 140) : 290

  // Signals data initialized empty, then populated live from Supabase /api/signals
  const [signals, setSignals] = useState<Record<TradingPair, SignalMappingData> | null>(null)
  const [liveTelemetry, setLiveTelemetry] = useState<Record<TradingPair, PairTelemetryData> | null>(null)

  // Fetch live signals and telemetry from backend APIs
  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        const [sigRes, telemRes] = await Promise.all([
          fetch("/api/signals", { cache: "no-store" }),
          fetch("/api/telemetry", { cache: "no-store" }),
        ])

        if (sigRes.ok) {
          const sigData = await sigRes.json()
          if (sigData.success && sigData.signals && mounted) {
            setSignals({
              "XAU-USD": sigData.signals["XAU-USD"],
              "BTC-USD": sigData.signals["BTC-USD"],
            })
          }
        }

        if (telemRes.ok) {
          const telemData = await telemRes.json()
          if (telemData.success && telemData.telemetry && mounted) {
            setLiveTelemetry({
              "XAU-USD": telemData.telemetry["XAU-USD"],
              "BTC-USD": telemData.telemetry["BTC-USD"],
            })
          }
        }
      } catch (err) {
        console.warn("Could not fetch live telemetry or signals:", err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 4000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  // Telemetry fallback data
  const pairData: Record<TradingPair, PairTelemetryData> = {
    "XAU-USD": {
      name: "Gold Spot vs US Dollar",
      price: "$2,654.80",
      delta: "+1.14%",
      high: "$2,668.50",
      low: "$2,632.10",
      volume: "$18.42B",
      spread: "0.15",
      bias: "Bullish",
      confidence: 88,
      invalidation: "$2,638.00",
      target: "$2,685.00",
      rrRatio: "1 : 1.83",
      kpis: [
        { label: "London / NY Session Vol", data: [12.4, 13.8, 14.2, 15.6, 17.1, 18.4], format: "usd_b" },
        { label: "Net Aggressive Delta", data: [580, 610, 640, 720, 810, 890], format: "qty_oz" },
        { label: "Ask Absorption Ratio", data: [1.2, 1.4, 1.3, 1.6, 1.8, 2.1], format: "ratio" },
      ],
      steps: [
        {
          id: "step-1",
          step: "Asian Session Range Sweep",
          tool: "liquidity.sweep_detector",
          durationMs: 420,
          state: "done" as const,
          input: '{ "pair": "XAUUSD", "range": "Asian Low ($2,634.50)", "action": "Swept & Rejected" }',
          output: '{ "sweep_confirmed": true, "volume_multiplier": "2.4x" }',
        },
        {
          id: "step-2",
          step: "Fair Value Gap & Order Block",
          tool: "smc.fvg_validator",
          durationMs: 650,
          state: "done" as const,
          input: '{ "timeframe": "M15", "zone": "[$2,648.20 - $2,651.00]", "confluence": "H1 OB" }',
          output: '{ "mitigated": false, "invalidation": "$2,638.00" }',
        },
        {
          id: "step-3",
          step: "Orderflow Delta & Absorption",
          tool: "tape.footprint_delta",
          durationMs: 1100,
          state: "done" as const,
          input: '{ "cluster": "Ask Absorption @ $2,652.00", "passive_buyers": "Dominated" }',
          output: '{ "buyer_aggression": "76%", "delta_divergence": true }',
        },
        {
          id: "step-4",
          step: "Risk Synthesis & Target Plan",
          tool: "council.synthesis_guard",
          durationMs: 1950,
          state: "running" as const,
          input: '{ "entry": "$2,654.50", "stop_loss": "$2,638.00", "take_profit": "$2,685.00", "rr": "1:1.83" }',
          output: '{ "score": "88/100", "rules_status": "Passed" }',
        },
      ],
      flowBarsData: [12.4, 18.2, -8.1, 24.5, 31.0, -12.4, 16.8, 22.1, -4.5, 19.3, 27.8, 35.4],
      flowBarsLabels: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"],
      ratings: [
        { label: "Strong Buy", count: 42 },
        { label: "Moderate Buy", count: 28 },
        { label: "Neutral", count: 12 },
        { label: "Pullback Risk", count: 6 },
        { label: "Invalidation", count: 2 },
      ],
      radarInsights: [
        {
          title: "Liquidity Engine (42)",
          description: "Asian session low swept with strong rejection; resting buy liquidity intact above high.",
        },
        {
          title: "Microstructure Tape (28)",
          description: "Passive ask absorption confirmed on prints; institutional selling absent.",
        },
        {
          title: "Risk Checks (Approved)",
          description: "No conflicting interest rate release scheduled in current window.",
        },
      ],
      sankeySources: [
        { id: "etf", label: "Gold ETFs Inflow", value: 4200000, color: "var(--chart-1)" },
        { id: "cb", label: "Central Bank Demand", value: 3100000, color: "var(--chart-5)" },
        { id: "comex", label: "COMEX Speculators", value: 2400000, color: "var(--chart-3)" },
        { id: "retail", label: "Retail Net Volume", value: 1100000, color: "var(--chart-amber)" },
      ],
      sankeyUses: [
        { id: "spot", label: "LBMA Spot Settlement", value: 4500000, color: "var(--chart-1)" },
        { id: "hedge", label: "Dealer Hedging", value: 3200000, color: "var(--chart-2)" },
        { id: "arb", label: "Basis Arbitrage", value: 1900000, color: "var(--chart-3)" },
        { id: "liquidity", label: "Market Maker Spread", value: 1200000, color: "var(--chart-4)" },
      ],
      lastCalculated: "2026-10-13T12:00:00Z",
    },
    "BTC-USD": {
      name: "Bitcoin Spot & Perpetual Market",
      price: "$67,412.50",
      delta: "+2.84%",
      high: "$68,120.00",
      low: "$65,240.00",
      volume: "$44.12B",
      spread: "1.00",
      bias: "Bullish",
      confidence: 84,
      invalidation: "$65,800.00",
      target: "$71,200.00",
      rrRatio: "1 : 2.34",
      kpis: [
        { label: "Aggregate Perp Volume", data: [38.2, 40.1, 41.8, 43.5, 44.1], format: "usd_b" },
        { label: "Net Taker Delta", data: [1120, 1280, 1450, 1690, 1840], format: "qty_btc" },
        { label: "Bid / Ask Imbalance", data: [1.14, 1.18, 1.25, 1.34], format: "ratio" },
      ],
      steps: [
        {
          id: "step-1",
          step: "HTF Range Equilibrium",
          tool: "liquidity.htf_range",
          durationMs: 510,
          state: "done" as const,
          input: '{ "pair": "BTCUSD", "range": "[$65,000 - $68,500]", "equilibrium": "$66,750" }',
          output: '{ "breakout": "Above Value Area High" }',
        },
        {
          id: "step-2",
          step: "CVD Delta Absorption Test",
          tool: "tape.cvd_divergence",
          durationMs: 820,
          state: "done" as const,
          input: '{ "cvd_trend": "Rising", "taker_side": "Buy Dominant" }',
          output: '{ "absorption_rate": "89%", "divergence": true }',
        },
        {
          id: "step-3",
          step: "Liquidation Cluster Mapping",
          tool: "depth.liquidation_clusters",
          durationMs: 1450,
          state: "done" as const,
          input: '{ "short_liquidation_pool": "$68,200 - $69,000 ($420M)" }',
          output: '{ "magnetic_target": "$68,500", "cascade_probability": "78%" }',
        },
        {
          id: "step-4",
          step: "Execution Guard Verification",
          tool: "council.execution_guard",
          durationMs: 2200,
          state: "running" as const,
          input: '{ "entry": "$67,400", "invalidation": "$65,800", "target": "$71,200" }',
          output: '{ "score": "84/100", "verdict": "Valid" }',
        },
      ],
      flowBarsData: [28.4, 42.1, -18.2, 55.0, 68.2, -31.4, 44.5, 59.2, -12.8, 48.6, 72.1, 88.5],
      flowBarsLabels: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"],
      ratings: [
        { label: "Strong Buy", count: 39 },
        { label: "Moderate Buy", count: 31 },
        { label: "Neutral", count: 18 },
        { label: "Pullback Risk", count: 9 },
        { label: "Invalidation", count: 3 },
      ],
      radarInsights: [
        {
          title: "Perp Delta Aggression (39)",
          description: "Aggressive taker buys dominating with CVD breakout above prior swing high.",
        },
        {
          title: "Liquidation Magnet (31)",
          description: "Over $420M in short liquidations clustered between $68.2K and $69.0K.",
        },
        {
          title: "Exchange Inflow Buffer (Neutral)",
          description: "CEX coin deposits remain at 3-month lows indicating spot holding resilience.",
        },
      ],
      sankeySources: [
        { id: "etf", label: "Spot ETFs", value: 5800000, color: "var(--chart-1)" },
        { id: "binance", label: "Binance Derivatives", value: 3900000, color: "var(--chart-5)" },
        { id: "coinbase", label: "Coinbase Prime", value: 2700000, color: "var(--chart-3)" },
        { id: "deribit", label: "Deribit Options", value: 1600000, color: "var(--chart-amber)" },
      ],
      sankeyUses: [
        { id: "custody", label: "Cold Custody", value: 6100000, color: "var(--chart-1)" },
        { id: "market_makers", label: "MM Bid Ladders", value: 3400000, color: "var(--chart-2)" },
        { id: "short_liqs", label: "Short Covers", value: 2800000, color: "var(--chart-3)" },
        { id: "basis", label: "Cash & Carry", value: 1700000, color: "var(--chart-4)" },
      ],
      lastCalculated: "2026-10-13T12:00:00Z",
    },
  }

  // Dynamic history series for PriceTargetFan from Binance live feed
  const [liveHistorySeries, setLiveHistorySeries] = useState<number[] | null>(null)

  useEffect(() => {
    let active = true
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/binance-chart?symbol=${encodeURIComponent(activePair)}&tf=M15`)
        if (!res.ok) return
        const json = await res.json()
        if (active && json.success && Array.isArray(json.series) && json.series.length > 5) {
          setLiveHistorySeries(json.series)
        }
      } catch {
        // fallback to default
      }
    }
    fetchHistory()
    const interval = setInterval(fetchHistory, 15000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [activePair])

  // Dynamic telemetry merged with live backend pipeline
  const activeTelemetry: PairTelemetryData = (liveTelemetry && liveTelemetry[activePair]) || pairData[activePair]
  const current = {
    ...activeTelemetry,
    kpis: activeTelemetry.kpis.map((k) => ({
      label: k.label,
      data: k.data,
      format: (v: number) => {
        if (k.format === "usd_b") return `$${v.toFixed(1)}B`
        if (k.format === "qty_oz") return `+${v} Oz`
        if (k.format === "qty_btc") return `+${v} BTC`
        if (k.format === "ratio") return `${v.toFixed(2)}x`
        return `${v}`
      },
    })),
  }
  const currentSignal = signals ? signals[activePair] : null

  // Dynamic Price & Targets from currentSignal
  const currentPriceNum = useMemo(() => {
    const raw = (current.price || "").replace(/[^0-9.]/g, "")
    const parsed = parseFloat(raw)
    return !isNaN(parsed) && parsed > 0 ? parsed : activePair === "XAU-USD" ? 2654.8 : 67412.5
  }, [current.price, activePair])

  const dynamicTargets = useMemo((): [PriceTarget, PriceTarget, PriceTarget] => {
    const parseNum = (str: string | undefined, fallback: number) => {
      if (!str) return fallback
      const cleaned = str.replace(/[^0-9.]/g, "")
      const parsed = parseFloat(cleaned)
      return !isNaN(parsed) && parsed > 0 ? parsed : fallback
    }

    const t2 = parseNum(currentSignal?.target2, activePair === "XAU-USD" ? 2710.0 : 73500.0)
    const t1 = parseNum(currentSignal?.target1, activePair === "XAU-USD" ? 2685.0 : 71200.0)
    const inv = parseNum(currentSignal?.invalidation, activePair === "XAU-USD" ? 2638.0 : 65800.0)

    // Dynamic analyst consensus from 20-Agent Council confidence score
    const conf = currentSignal?.confidenceScore || 85
    const tp1Analysts = Math.min(20, Math.max(10, Math.round((conf / 100) * 20)))
    const tp2Analysts = Math.min(tp1Analysts, Math.max(3, Math.round(tp1Analysts * 0.65)))
    const slAnalysts = Math.max(1, 20 - tp1Analysts)

    return [
      { key: "High TP2", price: t2, analysts: tp2Analysts },
      { key: "Mean TP1", price: t1, analysts: tp1Analysts },
      { key: "Invalidation SL", price: inv, analysts: slAnalysts },
    ]
  }, [currentSignal, activePair])

  // Dynamic institutional liquidity flow (Sankey) scaled from live session volume & delta
  const dynamicSankey = useMemo(() => {
    const rawVol =
      parseFloat((current.volume || "").replace(/[^0-9.]/g, "")) ||
      (activePair === "XAU-USD" ? 18.42 : 44.12)
    const rawDelta = parseFloat((current.delta || "").replace(/[^0-9.-]/g, "")) || 1.14
    const isBull = rawDelta >= 0

    if (activePair === "XAU-USD") {
      // Dynamic scaling for Gold Spot (LBMA, Central Banks, ETFs, COMEX)
      const baseFlow = Math.max(5000000, Math.round(rawVol * 580000)) // ~$10.68M flow sample window
      const etfRatio = isBull ? 0.38 : 0.28
      const cbRatio = 0.28
      const comexRatio = isBull ? 0.22 : 0.31
      const etf = Math.round(baseFlow * etfRatio)
      const cb = Math.round(baseFlow * cbRatio)
      const comex = Math.round(baseFlow * comexRatio)
      const retail = Math.max(0, baseFlow - (etf + cb + comex))

      // Allocation uses
      const lbmaRatio = isBull ? 0.44 : 0.37
      const hedgeRatio = isBull ? 0.27 : 0.34
      const arbRatio = 0.17
      const lbma = Math.round(baseFlow * lbmaRatio)
      const hedge = Math.round(baseFlow * hedgeRatio)
      const arb = Math.round(baseFlow * arbRatio)
      const mmSpread = Math.max(0, baseFlow - (lbma + hedge + arb))

      const sources = [
        { id: "etf", label: "Gold ETFs (GLD/IAU)", value: etf, color: "var(--chart-1)" },
        { id: "cb", label: "Central Bank Reserves", value: cb, color: "var(--chart-5)" },
        { id: "comex", label: "COMEX Speculators", value: comex, color: "var(--chart-3)" },
        { id: "retail", label: "Exchange Taker Delta", value: retail, color: "var(--chart-amber)" },
      ]

      const uses = [
        { id: "spot", label: "LBMA Spot Settlement", value: lbma, color: "var(--chart-1)" },
        { id: "hedge", label: "Dealer Delta Hedging", value: hedge, color: "var(--chart-2)" },
        { id: "arb", label: "Basis Arbitrage (EFP)", value: arb, color: "var(--chart-3)" },
        { id: "liquidity", label: "Market Maker Spread", value: mmSpread, color: "var(--chart-4)" },
      ]

      return {
        sources,
        uses,
        total: baseFlow,
        title: "Physical Bullion Liquidity Routing · XAU/USD",
        hubLabel: "Bullion Clearing",
        hubSubtitle: "100% Physical & Hedging Flow Conserved",
        badge: "Binance CVD Proxy Model",
      }
    } else {
      // Dynamic scaling for Bitcoin Perpetual & Spot (ETFs, Derivs, Coinbase Prime)
      const baseFlow = Math.max(5000000, Math.round(rawVol * 320000)) // ~$14.12M flow sample window
      const etfRatio = isBull ? 0.40 : 0.30
      const binanceRatio = isBull ? 0.28 : 0.34
      const coinbaseRatio = 0.20
      const etf = Math.round(baseFlow * etfRatio)
      const binance = Math.round(baseFlow * binanceRatio)
      const coinbase = Math.round(baseFlow * coinbaseRatio)
      const deribit = Math.max(0, baseFlow - (etf + binance + coinbase))

      // Allocation uses
      const custodyRatio = isBull ? 0.44 : 0.35
      const mmRatio = 0.23
      const liqRatio = isBull ? 0.19 : 0.28
      const custody = Math.round(baseFlow * custodyRatio)
      const mm = Math.round(baseFlow * mmRatio)
      const liqs = Math.round(baseFlow * liqRatio)
      const carry = Math.max(0, baseFlow - (custody + mm + liqs))

      const sources = [
        { id: "etf", label: "Spot Bitcoin ETFs", value: etf, color: "var(--chart-1)" },
        { id: "binance", label: "Binance Perp Takers", value: binance, color: "var(--chart-5)" },
        { id: "coinbase", label: "Coinbase Prime Desk", value: coinbase, color: "var(--chart-3)" },
        { id: "deribit", label: "Deribit Options Delta", value: deribit, color: "var(--chart-amber)" },
      ]

      const uses = [
        { id: "custody", label: "Cold Custody Vaults", value: custody, color: "var(--chart-1)" },
        { id: "market_makers", label: "MM Bid-Ask Ladders", value: mm, color: "var(--chart-2)" },
        { id: "short_liqs", label: isBull ? "Short Squeeze Absorbed" : "Long Liqs Cascade", value: liqs, color: "var(--chart-3)" },
        { id: "basis", label: "Cash & Carry Basis", value: carry, color: "var(--chart-4)" },
      ]

      return {
        sources,
        uses,
        total: baseFlow,
        title: "Cross-Venue Liquidity Routing · BTC/USD",
        hubLabel: "Orderflow Pool",
        hubSubtitle: "100% Aggregated Liquidity Conserved",
        badge: "Live Binance Derivs Feed",
      }
    }
  }, [activePair, current.volume, current.delta])


  return (
    <div className="min-h-screen bg-black text-foreground font-sans antialiased selection:bg-zinc-800 flex flex-col">
      {/* Unified App Navbar (with Global Full-Width Macro Ticker Tape) */}
      <AppNavbar />

      {/* 3. Vitals Strip: Clean Market Microstructure & Status */}
      <section className="border-b border-white/[0.06] px-4 sm:px-6 py-2.5 bg-zinc-950/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          {(["XAU-USD", "BTC-USD"] as TradingPair[]).map((pair) => {
            const active = activePair === pair
            return (
              <button
                key={pair}
                onClick={() => setActivePair(pair)}
                className={`text-[12px] font-mono px-3 py-1 rounded-full transition-colors flex items-center gap-1.5 ${
                  active
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "text-foreground/60 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${pair === "XAU-USD" ? "bg-amber-400" : "bg-emerald-400"}`} />
                {pair}
              </button>
            )
          })}
        </div>

        <div className="overflow-x-auto scrollbar-none flex-1 lg:max-w-none">
          <VitalsStrip
            className="w-full justify-end"
            vitals={[
              {
                label: activePair,
                value: current.price,
                delta: current.delta,
                hint: "Last price with session change",
                icon: activePair === "XAU-USD" ? "XAU" : "BTC",
              },
              { label: "24h High", value: current.high, hint: "Session high price" },
              { label: "24h Low", value: current.low, hint: "Session low price" },
              { label: "24h Volume", value: current.volume, hint: "Aggregated exchange turnover" },
              { label: "Consensus Bias", value: current.bias, delta: `${current.confidence}%`, hint: "Model confidence score" },
              { label: "Risk / Reward", value: current.rrRatio, hint: "Target vs invalidation ratio" },
            ]}
          />
        </div>
      </section>

      {/* 4. Main Interface Layout */}
      <main className="flex-1 p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 w-full">
        {/* Left Column (Active Signal Card, Chart, Microstructure KPIs, & Deliberation Blotter) - 8 Kolom */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* 1. Main Live Chart Container (Positioned on top for immediate glance) */}
          <div
            ref={chartCardRef}
            className={cn(
              "rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-4 sm:p-6 backdrop-blur-md transition-all duration-300",
              isFullscreen && "fixed inset-0 z-50 rounded-none border-0 bg-zinc-950 p-4 sm:p-6 flex flex-col justify-start overflow-hidden shadow-2xl"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-white/70" />
                  <span className="text-xs font-mono uppercase tracking-wider text-foreground/60">
                    {current.name}
                  </span>
                </div>
                {/* ViewSwitch: Pure ssych animated view switcher */}
                <ViewSwitch<ChartDisplayMode>
                  value={chartMode}
                  onChange={(mode) => setChartMode(mode)}
                  label="Chart View Switch"
                  options={[
                    {
                      id: "candle",
                      label: "Candlestick · Binance Live & Historical Bars",
                      short: "Candle",
                      icon: <BarChart3 className="h-3.5 w-3.5" />,
                    },
                    {
                      id: "line",
                      label: "Price Scrubber · Line & Crosshair",
                      short: "Line",
                      icon: <LineChart className="h-3.5 w-3.5" />,
                    },
                    {
                      id: "fan",
                      label: "Quant Target Fan · Multi-Model Projections",
                      short: "Targets",
                      icon: <TrendingUp className="h-3.5 w-3.5" />,
                    },
                  ]}
                />
              </div>
              <div className="flex items-center gap-2">
                {/* Fullscreen icon button */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={toggleFullscreen}
                  className="h-7 w-7 text-foreground/60 hover:text-foreground hover:bg-white/[0.08] border border-white/[0.08] rounded-md transition-colors cursor-pointer"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chart"}
                  aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen Chart"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Price Chart Display Switcher */}
            <div className={cn("w-full", isFullscreen && "flex-1 min-h-0 flex flex-col justify-center")}>
              {chartMode === "candle" ? (
                <Candlestick
                  name={current.name}
                  symbol={activePair}
                  height={chartHeight}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={toggleFullscreen}
                />
              ) : chartMode === "line" ? (
                <PriceScrubber
                  name={current.name}
                  symbol={activePair}
                  height={chartHeight}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={toggleFullscreen}
                />
              ) : (
                <PriceTargetFan
                  title={`${current.name} Quant Projections`}
                  symbol={activePair === "XAU-USD" ? "XAU/USD" : "BTC/USD"}
                  current={currentPriceNum}
                  targets={dynamicTargets}
                  height={chartHeight}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={toggleFullscreen}
                  history={liveHistorySeries ?? undefined}
                />
              )}
            </div>
          </div>

          {/* 2. Active Signal Confluence & Mapping Card */}
          <div className="space-y-2">
            {!isAuthenticated ? (
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-white/[0.08] bg-zinc-900/60 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-foreground/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  Public Terminal View · Signal locked
                </span>
                <Link
                  href="/login"
                  className="text-white hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Sign In to unlock</span>
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : isFreeTier ? (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-[11px] font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Free Tier Quota: {adminConfig.freeTierActiveQuota} Active Signals Allowed
                </span>
                <span className="text-foreground/50">
                  {hasAccessToSignal ? "Unmasked Access" : "Masked (Upgrade to Pass)"}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-[11px] font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {user?.tier} Pass Quota: {userTierQuota >= 999 ? "Unlimited Access" : `${userTierQuota} Active Signals`}
                </span>
                <span className="text-emerald-400 font-semibold">Active Access</span>
              </div>
            )}
            {currentSignal ? (
              <SignalCard
                signal={currentSignal}
                onOpenModal={() => setModalSignal(currentSignal)}
                isSubscribed={hasAccessToSignal}
              />
            ) : (
              <div className="h-64 rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-6 flex flex-col items-center justify-center gap-3 backdrop-blur-md">
                <div className="h-7 w-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                <span className="text-xs font-mono text-foreground/50">Connecting live quantitative feed...</span>
              </div>
            )}
          </div>

          {/* Microstructure KPI Row */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-4 sm:p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-mono uppercase tracking-wider text-foreground/60">
                Market Microstructure
              </span>
              <span className="text-[11px] text-foreground/40 font-mono">Live Session</span>
            </div>
            <KpiCardRow
              items={current.kpis}
              labels={["vs Session Open", "M15", "H1", "H4", "D1", "Live"]}
            />
          </div>

          {/* Deliberation & Analytics Blotter */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-4 sm:p-6 backdrop-blur-md flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-white/70" />
                <span className="text-xs font-mono uppercase tracking-wider text-foreground/60">
                  Model Deliberation &amp; Flow Analysis
                </span>
              </div>

              {/* Blotter Switcher */}
              <SegmentedControl
                options={["Deliberation", "Orderflow Delta", "Council Weights", "Returns"]}
                value={
                  blotterTab === "deliberation"
                    ? "Deliberation"
                    : blotterTab === "flow-bars"
                    ? "Orderflow Delta"
                    : blotterTab === "council-radar"
                    ? "Council Weights"
                    : "Returns"
                }
                onChange={(val) => {
                  if (val === "Deliberation") setBlotterTab("deliberation")
                  else if (val === "Orderflow Delta") setBlotterTab("flow-bars")
                  else if (val === "Council Weights") setBlotterTab("council-radar")
                  else if (val === "Returns") setBlotterTab("returns")
                }}
              />
            </div>

            {/* Blotter Content */}
            <div className="min-h-[290px]">
              {blotterTab === "deliberation" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Step Rail Timeline */}
                  <div className="md:col-span-7">
                    <AgentRunTimeline
                      runId={
                        current.lastCalculated
                          ? `EVAL-${activePair === "BTC-USD" ? "BTC" : "XAU"}-${new Date(current.lastCalculated)
                              .toLocaleTimeString("en-GB", { hour12: false })
                              .replace(/:/g, "")
                              .slice(0, 4)}`
                          : `EVAL-${activePair}`
                      }
                      task={`Liquidity sweep & structural validation for ${activePair}`}
                      steps={current.steps}
                      defaultOpen={
                        current.steps.find((s) => s.state === "running")?.id || "step-4"
                      }
                    />
                  </div>

                  {/* Confidence Gauge & Price Levels */}
                  <div className="md:col-span-5 flex flex-col gap-4">
                    <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4 flex flex-col items-center">
                      <span className="text-[11px] font-mono text-foreground/60 uppercase tracking-wider mb-2">
                        Model Confidence
                      </span>
                      <RadialGauge
                        value={current.confidence}
                        max={100}
                        label="Confidence"
                        noun="score"
                        bands={[
                          { name: "Neutral", from: 0, tone: "down" },
                          { name: "Moderate", from: 60, tone: "none" },
                          { name: "Pass", from: 80, tone: "up" },
                        ]}
                      />
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4 space-y-2 text-xs font-mono">
                      <div className="flex justify-between items-center text-foreground/60">
                        <span>Signal Bias</span>
                        <span className="text-white font-medium">{current.bias}</span>
                      </div>
                      <div className="flex justify-between items-center text-foreground/60">
                        <span>Reference Entry</span>
                        <span className="text-white">{current.price}</span>
                      </div>
                      <div className="flex justify-between items-center text-foreground/60">
                        <span>Invalidation Level</span>
                        <span className="text-rose-400">{current.invalidation}</span>
                      </div>
                      <div className="flex justify-between items-center text-foreground/60">
                        <span>Target Level</span>
                        <span className="text-emerald-400">{current.target}</span>
                      </div>
                      <div className="flex justify-between items-center text-foreground/60 pt-1.5 border-t border-white/[0.06]">
                        <span>Risk to Reward</span>
                        <span className="text-white font-medium">{current.rrRatio}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Orderflow Daily Flow Bars */}
              {blotterTab === "flow-bars" && (
                <div className="w-full flex justify-center py-2">
                  <FlowBars
                    title={`Hourly Net Orderflow Delta · ${activePair}`}
                    prefix="$"
                    unit="M"
                    data={current.flowBarsData}
                    labels={current.flowBarsLabels}
                  />
                </div>
              )}

              {/* Council Weights Ratings Radar */}
              {blotterTab === "council-radar" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center py-2">
                  <div className="md:col-span-6 flex justify-center">
                    <RatingsRadar
                      title={`Model Consensus Weights · ${activePair}`}
                      caption="Weights across liquidity, microstructure, and macro checks"
                      ratings={current.ratings}
                    />
                  </div>
                  <div className="md:col-span-6 space-y-2.5 text-xs font-mono text-foreground/60">
                    {current.radarInsights.map((insight, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-white/[0.06] bg-zinc-900/30">
                        <span className="text-white font-medium block mb-1">{insight.title}</span>
                        <span>{insight.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Returns Calendar */}
              {blotterTab === "returns" && (
                <div className="w-full py-2">
                  <ReturnsCalendar />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Side Console: Orderbook, Depth, Tape, Sankey Flow) - 4 Kolom */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-4 sm:p-6 backdrop-blur-md sticky top-14">
            {/* Console Header */}
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.06]">
              <span className="text-xs font-mono uppercase tracking-wider text-foreground/60 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-white/70" />
                Console
              </span>

              {/* Console Switcher */}
              <SegmentedControl
                options={["Orderbook", "Depth", "Tape", "Sankey"]}
                value={
                  consoleTab === "book"
                    ? "Orderbook"
                    : consoleTab === "depth"
                    ? "Depth"
                    : consoleTab === "tape"
                    ? "Tape"
                    : "Sankey"
                }
                onChange={(val) => {
                  if (val === "Orderbook") setConsoleTab("book")
                  else if (val === "Depth") setConsoleTab("depth")
                  else if (val === "Tape") setConsoleTab("tape")
                  else if (val === "Sankey") setConsoleTab("sankey")
                }}
              />
            </div>

            {/* Console Views */}
            <div className="flex flex-col w-full">
              {consoleTab === "book" && (
                <div className="w-full">
                  <OrderBook
                    symbol={activePair}
                    unit={activePair === "XAU-USD" ? "Oz" : "BTC"}
                    bids={depthData.bids.length > 0 ? depthData.bids : undefined}
                    asks={depthData.asks.length > 0 ? depthData.asks : undefined}
                    tick={activePair === "XAU-USD" ? 0.05 : 0.1}
                    groupings={activePair === "XAU-USD" ? [0.1, 0.5, 1.0, 2.5] : [0.5, 1.0, 5.0, 10.0]}
                    rows={8}
                    feed={false}
                  />
                </div>
              )}

              {consoleTab === "depth" && (
                <div className="w-full">
                  <DepthChart
                    symbol={activePair}
                    unit={activePair === "XAU-USD" ? "Oz" : "BTC"}
                    bids={depthData.bids.length > 0 ? depthData.bids : undefined}
                    asks={depthData.asks.length > 0 ? depthData.asks : undefined}
                    tick={activePair === "XAU-USD" ? 0.05 : 0.1}
                    reaches={activePair === "BTC-USD" ? [0.05, 0.1, 0.25] : [0.1, 0.25, 0.5]}
                    height={320}
                  />
                </div>
              )}

              {consoleTab === "tape" && (
                <div className="w-full">
                  <TradeTape
                    symbol={activePair}
                    flush
                    maxRows={20}
                    initialLive={true}
                    priceDp={2}
                    sizeDp={4}
                  />
                </div>
              )}

              {consoleTab === "sankey" && (
                <div className="w-full">
                  <SankeyFlow
                    title={dynamicSankey.title}
                    sources={dynamicSankey.sources}
                    uses={dynamicSankey.uses}
                    hubLabel={dynamicSankey.hubLabel}
                    hubSubtitle={dynamicSankey.hubSubtitle}
                    badge={dynamicSankey.badge}
                    formatValue={(v) => `$${(v / 1e6).toFixed(2)}M`}
                  />
                </div>
              )}
            </div>

            {/* Quiet Footer Note */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-foreground/45">
              <span>Model Invalidation Active</span>
              <span>SL / TP Monitored</span>
            </div>
          </div>
        </div>
      </main>

      {/* 5. Terminal Footer */}
      <footer className="border-t border-white/[0.08] px-4 sm:px-6 py-3 mt-auto bg-zinc-950/80 text-foreground/45 text-xs font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-foreground/70">needpips terminal</span>
          <span>·</span>
          <span>XAU/USD &amp; BTC/USD</span>
          <span>·</span>
          <span>Sankey Flow &amp; Model Deliberation</span>
        </div>
        <div>
          <span>needpips terminal</span>
        </div>
      </footer>

      {/* Signal Detailed Reason & Price Mapping Modal */}
      <SignalDetailModal
        open={modalSignal !== null}
        onClose={() => setModalSignal(null)}
        signal={modalSignal}
      />
    </div>
  )
}
