import { query } from "./db"
import { SignalMappingData } from "@/components/signal/signal-card"
import { JournalRow } from "@/components/ui/trade-journal-table"

export interface DbSignalRow {
  id: string
  pair: string
  asset_name: string
  signal_type: "BUY" | "SELL"
  status: "ACTIVE" | "WIN" | "LOSS" | "INVALIDATED"
  entry_zone: string
  invalidation: string
  target_1: string
  target_2?: string
  entry_price?: number
  exit_price?: number
  pnl?: number
  hold_minutes?: number
  risk_reward?: string
  timeframe?: string
  confidence_score?: number
  reasons?: any
  mapping_levels?: any
  confluence_weights?: any
  created_at: string
  settled_at?: string
}

export async function fetchHistoricalSignalsFromDb(): Promise<JournalRow[]> {
  try {
    const res = await query(
      `SELECT * FROM needpips_signals 
       ORDER BY COALESCE(settled_at, created_at) DESC`
    )

    return res.rows.map((row: DbSignalRow) => {
      const isXau = row.pair.includes("XAU") || (row.asset_name && row.asset_name.toLowerCase().includes("gold"))
      const asset = isXau ? "XAU" : "BTC"
      const entry = parseFloat(String(row.entry_price || (row.entry_zone || "").replace(/[^0-9.]/g, ""))) || 0
      const exitPrice = parseFloat(String(row.exit_price || (row.target_1 || "").replace(/[^0-9.]/g, ""))) || entry
      
      const rawStatus = (row.status || "").trim().toUpperCase()
      const isWin = rawStatus === "WIN" || rawStatus === "TP" || rawStatus === "HIT_TP" || rawStatus === "PROFIT"
      const isLoss = rawStatus === "LOSS" || rawStatus === "LOSE" || rawStatus === "SL" || rawStatus === "HIT_SL"
      const isExplicitRunning = rawStatus === "RUNNING" || rawStatus === "ACTIVE" || rawStatus === "TRIGGERED" || rawStatus === "FILLED"
      
      const isClosed = isWin || isLoss
      const status: "Win" | "Loss" | "Running" | "Open" = isWin
        ? "Win"
        : isLoss
        ? "Loss"
        : isExplicitRunning
        ? "Running"
        : "Open"

      const pnl = !isClosed
        ? null
        : row.pnl !== undefined && row.pnl !== null
        ? parseFloat(String(row.pnl))
        : isWin
        ? 250
        : -200

      const qty = 1
      const notional = Math.round(entry)

      return {
        id: row.id,
        at: row.settled_at ? new Date(row.settled_at).toISOString() : new Date(row.created_at).toISOString(),
        asset,
        side: (row.signal_type || "BUY").toUpperCase() === "BUY" ? "Long" : "Short",
        qty,
        notional,
        entry,
        exit: isClosed ? exitPrice : null,
        pnl,
        slippage: isXau ? 0.05 : 0.08,
        holdMin: isClosed ? (row.hold_minutes || 120) : null,
        status,
        riskReward: row.risk_reward || (isWin ? "1 : 2.50" : "1 : 1.50"),
        timeframe: row.timeframe || "M15",
        target: exitPrice,
      }
    })
  } catch (err) {
    console.error("Failed fetching historical signals from Supabase:", err)
    return []
  }
}

function safeParseJson<T>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback
  if (typeof val === "object") return val as T
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val)
      return parsed !== null && parsed !== undefined ? parsed : fallback
    } catch {
      return fallback
    }
  }
  return fallback
}

