"use client"

import { useEffect, useMemo, useRef, useState } from "react"

export interface OrderBookItem {
  price: number
  size: number
}

export interface LiveDepthState {
  bids: OrderBookItem[]
  asks: OrderBookItem[]
  lastUpdateId?: number
  connected: boolean
}

function mergeLevels(top: OrderBookItem[], deeper: OrderBookItem[], isBid: boolean): OrderBookItem[] {
  if (top.length === 0) return deeper
  if (deeper.length === 0) return top

  const cutoff = top[top.length - 1].price
  const rest = deeper.filter((d) => (isBid ? d.price < cutoff : d.price > cutoff))
  return [...top, ...rest]
}

export function useBinanceDepth(pair: string) {
  const [depth, setDepth] = useState<LiveDepthState>({
    bids: [],
    asks: [],
    connected: false,
  })

  const snapshotRef = useRef<{ bids: OrderBookItem[]; asks: OrderBookItem[] }>({
    bids: [],
    asks: [],
  })

  const binanceSym = useMemo(() => {
    const upper = pair.toUpperCase()
    if (upper.includes("XAU") || upper.includes("GOLD") || upper.includes("PAXG")) return "paxgusdt"
    if (upper.includes("BTC")) return "btcusdt"
    if (upper.includes("ETH")) return "ethusdt"
    return "btcusdt"
  }, [pair])

  useEffect(() => {
    let active = true
    let ws: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null

    // 1. Snapshot fetch (50-100 levels)
    async function loadSnapshot() {
      try {
        const res = await fetch(`/api/binance-depth?symbol=${binanceSym}&limit=100`)
        if (!res.ok) return
        const data = await res.json()
        if (active && data.success && Array.isArray(data.bids) && Array.isArray(data.asks)) {
          snapshotRef.current = {
            bids: data.bids,
            asks: data.asks,
          }
          setDepth((prev) => ({
            bids: prev.bids.length > 0 ? mergeLevels(prev.bids.slice(0, 20), data.bids, true) : data.bids,
            asks: prev.asks.length > 0 ? mergeLevels(prev.asks.slice(0, 20), data.asks, false) : data.asks,
            lastUpdateId: data.lastUpdateId,
            connected: prev.connected,
          }))
        }
      } catch (err) {
        console.warn("Failed fetching depth snapshot:", err)
      }
    }

    loadSnapshot()

    // 2. Real-time WebSocket connection (@depth20@100ms)
    function connectWs() {
      try {
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binanceSym}@depth20@100ms`)

        ws.onopen = () => {
          if (active) setDepth((prev) => ({ ...prev, connected: true }))
        }

        ws.onmessage = (event) => {
          try {
            const d = JSON.parse(event.data)
            if (Array.isArray(d.bids) && Array.isArray(d.asks)) {
              const bids = d.bids.map(([p, q]: [string, string]) => ({
                price: parseFloat(p),
                size: parseFloat(q),
              }))
              const asks = d.asks.map(([p, q]: [string, string]) => ({
                price: parseFloat(p),
                size: parseFloat(q),
              }))

              if (active) {
                const mergedBids = mergeLevels(bids, snapshotRef.current.bids, true)
                const mergedAsks = mergeLevels(asks, snapshotRef.current.asks, false)

                setDepth({
                  bids: mergedBids,
                  asks: mergedAsks,
                  lastUpdateId: d.lastUpdateId,
                  connected: true,
                })
              }
            }
          } catch {}
        }

        ws.onerror = () => {
          if (active) setDepth((prev) => ({ ...prev, connected: false }))
        }

        ws.onclose = () => {
          if (active) {
            setDepth((prev) => ({ ...prev, connected: false }))
            reconnectTimeout = setTimeout(connectWs, 2500)
          }
        }
      } catch {
        if (active) setDepth((prev) => ({ ...prev, connected: false }))
      }
    }

    connectWs()

    // 3. Periodic refresh of deeper levels and fallback if WS is down
    const refreshInterval = setInterval(() => {
      loadSnapshot()
    }, 4000)

    return () => {
      active = false
      clearInterval(refreshInterval)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (ws) {
        try {
          ws.close()
        } catch {}
      }
    }
  }, [binanceSym])

  return depth
}
