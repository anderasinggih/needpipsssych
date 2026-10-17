import { NextResponse } from "next/server"

export interface EconomicCalendarItem {
  id: string
  title: string
  country: string
  date: string
  impact: "High" | "Medium" | "Low"
  forecast: string
  previous: string
  actual?: string
  affectedAssets: ("XAU/USD" | "BTC/USD")[]
  rationale: string
}

export interface LiveNewsWireItem {
  time: string
  headline: string
  source: string
  url?: string
}

// Fallback high-impact macroeconomic events list (Formatted to UTC+7 / WIB)
const DEFAULT_ECONOMIC_EVENTS: EconomicCalendarItem[] = [
  {
    id: "e1",
    date: "Wednesday, Oct 14 • 19:30 UTC+7",
    country: "USD",
    title: "US CPI (Consumer Price Index) Report",
    impact: "High",
    forecast: "0.2%",
    previous: "0.3%",
    affectedAssets: ["XAU/USD", "BTC/USD"],
    rationale: "Direct driver of US Dollar (DXY) momentum. Reading above 0.3% accelerates bearish liquidity sweep on Spot Gold and Bitcoin.",
  },
  {
    id: "e2",
    date: "Wednesday, Oct 14 • 21:00 UTC+7",
    country: "USD",
    title: "FOMC Member Waller Speech on Policy Outlook",
    impact: "High",
    forecast: "—",
    previous: "—",
    affectedAssets: ["XAU/USD", "BTC/USD"],
    rationale: "Signals Fed's commitment toward remaining terminal interest rate cuts into Q4.",
  },
  {
    id: "e3",
    date: "Thursday, Oct 15 • 19:30 UTC+7",
    country: "USD",
    title: "US Producer Price Index (PPI) Final Demand",
    impact: "Medium",
    forecast: "0.1%",
    previous: "0.2%",
    affectedAssets: ["XAU/USD"],
    rationale: "Upstream pipeline price pressures signaling secondary inflation wave.",
  },
  {
    id: "e4",
    date: "Friday, Oct 16 • 19:30 UTC+7",
    country: "USD",
    title: "US Retail Sales MoM (Advance)",
    impact: "High",
    forecast: "0.3%",
    previous: "0.1%",
    affectedAssets: ["XAU/USD", "BTC/USD"],
    rationale: "Consumer resilience indicator; high reading dampens immediate quantitative easing bets.",
  },
  {
    id: "e5",
    date: "Friday, Oct 16 • 21:00 UTC+7",
    country: "USD",
    title: "University of Michigan Consumer Sentiment Prelim",
    impact: "Medium",
    forecast: "70.8",
    previous: "70.1",
    affectedAssets: ["BTC/USD"],
    rationale: "Long-run consumer inflation expectations index influencing crypto risk appetite.",
  },
]

async function fetchLiveEconomicCalendar(): Promise<EconomicCalendarItem[]> {
  try {
    const from = new Date().toISOString().slice(0, 10)
    const to = new Date(Date.now() + 7 * 86400 * 1000).toISOString().slice(0, 10)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4500)

    const res = await fetch(`https://www.financecalendar.com/wp-json/fc/v1/calendar?from=${from}&to=${to}`, {
      signal: controller.signal,
      next: { revalidate: 300 }, // 5 min cache
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error("Finance calendar HTTP error")
    const data = await res.json()

    if (Array.isArray(data.events) && data.events.length > 0) {
      return data.events.map((e: any, idx: number) => {
        const d = new Date(e.time_utc || e.date)
        const dayName = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Jakarta" })
        const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "Asia/Jakarta" })
        const day = d.toLocaleDateString("en-US", { day: "numeric", timeZone: "Asia/Jakarta" })
        const time = e.all_day
          ? "All Day"
          : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }) + " UTC+7"

        let country = "USD"
        const upper = (e.title || e.name || "").toUpperCase()
        if (upper.includes("CHINA") || upper.includes("PBOC") || upper.includes("CNY")) country = "CNY"
        else if (upper.includes("UK") || upper.includes("BOE") || upper.includes("BRITAIN") || upper.includes("POUND")) country = "GBP"
        else if (upper.includes("AUSTRALIA") || upper.includes("RBA") || upper.includes("AUD")) country = "AUD"
        else if (upper.includes("EURO") || upper.includes("ECB") || upper.includes("GERMAN")) country = "EUR"
        else if (upper.includes("JAPAN") || upper.includes("BOJ") || upper.includes("JPY")) country = "JPY"

        const impact: "High" | "Medium" | "Low" =
          e.impact === "high" ? "High" : e.impact === "medium" ? "Medium" : "Low"

        const affectedAssets: ("XAU/USD" | "BTC/USD")[] =
          country === "USD" ? ["XAU/USD", "BTC/USD"] : ["XAU/USD"]

        let rationale = "High-impact macroeconomic data release driving institutional orderflow rebalancing."
        if (upper.includes("CPI") || upper.includes("INFLATION") || upper.includes("PCE")) {
          rationale = "Direct driver of US Dollar (DXY) momentum. Reading divergence accelerates liquidity sweep on Spot Gold and Bitcoin."
        } else if (upper.includes("FOMC") || upper.includes("FED") || upper.includes("RATE") || upper.includes("BEIGE")) {
          rationale = "Key central bank monetary policy signal dictating benchmark yield curve trajectory."
        } else if (upper.includes("HOME") || upper.includes("SALES") || upper.includes("HOUSING")) {
          rationale = "Leading indicator of consumer interest rate sensitivity and real economic health."
        } else if (upper.includes("GDP") || upper.includes("GROWTH")) {
          rationale = "Core macroeconomic expansion metric driving cross-asset risk appetite."
        } else if (upper.includes("LABOUR") || upper.includes("LABOR") || upper.includes("JOBS") || upper.includes("CLAIMS")) {
          rationale = "Employment market barometer influencing Federal Reserve rate path expectations."
        } else if (upper.includes("PPI") || upper.includes("PRODUCER")) {
          rationale = "Upstream pipeline wholesale price pressure signaling secondary inflation trends."
        }

        return {
          id: `live-e${idx + 1}`,
          date: `${dayName}, ${month} ${day} • ${time}`,
          country,
          title: e.name || e.title,
          impact,
          forecast: e.consensus || "—",
          previous: e.prior || "—",
          actual: e.actual || undefined,
          affectedAssets,
          rationale,
        }
      })
    }
  } catch (err) {
    console.warn("Could not fetch live economic calendar, using fallback:", err)
  }
  return DEFAULT_ECONOMIC_EVENTS
}

