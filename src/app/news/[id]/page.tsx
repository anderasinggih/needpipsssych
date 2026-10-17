"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  AlertTriangle,
  Flame,
  TrendingUp,
  Activity,
  ShieldAlert,
  Zap,
  Layers,
  ArrowUpRight,
  Bot,
  Database,
  CheckCircle2,
} from "lucide-react"
import { AppNavbar } from "@/components/layout/app-navbar"
import { VitalsStrip, type Vital } from "@/components/ui/vitals-strip"
import { PriceScrubber } from "@/components/ui/price-scrubber"
import { CombRows, type CombRow } from "@/components/ui/comb-rows"
import { cn } from "@/lib/utils"
import type { NewsAIPlaybook } from "@/lib/news-playbook-store"

interface EconomicEventDetail {
  id: string
  date: string
  time: string
  currency: string
  event: string
  impact: "High" | "Medium" | "Low"
  forecast: string
  previous: string
  actual?: string
  affectedAssets: ("XAU/USD" | "BTC/USD")[]
  rationale: string
}

const FALLBACK_EVENTS: EconomicEventDetail[] = [
  {
    id: "e1",
    date: "Wednesday, Oct 14",
    time: "19:30 UTC+7",
    currency: "USD",
    event: "US CPI (Consumer Price Index) Report",
    impact: "High",
    forecast: "0.2%",
    previous: "0.3%",
    actual: "Pending",
    affectedAssets: ["XAU/USD", "BTC/USD"],
    rationale:
      "Direct driver of US Dollar (DXY) momentum. Reading divergence accelerates liquidity sweep on Spot Gold and Bitcoin via instant repricing of interest rate swap probability curves.",
  },
  {
    id: "e2",
    date: "Wednesday, Oct 14",
    time: "21:00 UTC+7",
    currency: "USD",
    event: "FOMC Member Waller Speech on Policy Outlook",
    impact: "High",
    forecast: "—",
    previous: "—",
    actual: "Pending",
    affectedAssets: ["XAU/USD", "BTC/USD"],
    rationale:
      "Key central bank monetary policy signal dictating benchmark yield curve trajectory and terminal federal funds rate expectations.",
  },
  {
    id: "e3",
    date: "Thursday, Oct 15",
    time: "19:30 UTC+7",
    currency: "USD",
    event: "US Producer Price Index (PPI) Final Demand",
    impact: "Medium",
    forecast: "0.1%",
    previous: "0.2%",
    actual: "Pending",
    affectedAssets: ["XAU/USD"],
    rationale:
      "Upstream pipeline wholesale price pressure signaling secondary inflation trends and producer margin compression.",
  },
  {
    id: "e4",
    date: "Friday, Oct 16",
    time: "19:30 UTC+7",
    currency: "USD",
    event: "US Retail Sales MoM (Advance)",
    impact: "High",
    forecast: "0.3%",
    previous: "0.1%",
    actual: "Pending",
    affectedAssets: ["XAU/USD", "BTC/USD"],
    rationale:
      "Leading indicator of consumer interest rate sensitivity and real economic health, driving immediate risk-on vs risk-off asset rotation.",
  },
]