export async function fetchActiveSignalsFromDb(): Promise<{ "XAU-USD": SignalMappingData; "BTC-USD": SignalMappingData; lastUpdated: string }> {
  const defaultXau: SignalMappingData = {
    pair: "XAU/USD",
    assetName: "Gold Spot",
    signalType: "BUY",
    status: "ACTIVE",
    entryZone: "$2,642.50",
    invalidation: "$2,634.00",
    target1: "$2,658.00",
    target2: "$2,674.00",
    riskReward: "1 : 1.82",
    timeframe: "M15 / H1",
    timestamp: "Today, Active",
    confidenceScore: 88,
    reasons: [
      {
        title: "Asian Low Liquidity Sweep",
        category: "Structure",
        description: "M15 internal liquidity sweep at Asian session low with Bullish Order Block mitigation.",
        confirmed: true,
      },
    ],
    mappingLevels: [
      { label: "Target 2 (External Liquidity Pool)", price: "$2,674.00", type: "Target" },
      { label: "Target 1 (First Take Profit)", price: "$2,658.00", type: "Target" },
      { label: "Optimal Entry Zone", price: "$2,642.50", type: "Entry" },
      { label: "Structural Invalidation Floor (SL)", price: "$2,634.00", type: "Invalidation" },
    ],
    confluenceWeights: [
      { label: "Asian Low Sweep", value: 45 },
      { label: "Orderflow CVD", value: 38 },
      { label: "SMC FVG Support", value: 34 },
    ],
  }

  const defaultBtc: SignalMappingData = {
    pair: "BTC/USD",
    assetName: "Bitcoin Perpetual",
    signalType: "BUY",
    status: "ACTIVE",
    entryZone: "$83,450.00",
    invalidation: "$82,100.00",
    target1: "$85,200.00",
    target2: "$87,000.00",
    riskReward: "1 : 2.10",
    timeframe: "H1 / H4",
    timestamp: "Today, Active",
    confidenceScore: 86,
    reasons: [
      {
        title: "Order Block Retest",
        category: "Orderflow",
        description: "H1 Bullish breaker block retest with aggressive spot delta absorption.",
        confirmed: true,
      },
    ],
    mappingLevels: [
      { label: "Target 2 (Weekly Range High)", price: "$87,000.00", type: "Target" },
      { label: "Target 1 (Prior Swing High)", price: "$85,200.00", type: "Target" },
      { label: "Optimal Entry Zone", price: "$83,450.00", type: "Entry" },
      { label: "Structural Invalidation Floor (SL)", price: "$82,100.00", type: "Invalidation" },
    ],
    confluenceWeights: [
      { label: "CVD Delta Absorption", value: 42 },
      { label: "H1 Breaker Block", value: 36 },
      { label: "Funding Neutrality", value: 28 },
    ],
  }

  try {
    const res = await query(
      `SELECT * FROM needpips_signals 
       WHERE status = 'ACTIVE' 
       ORDER BY created_at DESC`
    )

    const signals: Record<string, SignalMappingData> = {}
    let lastUpdated = new Date().toISOString()

    for (const row of res.rows) {
      const key = row.pair.toUpperCase().includes("BTC") ? "BTC-USD" : "XAU-USD"
      if (!signals[key]) {
        signals[key] = {
          pair: row.pair,
          assetName: row.asset_name,
          signalType: row.signal_type,
          status: row.status as SignalMappingData["status"],
          entryZone: row.entry_zone,
          invalidation: row.invalidation,
          target1: row.target_1,
          target2: row.target_2 || row.target_1,
          riskReward: row.risk_reward || "1 : 2.0",
          timeframe: row.timeframe || "H1",
          timestamp: `Today, ${new Date(row.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`,
          confidenceScore: row.confidence_score || 85,
          reasons: safeParseJson(row.reasons, []),
          mappingLevels: safeParseJson(row.mapping_levels, []),
          confluenceWeights: safeParseJson(row.confluence_weights, []),
        }
        lastUpdated = row.created_at
      }
    }

    return {
      "XAU-USD": signals["XAU-USD"] || defaultXau,
      "BTC-USD": signals["BTC-USD"] || defaultBtc,
      lastUpdated,
    }
  } catch (err) {
    console.error("Failed fetching active signals from database:", err)
    return {
      "XAU-USD": defaultXau,
      "BTC-USD": defaultBtc,
      lastUpdated: new Date().toISOString(),
    }
  }
}

export async function insertSignalToDb(signal: {
  pair: string
  assetName: string
  signalType: "BUY" | "SELL"
  status?: string
  entryZone: string
  invalidation: string
  target1: string
  target2?: string
  riskReward?: string
  timeframe?: string
  confidenceScore?: number
  reasons?: any
  mappingLevels?: any
  confluenceWeights?: any
}) {
  const id = `sig-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`
  const res = await query(
    `INSERT INTO needpips_signals (
      id, pair, asset_name, signal_type, status,
      entry_zone, invalidation, target_1, target_2,
      risk_reward, timeframe, confidence_score,
      reasons, mapping_levels, confluence_weights,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
    RETURNING *`,
    [
      id,
      signal.pair,
      signal.assetName,
      signal.signalType,
      signal.status || "ACTIVE",
      signal.entryZone,
      signal.invalidation,
      signal.target1,
      signal.target2 || null,
      signal.riskReward || "1 : 2.0",
      signal.timeframe || "H1",
      signal.confidenceScore || 85,
      JSON.stringify(signal.reasons || []),
      JSON.stringify(signal.mappingLevels || []),
      JSON.stringify(signal.confluenceWeights || []),
    ]
  )
  return res.rows[0]
}
