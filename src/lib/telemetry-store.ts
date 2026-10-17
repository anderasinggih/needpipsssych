import { query } from "./db"
import { AgentStep } from "@/components/ui/agent-run-timeline"
import { RadarRating } from "@/components/ui/ratings-radar"
import { FlowNode } from "@/components/ui/sankey-flow"

export interface PairTelemetryData {
  name: string
  price: string
  delta: string
  high: string
  low: string
  volume: string
  spread: string
  bias: "Bullish" | "Bearish" | "Neutral"
  confidence: number
  invalidation: string
  target: string
  rrRatio: string
  kpis: {
    label: string
    data: number[]
    format: string // e.g. "usd_b", "qty_oz", "qty_btc", "ratio"
  }[]
  steps: AgentStep[]
  flowBarsData: number[]
  flowBarsLabels: string[]
  ratings: RadarRating[]
  radarInsights: {
    title: string
    description: string
  }[]
  sankeySources: FlowNode[]
  sankeyUses: FlowNode[]
  lastCalculated: string
}

export interface TelemetryStoreData {
  "XAU-USD": PairTelemetryData
  "BTC-USD": PairTelemetryData
  lastUpdated: string
}


const DEFAULT_TELEMETRY: TelemetryStoreData = {
  lastUpdated: new Date().toISOString(),
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
        state: "done",
        input: '{ "pair": "XAUUSD", "range": "Asian Low ($2,634.50)", "action": "Swept & Rejected" }',
        output: '{ "sweep_confirmed": true, "volume_multiplier": "2.4x" }',
      },
      {
        id: "step-2",
        step: "Fair Value Gap & Order Block",
        tool: "smc.fvg_validator",
        durationMs: 650,
        state: "done",
        input: '{ "timeframe": "M15", "zone": "[$2,648.20 - $2,651.00]", "confluence": "H1 OB" }',
        output: '{ "mitigated": false, "invalidation": "$2,638.00" }',
      },
      {
        id: "step-3",
        step: "Orderflow Delta & Absorption",
        tool: "tape.footprint_delta",
        durationMs: 1100,
        state: "done",
        input: '{ "cluster": "Ask Absorption @ $2,652.00", "passive_buyers": "Dominated" }',
        output: '{ "buyer_aggression": "76%", "delta_divergence": true }',
      },
      {
        id: "step-4",
        step: "Risk Synthesis & Target Plan",
        tool: "council.synthesis_guard",
        durationMs: 1950,
        state: "running",
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
        state: "done",
        input: '{ "pair": "BTCUSD", "range": "[$65,000 - $68,500]", "equilibrium": "$66,750" }',
        output: '{ "breakout": "Above Value Area High" }',
      },
      {
        id: "step-2",
        step: "CVD Delta Absorption Test",
        tool: "tape.cvd_divergence",
        durationMs: 820,
        state: "done",
        input: '{ "cvd_trend": "Rising", "taker_side": "Buy Dominant" }',
        output: '{ "absorption_rate": "89%", "divergence": true }',
      },
      {
        id: "step-3",
        step: "Liquidation Cluster Mapping",
        tool: "depth.liquidation_clusters",
        durationMs: 1450,
        state: "done",
        input: '{ "short_liquidation_pool": "$68,200 - $69,000 ($420M)" }',
        output: '{ "magnetic_target": "$68,500", "cascade_probability": "78%" }',
      },
      {
        id: "step-4",
        step: "Execution Guard Verification",
        tool: "council.execution_guard",
        durationMs: 2200,
        state: "running",
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

let cachedTelemetry: TelemetryStoreData = DEFAULT_TELEMETRY

export async function getTelemetryStoreFromDb(): Promise<TelemetryStoreData> {
  try {
    const res = await query(
      "SELECT value FROM needpips_system_settings WHERE key = $1 LIMIT 1",
      ["telemetry"]
    )
    if (res.rows.length > 0 && res.rows[0].value) {
      const val = res.rows[0].value
      cachedTelemetry = typeof val === "string" ? JSON.parse(val) : (val as TelemetryStoreData)
      return cachedTelemetry
    }

    await query(
      "INSERT INTO needpips_system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO NOTHING",
      ["telemetry", JSON.stringify(DEFAULT_TELEMETRY)]
    )
    return DEFAULT_TELEMETRY
  } catch (err) {
    console.warn("Failed reading telemetry from Supabase:", err)
    return cachedTelemetry
  }
}

export function getTelemetryStore(): TelemetryStoreData {
  return cachedTelemetry
}

export function saveTelemetryStore(data: TelemetryStoreData): void {
  cachedTelemetry = data
  query(
    `INSERT INTO needpips_system_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    ["telemetry", JSON.stringify(data)]
  ).catch((err) => {
    console.error("Failed saving telemetry to Supabase:", err)
  })
}
