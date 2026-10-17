"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Bell,
  Volume2,
  VolumeX,
  Send,
  Check,
  Radio,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Zap,
  Bot,
  MessageSquare,
  Play,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Audio synthesis function using Web Audio API (No external sound asset files needed)
export function playInstitutionalChime() {
  if (typeof window === "undefined") return
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const now = ctx.currentTime

    // Tone 1: Clean high-resonance sine pulse (880 Hz / A5)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(880, now)
    osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12) // slides up to D6
    gain1.gain.setValueAtTime(0.001, now)
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    // Tone 2: Warm undertone harmonics (587.33 Hz / D5)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = "sine"
    osc2.frequency.setValueAtTime(587.33, now)
    gain2.gain.setValueAtTime(0.001, now)
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.04)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.56)
    osc2.stop(now + 0.46)
  } catch {
    // Audio context suspended or blocked by user gesture
  }
}

export interface SignalPushNotification {
  id: string
  title: string
  pair: string
  direction: "BUY" | "SELL"
  quorumScore: number
  entry: string
  target: string
  timeAgo: string
}

export function NotificationSoundCenter({
  onBroadcastTest,
}: {
  onBroadcastTest?: () => void
}) {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const [telegramConnected, setTelegramConnected] = useState<boolean>(true)
  const [telegramChannel, setTelegramChannel] = useState<string>("@needpips_alpha_vip")
  const [recentNotification, setRecentNotification] = useState<SignalPushNotification | null>(null)
  const [toastVisible, setToastVisible] = useState<boolean>(false)

  const triggerMockNotification = () => {
    if (soundEnabled) {
      playInstitutionalChime()
    }
    const notif: SignalPushNotification = {
      id: `sig-${Date.now()}`,
      title: "New AI Council Quorum Reached",
      pair: "XAU/USD",
      direction: "BUY",
      quorumScore: 88,
      entry: "$2,654.80",
      target: "$2,685.00",
      timeAgo: "Just now",
    }
    setRecentNotification(notif)
    setToastVisible(true)
    setTimeout(() => {
      setToastVisible(false)
    }, 5000)

    if (onBroadcastTest) onBroadcastTest()
  }

  return (
    <>
      {/* 1. Global Floating Signal Broadcast Toast Popup */}
      <AnimatePresence>
        {toastVisible && recentNotification && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-14 right-4 sm:right-6 z-[100] max-w-sm w-full p-4 rounded-2xl border border-emerald-500/30 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-emerald-950/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold block">
                    88% Model Quorum Broadcast
                  </span>
                  <span className="font-semibold text-xs text-white">
                    {recentNotification.pair} · {recentNotification.direction} Setup
                  </span>
                </div>
              </div>
              <button
                onClick={() => setToastVisible(false)}
                className="text-foreground/45 hover:text-white text-xs font-mono p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
              <span className="text-foreground/60">Entry: {recentNotification.entry}</span>
              <span className="text-emerald-400 font-medium">TP: {recentNotification.target}</span>
              <span className="text-foreground/40">{recentNotification.timeAgo}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Audio & Telegram Controls Desk Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-white tracking-tight uppercase tracking-wider font-mono">
              Signal Dispatch &amp; Alert Engine
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled)
                if (!soundEnabled) playInstitutionalChime()
              }}
              className={cn(
                "px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-colors",
                soundEnabled
                  ? "bg-white/[0.08] text-white border-white/20"
                  : "bg-transparent text-foreground/45 border-white/[0.06]"
              )}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Chime On</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-foreground/40" />
                  <span>Muted</span>
                </>
              )}
            </button>

            <button
              onClick={triggerMockNotification}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono flex items-center gap-1.5 transition-colors font-medium"
            >
              <Play className="h-3 w-3" />
              <span>Test Chime</span>
            </button>
          </div>
        </div>

        {/* Telegram Bot Broadcast Channel Card */}
        <div className="p-3.5 rounded-xl border border-white/[0.06] bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Send className="h-4 w-4 text-sky-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white">Telegram Push Channel</span>
                <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[9.5px] font-mono font-semibold">
                  CONNECTED
                </span>
              </div>
              <p className="text-[11px] font-mono text-foreground/50 truncate">
                Target: {telegramChannel} · Latency &lt;180ms
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerMockNotification()
              alert(`Signal payload dispatched to Telegram channel: ${telegramChannel}`)
            }}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-[11.5px] font-medium transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-center"
          >
            <Send className="h-3 w-3 text-sky-400" />
            <span>Broadcast to Channel</span>
          </button>
        </div>
      </div>
    </>
  )
}
