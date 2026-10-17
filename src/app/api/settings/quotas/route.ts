import { NextResponse } from "next/server"
import { getTierQuotas, updateTierQuotas } from "@/lib/settings-db"
import { recordAuditLog } from "@/lib/logs-store"

// GET /api/settings/quotas - Retrieve current system tier quotas
export async function GET(_req: Request) {
  try {
    const quotas = await getTierQuotas()
    return NextResponse.json({
      success: true,
      quotas,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load tier quotas"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// POST /api/settings/quotas - Update tier quotas in Supabase by Admin
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const updated = await updateTierQuotas(body)

    // Log admin audit action
    try {
      recordAuditLog({
        code: 200,
        method: "POST",
        path: "/api/settings/quotas",
        ms: 12,
        body: JSON.stringify(body, null, 2),
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      quotas: updated,
      message: "Tier quotas updated and synced successfully.",
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save tier quotas"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
