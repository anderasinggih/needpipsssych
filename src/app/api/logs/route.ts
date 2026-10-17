import { NextResponse } from "next/server"
import { getLogsFromDb, recordAuditLog } from "@/lib/logs-store"

// GET /api/logs - Retrieve system & inference request logs directly from Supabase
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category") || undefined // "All" | "Inference" | "Market" | "Errors"

    const logs = await getLogsFromDb(category)

    return NextResponse.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      count: logs.length,
      logs,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// POST /api/logs - Ingest an audit event or request log entry
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { code = 200, method = "POST", path, ms = 24, body: payloadBody } = body

    if (!path) {
      return NextResponse.json(
        { success: false, error: "Missing path field in log" },
        { status: 400 }
      )
    }

    const recorded = recordAuditLog({
      code: Number(code),
      method: String(method).toUpperCase(),
      path: String(path),
      ms: Number(ms),
      body: payloadBody || "// Execution trace captured",
    })

    return NextResponse.json({
      success: true,
      message: "Log entry captured",
      log: recorded,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to record log"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
