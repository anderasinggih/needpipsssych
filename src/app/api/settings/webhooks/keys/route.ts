import { NextResponse } from "next/server"
import {
  getAdminApiKeys,
  generateAdminApiKey,
  revokeAdminApiKey,
} from "@/lib/webhook-keys-db"
import { recordAuditLog } from "@/lib/logs-store"

// GET /api/settings/webhooks/keys - List all configured API keys
export async function GET(_req: Request) {
  try {
    const keys = await getAdminApiKeys()
    return NextResponse.json({
      success: true,
      keys,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed fetching keys"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// POST /api/settings/webhooks/keys - Generate a new API key
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, createdByName, createdByEmail } = body

    const result = await generateAdminApiKey(name, {
      name: createdByName,
      email: createdByEmail,
    })

    // Record audit trail
    try {
      recordAuditLog({
        code: 201,
        method: "POST",
        path: "/api/settings/webhooks/keys",
        ms: 14,
        body: JSON.stringify({
          action: "generate_api_key",
          keyId: result.apiKey.id,
          keyName: result.apiKey.name,
          createdBy: createdByName || "Super Admin",
        }),
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      apiKey: result.apiKey,
      rawKey: result.rawKey,
      message: "API Key successfully created. Save this secret key now.",
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed generating API key"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// DELETE /api/settings/webhooks/keys - Revoke an existing API key
export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing key ID" }, { status: 400 })
    }

    const revoked = await revokeAdminApiKey(id)
    if (!revoked) {
      return NextResponse.json({ success: false, error: "Key not found" }, { status: 404 })
    }

    try {
      recordAuditLog({
        code: 200,
        method: "DELETE",
        path: `/api/settings/webhooks/keys`,
        ms: 12,
        body: JSON.stringify({ action: "revoke_api_key", keyId: id }),
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `API Key ${id} has been revoked and cannot emit signals anymore.`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed revoking API key"
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
