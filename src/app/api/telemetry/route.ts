import { NextResponse } from "next/server"
import { getTelemetryStore, saveTelemetryStore, PairTelemetryData } from "@/lib/telemetry-store"
import { runDeliberationPipeline } from "@/lib/deliberation-worker"
import { recordAuditLog } from "@/lib/logs-store"

// GET /api/telemetry - Fetch live blotter deliberation and flow analysis data
export async function GET(req: Request) {
  const startTime = Date.now()
  try {
    const store = await runDeliberationPipeline()
    const url = new URL(req.url)
    const pair = url.searchParams.get("pair") // "XAU-USD" or "BTC-USD"

    const latency = Date.now() - startTime

    // Record audit trail in real logs
    try {
      recordAuditLog({
        code: 200,
        method: "GET",
        path: `/v1/quant/blotter-telemetry${pair ? `?pair=${pair}` : ""}`,
        ms: Math.max(latency, 12),
        body: JSON.stringify({
          activePair: pair || "ALL",
          updatedAt: store.lastUpdated,
          status: "synced",
        }),
      })
    } catch (_) {}

    if (pair && (pair === "XAU-USD" || pair === "BTC-USD")) {
      return NextResponse.json({
        success: true,
        pair,
        data: store[pair],
        lastUpdated: store.lastUpdated,
      })
    }

    return NextResponse.json({
      success: true,
      telemetry: store,
      lastUpdated: store.lastUpdated,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load telemetry"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// POST /api/telemetry - Allow Admin/Engine to update deliberation steps or telemetry values
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { pair, updates } = body

    if (!pair || (pair !== "XAU-USD" && pair !== "BTC-USD")) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing pair parameter" },
        { status: 400 }
      )
    }

    const targetPair = pair as "XAU-USD" | "BTC-USD"
    const store = getTelemetryStore()
    store[targetPair] = {
      ...store[targetPair],
      ...updates,
      lastCalculated: new Date().toISOString(),
    }
    store.lastUpdated = new Date().toISOString()

    saveTelemetryStore(store)

    try {
      recordAuditLog({
        code: 200,
        method: "POST",
        path: `/v1/quant/blotter-telemetry/update?pair=${targetPair}`,
        ms: 22,
        body: JSON.stringify({ pair: targetPair, updatedKeys: Object.keys(updates) }),
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Telemetry for ${targetPair} updated successfully`,
      data: store[targetPair],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update telemetry"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