export async function GET() {
  try {
    const wireItems: LiveNewsWireItem[] = []

    // 1. Fetch live Cointelegraph articles
    try {
      const ctRes = await fetch(
        "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss",
        { next: { revalidate: 180 } }
      )
      if (ctRes.ok) {
        const ctData = await ctRes.json()
        if (ctData.status === "ok" && Array.isArray(ctData.items)) {
          ctData.items.slice(0, 4).forEach((item: any) => {
            const pubDate = new Date(item.pubDate)
            const minutesAgo = Math.max(1, Math.round((Date.now() - pubDate.getTime()) / 60000))
            const timeAgo =
              minutesAgo < 60
                ? `${minutesAgo}m ago`
                : `${Math.round(minutesAgo / 60)}h ago`

            wireItems.push({
              time: timeAgo,
              headline: item.title,
              source: "Cointelegraph",
              url: item.link,
            })
          })
        }
      }
    } catch {
      // Cointelegraph feed fail handled
    }

    // 2. Fetch live MarketWatch articles (Macro, Gold & Equities)
    try {
      const mwRes = await fetch(
        "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.content.dowjones.io%2Fpublic%2Frss%2Fmw_topstories",
        { next: { revalidate: 180 } }
      )
      if (mwRes.ok) {
        const mwData = await mwRes.json()
        if (mwData.status === "ok" && Array.isArray(mwData.items)) {
          mwData.items.slice(0, 4).forEach((item: any) => {
            const pubDate = new Date(item.pubDate)
            const minutesAgo = Math.max(1, Math.round((Date.now() - pubDate.getTime()) / 60000))
            const timeAgo =
              minutesAgo < 60
                ? `${minutesAgo}m ago`
                : `${Math.round(minutesAgo / 60)}h ago`

            wireItems.push({
              time: timeAgo,
              headline: item.title,
              source: "MarketWatch Macro",
              url: item.link,
            })
          })
        }
      }
    } catch {
      // MarketWatch feed fail handled
    }

    // 3. Fetch live Binance 24h market stats for BTC & PAXG (Gold Spot proxy)
    let marketTickers: any = null
    try {
      const bRes = await fetch(
        "https://data-api.binance.vision/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22PAXGUSDT%22%5D",
        { next: { revalidate: 30 } }
      )
      if (bRes.ok) {
        marketTickers = await bRes.json()
      }
    } catch {
      // Binance fail handled
    }

    // 4. Fetch live High-Impact Economic Calendar from financecalendar API
    const schedule = await fetchLiveEconomicCalendar()

    return NextResponse.json({
      success: true,
      updatedAt: new Date().toISOString(),
      schedule,
      wire: wireItems.length > 0 ? wireItems : [
        { time: "12m ago", headline: "Institutional bullion demand defends $2,630 Asian sweep block.", source: "NeedPips Macro Wire" },
        { time: "34m ago", headline: "Spot Bitcoin ETFs net fourth straight day of inflows above $380M.", source: "On-Chain Flow Desk" },
        { time: "1h ago", headline: "US 10-Yr sovereign yields ease to 3.98% ahead of CPI print.", source: "Rates Monitor" },
      ],
      tickers: marketTickers,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch live market news" },
      { status: 500 }
    )
  }
}
