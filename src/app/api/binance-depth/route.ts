import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawSymbol = searchParams.get("symbol") || "btcusdt"
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "50", 10)))

    // Map symbol to Binance format
    let binanceSymbol = "BTCUSDT"
    const upper = rawSymbol.toUpperCase()
    if (upper.includes("XAU") || upper.includes("GOLD") || upper.includes("PAXG")) {
      binanceSymbol = "PAXGUSDT"
    } else if (upper.includes("BTC")) {
      binanceSymbol = "BTCUSDT"
    } else if (upper.includes("ETH")) {
      binanceSymbol = "ETHUSDT"
    } else {
      binanceSymbol = rawSymbol.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
    }

    const res = await fetch(
      `https://data-api.binance.vision/api/v3/depth?symbol=${encodeURIComponent(binanceSymbol)}&limit=${limit}`,
      {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 1 },
        signal: AbortSignal.timeout(4000),
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Binance depth API error: ${res.statusText}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    if (!data.bids || !data.asks) {
      return NextResponse.json({ success: false, error: "Invalid depth data from Binance" }, { status: 500 })
    }

    const bids = data.bids.map(([p, q]: [string, string]) => ({
      price: parseFloat(p),
      size: parseFloat(q),
    }))

    const asks = data.asks.map(([p, q]: [string, string]) => ({
      price: parseFloat(p),
      size: parseFloat(q),
    }))

    return NextResponse.json({
      success: true,
      symbol: binanceSymbol,
      lastUpdateId: data.lastUpdateId,
      bids,
      asks,
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}
