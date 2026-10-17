"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronRight,
  Layers,
  Shield,
  TrendingUp,
  Zap,
  HelpCircle,
  Activity,
  BarChart3,
  Search,
} from "lucide-react"
import { AppNavbar } from "@/components/layout/app-navbar"
import { ScreenShuffle } from "@/components/ui/screen-shuffle"
import { MouseTrailCta } from "@/components/ui/mouse-trail-cta"
import { ProjectIndex, type ProjectIndexItem } from "@/components/ui/project-index"
import { MacbookFrame } from "@/components/ui/macbook-frame"
import { IndexCard } from "@/components/ui/index-card"
import { Accordion, type AccordionItem } from "@/components/ui/accordion"
import { VitalsStrip } from "@/components/ui/vitals-strip"

// ProjectIndex sample data showcasing quant research modules
const RESEARCH_INDEX_ITEMS: ProjectIndexItem[] = [
  {
    title: "Order Flow Footprint Imbalance",
    tag: "Volume Profile",
    year: "v2.4",
    ticker: "OFI-20",
    change: 14.8,
    series: [100, 104, 102, 108, 114, 112, 118, 122, 126],
  },
  {
    title: "Asian Range Sweep Defense",
    tag: "Liquidity SMC",
    year: "v3.1",
    ticker: "ARS-XAU",
    change: 22.4,
    series: [210, 215, 212, 224, 230, 238, 245, 252, 258],
  },
  {
    title: "Macro Yield & DXY Divergence",
    tag: "Macro Cross",
    year: "v1.8",
    ticker: "DXY-YLD",
    change: 8.6,
    series: [98, 97, 99, 102, 101, 104, 106, 108],
  },
  {
    title: "Spot Bitcoin ETF Net Flow Model",
    tag: "Institutional ETF",
    year: "v2.0",
    ticker: "ETF-BTC",
    change: 31.2,
    series: [310, 318, 325, 340, 355, 370, 390, 412],
  },
]

// FAQ Section Items using pure ssych Accordion component
const FAQ_ITEMS: AccordionItem[] = [
  {
    title: "How does the 20-model consensus engine work?",
    body: "Every setup is evaluated concurrently by 20 dedicated quantitative models spanning footprint delta, structural order blocks, macro liquidity, and statistical mean-reversion. A signal is emitted only when a strict quorum threshold (typically >= 80% agreement) is met.",
  },
  {
    title: "Which trading instruments are monitored?",
    body: "NeedPips strictly focuses on the two deepest institutional liquidity pools: XAU/USD (Spot Gold) and BTC/USD (Bitcoin). This narrow focus eliminates noise and ensures high execution precision.",
  },
  {
    title: "Is NeedPips a custodial trading platform or broker?",
    body: "No. NeedPips is 100% non-custodial intelligence. We never manage or custody your funds. You execute signals on your own preferred broker or exchange with disciplined 1–2% risk parameters.",
  },
  {
    title: "What is included with Weekly and Monthly passes?",
    body: "Subscribers receive unthrottled real-time signals, numerical invalidation (SL) and dual target (TP1/TP2) levels, confluence breakdowns, live macro calendar alerts, and exportable performance journals.",
  },
  {
    title: "How are invalidation levels calculated?",
    body: "Invalidation thresholds are determined based on technical structure failure points (e.g. key swing highs/lows) rather than arbitrary pip distances, ensuring minimum statistical drawdowns.",
  },
]

import { useState, useEffect } from "react"

