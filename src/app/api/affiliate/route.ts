import { NextRequest, NextResponse } from "next/server"
import {
  getAffiliateStoreFromDb,
  getAffiliateStore,
  saveAffiliateStore,
  getOrCreateAffiliateForUser,
  recordReferralLeadRegistration,
  recordReferralClick,
  type PayoutRecord,
} from "@/lib/affiliate-store"
import { recordAuditLog } from "@/lib/logs-store"
import { findUserByEmail } from "@/lib/users-db"

export async function GET(req: NextRequest) {
  try {
    await getAffiliateStoreFromDb()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const email = searchParams.get("email")
    const name = searchParams.get("name")
    const refCode = searchParams.get("ref")
    const isClick = searchParams.get("click") === "true"

    // 1. If click tracking
    if (refCode && isClick) {
      recordReferralClick(refCode)
      return NextResponse.json({ success: true, message: "Click recorded" })
    }

    // 2. Fetch specific affiliate partner
    if (userId || email) {
      const foundUser = email ? await findUserByEmail(email) : null

      const userPayload = {
        id: userId || foundUser?.id || "usr_partner",
        email: email || foundUser?.email || "partner@needpips.io",
        name: name || foundUser?.name || "Affiliate Partner",
        role: foundUser?.role || "Affiliate",
      }

      const affiliate = getOrCreateAffiliateForUser(userPayload)

      // Calculate aggregated metrics
      const totalLeads = affiliate.leads.length
      const paidSubscribers = affiliate.leads.filter((l) => l.status === "Active Paid").length
      const conversionRate =
        affiliate.totalClicks > 0
          ? ((paidSubscribers / affiliate.totalClicks) * 100).toFixed(1)
          : "0.0"

      return NextResponse.json({
        success: true,
        affiliate,
        metrics: {
          totalClicks: affiliate.totalClicks,
          totalLeads,
          paidSubscribers,
          conversionRate: `${conversionRate}%`,
          unclaimedBalance: affiliate.unclaimedCommission,
          accumulatedPayout: affiliate.accumulatedPayout,
          currentTier: affiliate.currentTier,
          commissionRate: `${affiliate.commissionRatePercent}%`,
        },
      })
    }

    // 3. Fallback: Return master affiliate data
    const store = getAffiliateStore()
    const defaultAffiliate =
      store.affiliates["NEEDPIPS-PRO-88"] ||
      Object.values(store.affiliates)[0]

    return NextResponse.json({
      success: true,
      affiliate: defaultAffiliate,
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, userId, referralCode, walletAddress, newUser } = body

    // 1. Action: Record a new lead registration
    if (action === "record-lead" && referralCode && newUser) {
      const result = recordReferralLeadRegistration(referralCode, newUser)
      return NextResponse.json({ success: result.success, lead: result.lead })
    }

    // 2. Action: Request payout / withdraw
    if (action === "withdraw" && userId) {
      const store = getAffiliateStore()
      const code = store.userCodeMap[userId] || "NEEDPIPS-PRO-88"
      const affiliate = store.affiliates[code]

      if (!affiliate) {
        return NextResponse.json({ success: false, error: "Affiliate account not found" }, { status: 404 })
      }

      if (affiliate.unclaimedCommission <= 0) {
        return NextResponse.json(
          { success: false, error: "Saldo komisi belum mencukupi untuk penarikan (Rp 0)." },
          { status: 400 }
        )
      }

      const withdrawAmount = affiliate.unclaimedCommission
      const payoutId = `pay_${Date.now().toString(36)}`
      const newPayout: PayoutRecord = {
        id: payoutId,
        amount: withdrawAmount,
        date: new Date().toISOString().split("T")[0],
        status: "Processing",
        walletAddress: affiliate.walletAddress,
      }

      affiliate.unclaimedCommission = 0
      affiliate.payouts = [newPayout, ...(affiliate.payouts || [])]
      store.lastUpdated = new Date().toISOString()
      saveAffiliateStore(store)

      recordAuditLog({
        code: 200,
        method: "POST",
        path: "/api/affiliate/withdraw",
        ms: 19,
        body: JSON.stringify({
          userId,
          affiliateCode: code,
          amountIdr: withdrawAmount,
          account: affiliate.walletAddress,
        }),
      })

      return NextResponse.json({
        success: true,
        message: `Permintaan penarikan komisi sebesar Rp ${withdrawAmount.toLocaleString("id-ID")} berhasil diajukan.`,
        payout: newPayout,
        unclaimedBalance: 0,
      })
    }

    // 3. Action: Update wallet/rekening address
    if (action === "update-wallet" && userId && walletAddress) {
      const store = getAffiliateStore()
      const code = store.userCodeMap[userId] || "NEEDPIPS-PRO-88"
      const affiliate = store.affiliates[code]

      if (!affiliate) {
        return NextResponse.json({ success: false, error: "Affiliate account not found" }, { status: 404 })
      }

      affiliate.walletAddress = walletAddress.trim()
      store.lastUpdated = new Date().toISOString()
      saveAffiliateStore(store)

      recordAuditLog({
        code: 200,
        method: "POST",
        path: "/api/affiliate/update-wallet",
        ms: 12,
        body: JSON.stringify({ userId, account: affiliate.walletAddress }),
      })

      return NextResponse.json({
        success: true,
        message: "Informasi rekening / e-wallet pencairan berhasil disimpan.",
        walletAddress: affiliate.walletAddress,
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action or parameters." },
      { status: 400 }
    )
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}
