"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Globe,
  Clock,
  Flame,
  AlertTriangle,
  ChevronRight,
} from "lucide-react"
import { AppNavbar } from "@/components/layout/app-navbar"
import { NewsCard, type NewsItem } from "@/components/ui/news-card"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { cn } from "@/lib/utils"

/* 1. Definisi Jadwal Kalender Ekonomi & Makro */
export interface EconomicEvent {
  id: string
  time: string
  date: string
  currency: string
  event: string
  impact: "High" | "Medium" | "Low"
  forecast: string
  previous: string
  actual?: string
  affectedAssets: ("XAU/USD" | "BTC/USD")[]
  rationale: string
}

const ECONOMIC_SCHEDULE: EconomicEvent[] = [
  {
    id: "e1",
    date: "Wednesday, Oct 14",
    time: "19:30 UTC+7",
    currency: "USD",
    event: "US CPI (Consumer Price Index) Report",
    impact: "High",
    forecast: "0.2%",
    previous: "0.3%",
    affectedAssets: ["XAU/USD", "BTC/USD"],
    rationale: "Direct driver of US Dollar (DXY) momentum. Reading divergence accelerates liquidity sweep on Spot Gold and Bitcoin.",
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
    affectedAssets: ["XAU/USD", "BTC/USD"],
    rationale: "Key central bank monetary policy signal dictating benchmark yield curve trajectory.",
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
    affectedAssets: ["XAU/USD"],
    rationale: "Upstream pipeline wholesale price pressure signaling secondary inflation trends.",
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
    affectedAssets: ["XAU/USD", "BTC/USD"],
    rationale: "Leading indicator of consumer interest rate sensitivity and real economic health.",
  },
]

/* 2. Headline Highlights Wire untuk NewsCard */
const ROTATING_WIRE_ITEMS: NewsItem[] = [
  {
    time: "14m ago",
    headline: "Central banks accumulate 42 tonnes of bullion in Q3, defending $2,630 demand block.",
    source: "Bullion Quant Wire",
  },
  {
    time: "48m ago",
    headline: "Spot Bitcoin ETFs print fourth straight day of inflows exceeding $380M.",
    source: "On-Chain Flow Desk",
  },
  {
    time: "2h ago",
    headline: "US 10-Yr sovereign yields ease to 4.08% ahead of CPI release.",
    source: "Macro Rates Monitor",
  },
]

