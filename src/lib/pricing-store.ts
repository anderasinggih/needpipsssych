import { query } from "./db"
import { recordAuditLog } from "@/lib/logs-store"

export interface PricingPlanConfig {
  id: "weekly" | "monthly"
  name: string
  tagline: string
  priceIdr: number // Harga aktif (e.g. 30000 or 80000)
  originalPriceIdr?: number // Harga coret sebelum diskon (e.g. 50000 or 120000)
  discountPercent?: number // Persentase diskon terhitung / custom (e.g. 40 or 33)
  showDiscountBadge: boolean
  badgeText: string // e.g. "Save 33%", "HEMAT 40%", "Best Value"
  billingCycle: string // e.g. "per 7 days", "per 30 days"
  popular?: boolean
  checkoutUrl?: string
  features: string[]
  unlockedSignals: string
}

export interface PricingStoreData {
  currencyCode: "IDR"
  currencySymbol: "IDR"
  plans: {
    weekly: PricingPlanConfig
    monthly: PricingPlanConfig
  }
  lastUpdated: string
}

export const DEFAULT_PRICING: PricingStoreData = {
  currencyCode: "IDR",
  currencySymbol: "IDR",
  plans: {
    weekly: {
      id: "weekly",
      name: "Weekly Quant Pass",
      tagline: "7-day unthrottled access for short-term tactical momentum",
      priceIdr: 30000,
      originalPriceIdr: 50000,
      discountPercent: 40,
      showDiscountBadge: true,
      badgeText: "SAVE 40%",
      billingCycle: "per 7 days • instant renewal",
      popular: false,
      checkoutUrl: "https://lynk.id/skaladigital/movvp3991njn/checkout",
      features: [
        "Full XAU/USD & BTC/USD Signal Access",
        "Explicit Invalidation (SL) & TP1 / TP2 levels",
        "Confluence weights & mathematical rationales",
        "Live In-App Push alerts (M15 / H1 / H4)",
        "Public History & verification audit",
      ],
      unlockedSignals: "15-25 high probability calls / week",
    },
    monthly: {
      id: "monthly",
      name: "Monthly Institutional Pass",
      tagline: "30-day unthrottled access with priority alpha & full macro model suite",
      priceIdr: 80000,
      originalPriceIdr: 120000,
      discountPercent: 33,
      showDiscountBadge: true,
      badgeText: "BEST VALUE",
      billingCycle: "per 30 days • instant renewal",
      popular: true,
      checkoutUrl: "https://lynk.id/skaladigital/yjxxlgwq405l/checkout",
      features: [
        "Everything in Weekly Pass",
        "Prioritized Orderflow & Microstructure delta alerts",
        "Multi-timeframe Macro Correlation matrix (DXY / Yields)",
        "Direct Telegram Instant Dispatch Bot access",
        "Full exportable Historical Returns matrix",
      ],
      unlockedSignals: "60-100 high probability calls / month",
    },
  },
  lastUpdated: new Date().toISOString(),
}

let cachedPricing: PricingStoreData = DEFAULT_PRICING

export async function getPricingStoreFromDb(): Promise<PricingStoreData> {
  try {
    const res = await query(
      "SELECT value FROM needpips_system_settings WHERE key = $1 LIMIT 1",
      ["pricing_plans"]
    )
    if (res.rows.length > 0 && res.rows[0].value) {
      const val = res.rows[0].value
      cachedPricing = typeof val === "string" ? JSON.parse(val) : (val as PricingStoreData)
      return cachedPricing
    }

    // Insert default into Supabase if not present
    await query(
      "INSERT INTO needpips_system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO NOTHING",
      ["pricing_plans", JSON.stringify(DEFAULT_PRICING)]
    )
    return DEFAULT_PRICING
  } catch (err) {
    console.warn("Failed reading pricing from Supabase:", err)
    return cachedPricing
  }
}

export function getPricingStore(): PricingStoreData {
  return cachedPricing
}

export async function savePricingStore(data: PricingStoreData): Promise<void> {
  cachedPricing = data
  try {
    await query(
      `INSERT INTO needpips_system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      ["pricing_plans", JSON.stringify(data)]
    )
  } catch (err) {
    console.error("Failed saving pricing store to Supabase:", err)
  }
}

export async function updatePricingPlans(updates: {
  weekly?: Partial<PricingPlanConfig>
  monthly?: Partial<PricingPlanConfig>
}): Promise<PricingStoreData> {
  const store = await getPricingStoreFromDb()

  if (updates.weekly) {
    store.plans.weekly = { ...store.plans.weekly, ...updates.weekly }
    if (store.plans.weekly.originalPriceIdr && store.plans.weekly.originalPriceIdr > store.plans.weekly.priceIdr) {
      store.plans.weekly.discountPercent = Math.round(
        ((store.plans.weekly.originalPriceIdr - store.plans.weekly.priceIdr) /
          store.plans.weekly.originalPriceIdr) *
          100
      )
    }
  }

  if (updates.monthly) {
    store.plans.monthly = { ...store.plans.monthly, ...updates.monthly }
    if (store.plans.monthly.originalPriceIdr && store.plans.monthly.originalPriceIdr > store.plans.monthly.priceIdr) {
      store.plans.monthly.discountPercent = Math.round(
        ((store.plans.monthly.originalPriceIdr - store.plans.monthly.priceIdr) /
          store.plans.monthly.originalPriceIdr) *
          100
      )
    }
  }

  store.lastUpdated = new Date().toISOString()
  await savePricingStore(store)

  recordAuditLog({
    code: 200,
    method: "POST",
    path: "/api/pricing/update",
    ms: 15,
    body: JSON.stringify({
      weeklyPrice: store.plans.weekly.priceIdr,
      monthlyPrice: store.plans.monthly.priceIdr,
      weeklyDiscount: store.plans.weekly.discountPercent,
      monthlyDiscount: store.plans.monthly.discountPercent,
    }),
  })

  return store
}
