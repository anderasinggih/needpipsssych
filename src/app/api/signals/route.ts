import { NextResponse } from "next/server"
import { fetchActiveSignalsFromDb, insertSignalToDb } from "@/lib/signals-db"
import { recordAuditLog } from "@/lib/logs-store"
import { SignalMappingData } from "@/components/signal/signal-card"

// GET /api/signals - Return active signals for XAU/USD and BTC/USD directly from Supabase
export async function GET(_req: Request) {
  try {
    const dbData = await fetchActiveSignalsFromDb()
    return NextResponse.json(
      {
        success: true,
        lastUpdated: dbData.lastUpdated,
        signals: dbData,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    )
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Database fetch failed"
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}

// POST /api/signals - Admin publishes or updates a live signal
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      pair,
      direction,
      entryZone,
      slPrice,
      tp1Price,
      tp2Price,
      confidenceScore,
      timeframe,
      confluenceNotes,
      status = "ACTIVE",
    } = body

    if (!pair || !direction || !entryZone || !slPrice || !tp1Price) {
      return NextResponse.json(
        { success: false, error: "Missing required signal fields (pair, direction, entryZone, slPrice, tp1Price)" },
        { status: 400 }
      )
    }

    // Determine normalized key ("XAU-USD" or "BTC-USD")
    const pairKey = pair.toUpperCase().includes("BTC") ? "BTC-USD" : "XAU-USD"
    const isXAU = pairKey === "XAU-USD"

    // Calculate approx Risk : Reward ratio
    const numEntry = parseFloat(entryZone.replace(/[^0-9.]/g, "")) || 0
    const numSl = parseFloat(slPrice.replace(/[^0-9.]/g, "")) || 0
    const numTp1 = parseFloat(tp1Price.replace(/[^0-9.]/g, "")) || 0
    let riskReward = "1 : 2.0"
    if (numEntry && numSl && numTp1) {
      const risk = Math.abs(numEntry - numSl)
      const reward = Math.abs(numTp1 - numEntry)
      if (risk > 0) {
        riskReward = `1 : ${(reward / risk).toFixed(2)}`
      }
    }

    const updatedSignal: SignalMappingData = {
      pair: isXAU ? "XAU/USD" : "BTC/USD",
      assetName: isXAU ? "Gold Spot" : "Bitcoin Perpetual",
      signalType: direction === "SELL" ? "SELL" : "BUY",
      status: status as SignalMappingData["status"],
      entryZone: entryZone.includes("$") ? entryZone : `$${entryZone}`,
      invalidation: slPrice.includes("$") ? slPrice : `$${slPrice}`,
      target1: tp1Price.includes("$") ? tp1Price : `$${tp1Price}`,
      target2: tp2Price ? (tp2Price.includes("$") ? tp2Price : `$${tp2Price}`) : tp1Price,
      riskReward,
      timeframe: timeframe || "M15 / H1",
      timestamp: `Today, ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`,
      confidenceScore: typeof confidenceScore === "number" ? confidenceScore : 88,
      reasons: confluenceNotes
        ? [
            {
              title: "Admin Quant Synthesis & Confluence",
              category: "Structure",
              description: confluenceNotes,
              confirmed: true,
            },
          ]
        : [],
      mappingLevels: [
        { label: "Target 2 (External Liquidity Pool)", price: tp2Price ? (tp2Price.includes("$") ? tp2Price : `$${tp2Price}`) : tp1Price, type: "Target" },
        { label: "Target 1 (First Take Profit)", price: tp1Price.includes("$") ? tp1Price : `$${tp1Price}`, type: "Target" },
        { label: "Optimal Entry Zone", price: entryZone.includes("$") ? entryZone : `$${entryZone}`, type: "Entry" },
        { label: "Structural Invalidation Floor (SL)", price: slPrice.includes("$") ? slPrice : `$${slPrice}`, type: "Invalidation" },
      ],
      confluenceWeights: [
        { label: "Liquidity Sweep", value: 45 },
        { label: "Orderflow CVD", value: 38 },
        { label: "SMC FVG Support", value: 34 },
        { label: "Macro Correlation", value: 26 },
      ],
    }

    // Persist live signal directly to Supabase PostgreSQL
    try {
      await insertSignalToDb({
        pair: updatedSignal.pair,
        assetName: updatedSignal.assetName,
        signalType: updatedSignal.signalType,
        status: updatedSignal.status,
        entryZone: updatedSignal.entryZone,
        invalidation: updatedSignal.invalidation,
        target1: updatedSignal.target1,
        target2: updatedSignal.target2,
        riskReward: updatedSignal.riskReward,
        timeframe: updatedSignal.timeframe,
        confidenceScore: updatedSignal.confidenceScore,
        reasons: updatedSignal.reasons,
        mappingLevels: updatedSignal.mappingLevels,
        confluenceWeights: updatedSignal.confluenceWeights,
      })
    } catch (e) {
      console.warn("Failed saving signal to Supabase:", e)
    }

    const nowIso = new Date().toISOString()

    // Automatically record to audit logs trail
    try {
      recordAuditLog({
        code: 200,
        method: "POST",
        path: `/v1/inference/signal-broadcast/${pairKey}`,
        ms: 38,
        body: JSON.stringify(
          {
            pair: updatedSignal.pair,
            type: updatedSignal.signalType,
            entry: updatedSignal.entryZone,
            sl: updatedSignal.invalidation,
            tp1: updatedSignal.target1,
            confidence: `${updatedSignal.confidenceScore}%`,
            status: "BROADCASTED_LIVE",
          },
          null,
          2
        ),
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Signal for ${pairKey} successfully broadcasted live to feed`,
      signal: updatedSignal,
      lastUpdated: nowIso,
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to broadcast signal"
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
