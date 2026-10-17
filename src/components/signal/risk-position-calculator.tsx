"use client"

import { useState } from "react"
import { Calculator, ShieldAlert, ArrowRight, DollarSign, Percent, Scale, Check } from "lucide-react"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { cn } from "@/lib/utils"

export function RiskPositionCalculator({
  currentPair = "XAU-USD",
  currentPrice = 2654.80,
  defaultSl = 2638.00,
  defaultTp = 2685.00,
}: {
  currentPair?: "XAU-USD" | "BTC-USD"
  currentPrice?: number
  defaultSl?: number
  defaultTp?: number
}) {
  const [pair, setPair] = useState<"XAU-USD" | "BTC-USD">(currentPair)
  const [accountBalance, setAccountBalance] = useState<number>(10000)
  const [riskPercent, setRiskPercent] = useState<number>(1.0) // 1% institutional risk
  const [customSl, setCustomSl] = useState<number>(defaultSl)
  const [customTp, setCustomTp] = useState<number>(defaultTp)

  // Monetary risk capital ($)
  const riskAmount = (accountBalance * riskPercent) / 100

  // Calculation for Gold Spot (XAU/USD) vs Bitcoin (BTC/USD)
  const isGold = pair === "XAU-USD"

  // Distance to Stop Loss in dollars
  const slDistance = Math.max(0.1, Math.abs(currentPrice - customSl))
  const tpDistance = Math.max(0.1, Math.abs(customTp - currentPrice))

  // Recommended position sizing:
  // For Gold: 1 standard lot = 100 oz. $1 move per lot = $100.
  // Lot = RiskAmount / (SL_Distance * 100)
  // For BTC: Qty = RiskAmount / SL_Distance
  const recommendedLot = isGold
    ? Math.max(0.01, Number((riskAmount / (slDistance * 100)).toFixed(2)))
    : Math.max(0.001, Number((riskAmount / slDistance).toFixed(3)))

  const potentialProfit = isGold
    ? Number((recommendedLot * tpDistance * 100).toFixed(2))
    : Number((recommendedLot * tpDistance).toFixed(2))

  const rrRatio = (tpDistance / slDistance).toFixed(2)

  return (
    <div className="w-full space-y-5 text-foreground">
      {/* Pair Switcher & Contract Specs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-white/[0.08] bg-zinc-900/40">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-foreground/50 uppercase tracking-wider">
            Trading Asset:
          </span>
          <div className="w-[180px]">
            <SegmentedControl
              options={["XAU/USD", "BTC/USD"]}
              value={isGold ? "XAU/USD" : "BTC/USD"}
              onChange={(val) => {
                const next = val === "XAU/USD" ? "XAU-USD" : "BTC-USD"
                setPair(next)
                if (next === "BTC-USD") {
                  setCustomSl(65800)
                  setCustomTp(71200)
                } else {
                  setCustomSl(2638)
                  setCustomTp(2685)
                }
              }}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-foreground/45">Contract Multiplier:</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-emerald-400 font-semibold">
            {isGold ? "100 oz / Lot (Standard FX)" : "1.00 BTC Units"}
          </span>
        </div>
      </div>

      {/* Input Parameters Form Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        {/* 1. Account Equity */}
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-zinc-900/30 flex flex-col justify-between">
          <span className="text-[10.5px] text-foreground/45 uppercase tracking-wider block mb-1">
            Account Equity ($)
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-foreground/40 text-base font-medium">$</span>
            <input
              type="number"
              step="500"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Math.max(100, Number(e.target.value)))}
              className="bg-transparent w-full outline-none font-mono text-xl font-semibold text-white tracking-tight"
            />
          </div>
          <span className="text-[10px] text-foreground/40 mt-2 block">
            Baseline risk equity
          </span>
        </div>

        {/* 2. Risk Tolerance (%) */}
        <div className="p-4 rounded-2xl border border-white/[0.08] bg-zinc-900/30 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10.5px] text-foreground/45 uppercase tracking-wider">
              Risk Tolerance
            </span>
            <span className="text-xs text-emerald-400 font-bold">{riskPercent}%</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[0.5, 1.0, 1.5, 2.0].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setRiskPercent(pct)}
                className={cn(
                  "py-1.5 rounded-lg text-xs font-mono font-medium transition-all text-center",
                  riskPercent === pct
                    ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                    : "bg-white/[0.04] text-foreground/60 hover:text-white hover:bg-white/[0.08]"
                )}
              >
                {pct}%
              </button>
            ))}
          </div>
          <span className="text-[10px] text-foreground/40 mt-2 block">
            Institutional range: 1–2%
          </span>
        </div>

        {/* 3. Invalidation Stop Loss */}
        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 flex flex-col justify-between">
          <span className="text-[10.5px] text-rose-400/80 uppercase tracking-wider block mb-1">
            Stop Loss Price ($)
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-rose-400/50 text-base font-medium">$</span>
            <input
              type="number"
              step="1"
              value={customSl}
              onChange={(e) => setCustomSl(Number(e.target.value))}
              className="bg-transparent w-full outline-none font-mono text-xl font-semibold text-rose-400 tracking-tight"
            />
          </div>
          <span className="text-[10px] text-rose-400/60 mt-2 block">
            SL Distance: ${slDistance.toFixed(2)}
          </span>
        </div>

        {/* 4. Target Profit (TP1) */}
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
          <span className="text-[10.5px] text-emerald-400/80 uppercase tracking-wider block mb-1">
            Target 1 (TP) Price ($)
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-emerald-400/50 text-base font-medium">$</span>
            <input
              type="number"
              step="1"
              value={customTp}
              onChange={(e) => setCustomTp(Number(e.target.value))}
              className="bg-transparent w-full outline-none font-mono text-xl font-semibold text-emerald-400 tracking-tight"
            />
          </div>
          <span className="text-[10px] text-emerald-400/60 mt-2 block">
            TP Distance: ${tpDistance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Primary Recommended Results Banner */}
      <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.10] bg-gradient-to-br from-zinc-900/60 to-zinc-950/80 backdrop-blur-md">
        <span className="text-[11px] font-mono text-foreground/45 uppercase tracking-widest block mb-4">
          Calculated Order Parameters
        </span>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 font-mono">
          {/* Recommended Sizing */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10.5px] text-foreground/45 uppercase block mb-1">
              Recommended Sizing
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {recommendedLot}{" "}
              <span className="text-sm font-normal text-foreground/50">
                {isGold ? "Lots" : "BTC"}
              </span>
            </div>
            <span className="text-[10.5px] text-emerald-400/80 block mt-1">
              Optimal position allocation
            </span>
          </div>

          {/* Max Dollar Loss */}
          <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/15">
            <span className="text-[10.5px] text-rose-400/80 uppercase block mb-1">
              Max Risk (Loss Cap)
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-rose-400 tracking-tight">
              -${riskAmount.toFixed(2)}
            </div>
            <span className="text-[10.5px] text-rose-400/60 block mt-1">
              Fixed {riskPercent}% of ${accountBalance.toLocaleString()}
            </span>
          </div>

          {/* Estimated Gain */}
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            <span className="text-[10.5px] text-emerald-400/80 uppercase block mb-1">
              Estimated Gain (TP1)
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-tight">
              +${potentialProfit.toLocaleString()}{" "}
              <span className="text-xs font-normal text-emerald-400/70">USD</span>
            </div>
            <span className="text-[10.5px] text-emerald-400/60 block mt-1">
              +{(potentialProfit / (accountBalance || 1) * 100).toFixed(1)}% portfolio growth
            </span>
          </div>

          {/* Risk : Reward Ratio */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <span className="text-[10.5px] text-foreground/45 uppercase block mb-1">
              Risk : Reward Ratio
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              1 : {rrRatio}
            </div>
            <span className="text-[10.5px] text-foreground/50 block mt-1">
              {Number(rrRatio) >= 1.5 ? "✓ Institutional Grade" : "Sub-optimal skew"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
