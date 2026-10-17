import { NextResponse } from "next/server"
import { fetchAllUsers, updateUserRecord, findUserById } from "@/lib/users-db"
import { recordAuditLog } from "@/lib/logs-store"
import type { SubscriptionTier } from "@/lib/auth-context"

// GET /api/auth/users - Retrieve user list for admin management desk directly from database
export async function GET(_req: Request) {
  try {
    const users = await fetchAllUsers()
    // Strip sensitive passwords before returning to client
    const safeUsers = users.map(({ passwordHash: _, ...rest }) => rest)
    return NextResponse.json({
      success: true,
      lastUpdated: new Date().toISOString(),
      count: safeUsers.length,
      users: safeUsers,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error"
    console.error("Fetch users error:", err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

// POST /api/auth/users - Update user permissions, role, or tier from Settings
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, userId, tier, role, status } = body

    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing userId" }, { status: 400 })
    }

    const updates: any = {}

    if (action === "update-tier" && tier) {
      updates.tier = tier as SubscriptionTier
      updates.subscriptionExpiry = tier === "Free" ? null : tier === "Admin" ? "Lifetime" : "2026-11-30"
      updates.activeSignalsAllowed = tier === "Admin" ? 999 : tier === "Free" ? 1 : 999
      try {
        const { upgradeReferralLeadCommission } = await import("@/lib/affiliate-store")
        upgradeReferralLeadCommission(userId, tier)
      } catch (err) {
        console.warn("Could not sync referral commission on tier upgrade:", err)
      }
    }

    if (action === "update-role" && role) {
      updates.role = role
    }

    if (action === "update-status" && status) {
      updates.status = status
    }

    await updateUserRecord(userId, updates)
    const updatedRecord = await findUserById(userId)
    const safeUser = updatedRecord ? (({ passwordHash: _, ...rest }) => rest)(updatedRecord) : null

    // Log audit trail
    try {
      recordAuditLog({
        code: 200,
        method: "POST",
        path: `/v1/admin/users/update`,
        ms: 18,
        body: JSON.stringify({ userId, action, tier, role, status }, null, 2),
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `User ${userId} permissions updated successfully`,
      user: safeUser,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error"
    console.error("Update user error:", err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