export default function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const eventId = resolvedParams.id

  const [event, setEvent] = useState<EconomicEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [playbook, setPlaybook] = useState<NewsAIPlaybook | null>(null)
  const [playbookLoading, setPlaybookLoading] = useState(true)
  const [isPlaybookCached, setIsPlaybookCached] = useState(false)

  // Fetch AI Playbook when event is resolved
  useEffect(() => {
    if (!event) return
    const currentEvent = event

    async function fetchAiPlaybook() {
      setPlaybookLoading(true)
      try {
        // Fast-path: Check browser local cache first
        const cacheKey = `needpips_ai_playbook_${currentEvent.id}`
        const localCached = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null
        if (localCached) {
          try {
            const parsed = JSON.parse(localCached)
            setPlaybook(parsed)
            setIsPlaybookCached(true)
            setPlaybookLoading(false)
            return
          } catch {}
        }

        // Server-path: Call API with persistent file/database cache check
        const res = await fetch("/api/news-playbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentEvent.id,
            event: currentEvent.event,
            currency: currentEvent.currency,
            impact: currentEvent.impact,
            forecast: currentEvent.forecast,
            previous: currentEvent.previous,
            rationale: currentEvent.rationale,
            affectedAssets: currentEvent.affectedAssets,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.playbook) {
            setPlaybook(data.playbook)
            setIsPlaybookCached(data.cached ?? false)
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(cacheKey, JSON.stringify(data.playbook))
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn("Failed to retrieve AI Playbook:", err)
      } finally {
        setPlaybookLoading(false)
      }
    }

    fetchAiPlaybook()
  }, [event])

  useEffect(() => {
    async function loadEventData() {
      try {
        const res = await fetch("/api/market-news")
        if (res.ok) {
          const data = await res.json()
          if (data.schedule && Array.isArray(data.schedule)) {
            const found = data.schedule.find(
              (s: any) => String(s.id).toLowerCase() === String(eventId).toLowerCase()
            )
            if (found) {
              setEvent({
                id: found.id,
                date: found.date.split("•")[0]?.trim() || found.date,
                time: found.date.split("•")[1]?.trim() || "19:30 UTC+7",
                currency: found.country,
                event: found.title,
                impact: found.impact,
                forecast: found.forecast,
                previous: found.previous,
                actual: found.actual || "Pending",
                affectedAssets: found.affectedAssets || ["XAU/USD", "BTC/USD"],
                rationale: found.rationale,
              })
              setLoading(false)
              return
            }
          }
        }
      } catch (e) {
        // Fallback
      }

      // Check fallback list
      const fallback = FALLBACK_EVENTS.find(
        (e) => String(e.id).toLowerCase() === String(eventId).toLowerCase()
      )
      if (fallback) {
        setEvent(fallback)
      } else {
        // Default generic event if specific id is custom
        setEvent({
          id: eventId,
          date: "Scheduled This Week",
          time: "19:30 UTC+7",
          currency: "USD",
          event: `Economic Catalyst [${eventId}]`,
          impact: "High",
          forecast: "0.2%",
          previous: "0.3%",
          actual: "Pending",
          affectedAssets: ["XAU/USD", "BTC/USD"],
          rationale:
            "High impact tier release expected to cause significant liquidity expansion and immediate orderflow sweeps across major pairs.",
        })
      }
      setLoading(false)
    }

    loadEventData()
  }, [eventId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <AppNavbar />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-foreground/50">
              Loading economic event intelligence...
            </span>
          </div>
        </main>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <AppNavbar />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">
          <button
            onClick={() => router.push("/news")}
            className="flex items-center gap-2 text-xs font-mono text-foreground/60 hover:text-white mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to News Wire
          </button>
          <div className="p-8 rounded-2xl border border-white/[0.08] bg-zinc-900/30 text-center">
            <p className="text-sm text-foreground/60">Event intelligence record not found.</p>
          </div>
        </main>
      </div>
    )
  }

  const vitalsData: Vital[] = [
    {
      label: "Currency",
      value: event.currency,
      hint: "Sovereign jurisdiction and denomination",
    },
    {
      label: "Forecast",
      value: event.forecast,
      hint: "Consensus projection among Tier-1 primary dealers",
    },
    {
      label: "Previous",
      value: event.previous,
      hint: "Prior period verified benchmark release",
    },
    {
      label: "Vol Impact",
      value: event.impact,
      delta: event.impact === "High" ? "+85 bps" : "+35 bps",
      hint: "Estimated implied spread expansion during announcement",
    },
    {
      label: "Status",
      value: event.actual || "Pending",
      hint: "Bureau verification and tick lock status",
    },
  ]

  const macroCombRows: CombRow[] = [
    { label: "DXY Dollar Index", value: 42.5 },
    { label: "US 10Y Yield", value: 38.2 },
    { label: "Gold (XAU) Implied", value: 31.0 },
    { label: "Bitcoin Volatility", value: 24.8 },
    { label: "S&P 500 E-Mini", value: 18.4 },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <AppNavbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-3.5 sm:px-6 py-5 sm:py-8 space-y-6">
        {/* Navigation Breadcrumb & Terminal Link */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-foreground/60 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Market Calendar & News Wire</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-zinc-950 font-semibold bg-white hover:bg-zinc-200 px-3 py-1.5 rounded-full transition-all active:scale-[0.98] shadow-sm"
          >
            <Zap className="h-3.5 w-3.5 text-zinc-950" />
            <span>Open NeedPips Terminal</span>
          </Link>
        </div>

        {/* Event Header Banner */}
        <section className="p-4 sm:p-6 rounded-2xl border border-white/[0.08] bg-zinc-900/40 relative overflow-hidden space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-white font-medium border border-white/10">
                {event.currency}
              </span>
              <span
                className={cn(
                  "text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase tracking-wider font-semibold",
                  event.impact === "High"
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : event.impact === "Medium"
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                )}
              >
                {event.impact} Volatility Impact
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono text-foreground/55">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 opacity-70" />
                {event.date}
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Clock className="h-3.5 w-3.5" />
                {event.time}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {event.event}
            </h1>
            <p className="text-xs sm:text-sm text-foreground/65 leading-relaxed max-w-3xl">
              {event.rationale}
            </p>
          </div>

          {/* Primary Affected Assets Badges */}
          <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
            <span className="text-[10.5px] font-mono text-foreground/45 uppercase tracking-wider">
              Correlated Instruments:
            </span>
            {event.affectedAssets.map((asset) => (
              <span
                key={asset}
                className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-white/[0.06] text-white border border-white/[0.08] font-medium"
              >
                {asset}
              </span>
            ))}
          </div>
        </section>

        {/* SSYCH Vitals Strip Component */}
        <section className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-zinc-900/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              Event Vital Metrics
            </span>
            <span className="text-[11px] font-mono text-foreground/40">
              Interactive Hover Breakdown
            </span>
          </div>

          <div className="overflow-x-auto scrollbar-none py-1">
            <VitalsStrip
              vitals={vitalsData}
              counter="Orderflow Ticks"
              count={2849}
              every={1200}
            />
          </div>
        </section>

        {/* Charts & Macro Quant Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Price Scrubber Desk: Gold & Bitcoin Impact Projections */}
          <div className="lg:col-span-7 p-4 sm:p-6 rounded-2xl border border-white/[0.08] bg-zinc-900/30 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
                  Asset Price Scrub Simulation
                </span>
                <span className="text-[10.5px] font-mono text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded">
                  {event.affectedAssets[0] || "XAU/USD"}
                </span>
              </div>
              <p className="text-xs text-foreground/60 leading-relaxed mb-4">
                Interactive historical price scrubber demonstrating mean-reversion drift and
                liquidity cascade zones surrounding macro announcements.
              </p>
            </div>

            <div className="w-full flex justify-center overflow-x-auto scrollbar-none py-2">
              <PriceScrubber
                name={event.affectedAssets[0] === "BTC/USD" ? "Bitcoin" : "Spot Gold"}
                symbol={event.affectedAssets[0] === "BTC/USD" ? "BTC/USD" : "XAU/USD"}
              />
            </div>
          </div>

          {/* Comb Rows Desk: Factor Sensitivities */}
          <div className="lg:col-span-5 p-4 sm:p-6 rounded-2xl border border-white/[0.08] bg-zinc-900/30 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-cyan-400" />
                  Macro Factor Sensitivity
                </span>
                <span className="text-[10.5px] font-mono text-foreground/45">
                  Normalized Score
                </span>
              </div>
              <p className="text-xs text-foreground/60 leading-relaxed mb-4">
                Comparative elasticity across correlated markets relative to benchmark dollar
                velocity.
              </p>
            </div>

            <div className="w-full">
              <CombRows
                title="Cross-Market Elasticity"
                rows={macroCombRows}
                subject="DXY Dollar Index"
              />
            </div>
          </div>
        </div>

        {/* Quant Playbook & Tactical Scenarios */}
        <section className="p-4 sm:p-6 rounded-2xl border border-white/[0.08] bg-zinc-900/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">
                NeedPips Autonomous Execution Playbook
              </h2>
            </div>

            {/* AI Generation & Cache Badge */}
            <div className="flex items-center gap-2">
              {playbookLoading ? (
                <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1.5 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  Connecting to AI Model...
                </span>
              ) : playbook ? (
                isPlaybookCached ? (
                  <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
                    <Database className="h-3 w-3 text-emerald-400" />
                    <span>AI Playbook Cached · Instant Retained</span>
                  </span>
                ) : (
                  <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-cyan-400" />
                    <span>Live AI Inference Generated</span>
                  </span>
                )
              ) : (
                <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/10">
                  AI Provider Key Required
                </span>
              )}
            </div>
          </div>

          {playbook ? (
            <div className="space-y-4">
              {/* Executive Macro Summary from AI */}
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-foreground/45 uppercase tracking-wider">
                    Model Intelligence Summary:
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {playbook.sourceModel}
                  </span>
                </div>
                <p className="text-xs text-foreground/75 leading-relaxed">
                  {playbook.executiveSummary}
                </p>
              </div>

              {/* Scenarios Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Scenario A: Actual > Forecast */}
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] space-y-2.5">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-emerald-400 font-semibold">
                      {playbook.scenarioA.title}
                    </span>
                    <span className="text-foreground/50 text-[11px]">
                      {playbook.scenarioA.subtitle}
                    </span>
                  </div>
                  <p className="text-foreground/70 leading-relaxed">
                    {playbook.scenarioA.description}
                  </p>
                  <div className="pt-2 border-t border-emerald-500/15 space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-foreground/60">
                      <span>Bias: {playbook.scenarioA.targetBias}</span>
                      <span className="text-emerald-400 font-medium">
                        {playbook.scenarioA.targetLevel}
                      </span>
                    </div>
                    {playbook.scenarioA.invalidationLevel && (
                      <div className="text-[10px] text-foreground/40 truncate">
                        {playbook.scenarioA.invalidationLevel}
                      </div>
                    )}
                  </div>
                </div>

                {/* Scenario B: Actual < Forecast */}
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] space-y-2.5">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-rose-400 font-semibold">
                      {playbook.scenarioB.title}
                    </span>
                    <span className="text-foreground/50 text-[11px]">
                      {playbook.scenarioB.subtitle}
                    </span>
                  </div>
                  <p className="text-foreground/70 leading-relaxed">
                    {playbook.scenarioB.description}
                  </p>
                  <div className="pt-2 border-t border-rose-500/15 space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-foreground/60">
                      <span>Bias: {playbook.scenarioB.targetBias}</span>
                      <span className="text-rose-400 font-medium">
                        {playbook.scenarioB.targetLevel}
                      </span>
                    </div>
                    {playbook.scenarioB.invalidationLevel && (
                      <div className="text-[10px] text-foreground/40 truncate">
                        {playbook.scenarioB.invalidationLevel}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-white/[0.08] bg-zinc-900/30 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-zinc-300 font-semibold text-xs">
                <Bot className="h-4 w-4 text-zinc-400" />
                <span>Autonomous AI Macro Playbook Offline</span>
              </div>
              <p className="text-xs text-foreground/55 max-w-xl mx-auto leading-relaxed">
                To maintain institutional integrity without synthetic artifacts or heuristic rules,
                this scenario engine connects directly to live AI models (Google Gemini or OpenAI).
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 font-mono text-[11px] text-zinc-400">
                <span className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08]">
                  GEMINI_API_KEY
                </span>
                <span className="text-foreground/40">or</span>
                <span className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.08]">
                  OPENAI_API_KEY
                </span>
                <span className="text-foreground/40">in .env.local</span>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
