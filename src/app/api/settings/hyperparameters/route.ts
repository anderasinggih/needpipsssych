import { NextResponse } from "next/server"
import { getModelHyperparameters, updateModelHyperparameters } from "@/lib/settings-db"
import { recordAuditLog } from "@/lib/logs-store"

// GET /api/settings/hyperparameters - Retrieve persisted model hyperparameters
export async function GET(_req: Request) {
  try {
    const hyperparameters = await getModelHyperparameters()
    return NextResponse.json({
      success: true,
      hyperparameters,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load model hyperparameters"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// POST /api/settings/hyperparameters - Update and persist model hyperparameters in Supabase
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      minConfidenceThreshold,
      modelTemperature,
      autoInvalidationTimeout,
      highImpactNewsPause,
      engineLive,
      updatedBy,
    } = body

    // Validation
    const updates: Record<string, unknown> = {}
    if (typeof minConfidenceThreshold === "number" && minConfidenceThreshold >= 50 && minConfidenceThreshold <= 99) {
      updates.minConfidenceThreshold = Math.round(minConfidenceThreshold)
    }
    if (typeof modelTemperature === "number" && modelTemperature >= 0 && modelTemperature <= 1) {
      updates.modelTemperature = Math.round(modelTemperature * 100) / 100
    }
    if (typeof autoInvalidationTimeout === "string" && ["120m", "240m", "480m"].includes(autoInvalidationTimeout)) {
      updates.autoInvalidationTimeout = autoInvalidationTimeout
    }
    if (typeof highImpactNewsPause === "boolean") {
      updates.highImpactNewsPause = highImpactNewsPause
    }
    if (typeof engineLive === "boolean") {
      updates.engineLive = engineLive
    }
    if (typeof updatedBy === "string") {
      updates.updatedBy = updatedBy
    }

    const updated = await updateModelHyperparameters(updates)

    // Record audit trail
    try {
      recordAuditLog({
        code: 200,
        method: "POST",
        path: "/api/settings/hyperparameters",
        ms: 16,
        body: JSON.stringify({
          updates,
          savedAt: updated.lastUpdated,
          updatedBy: updatedBy || "Super Admin",
        }),
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      hyperparameters: updated,
      message: "Model hyperparameters successfully saved and persisted to Supabase.",
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save model hyperparameters"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
