"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { Check, ShieldCheck, Zap, ArrowRight, Lock, TrendingUp, Sparkles, RefreshCw, QrCode, ExternalLink, X, Info } from "lucide-react"
import { AppNavbar } from "@/components/layout/app-navbar"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { cn } from "@/lib/utils"
import { PricingStoreData, PricingPlanConfig } from "@/lib/pricing-store"
import { useAuth } from "@/lib/auth-context"

function formatIdr(amount: number): string {
  return `IDR ${amount.toLocaleString("id-ID")}`
}

const DEFAULT_PLANS: Record<"weekly" | "monthly", PricingPlanConfig> = {
  weekly: {
    id: "weekly",
    name: "Weekly Quant Pass",
    tagline: "7-day unthrottled access for short-term tactical momentum",
    priceIdr: 30000,
    originalPriceIdr: 50000,
    discountPercent: 40,
    showDiscountBadge: true,
    badgeText: "SAVE 40%",
    billingCycle: "per 7 days • instant activation",
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
    name: "Monthly Pro Pass",
    tagline: "30-day unthrottled access with highest cost-efficiency",
    priceIdr: 80000,
    originalPriceIdr: 120000,
    discountPercent: 33,
    showDiscountBadge: true,
    badgeText: "Best Value • SAVE 33%",
    billingCycle: "per 30 days • billed monthly (IDR 20.000/wk equivalent)",
    popular: true,
    checkoutUrl: "https://lynk.id/skaladigital/yjxxlgwq405l/checkout",
    features: [
      "Everything in Weekly Quant Pass",
      "Priority Quant Inference Queue (<500ms)",
      "Extended Institutional Sankey Liquidity routing",
      "10% Flat Referral Affiliate Commission on All Subscriptions",
      "Direct Analyst desk rationale notes",
      "Full exportable Historical Returns matrix",
    ],
    unlockedSignals: "60-100 high probability calls / month",
  },
}

const COMPARISON_ROWS = [
  { feature: "Target Instruments", free: "XAU/USD & BTC/USD (Delayed)", weekly: "XAU/USD & BTC/USD (Real-time)", monthly: "XAU/USD & BTC/USD (Real-time)" },
  { feature: "Signal Direction & Sentiment", free: "Visible (General bias)", weekly: "Full unmasked", monthly: "Full unmasked" },
  { feature: "Exact Entry, SL & TP Levels", free: "Blurred / Masked", weekly: "Precise numerical values", monthly: "Precise numerical values" },
  { feature: "Confluence Engine Breakdown", free: "Top 1 factor only", weekly: "All 4 active confluences", monthly: "All 4 active confluences + Desk notes" },
  { feature: "Sankey Liquidity Flow Map", free: "Sample preview", weekly: "Live blotter", monthly: "Live blotter + Whale depth" },
  { feature: "Execution Guarantee / Non-Custodial", free: "Yes (You control funds)", weekly: "Yes (You control funds)", monthly: "Yes (You control funds)" },
  { feature: "Referral Affiliate Commission", free: "10% Flat / transaction", weekly: "10% Flat / transaction", monthly: "10% Flat / transaction" },
]

