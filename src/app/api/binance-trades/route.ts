import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const rawSymbol = searchParams.get("symbol") || "btcusdt"
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get("limit") || "20", 10)))

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
      `https://data-api.binance.vision/api/v3/trades?symbol=${encodeURIComponent(binanceSymbol)}&limit=${limit}`,
      {
        headers: { "Content-Type": "application/json" },
        next: { revalidate: 2 },
        signal: AbortSignal.timeout(4000),
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Binance trades API error: ${res.statusText}` },
        { status: res.status }
      )
    }

    const data = await res.json()
    if (!Array.isArray(data)) {
      return NextResponse.json({ success: false, error: "Invalid response from Binance" }, { status: 500 })
    }

    // Format trades
    const trades = data.map((t: any) => {
      const price = parseFloat(t.price)
      const size = parseFloat(t.qty)
      const side = t.isBuyerMaker ? "sell" : "buy"
      const date = new Date(t.time)
      const pad = (n: number) => String(n).padStart(2, "0")
      const timeStr = `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`

      return {
        id: t.id,
        time: t.time,
        t: timeStr,
        price,
        size,
        side,
        block: size >= (binanceSymbol === "BTCUSDT" ? 0.8 : 4.0),
      }
    })

    return NextResponse.json({
      success: true,
      symbol: binanceSymbol,
      trades: trades.reverse(), // Newest first
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}
