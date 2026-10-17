import { NextRequest, NextResponse } from "next/server"
import { validateAdminApiKey } from "@/lib/webhook-keys-db"
import { insertSignalToDb } from "@/lib/signals-db"
import { recordAuditLog } from "@/lib/logs-store"

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  try {
    // 1. Extract API Key from Authorization Header, x-api-key header, or URL search params
    const authHeader = req.headers.get("authorization") || ""
    const xApiKey = req.headers.get("x-api-key") || ""
    const urlKey = req.nextUrl.searchParams.get("key") || ""

    let token = xApiKey || urlKey
    if (!token && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.slice(7).trim()
    }

    // Parse JSON body
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload in webhook body" },
        { status: 400 }
      )
    }

    // Also support passphrase / api_key in JSON body (TradingView webhook standard)
    if (!token && typeof body === "object") {
      token = body.passphrase || body.api_key || body.secret || ""
    }

    // 2. Validate API Key
    const { valid, keyRecord } = await validateAdminApiKey(token)
    if (!valid || !keyRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: Invalid or revoked Admin Ingestion API Key",
        },
        { status: 401 }
      )
    }

    // 3. Extract and normalize signal parameters
    const rawPair = String(body.ticker || body.pair || body.symbol || "XAU/USD").toUpperCase()
    const isBtc = rawPair.includes("BTC")
    const pair = isBtc ? "XAU/USD" === rawPair ? "BTC/USD" : "BTC/USD" : "XAU/USD"
    const assetName = isBtc ? "Bitcoin Spot & Perpetual" : "Gold Spot (XAU/USD)"

    const rawAction = String(body.action || body.direction || body.order || "BUY").toUpperCase()
    const signalType: "BUY" | "SELL" = rawAction.includes("SELL") || rawAction.includes("SHORT") ? "SELL" : "BUY"

    // Prices
    const entryNum = parseFloat(String(body.entry || body.price || body.close || (isBtc ? 67450 : 2642.5)))
    const entryFormatted = isBtc
      ? entryNum.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : entryNum.toFixed(2)

    const defaultSl = signalType === "BUY" ? (isBtc ? entryNum - 850 : entryNum - 8.5) : (isBtc ? entryNum + 850 : entryNum + 8.5)
    const slNum = parseFloat(String(body.sl || body.stop_loss || defaultSl))
    const slFormatted = isBtc
      ? slNum.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : slNum.toFixed(2)

    const defaultTp1 = signalType === "BUY" ? (isBtc ? entryNum + 1550 : entryNum + 15.5) : (isBtc ? entryNum - 1550 : entryNum - 15.5)
    const tp1Num = parseFloat(String(body.tp1 || body.take_profit || defaultTp1))
    const tp1Formatted = isBtc
      ? tp1Num.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : tp1Num.toFixed(2)

    const defaultTp2 = signalType === "BUY" ? (isBtc ? entryNum + 3100 : entryNum + 31.5) : (isBtc ? entryNum - 3100 : entryNum - 31.5)
    const tp2Num = parseFloat(String(body.tp2 || body.take_profit_2 || defaultTp2))
    const tp2Formatted = isBtc
      ? tp2Num.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : tp2Num.toFixed(2)

    const timeframe = String(body.timeframe || body.interval || "H1").toUpperCase()
    const confidenceScore = Math.min(100, Math.max(65, parseInt(String(body.confidence || 88), 10)))

    const confluenceNotes = String(
      body.confluence ||
      body.message ||
      body.notes ||
      `Automated ${timeframe} institutional signal ingested via TradingView Alert (${keyRecord.name})`
    )

    // Calculate risk reward
    const risk = Math.abs(entryNum - slNum)
    const reward = Math.abs(tp1Num - entryNum)
    const rrRatio = risk > 0 ? (reward / risk).toFixed(2) : "1.82"
    const riskReward = `1 : ${rrRatio}`

    // 4. Save signal into Supabase
    const inserted = await insertSignalToDb({
      pair,
      assetName,
      signalType,
      status: "ACTIVE",
      entryZone: entryFormatted,
      invalidation: slFormatted,
      target1: tp1Formatted,
      target2: tp2Formatted,
      riskReward,
      timeframe,
      confidenceScore,
      reasons: [
        {
          title: "TradingView Webhook Ingestion",
          description: confluenceNotes,
          confidence: `${confidenceScore}% Consensus`,
        },
        {
          title: "Ingested via Verified API Key",
          description: `Authorized by ${keyRecord.name} (${keyRecord.maskedKey})`,
          confidence: "Valid Signature",
        },
      ],
      mappingLevels: [
        { level: "Entry", price: `$${entryFormatted}` },
        { level: "Invalidation (SL)", price: `$${slFormatted}` },
        { level: "Take Profit 1", price: `$${tp1Formatted}` },
        { level: "Take Profit 2", price: `$${tp2Formatted}` },
      ],
      confluenceWeights: [
        { name: "TradingView Strategy Engine", weight: "40%" },
        { name: "PineScript Alert Execution", weight: "35%" },
        { name: "NeedPips Synthesis Guard", weight: "25%" },
      ],
    })

    const latency = Date.now() - startTime

    // 5. Record audit trail
    try {
      recordAuditLog({
        code: 201,
        method: "POST",
        path: "/api/webhooks/tradingview",
        ms: latency,
        body: JSON.stringify({
          signalId: inserted?.id,
          pair,
          direction: signalType,
          entry: entryFormatted,
          keyName: keyRecord.name,
          receivedFrom: req.headers.get("x-forwarded-for") || "TradingView Webhook",
        }),
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Signal for ${pair} (${signalType}) successfully ingested and broadcasted to subscriber PROD feeds.`,
      signal: {
        id: inserted?.id,
        pair,
        direction: signalType,
        entry: entryFormatted,
        sl: slFormatted,
        tp1: tp1Formatted,
        tp2: tp2Formatted,
        timeframe,
        confidenceScore,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook execution error"
    console.error("TradingView webhook error:", err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