export default function PricingPage() {
  const { user } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Monthly Pro")
  const isMonthly = selectedPeriod === "Monthly Pro"

  const [plans, setPlans] = useState<Record<"weekly" | "monthly", PricingPlanConfig>>(DEFAULT_PLANS)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeModalPlan, setActiveModalPlan] = useState<PricingPlanConfig | null>(null)
  const [customEmail, setCustomEmail] = useState<string>("")

  // Sync custom email when user changes
  useEffect(() => {
    if (user?.email) {
      setCustomEmail(user.email)
    }
  }, [user?.email])

  // Fetch real-time pricing from backend API
  useEffect(() => {
    let isMounted = true
    const fetchPricing = async () => {
      try {
        setLoading(true)
        const res = await fetch("/api/pricing")
        const data = await res.json()
        if (data.success && data.plans && isMounted) {
          setPlans({
            weekly: { ...DEFAULT_PLANS.weekly, ...data.plans.weekly },
            monthly: { ...DEFAULT_PLANS.monthly, ...data.plans.monthly },
          })
        }
      } catch (err) {
        console.warn("Failed fetching /api/pricing, using defaults", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchPricing()
    return () => {
      isMounted = false
    }
  }, [])

  const planList = [plans.weekly, plans.monthly]

  const getCheckoutUrlForTier = (tier: PricingPlanConfig, emailOverride?: string) => {
    const rawUrl =
      tier.checkoutUrl ||
      (tier.id === "weekly"
        ? "https://lynk.id/skaladigital/movvp3991njn/checkout"
        : "https://lynk.id/skaladigital/yjxxlgwq405l/checkout")
    
    const emailToUse = (emailOverride || customEmail || user?.email || "").trim()
    if (!emailToUse) return rawUrl

    try {
      const url = new URL(rawUrl)
      url.searchParams.set("email", emailToUse)
      if (user?.name) {
        url.searchParams.set("name", user.name)
      }
      return url.toString()
    } catch {
      return `${rawUrl}?email=${encodeURIComponent(emailToUse)}`
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-white/20">
      <AppNavbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-foreground/70 uppercase tracking-widest mb-4">
            <Zap className="h-3 w-3 text-emerald-400" />
            <span>Institutional Access Tiers (IDR Pricing)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-3">
            Algorithmic precision. Pure alpha.
          </h1>
          <p className="text-sm sm:text-base text-foreground/60 leading-relaxed">
            Choose your subscription pass to unmask real-time AI quant signals, exact invalidation thresholds, and multi-asset confluence structures.
          </p>

          {/* Toggle Switcher */}
          <div className="mt-8 flex justify-center">
            <SegmentedControl
              options={["Weekly Pass", "Monthly Pro"]}
              value={selectedPeriod}
              onChange={(val) => setSelectedPeriod(val)}
              className="p-1"
            />
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-20">
          {planList.map((tier) => {
            const isHighlighted =
              (tier.id === "monthly" && isMonthly) || (tier.id === "weekly" && !isMonthly)
            const hasDiscount =
              tier.originalPriceIdr && tier.originalPriceIdr > tier.priceIdr

            return (
              <motion.div
                key={tier.id}
                layout
                className={cn(
                  "relative rounded-[24px] p-6 sm:p-8 flex flex-col justify-between border transition-all duration-300",
                  isHighlighted
                    ? "bg-zinc-900/60 border-white/20 shadow-2xl shadow-emerald-950/10"
                    : "bg-zinc-950/40 border-white/[0.08] hover:border-white/15"
                )}
              >
                {/* Discount Promo Badge */}
                {tier.showDiscountBadge && (
                  <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10.5px] font-mono tracking-wider uppercase font-semibold">
                    {tier.badgeText}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-white tracking-tight">{tier.name}</h2>
                    <span className="text-[11px] font-mono text-foreground/45 uppercase tracking-wider">
                      {tier.id === "weekly" ? "7D PASS" : "30D PASS"}
                    </span>
                  </div>

                  <p className="text-xs text-foreground/60 mb-6 leading-relaxed min-h-[36px]">
                    {tier.tagline}
                  </p>

                  <div className="mb-6 pb-6 border-b border-white/[0.08]">
                    <div className="flex items-baseline flex-wrap gap-2">
                      {/* Strikethrough Original Price */}
                      {hasDiscount && (
                        <span className="text-sm sm:text-base font-mono text-foreground/40 line-through">
                          {formatIdr(tier.originalPriceIdr!)}
                        </span>
                      )}
                      <span className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-white">
                        {formatIdr(tier.priceIdr)}
                      </span>
                      <span className="text-xs font-mono text-foreground/50">
                        {tier.id === "weekly" ? "/ 7 days" : "/ 30 days"}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-foreground/45 mt-1.5">{tier.billingCycle}</p>
                  </div>

                  <div className="mb-8">
                    <div className="text-[11px] font-mono text-foreground/50 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Expected Output: {tier.unlockedSignals}</span>
                    </div>

                    <ul className="space-y-3">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-foreground/80 leading-snug">
                          <div className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="h-2.5 w-2.5 text-emerald-400" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalPlan(tier)}
                    className={cn(
                      "w-full py-3 rounded-full text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition-all outline-none cursor-pointer",
                      isHighlighted
                        ? "bg-white text-zinc-950 font-semibold hover:bg-zinc-200 active:scale-[0.98] shadow-lg shadow-white/5"
                        : "bg-white/[0.06] text-white border border-white/10 hover:bg-white/10 active:scale-[0.98]"
                    )}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Activate {tier.name}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <p className="text-[10px] text-center font-mono text-foreground/40 mt-3 flex items-center justify-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Instant QRIS Automated Activation</span>
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Feature Matrix Table */}
        <div className="border border-white/[0.08] rounded-[24px] bg-zinc-950/40 p-6 sm:p-8 overflow-x-auto">
          <div className="flex items-center gap-2.5 mb-6">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold tracking-tight text-white uppercase font-mono">
              Tier Capabilities Matrix
            </h3>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] font-mono text-foreground/45 uppercase tracking-wider">
                <th className="pb-3 pr-4 font-medium">Feature &amp; Quant Access</th>
                <th className="pb-3 px-4 font-medium">Public / Free</th>
                <th className="pb-3 px-4 font-medium text-white">
                  Weekly Pass ({formatIdr(plans.weekly.priceIdr)})
                </th>
                <th className="pb-3 pl-4 font-medium text-emerald-400">
                  Monthly Pro ({formatIdr(plans.monthly.priceIdr)})
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 pr-4 text-foreground/85 font-medium">{row.feature}</td>
                  <td className="py-3.5 px-4 text-foreground/45 font-mono">{row.free}</td>
                  <td className="py-3.5 px-4 text-white font-mono">{row.weekly}</td>
                  <td className="py-3.5 pl-4 text-emerald-400 font-mono font-medium">{row.monthly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Non-Custodial Security & Performance Audit Callout */}
        <div className="mt-12 rounded-[20px] border border-white/[0.06] bg-zinc-900/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white tracking-tight">100% Non-Custodial Intelligence</h4>
              <p className="text-[11px] text-foreground/50 leading-relaxed mt-0.5">
                NeedPips never manages or custody client funds. Trade via your preferred broker or execution venue while applying systematic 1–2% position sizing discipline.
              </p>
            </div>
          </div>
          <Link
            href="/history"
            className="text-xs font-mono text-white/80 hover:text-white px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 whitespace-nowrap"
          >
            Review Performance Audit →
          </Link>
        </div>

        {/* QRIS Instant Checkout Dialog (Lynk.id Integration) */}
        <AnimatePresence>
          {activeModalPlan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setActiveModalPlan(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-md rounded-[24px] border border-white/15 bg-zinc-950 p-6 sm:p-7 shadow-2xl z-10 space-y-5"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block">
                        Instant QRIS Activation
                      </span>
                      <h3 className="text-base font-semibold text-white tracking-tight">
                        {activeModalPlan.name}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModalPlan(null)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-foreground/50 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Price Display */}
                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/[0.08] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-foreground/50 uppercase block">Total Payable</span>
                    <span className="text-2xl font-mono font-bold text-white">
                      {formatIdr(activeModalPlan.priceIdr)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                      Zero-Wait Verification
                    </span>
                    <span className="text-[10px] font-mono text-foreground/45 block mt-1">
                      {activeModalPlan.id === "weekly" ? "7 Days Unmasked Access" : "30 Days Unmasked Access"}
                    </span>
                  </div>
                </div>

                {/* Account Email Confirmation */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-foreground/60 uppercase tracking-wider block">
                    Account Email:
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-white/15 focus-within:border-emerald-400 transition-colors">
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="analyst@needpips.io"
                      className="w-full bg-transparent text-xs font-mono text-white outline-none placeholder:text-foreground/30"
                    />
                    {user?.email && user.email === customEmail && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                        Linked
                      </span>
                    )}
                  </div>
                </div>

                {/* Supported Payment Channels */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-foreground/70">
                    <Info className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Supported QRIS Channels:</span>
                  </div>
                  <p className="text-[10px] font-mono text-foreground/50">
                    BCA • Mandiri • BRI • BNI • GoPay • OVO • DANA • ShopeePay • LinkAja
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <a
                    href={getCheckoutUrlForTier(activeModalPlan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-full bg-white text-zinc-950 font-semibold text-xs tracking-tight hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-white/10"
                  >
                    <span>Proceed to QRIS Payment</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveModalPlan(null)}
                    className="w-full py-2.5 rounded-full text-foreground/50 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
