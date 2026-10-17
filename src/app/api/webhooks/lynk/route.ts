import { NextRequest, NextResponse } from "next/server"
import { findUserByEmail, insertUser, updateUserRecord } from "@/lib/users-db"
import { upgradeReferralLeadCommission } from "@/lib/affiliate-store"
import { recordAuditLog } from "@/lib/logs-store"
import type { SubscriptionTier } from "@/lib/auth-context"

/**
 * Lynk.id Webhook Receiver Endpoint
 * URL: https://<domain>/api/webhooks/lynk
 * 
 * Configured in Lynk.id Dashboard:
 * Settings -> Integrations -> Webhooks -> Add Webhook URL
 *
 * Supported Checkout Products:
 * - Weekly Pass (Rp 30.000): https://lynk.id/skaladigital/movvp3991njn/checkout
 * - Monthly Pro (Rp 80.000): https://lynk.id/skaladigital/yjxxlgwq405l/checkout
 */

export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "NeedPips Lynk.id Webhook Receiver",
    method: "POST",
    endpoints: {
      weekly: "https://lynk.id/skaladigital/movvp3991njn/checkout",
      monthly: "https://lynk.id/skaladigital/yjxxlgwq405l/checkout",
    },
    message: "Send HTTP POST completed order webhook payload from Lynk.id to activate subscriptions.",
    timestamp: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    // 1. Validate Optional Lynk.id Merchant Key / Secret if set
    const expectedKey = process.env.LYNK_MERCHANT_KEY
    if (expectedKey) {
      const authHeader = req.headers.get("authorization") || ""
      const merchantKeyHeader = req.headers.get("x-merchant-key") || req.headers.get("x-lynk-merchant-key") || ""
      const isBearerMatch = authHeader.replace(/^Bearer\s+/i, "").trim() === expectedKey
      const isHeaderMatch = merchantKeyHeader.trim() === expectedKey

      if (!isBearerMatch && !isHeaderMatch) {
        recordAuditLog({
          code: 401,
          method: "POST",
          path: "/api/webhooks/lynk",
          ms: Date.now() - startTime,
          body: JSON.stringify({ error: "Unauthorized Lynk.id merchant key" }),
        })
        return NextResponse.json(
          { success: false, error: "Unauthorized: Invalid Lynk.id Merchant Key" },
          { status: 401 }
        )
      }
    }

    // 2. Parse Incoming Payload
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload in request body" },
        { status: 400 }
      )
    }

    // Extract customer email (support multiple nested shapes from Lynk.id payload)
    const rawEmail =
      body.email ||
      body.customer?.email ||
      body.buyer_email ||
      body.data?.email ||
      body.user?.email ||
      ""

    const customerEmail = String(rawEmail).trim().toLowerCase()

    if (!customerEmail || !customerEmail.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer email is missing or invalid in Lynk.id webhook payload.",
          receivedPayload: body,
        },
        { status: 400 }
      )
    }

    const customerName =
      String(
        body.name ||
        body.customer?.name ||
        body.buyer_name ||
        body.data?.name ||
        customerEmail.split("@")[0] ||
        "Quant Analyst"
      ).trim()

    // 3. Detect Product / Subscription Tier
    // Weekly identifier: 'movvp3991njn' or 'weekly' or price <= 50000
    // Monthly identifier: 'yjxxlgwq405l' or 'monthly' or price > 50000
    const itemsText = Array.isArray(body.items)
      ? body.items.map((i: any) => `${i.title || ""} ${i.name || ""} ${i.id || ""} ${i.sku || ""}`).join(" ")
      : ""
    const allText = `${body.title || ""} ${body.product_title || ""} ${body.product?.title || ""} ${body.product?.slug || ""} ${body.slug || ""} ${body.ref_id || ""} ${itemsText}`.toLowerCase()

    const rawTotal = Number(
      body.grandTotal ??
      body.grand_total ??
      body.total ??
      body.amount ??
      body.items?.[0]?.price ??
      0
    )

    let targetTier: SubscriptionTier = "Monthly"
    let validityDays = 30

    if (allText.includes("movvp3991njn") || allText.includes("weekly") || (rawTotal > 0 && rawTotal <= 50000)) {
      targetTier = "Weekly"
      validityDays = 7
    } else {
      targetTier = "Monthly"
      validityDays = 30
    }

    // 4. Calculate Expiry Date (extends existing if already active in the future)
    let user = await findUserByEmail(customerEmail)
    const now = new Date()
    let baseTime = now.getTime()

    if (user?.subscriptionExpiry) {
      const currentExpiry = new Date(user.subscriptionExpiry).getTime()
      if (!isNaN(currentExpiry) && currentExpiry > baseTime) {
        baseTime = currentExpiry
      }
    }

    const expiryDate = new Date(baseTime + validityDays * 24 * 60 * 60 * 1000)
    const expiryStr = expiryDate.toISOString().split("T")[0] // e.g. "2026-11-13"

    // 5. Update or Provision User Account in Supabase
    let userId = user?.id

    if (user) {
      await updateUserRecord(user.id, {
        tier: targetTier,
        subscriptionExpiry: expiryStr,
        activeSignalsAllowed: 999,
        status: "Active",
      })
    } else {
      // User hasn't registered yet on NeedPips but already paid via Lynk.id
      userId = `usr_${Math.random().toString(36).substring(2, 9)}`
      await insertUser({
        id: userId,
        name: customerName,
        email: customerEmail,
        passwordHash: "",
        tier: targetTier,
        role: "User",
        status: "Active",
        activeSignalsAllowed: 999,
        joinedDate: now.toISOString(),
        subscriptionExpiry: expiryStr,
        emailVerified: true,
      })
    }

    // 6. Automatically Upgrade Affiliate Commission for Referrer (10% flat IDR)
    if (userId) {
      try {
        upgradeReferralLeadCommission(userId, targetTier)
      } catch (affErr) {
        console.warn("Affiliate commission trigger non-critical warning:", affErr)
      }
    }

    const refId = String(body.ref_id || body.order_id || body.id || `LYNK-${Date.now().toString(36)}`)

    // 7. Audit Log in Supabase Blotter
    recordAuditLog({
      code: 200,
      method: "POST",
      path: "/api/webhooks/lynk",
      ms: Date.now() - startTime,
      body: JSON.stringify({
        action: "lynk_payment_activated",
        refId,
        email: customerEmail,
        name: customerName,
        tier: targetTier,
        validityDays,
        subscriptionExpiry: expiryStr,
        grandTotal: rawTotal,
      }),
    })

    return NextResponse.json({
      success: true,
      message: `Subscription successfully activated: ${targetTier} Pass for ${customerEmail} (Valid until ${expiryStr})`,
      data: {
        refId,
        email: customerEmail,
        name: customerName,
        tier: targetTier,
        validityDays,
        subscriptionExpiry: expiryStr,
        amountIdr: rawTotal,
      },
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error"
    recordAuditLog({
      code: 500,
      method: "POST",
      path: "/api/webhooks/lynk",
      ms: Date.now() - startTime,
      body: JSON.stringify({ error: errorMsg }),
    })
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    )
  }
}
