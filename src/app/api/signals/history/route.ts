import { NextResponse } from "next/server"
import { fetchHistoricalSignalsFromDb } from "@/lib/signals-db"

export async function GET() {
  try {
    const history = await fetchHistoricalSignalsFromDb()
    return NextResponse.json({
      success: true,
      count: history.length,
      history,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load signals history"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