export default function MarketNewsPage() {
  const router = useRouter()
  const [impactFilter, setImpactFilter] = useState<string>("All Impacts")
  const [assetFilter, setAssetFilter] = useState<string>("All Assets")
  const [wireItems, setWireItems] = useState<NewsItem[]>(ROTATING_WIRE_ITEMS)
  const [events, setEvents] = useState<EconomicEvent[]>(ECONOMIC_SCHEDULE)
  const [isLive, setIsLive] = useState<boolean>(false)

  useEffect(() => {
    async function loadLiveData() {
      try {
        const res = await fetch("/api/market-news")
        if (res.ok) {
          const data = await res.json()
          if (data.wire && Array.isArray(data.wire) && data.wire.length > 0) {
            setWireItems(
              data.wire.map((w: any) => ({
                time: w.time,
                headline: w.headline,
                source: w.source,
              }))
            )
          }
          if (data.schedule && Array.isArray(data.schedule) && data.schedule.length > 0) {
            setEvents(
              data.schedule.map((s: any) => ({
                id: s.id,
                date: s.date.split("•")[0]?.trim() || s.date,
                time: s.date.split("•")[1]?.trim() || "19:30 UTC+7",
                currency: s.country,
                event: s.title,
                impact: s.impact,
                forecast: s.forecast,
                previous: s.previous,
                affectedAssets: s.affectedAssets,
                rationale: s.rationale,
              }))
            )
          }
          setIsLive(true)
        }
      } catch {
        // Keep fallback data
      }
    }
    loadLiveData()
    const timer = setInterval(loadLiveData, 60000)
    return () => clearInterval(timer)
  }, [])

  // Filter jadwal ekonomi
  const filteredSchedule = events.filter((item) => {
    const matchImpact =
      impactFilter === "All Impacts" ||
      (impactFilter === "High Impact" && item.impact === "High") ||
      (impactFilter === "Medium Impact" && item.impact === "Medium") ||
      (impactFilter === "Low Impact" && item.impact === "Low")

    const matchAsset =
      assetFilter === "All Assets" ||
      (assetFilter === "XAU/USD" && item.affectedAssets.includes("XAU/USD")) ||
      (assetFilter === "BTC/USD" && item.affectedAssets.includes("BTC/USD"))

    return matchImpact && matchAsset
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-white/20">
      <AppNavbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/[0.08] mb-6 sm:mb-8">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10.5px] font-mono text-foreground/70 uppercase tracking-widest font-semibold">
              <Globe className="h-3 w-3 text-emerald-400" />
              <span>Economic Calendar &amp; Catalysts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Market News &amp; Macro Schedule
            </h1>
            <p className="text-xs sm:text-sm text-foreground/55 max-w-2xl leading-relaxed">
              Live global macroeconomic releases, volatility impact scoring, and institutional orderflow implications for XAU/USD &amp; BTC/USD.
            </p>
          </div>

          {/* Rotating Live NewsCard */}
          <div className="w-full lg:w-[380px] shrink-0 p-4 rounded-[22px] border border-white/[0.08] bg-zinc-950/70 backdrop-blur-md">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/[0.06]">
              <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/50">
                Institutional Realtime Wire
              </span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9.5px] font-mono text-emerald-400 uppercase tracking-widest font-semibold">
                  {isLive ? "LIVE RSS API" : "CONNECTING"}
                </span>
              </div>
            </div>
            <NewsCard
              title="Live Wire Highlights"
              items={wireItems}
              cycleMs={4600}
            />
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Impact Filter */}
            <div className="overflow-x-auto scrollbar-none">
              <SegmentedControl
                options={["All Impacts", "High Impact", "Medium Impact", "Low Impact"]}
                value={impactFilter}
                onChange={(val) => setImpactFilter(val)}
                className="p-1 text-xs"
              />
            </div>

            {/* Asset Filter */}
            <div className="overflow-x-auto scrollbar-none">
              <SegmentedControl
                options={["All Assets", "XAU/USD", "BTC/USD"]}
                value={assetFilter}
                onChange={(val) => setAssetFilter(val)}
                className="p-1 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-foreground/45 shrink-0">
            <Clock className="h-3.5 w-3.5 text-foreground/50" />
            <span>Timezone: UTC+7 (WIB) • {filteredSchedule.length} Events Listed</span>
          </div>
        </div>

        {/* 1. Mobile Cards View (< 768px) */}
        <div className="block md:hidden space-y-3">
          {filteredSchedule.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/news/${item.id}`)}
              className="p-4 rounded-2xl border border-white/[0.08] bg-zinc-950/70 hover:bg-zinc-900/60 active:scale-[0.99] transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-white/[0.06] text-foreground/80 font-semibold">
                    {item.currency}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border",
                      item.impact === "High" && "bg-rose-500/10 text-rose-400 border-rose-500/25",
                      item.impact === "Medium" && "bg-amber-500/10 text-amber-400 border-amber-500/25",
                      item.impact === "Low" && "bg-zinc-800 text-zinc-400 border-white/[0.08]"
                    )}
                  >
                    {item.impact === "High" && <Flame className="h-2.5 w-2.5 text-rose-400" />}
                    {item.impact === "Medium" && <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />}
                    <span>{item.impact}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[11px] font-medium text-white">{item.time}</span>
                  <span className="block font-mono text-[10px] text-foreground/40">{item.date}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-foreground/90 group-hover:text-white transition-colors flex items-center justify-between gap-2">
                  <span>{item.event}</span>
                  <ChevronRight className="h-4 w-4 text-foreground/30 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                </h3>
                <p className="text-[11px] font-mono text-foreground/50 mt-1 line-clamp-2 leading-relaxed">
                  {item.rationale}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.05] text-[10.5px] font-mono">
                <div className="flex items-center gap-3">
                  <span className="text-foreground/45">Forecast: <span className="text-white font-medium">{item.forecast}</span></span>
                  <span className="text-foreground/45">Prior: <span className="text-foreground/60">{item.previous}</span></span>
                </div>
                <div className="flex items-center gap-1">
                  {item.affectedAssets.map((pair) => (
                    <span
                      key={pair}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9.5px] font-mono font-semibold border",
                        pair === "XAU/USD"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      )}
                    >
                      {pair}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 2. Desktop Table View (>= 768px) */}
        <div className="hidden md:block rounded-[24px] border border-white/[0.08] bg-zinc-950/50 p-6 sm:p-7 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] font-mono text-foreground/45 uppercase tracking-wider">
                <th className="pb-3 pr-4 font-medium">Date &amp; Time</th>
                <th className="pb-3 px-4 font-medium">Impact Level</th>
                <th className="pb-3 px-4 font-medium">Event &amp; Currency</th>
                <th className="pb-3 px-4 font-medium text-right">Forecast</th>
                <th className="pb-3 px-4 font-medium text-right">Previous</th>
                <th className="pb-3 px-4 font-medium">Target Pairs</th>
                <th className="pb-3 pl-4 font-medium">Quant Market Implication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredSchedule.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`/news/${item.id}`)}
                  className="hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors group cursor-pointer"
                >
                  {/* Date & Time */}
                  <td className="py-4 pr-4 whitespace-nowrap">
                    <span className="block font-medium text-white text-xs">{item.time}</span>
                    <span className="block font-mono text-[10.5px] text-foreground/45">{item.date}</span>
                  </td>

                  {/* Impact */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-semibold border",
                        item.impact === "High" && "bg-rose-500/10 text-rose-400 border-rose-500/25",
                        item.impact === "Medium" && "bg-amber-500/10 text-amber-400 border-amber-500/25",
                        item.impact === "Low" && "bg-zinc-800 text-zinc-400 border-white/[0.08]"
                      )}
                    >
                      {item.impact === "High" && <Flame className="h-3 w-3 text-rose-400" />}
                      {item.impact === "Medium" && <AlertTriangle className="h-3 w-3 text-amber-400" />}
                      <span>{item.impact}</span>
                    </span>
                  </td>

                  {/* Event & Currency */}
                  <td className="py-4 px-4 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10.5px] px-1.5 py-0.5 rounded bg-white/[0.06] text-foreground/80 font-semibold">
                        {item.currency}
                      </span>
                      <span className="font-medium text-foreground/90 group-hover:text-white transition-colors">
                        {item.event}
                      </span>
                    </div>
                  </td>

                  {/* Forecast */}
                  <td className="py-4 px-4 text-right font-mono text-foreground/75 whitespace-nowrap">
                    {item.forecast}
                  </td>

                  {/* Previous */}
                  <td className="py-4 px-4 text-right font-mono text-foreground/45 whitespace-nowrap">
                    {item.previous}
                  </td>

                  {/* Target Pairs */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {item.affectedAssets.map((pair) => (
                        <span
                          key={pair}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border",
                            pair === "XAU/USD"
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                          )}
                        >
                          {pair}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Technical Rationale & Navigation Indicator */}
                  <td className="py-4 pl-4 min-w-[260px] text-[11px] font-mono text-foreground/55 group-hover:text-foreground/80 transition-colors leading-relaxed">
                    <div className="flex items-center justify-between gap-3">
                      <span className="line-clamp-2">{item.rationale}</span>
                      <ChevronRight className="h-4 w-4 text-foreground/30 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] px-4 sm:px-6 py-3 mt-auto bg-zinc-950/80 text-foreground/45 text-xs font-mono flex items-center justify-between">
        <div>needpips terminal · Market News &amp; Macro Intelligence</div>
        <div>needpips intelligence</div>
      </footer>
    </div>
  )
}
