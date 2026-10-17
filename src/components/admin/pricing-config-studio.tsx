"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Tag,
  Save,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Percent,
  CircleDollarSign,
  Eye,
  Check,
} from "lucide-react"
import { LiveToggle } from "@/components/ui/live-toggle"
import { cn } from "@/lib/utils"
import { PricingPlanConfig } from "@/lib/pricing-store"

function formatRupiah(amount: number): string {
  return `IDR ${amount.toLocaleString("id-ID")}`
}

export function PricingConfigStudio() {
  const [weeklyPrice, setWeeklyPrice] = useState<number>(30000)
  const [weeklyOriginal, setWeeklyOriginal] = useState<number>(50000)
  const [weeklyBadgeShow, setWeeklyBadgeShow] = useState<boolean>(true)
  const [weeklyBadgeText, setWeeklyBadgeText] = useState<string>("SAVE 40%")

  const [monthlyPrice, setMonthlyPrice] = useState<number>(80000)
  const [monthlyOriginal, setMonthlyOriginal] = useState<number>(120000)
  const [monthlyBadgeShow, setMonthlyBadgeShow] = useState<boolean>(true)
  const [monthlyBadgeText, setMonthlyBadgeText] = useState<string>("Best Value • SAVE 33%")

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // 1. Fetch live pricing config
  const fetchPricing = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/pricing")
      const data = await res.json()
      if (data.success && data.plans) {
        const w = data.plans.weekly
        const m = data.plans.monthly
        setWeeklyPrice(w.priceIdr || 30000)
        setWeeklyOriginal(w.originalPriceIdr || 50000)
        setWeeklyBadgeShow(w.showDiscountBadge ?? true)
        setWeeklyBadgeText(w.badgeText || "SAVE 40%")

        setMonthlyPrice(m.priceIdr || 80000)
        setMonthlyOriginal(m.originalPriceIdr || 120000)
        setMonthlyBadgeShow(m.showDiscountBadge ?? true)
        setMonthlyBadgeText(m.badgeText || "Best Value • SAVE 33%")
      }
    } catch (err) {
      console.warn("Failed fetching /api/pricing:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPricing()
  }, [])

  // Auto-calculated discounts
  const weeklyDiscountPercent =
    weeklyOriginal > weeklyPrice
      ? Math.round(((weeklyOriginal - weeklyPrice) / weeklyOriginal) * 100)
      : 0

  const monthlyDiscountPercent =
    monthlyOriginal > monthlyPrice
      ? Math.round(((monthlyOriginal - monthlyPrice) / monthlyOriginal) * 100)
      : 0

  // 2. Save handler
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekly: {
            priceIdr: Number(weeklyPrice),
            originalPriceIdr: Number(weeklyOriginal),
            discountPercent: weeklyDiscountPercent,
            showDiscountBadge: weeklyBadgeShow,
            badgeText: weeklyBadgeText,
          },
          monthly: {
            priceIdr: Number(monthlyPrice),
            originalPriceIdr: Number(monthlyOriginal),
            discountPercent: monthlyDiscountPercent,
            showDiscountBadge: monthlyBadgeShow,
            badgeText: monthlyBadgeText,
          },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setFeedback("Pricing & discount configurations saved permanently to data/pricing.json")
        setTimeout(() => setFeedback(null), 3500)
      }
    } catch (err) {
      console.error("Save error", err)
    } finally {
      setIsSaving(false)
    }
  }

  // 3. Reset handler
  const handleReset = async () => {
    if (!confirm("Reset pricing to standard IDR presets (Monthly IDR 80.000, Weekly IDR 30.000)?")) return
    setIsSaving(true)
    try {
      const res = await fetch("/api/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      })
      const data = await res.json()
      if (data.success) {
        setWeeklyPrice(30000)
        setWeeklyOriginal(50000)
        setWeeklyBadgeShow(true)
        setWeeklyBadgeText("SAVE 40%")

        setMonthlyPrice(80000)
        setMonthlyOriginal(120000)
        setMonthlyBadgeShow(true)
        setMonthlyBadgeText("Best Value • SAVE 33%")

        setFeedback("Pricing restored to default IDR presets.")
        setTimeout(() => setFeedback(null), 3500)
      }
    } catch (err) {
      console.error("Reset error", err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{feedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Card */}
      <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-7 backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] font-mono text-emerald-400 uppercase tracking-widest mb-1.5 font-semibold">
              <CircleDollarSign className="h-3 w-3" />
              <span>IDR Currency &amp; Discount Desk</span>
            </div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Subscription Pricing &amp; Strikethrough Offers
            </h2>
            <p className="text-xs text-foreground/55 mt-0.5">
              Set active subscriber fees in Indonesian Rupiah (IDR), configure strikethrough comparison prices, and manage discount promo badges.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-xs font-mono text-foreground/60 hover:text-white transition-all flex items-center gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-full bg-white text-zinc-950 font-semibold text-xs tracking-tight hover:bg-zinc-200 active:scale-95 transition-all flex items-center gap-1.5 shadow"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving..." : "Save Pricing Config"}</span>
            </button>
          </div>
        </div>

        {/* 2-Columns Form: Weekly Pass & Monthly Pass */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan 1: Weekly Pass */}
          <div className="p-5 rounded-2xl border border-white/[0.06] bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white/70" />
                <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                  Weekly Quant Pass (7 Days)
                </h3>
              </div>
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-foreground/60">
                Tier: Weekly
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-foreground/50 uppercase block mb-1">
                  Active Price (IDR):
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/60 border border-white/[0.08] focus-within:border-white/20">
                  <span className="text-xs font-mono text-emerald-400 font-semibold">IDR</span>
                  <input
                    type="number"
                    step="1000"
                    value={weeklyPrice}
                    onChange={(e) => setWeeklyPrice(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-white outline-none"
                  />
                  <span className="text-[10px] font-mono text-foreground/40 shrink-0">
                    {formatRupiah(weeklyPrice)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-foreground/50 uppercase block mb-1">
                  Original / Strikethrough Price (IDR):
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/60 border border-white/[0.08] focus-within:border-white/20">
                  <span className="text-xs font-mono text-foreground/40 line-through">IDR</span>
                  <input
                    type="number"
                    step="1000"
                    value={weeklyOriginal}
                    onChange={(e) => setWeeklyOriginal(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-foreground/75 outline-none line-through"
                  />
                  <span className="text-[10px] font-mono text-foreground/40 shrink-0">
                    {formatRupiah(weeklyOriginal)}
                  </span>
                </div>
              </div>

              {/* Discount computation badge */}
              <div className="p-2.5 rounded-xl bg-zinc-950/40 border border-white/[0.04] flex items-center justify-between text-xs font-mono">
                <span className="text-foreground/50 text-[10.5px]">Calculated Savings:</span>
                <span className="text-emerald-400 font-semibold text-xs">
                  {weeklyDiscountPercent > 0 ? `${weeklyDiscountPercent}% Discount` : "No Discount"}
                </span>
              </div>

              {/* Promo Badge settings */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-mono text-foreground/60 uppercase">
                    Display Discount Badge:
                  </span>
                  <LiveToggle live={weeklyBadgeShow} onLiveChange={(v) => setWeeklyBadgeShow(v)} />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-foreground/50 uppercase block mb-1">
                    Badge Text:
                  </label>
                  <input
                    type="text"
                    value={weeklyBadgeText}
                    onChange={(e) => setWeeklyBadgeText(e.target.value)}
                    placeholder="e.g. SAVE 40%"
                    className="w-full bg-zinc-950/60 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-white/25"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Plan 2: Monthly Pro Pass */}
          <div className="p-5 rounded-2xl border border-emerald-500/20 bg-zinc-900/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">
                  Monthly Pro Pass (30 Days)
                </h3>
              </div>
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-semibold">
                Popular Choice
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-foreground/50 uppercase block mb-1">
                  Active Price (IDR):
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/60 border border-emerald-500/30 focus-within:border-emerald-400">
                  <span className="text-xs font-mono text-emerald-400 font-semibold">IDR</span>
                  <input
                    type="number"
                    step="1000"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-white outline-none"
                  />
                  <span className="text-[10px] font-mono text-emerald-400/80 shrink-0 font-semibold">
                    {formatRupiah(monthlyPrice)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-foreground/50 uppercase block mb-1">
                  Original / Strikethrough Price (IDR):
                </label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950/60 border border-white/[0.08] focus-within:border-white/20">
                  <span className="text-xs font-mono text-foreground/40 line-through">IDR</span>
                  <input
                    type="number"
                    step="1000"
                    value={monthlyOriginal}
                    onChange={(e) => setMonthlyOriginal(Number(e.target.value))}
                    className="w-full bg-transparent text-xs font-mono text-foreground/75 outline-none line-through"
                  />
                  <span className="text-[10px] font-mono text-foreground/40 shrink-0">
                    {formatRupiah(monthlyOriginal)}
                  </span>
                </div>
              </div>

              {/* Discount computation badge */}
              <div className="p-2.5 rounded-xl bg-zinc-950/40 border border-white/[0.04] flex items-center justify-between text-xs font-mono">
                <span className="text-foreground/50 text-[10.5px]">Calculated Savings:</span>
                <span className="text-emerald-400 font-semibold text-xs">
                  {monthlyDiscountPercent > 0 ? `${monthlyDiscountPercent}% Discount` : "No Discount"}
                </span>
              </div>

              {/* Promo Badge settings */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-mono text-foreground/60 uppercase">
                    Display Discount Badge:
                  </span>
                  <LiveToggle live={monthlyBadgeShow} onLiveChange={(v) => setMonthlyBadgeShow(v)} />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-foreground/50 uppercase block mb-1">
                    Badge Text:
                  </label>
                  <input
                    type="text"
                    value={monthlyBadgeText}
                    onChange={(e) => setMonthlyBadgeText(e.target.value)}
                    placeholder="e.g. Best Value • SAVE 33%"
                    className="w-full bg-zinc-950/60 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-mono text-white outline-none focus:border-white/25"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Live Card Simulator / Preview */}
        <div className="pt-4 border-t border-white/[0.06] space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-white uppercase font-mono tracking-wider">
              Live Subscriber Page Preview (/pricing)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly Preview */}
            <div className="p-4 rounded-xl border border-white/[0.08] bg-zinc-900/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Weekly Quant Pass</span>
                {weeklyBadgeShow && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                    {weeklyBadgeText}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                {weeklyOriginal > weeklyPrice && (
                  <span className="text-sm font-mono text-foreground/40 line-through">
                    {formatRupiah(weeklyOriginal)}
                  </span>
                )}
                <span className="text-2xl font-mono font-bold text-white">
                  {formatRupiah(weeklyPrice)}
                </span>
                <span className="text-xs font-mono text-foreground/50">/ 7 days</span>
              </div>
            </div>

            {/* Monthly Preview */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-zinc-900/50 space-y-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Monthly Pro Pass</span>
                {monthlyBadgeShow && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-semibold">
                    {monthlyBadgeText}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                {monthlyOriginal > monthlyPrice && (
                  <span className="text-sm font-mono text-foreground/40 line-through">
                    {formatRupiah(monthlyOriginal)}
                  </span>
                )}
                <span className="text-2xl font-mono font-bold text-emerald-400">
                  {formatRupiah(monthlyPrice)}
                </span>
                <span className="text-xs font-mono text-foreground/50">/ 30 days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
