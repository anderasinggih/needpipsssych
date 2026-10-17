"use client"

import { useEffect, useState } from "react"
import { TickerTape, type TickerRow } from "@/components/ui/ticker-tape"

// Baseline fallback if network/Binance fails
const DEFAULT_ROWS: TickerRow[] = [
  { symbol: "BTC/USDT", price: 83680.0, change: 0.74 },
  { symbol: "XAU/USD", price: 2654.8, change: 1.14 },
  { symbol: "ETH/USDT", price: 2538.6, change: 1.12 },
  { symbol: "SOL/USDT", price: 111.4, change: 0.86 },
  { symbol: "DXY Index", price: 101.42, change: -0.32 },
  { symbol: "US 10Y Yield", price: 3.98, change: -1.24 },
  { symbol: "Gold / Silver", price: 84.15, change: 0.18 },
  { symbol: "BTC Dominance", price: 58.4, change: 0.85 },
  { symbol: "S&P 500", price: 5815.2, change: 0.42 },
]

export function LiveTickerTape({ className }: { className?: string }) {
  const [rows, setRows] = useState<TickerRow[]>(DEFAULT_ROWS)

  useEffect(() => {
    let mounted = true

    async function fetchLiveBinanceTickers() {
      try {
        // Fetch real 24hr ticker data from Binance mirror for crypto & PAXG (Gold Spot proxy)
        const symbols = JSON.stringify(["BTCUSDT", "PAXGUSDT", "ETHUSDT", "SOLUSDT"])
        const res = await fetch(`https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`)
        if (!res.ok) return
        const data = await res.json()
        if (!Array.isArray(data) || !mounted) return

        const btc = data.find((d) => d.symbol === "BTCUSDT")
        const paxg = data.find((d) => d.symbol === "PAXGUSDT")
        const eth = data.find((d) => d.symbol === "ETHUSDT")
        const sol = data.find((d) => d.symbol === "SOLUSDT")

        setRows((prev) => {
          return prev.map((item) => {
            if (item.symbol === "BTC/USDT" || item.symbol === "BTC/USD") {
              if (btc) {
                return {
                  symbol: "BTC/USDT",
                  price: parseFloat(btc.lastPrice),
                  change: parseFloat(btc.priceChangePercent),
                }
              }
            }
            if (item.symbol === "XAU/USD" || item.symbol === "XAU/USDT") {
              if (paxg) {
                return {
                  symbol: "XAU/USD",
                  price: parseFloat(paxg.lastPrice),
                  change: parseFloat(paxg.priceChangePercent),
                }
              }
            }
            if (item.symbol === "ETH/USDT") {
              if (eth) {
                return {
                  symbol: "ETH/USDT",
                  price: parseFloat(eth.lastPrice),
                  change: parseFloat(eth.priceChangePercent),
                }
              }
            }
            if (item.symbol === "SOL/USDT") {
              if (sol) {
                return {
                  symbol: "SOL/USDT",
                  price: parseFloat(sol.lastPrice),
                  change: parseFloat(sol.priceChangePercent),
                }
              }
            }
            return item
          })
        })
      } catch (e) {
        // Fallback to initial values on connection limits
      }
    }

    fetchLiveBinanceTickers()

    // 1. Direct WebSocket stream for real-time live ticker updates (<100ms)
    let ws: WebSocket | null = null
    try {
      ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@ticker/paxgusdt@ticker/ethusdt@ticker/solusdt@ticker")
      ws.onmessage = (event) => {
        if (!mounted) return
        try {
          const msg = JSON.parse(event.data)
          // msg.s: symbol, msg.c: close/lastPrice, msg.P: priceChangePercent
          if (!msg.s) return
          const sym = msg.s.toUpperCase()
          const lastPrice = parseFloat(msg.c)
          const changePercent = parseFloat(msg.P)

          setRows((curr) =>
            curr.map((r) => {
              if (sym === "BTCUSDT" && (r.symbol === "BTC/USDT" || r.symbol === "BTC/USD")) {
                return { ...r, price: lastPrice, change: changePercent }
              }
              if (sym === "PAXGUSDT" && (r.symbol === "XAU/USD" || r.symbol === "XAU/USDT")) {
                return { ...r, price: lastPrice, change: changePercent }
              }
              if (sym === "ETHUSDT" && r.symbol === "ETH/USDT") {
                return { ...r, price: lastPrice, change: changePercent }
              }
              if (sym === "SOLUSDT" && r.symbol === "SOL/USDT") {
                return { ...r, price: lastPrice, change: changePercent }
              }
              return r
            })
          )
        } catch {}
      }
    } catch {}

    // 2. Fallback periodic poll every 15s in case WebSocket drops
    const interval = setInterval(fetchLiveBinanceTickers, 15000)

    return () => {
      mounted = false
      clearInterval(interval)
      if (ws) {
        try {
          ws.close()
        } catch {}
      }
    }
  }, [])

  return <TickerTape rows={rows} className={className} />
}
