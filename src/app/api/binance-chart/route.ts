import { NextResponse } from "next/server"
import { recordAuditLog } from "@/lib/logs-store"

export interface BinanceKline {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Mapping our platform symbols to Binance symbols
// BTC -> BTCUSDT
// XAU -> PAXGUSDT (Pax Gold on Binance represents 1 troy oz of physical gold)
const SYMBOL_MAP: Record<string, string> = {
  "BTC-USD": "BTCUSDT",
  "BTC/USD": "BTCUSDT",
  "BTC": "BTCUSDT",
  "BTCUSDT": "BTCUSDT",
  "XAU-USD": "PAXGUSDT",
  "XAU/USD": "PAXGUSDT",
  "XAU": "PAXGUSDT",
  "PAXGUSDT": "PAXGUSDT",
}

const INTERVAL_MAP: Record<string, string> = {
  // Standard trader timeframes
  "M1": "1m",
  "M5": "5m",
  "M15": "15m",
  "M30": "30m",
  "H1": "1h",
  "H4": "4h",
  "D1": "1d",
  "W1": "1w",
  // Backward compatibility aliases
  "1D": "15m",
  "1W": "1h",
  "1M": "4h",
  "1Y": "1d",
  "All": "1w",
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawSymbol = searchParams.get("symbol") || "BTC-USD"
    const tf = searchParams.get("tf") || "M15"

    const binanceSymbol = SYMBOL_MAP[rawSymbol] || "BTCUSDT"
    const interval = INTERVAL_MAP[tf] || "15m"
    const limit = 250 // 250 klines for rich horizontal panning & historical view

    // Use Binance public CDN mirror data-api.binance.vision to prevent regional/ISP timeouts
    const binanceUrl = `https://data-api.binance.vision/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`

    const startTime = Date.now()
    const res = await fetch(binanceUrl, {
      next: { revalidate: 10 },
      signal: AbortSignal.timeout(4000),
    })

    const latencyMs = Date.now() - startTime

    if (!res.ok) {
      try {
        recordAuditLog({
          code: res.status,
          method: "GET",
          path: `/v1/market/klines/${binanceSymbol}?interval=${interval}`,
          ms: latencyMs,
          body: JSON.stringify({ error: res.statusText, symbol: binanceSymbol }),
        })
      } catch (_) {}
      throw new Error(`Binance API error: ${res.statusText}`)
    }

    const rawData = await res.json()

    // Binance returns array: [openTime, open, high, low, close, volume, closeTime, quoteAssetVolume, numberOfTrades, ...]
    const candles: BinanceKline[] = rawData.map((k: (string | number)[]) => ({
      time: Number(k[0]),
      open: parseFloat(String(k[1])),
      high: parseFloat(String(k[2])),
      low: parseFloat(String(k[3])),
      close: parseFloat(String(k[4])),
      volume: parseFloat(String(k[5])),
    }))

    const closePrices = candles.map((c) => c.close)
    const currentPrice = closePrices[closePrices.length - 1]
    const openPrice = closePrices[0]
    const highPrice = Math.max(...candles.map((c) => c.high))
    const lowPrice = Math.min(...candles.map((c) => c.low))
    const totalVolume = candles.reduce((acc, c) => acc + c.volume, 0)
    const changePct = ((currentPrice - openPrice) / openPrice) * 100

    try {
      recordAuditLog({
        code: 200,
        method: "GET",
        path: `/v1/market/klines/${binanceSymbol}?interval=${interval}`,
        ms: latencyMs,
        body: JSON.stringify(
          {
            symbol: binanceSymbol,
            interval,
            bars: candles.length,
            lastPrice: currentPrice,
            changePct: `${changePct.toFixed(2)}%`,
          },
          null,
          2
        ),
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      source: "Binance Live",
      symbol: binanceSymbol,
      interval,
      candles,
      series: closePrices,
      stats: {
        lastPrice: currentPrice,
        openPrice,
        highPrice,
        lowPrice,
        volume: totalVolume,
        changePct,
      },
      updatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch Binance klines",
      },
      { status: 500 }
    )
  }
}
