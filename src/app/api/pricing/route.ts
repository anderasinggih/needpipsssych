import { NextRequest, NextResponse } from "next/server"
import { getPricingStoreFromDb, updatePricingPlans, savePricingStore, getPricingStore, PricingStoreData } from "@/lib/pricing-store"
export async function GET(_req: Request) {
  try {
    const store = await getPricingStoreFromDb()
    return NextResponse.json({
      success: true,
      currency: store.currencyCode,
      symbol: store.currencySymbol,
      plans: store.plans,
      lastUpdated: store.lastUpdated,
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Action reset to default
    if (body.action === "reset") {
      const defaultStore = await getPricingStoreFromDb()
      defaultStore.plans.weekly.priceIdr = 30000
      defaultStore.plans.weekly.originalPriceIdr = 50000
      defaultStore.plans.weekly.discountPercent = 40
      defaultStore.plans.weekly.badgeText = "SAVE 40%"
      defaultStore.plans.weekly.showDiscountBadge = true

      defaultStore.plans.monthly.priceIdr = 80000
      defaultStore.plans.monthly.originalPriceIdr = 120000
      defaultStore.plans.monthly.discountPercent = 33
      defaultStore.plans.monthly.badgeText = "Best Value • SAVE 33%"
      defaultStore.plans.monthly.showDiscountBadge = true

      defaultStore.lastUpdated = new Date().toISOString()
      await savePricingStore(defaultStore)

      return NextResponse.json({
        success: true,
        message: "Pricing reset to default IDR values (Monthly IDR 80.000, Weekly IDR 30.000)",
        plans: defaultStore.plans,
      })
    }

    const updated = await updatePricingPlans({
      weekly: body.weekly,
      monthly: body.monthly,
    })

    return NextResponse.json({
      success: true,
      message: "Pricing and promo configuration saved successfully.",
      plans: updated.plans,
      lastUpdated: updated.lastUpdated,
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}