export default function LandingPage() {
  const [liveVitals, setLiveVitals] = useState({
    btcPrice: "$83,680.00",
    btcDelta: "+0.74%",
    xauPrice: "$2,654.80",
    xauDelta: "+1.14%",
  })

  useEffect(() => {
    async function fetchLandingPrices() {
      try {
        const symbols = JSON.stringify(["BTCUSDT", "PAXGUSDT"])
        const res = await fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`)
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data)) {
          const btc = data.find((d: { symbol: string }) => d.symbol === "BTCUSDT")
          const paxg = data.find((d: { symbol: string }) => d.symbol === "PAXGUSDT")
          setLiveVitals({
            btcPrice: btc ? `$${parseFloat(btc.lastPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$83,680.00",
            btcDelta: btc ? `${parseFloat(btc.priceChangePercent) >= 0 ? "+" : ""}${parseFloat(btc.priceChangePercent).toFixed(2)}%` : "+0.74%",
            xauPrice: paxg ? `$${parseFloat(paxg.lastPrice).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$2,654.80",
            xauDelta: paxg ? `${parseFloat(paxg.priceChangePercent) >= 0 ? "+" : ""}${parseFloat(paxg.priceChangePercent).toFixed(2)}%` : "+1.14%",
          })
        }
      } catch {}
    }
    fetchLandingPrices()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-white/20">
      <AppNavbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 space-y-24">
        {/* 1. Hero Section */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-300 uppercase tracking-widest mb-6 font-semibold">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span>AI Quantitative Market Analysis Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.08] mb-5">
            AI Quant Analysis &amp; Signals. Powered by 20-Model Consensus.
          </h1>

          <p className="text-sm sm:text-base text-foreground/60 leading-relaxed max-w-2xl mx-auto mb-8">
            NeedPips operates an autonomous council of 20 quantitative AI models analyzing real-time orderflow, liquidity sweeps, and macro catalysts across XAU/USD (Gold) and BTC/USD (Bitcoin).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <MouseTrailCta
              label="Launch Live Terminal"
              href="/"
              className="w-full sm:w-auto min-w-[220px] py-3.5 px-6 rounded-full"
            />

            <Link
              href="/pricing"
              className="px-6 py-3.5 rounded-full bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] text-white font-medium text-xs tracking-tight transition-all"
            >
              <span>View Access Passes</span>
            </Link>
          </div>
        </section>

        {/* 2. MacbookFrame Showcase & IndexCard Grid */}
        <section className="space-y-8">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[11px] font-mono text-foreground/45 uppercase tracking-widest block mb-1">
              Terminal Interface Preview
            </span>
            <h2 className="text-2xl font-semibold text-white tracking-tight">
              Calm, institutional execution interface
            </h2>
          </div>

          <div className="flex justify-center">
            <MacbookFrame>
              <div className="w-full h-full bg-zinc-950 p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
                <VitalsStrip
                  vitals={[
                    { label: "XAU/USD", value: liveVitals.xauPrice, delta: liveVitals.xauDelta, hint: "Spot Gold Asian sweep mitigation" },
                    { label: "BTC/USD", value: liveVitals.btcPrice, delta: liveVitals.btcDelta, hint: "Binance live spot orderflow" },
                    { label: "Consensus", value: "STRONG BUY", delta: "86.4%", hint: "88% model agreement reached" },
                  ]}
                />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl border border-white/[0.06] bg-zinc-900/50 font-mono text-[11px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-semibold">XAU/USD Long Setup</span>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">ACTIVE</span>
                    </div>
                    <div className="text-foreground/45 text-[10px]">Entry: $2,642.50 • SL: $2,634.00</div>
                    <div className="text-emerald-400 text-[10px] font-medium">TP1: $2,658.00 • TP2: $2,674.00</div>
                  </div>

                  <div className="p-3 rounded-xl border border-white/[0.06] bg-zinc-900/50 font-mono text-[11px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-semibold">BTC/USD Long Setup</span>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">ACTIVE</span>
                    </div>
                    <div className="text-foreground/45 text-[10px]">Entry: $67,850.00 • SL: $66,900.00</div>
                    <div className="text-emerald-400 text-[10px] font-medium">TP1: $69,200.00 • TP2: $71,500.00</div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-foreground/40 text-center pt-2">
                  NeedPips Quant Terminal • High-frequency algorithmic blotter
                </div>
              </div>
            </MacbookFrame>
          </div>
        </section>

        {/* 3. ScreenShuffle & IndexCard Double Column */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="text-[11px] font-mono text-foreground/45 uppercase tracking-widest block">
              Multi-View Analytics Stack
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight">
              Deep orderflow transparency across every market cycle
            </h2>
            <p className="text-xs sm:text-sm text-foreground/60 leading-relaxed">
              Cycle through specialized research blotters including the Sankey liquidity router, ratings radar, and returns matrix to audit how individual models deliberate before publishing.
            </p>

            <div className="pt-4 flex justify-start">
              <IndexCard className="w-full max-w-[360px]" />
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            {/* ScreenShuffle: Pure ssych stacked-screens component */}
            <div className="w-full max-w-[420px] h-[320px] flex items-center justify-center">
              <ScreenShuffle />
            </div>
          </div>
        </section>

        {/* 4. ProjectIndex Section (Holdings & Models List) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <span className="text-[11px] font-mono text-foreground/45 uppercase tracking-widest block mb-1">
                Quantitative Research Modules
              </span>
              <h2 className="text-2xl font-semibold text-white tracking-tight">
                Consensus Engine Sub-Models
              </h2>
            </div>
            <p className="text-xs text-foreground/50 max-w-sm">
              Each module specializes in one structural dimension, contributing weighted scores to the final quorum.
            </p>
          </div>

          {/* ProjectIndex: Pure ssych list with interactive hover cover preview */}
          <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/40 p-4 sm:p-6">
            <ProjectIndex
              items={RESEARCH_INDEX_ITEMS}
              label="Quantitative Research Models"
            />
          </div>
        </section>

        {/* 5. About Us Section */}
        <section className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-8 sm:p-12 backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10.5px] font-mono text-foreground/70 uppercase tracking-widest font-semibold">
                <BrainCircuit className="h-3 w-3 text-emerald-400" />
                <span>About NeedPips</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                Built by quant researchers. Engineered for serious traders.
              </h2>
            </div>

            <div className="lg:col-span-7 space-y-4 text-xs sm:text-sm text-foreground/60 leading-relaxed font-sans">
              <p>
                NeedPips was founded to bridge the gap between institutional algorithmic desks and independent traders. Traditional trading signals often rely on arbitrary indicators or individual human discretion, which leads to emotional drawdowns and inconsistent execution.
              </p>
              <p>
                By deploying an autonomous council of 20 specialized AI models—each evaluating distinct layers from order book depth to macroeconomic shifts—we establish a mathematically verifiable quorum before any trade recommendation is broadcasted.
              </p>
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs text-white">
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/[0.06]">
                  <span className="text-foreground/45 text-[10px] block">TARGET ASSETS</span>
                  <span className="font-semibold text-emerald-400">XAU/USD &amp; BTC/USD</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/[0.06]">
                  <span className="text-foreground/45 text-[10px] block">DELIBERATION QUORUM</span>
                  <span className="font-semibold text-white">20 AI Models</span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-white/[0.06] col-span-2 sm:col-span-1">
                  <span className="text-foreground/45 text-[10px] block">CUSTODY STATUS</span>
                  <span className="font-semibold text-white">100% Non-Custodial</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. FAQ Q&A Section (Using pure ssych Accordion component) */}
        <section className="space-y-6">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[11px] font-mono text-foreground/45 uppercase tracking-widest block mb-1">
              Knowledge Base
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-foreground/50 mt-1">
              Clear answers regarding our consensus methodology, subscription passes, and execution bounds.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-8 backdrop-blur-md max-w-3xl mx-auto">
            <Accordion items={FAQ_ITEMS} defaultOpen={0} />
          </div>
        </section>

        {/* 7. MouseTrailCta Interactive Footer Banner */}
        <section className="relative rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-8 sm:p-14 text-center backdrop-blur-md overflow-hidden flex flex-col items-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-3">
            Step into consensus-driven market intelligence
          </h2>
          <p className="text-xs sm:text-sm text-foreground/55 max-w-md mx-auto mb-8">
            Activate your weekly or monthly subscription pass to unmask real-time signal levels and mathematical risk bounds.
          </p>

          {/* MouseTrailCta: Full stage with quantitative green particle dust */}
          <MouseTrailCta
            label="Activate Access Pass"
            href="/pricing"
            className="w-full max-w-lg py-12 rounded-2xl bg-zinc-900/30 border border-white/[0.04]"
          />
        </section>
      </main>

      {/* Institutional Landing Page Footer with Author Badge (Pure SSYCH Tokens) */}
      <footer className="mt-16 border-t border-white/[0.08] bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-md bg-white/10 border border-white/15 flex items-center justify-center">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-white tracking-tight">needpips</span>
              <span className="text-[10px] text-foreground/45 uppercase tracking-wider">Quant Terminal</span>
            </div>
          </div>

          {/* Author Badge (Pure SSYCH Spec) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-foreground/70">
            <span className="text-[10.5px] text-foreground/45">Architect &amp; Lead:</span>
            <span className="text-[11px] font-semibold text-white tracking-tight">anderasinggih</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
          </div>

          <div className="text-[10.5px] text-foreground/45">
            © 2026 needpips.io · All mathematical models non-custodial
          </div>
        </div>
      </footer>
    </div>
  )
}
