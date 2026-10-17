"use client"

import { useState } from "react"
import {
  Target,
  AlertTriangle,
  Compass,
  Layers,
  CheckCircle2,
  Maximize2,
  ChevronRight,
  TrendingUp,
  FileCode2,
  Volume2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Modal } from "@/components/ui/modal"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { CombRows } from "@/components/ui/comb-rows"
import { playInstitutionalChime } from "@/components/signal/notification-sound-center"

export interface SignalMappingData {
  pair: string
  assetName: string
  signalType: "BUY" | "SELL"
  status: "ACTIVE" | "PENDING" | "INVALIDATED" | "TARGET_REACHED"
  entryZone: string
  invalidation: string
  target1: string
  target2: string
  riskReward: string
  timeframe: string
  timestamp: string
  confidenceScore: number
  // Confluence & Reason checklist
  reasons: {
    title: string
    category: "Liquidity" | "Structure" | "Orderflow" | "Macro"
    description: string
    confirmed: boolean
  }[]
  // Technical Price Mapping Levels
  mappingLevels: {
    label: string
    price: string
    type: "Resistance" | "Target" | "Entry" | "OrderBlock" | "Invalidation"
  }[]
  // Confluence weights comparison
  confluenceWeights: {
    label: string
    value: number
  }[]
}

export function SignalCard({
  signal,
  onOpenModal,
  isSubscribed = true,
}: {
  signal: SignalMappingData
  onOpenModal: () => void
  isSubscribed?: boolean
}) {
  const isBuy = signal.signalType === "BUY"

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-4 sm:p-5 backdrop-blur-md flex flex-col gap-4 transition-colors hover:border-white/[0.15] relative overflow-hidden">
      {/* 1. Header: Pair, Direction Badge, Status & Timestamp */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-sm tracking-tight text-white">{signal.pair}</span>
          <span
            className={cn(
              "text-[10.5px] font-mono px-2 py-0.5 rounded-full font-semibold",
              isBuy ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
            )}
          >
            {signal.signalType}
          </span>
          <span className="text-[11px] font-mono text-foreground/45 hidden sm:inline-block">
            {signal.timeframe} · {signal.timestamp}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Play Institutional Chime Alert"
            onClick={(e) => {
              e.stopPropagation()
              playInstitutionalChime()
            }}
            className="p-1 rounded-md text-foreground/50 hover:text-emerald-400 hover:bg-white/[0.04] transition-colors"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {signal.status}
          </span>
          <button
            type="button"
            onClick={onOpenModal}
            className="text-[11.5px] font-mono text-foreground/60 hover:text-white px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-colors flex items-center gap-1"
          >
            <span>Detail</span>
            <ChevronRight className="h-3 w-3 opacity-60" />
          </button>
        </div>
      </div>

      {/* 2. Key Price Levels Mapping Row (Clean blur overlay when not subscribed) */}
      <div className="relative">
        <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono transition-all", !isSubscribed && "select-none blur-[6px] opacity-40")}>
          <div className="p-2.5 rounded-xl border border-white/[0.04] bg-zinc-900/40">
            <span className="text-foreground/45 text-[10.5px] block mb-0.5">Entry Zone</span>
            <span className="text-white font-medium">{signal.entryZone}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/[0.04] bg-zinc-900/40">
            <span className="text-rose-400/80 text-[10.5px] block mb-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-rose-400" /> Invalidation (SL)
            </span>
            <span className="text-rose-400 font-medium">{signal.invalidation}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/[0.04] bg-zinc-900/40">
            <span className="text-emerald-400/80 text-[10.5px] block mb-0.5 flex items-center gap-1">
              <Target className="h-3 w-3 text-emerald-400" /> Target 1 (TP)
            </span>
            <span className="text-emerald-400 font-medium">{signal.target1}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-white/[0.04] bg-zinc-900/40">
            <span className="text-foreground/45 text-[10.5px] block mb-0.5">Risk : Reward</span>
            <span className="text-white font-medium">{signal.riskReward}</span>
          </div>
        </div>

        {/* Paywall Overlay */}
        {!isSubscribed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl border border-white/[0.08]">
            <a
              href="/pricing"
              className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs tracking-tight shadow-md hover:bg-zinc-200 transition-colors flex items-center gap-2"
            >
              <span>Unlock Signal Levels &amp; Confluences</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* 3. Reason Preview (Top 2 Confluences) */}
      <div className={cn("space-y-1.5 pt-1", !isSubscribed && "select-none blur-[4px] opacity-35")}>
        <div className="flex items-center justify-between text-[11px] font-mono text-foreground/45">
          <span>Primary Signal Confluences</span>
          <span>{signal.confidenceScore}% Confidence</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {signal.reasons.slice(0, 2).map((r, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-900/30 border border-white/[0.04]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-white font-medium text-[11.5px] block leading-tight">{r.title}</span>
                <span className="text-foreground/50 text-[11px] leading-tight block mt-0.5 truncate">{r.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SignalDetailModal({
  open,
  onClose,
  signal,
}: {
  open: boolean
  onClose: () => void
  signal: SignalMappingData | null
}) {
  const [tab, setTab] = useState<"Reasons" | "Council Consensus" | "Mapping" | "Weights">("Reasons")

  if (!signal) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${signal.pair} · Signal Analysis & Price Mapping`}
      width={680}
      actions={[
        { label: "Close", onClick: onClose, primary: true },
      ]}
    >
      <div className="space-y-5 py-2">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="text-xs font-mono text-foreground/60">
            {signal.signalType} Signal · {signal.entryZone}
          </span>
          <SegmentedControl
            options={["Reasons", "Council Consensus", "Mapping", "Weights"]}
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
          />
        </div>

        {/* Tab: Council Consensus (Synthesized conclusion from 20 AI models) */}
        {tab === "Council Consensus" && (
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 font-mono text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                  20-Agent Model Deliberation Summary
                </span>
                <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  88% Model Agreement (17/20 Models)
                </span>
              </div>
              <p className="text-foreground/85 leading-relaxed">
                17 of 20 quantitative AI models reached algorithmic consensus for LONG / BUY expansion. Key driving factors include Asian session liquidity sweep defense, DXY Dollar Index resistance mitigation, and heavy buy imbalance across institutional volume profiles.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl border border-white/[0.06] bg-zinc-900/40">
                <span className="text-foreground/45 text-[10px] block">BULLISH MODELS</span>
                <span className="text-emerald-400 font-semibold text-sm">17 Models (85%)</span>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.06] bg-zinc-900/40">
                <span className="text-foreground/45 text-[10px] block">NEUTRAL / DISSENT</span>
                <span className="text-foreground/75 font-semibold text-sm">3 Models (15%)</span>
              </div>
              <div className="p-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 col-span-2 sm:col-span-1">
                <span className="text-foreground/45 text-[10px] block">QUORUM STATUS</span>
                <span className="text-white font-semibold text-sm">Approved for Public</span>
              </div>
            </div>

            <div className="text-[11px] font-mono text-foreground/45 border-t border-white/[0.06] pt-3">
              Note: Detailed per-model API keys and prompt weights are managed in the Admin Studio desk.
            </div>
          </div>
        )}

        {/* Tab 1: Detailed Reasons & Confluence Checklist */}
        {tab === "Reasons" && (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {signal.reasons.map((r, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-white/[0.06] bg-zinc-900/40 flex items-start gap-3"
              >
                <div className="h-5 w-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-xs">{r.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-foreground/60">
                      {r.category}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/60 leading-relaxed">{r.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Technical Price Mapping Ladder */}
        {tab === "Mapping" && (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            <p className="text-xs text-foreground/50 pb-1">
              Horizontal price reference levels mapped on high-timeframe orderflow:
            </p>
            {signal.mappingLevels.map((lvl, i) => {
              const isTarget = lvl.type === "Target"
              const isInvalid = lvl.type === "Invalidation"
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.04] bg-zinc-900/30 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        isTarget ? "bg-emerald-400" : isInvalid ? "bg-rose-400" : "bg-zinc-400"
                      )}
                    />
                    <span className="text-foreground/80">{lvl.label}</span>
                    <span className="text-[10px] text-foreground/45 px-1.5 py-0.5 rounded bg-white/[0.04]">
                      {lvl.type}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-semibold",
                      isTarget ? "text-emerald-400" : isInvalid ? "text-rose-400" : "text-white"
                    )}
                  >
                    {lvl.price}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab 3: Confluence Factor Weights (CombRows) */}
        {tab === "Weights" && (
          <div className="p-3 rounded-xl border border-white/[0.06] bg-zinc-900/30">
            <CombRows
              title="Factor Weight Distribution"
              subject="Liquidity Sweep"
              rows={signal.confluenceWeights}
              max={50}
              caption="Normalized confluence score out of 50 points"
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
