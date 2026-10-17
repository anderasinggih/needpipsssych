"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import {
  Shield,
  Sliders,
  Cpu,
  Radio,
  Users,
  KeyRound,
  Check,
  AlertCircle,
  RefreshCw,
  Plus,
  Send,
  Database,
  Lock,
  Calendar,
  Layers,
  SlidersHorizontal,
  Bell,
  Fingerprint,
  HardDrive,
  Workflow,
  ExternalLink,
  Save,
  RotateCcw,
  Copy,
  Trash2,
  Terminal,
  Code2,
  CheckCircle2,
} from "lucide-react"
import type { AdminApiKey } from "@/lib/webhook-keys-db"
import { AppNavbar } from "@/components/layout/app-navbar"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { ViewSwitch, type ViewOption } from "@/components/ui/view-switch"
import { DateRangePicker, type DayRange } from "@/components/ui/date-range-picker"
import { PreferencesCard, type PreferenceRow } from "@/components/ui/preferences-card"
import { LiveToggle } from "@/components/ui/live-toggle"
import { AgentCouncilStudio } from "@/components/admin/agent-council-studio"
import { PricingConfigStudio } from "@/components/admin/pricing-config-studio"
import { AdminUserTable, type AdminUserAccount } from "@/components/admin/admin-user-table"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export default function AdminSettingsPage() {
  const { user, adminConfig, updateAdminConfig } = useAuth()
  const [activeTab, setActiveTab] = useState<string>("Signal Studio")

  // ViewSwitch Environment Scope State (Production vs Staging vs Sandbox)
  const [scopeView, setScopeView] = useState<"prod" | "staging" | "sandbox">("prod")

  // DateRangePicker Audit Window State
  const [auditRange, setAuditRange] = useState<DayRange>({ from: "2026-09-01", to: "2026-09-28" })

  // Quant Engine Model Settings State
  const [engineLive, setEngineLive] = useState<boolean>(true)
  const [modelTemperature, setModelTemperature] = useState<number>(0.2)
  const [minConfidenceThreshold, setMinConfidenceThreshold] = useState<number>(75)
  const [autoInvalidationTimeout, setAutoInvalidationTimeout] = useState<string>("240m")
  const [highImpactNewsPause, setHighImpactNewsPause] = useState<boolean>(true)
  const [isSavingHyperparams, setIsSavingHyperparams] = useState<boolean>(false)
  const [hyperparamsMessage, setHyperparamsMessage] = useState<string | null>(null)
  const [hyperparamsLastSaved, setHyperparamsLastSaved] = useState<string | null>(null)

  // Webhook Ingestion API Keys State
  const [apiKeysList, setApiKeysList] = useState<AdminApiKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState<boolean>(false)
  const [newKeyName, setNewKeyName] = useState<string>("")
  const [isGeneratingKey, setIsGeneratingKey] = useState<boolean>(false)
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ apiKey: AdminApiKey; rawKey: string } | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [webhookCodeTab, setWebhookCodeTab] = useState<string>("TradingView JSON")
  const [testWebhookPair, setTestWebhookPair] = useState<string>("XAU/USD")
  const [testWebhookDirection, setTestWebhookDirection] = useState<"BUY" | "SELL">("BUY")
  const [isSendingTestWebhook, setIsSendingTestWebhook] = useState<boolean>(false)
  const [testWebhookResponse, setTestWebhookResponse] = useState<string | null>(null)

  // Signal Generator Draft State
  const [selectedPair, setSelectedPair] = useState<string>("XAU/USD")
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY")
  const [timeframe, setTimeframe] = useState<string>("H1")
  const [entryPrice, setEntryPrice] = useState<string>("2,642.50")
  const [slPrice, setSlPrice] = useState<string>("2,634.00")
  const [tp1Price, setTp1Price] = useState<string>("2,658.00")
  const [tp2Price, setTp2Price] = useState<string>("2,674.00")
  const [confidenceScore, setConfidenceScore] = useState<number>(86)
  const [confluenceNotes, setConfluenceNotes] = useState<string>(
    "M15 internal liquidity sweep at Asian session low with Bullish Order Block mitigation and DXY pullback confirmation."
  )
  const [isPublishing, setIsPublishing] = useState<boolean>(false)
  const [publishSuccess, setPublishSuccess] = useState<boolean>(false)

  // Real Registered Accounts State
  const [usersList, setUsersList] = useState<AdminUserAccount[]>([])
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [userUpdateMessage, setUserUpdateMessage] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch("/api/auth/users")
      const data = await res.json()
      if (data.success && Array.isArray(data.users)) {
        setUsersList(data.users)
      }
    } catch (e) {
      console.warn("Failed fetching users", e)
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchHyperparameters = async () => {
    try {
      const res = await fetch("/api/settings/hyperparameters")
      const data = await res.json()
      if (data.success && data.hyperparameters) {
        const hp = data.hyperparameters
        if (typeof hp.minConfidenceThreshold === "number") setMinConfidenceThreshold(hp.minConfidenceThreshold)
        if (typeof hp.modelTemperature === "number") setModelTemperature(hp.modelTemperature)
        if (typeof hp.autoInvalidationTimeout === "string") setAutoInvalidationTimeout(hp.autoInvalidationTimeout)
        if (typeof hp.highImpactNewsPause === "boolean") setHighImpactNewsPause(hp.highImpactNewsPause)
        if (typeof hp.engineLive === "boolean") setEngineLive(hp.engineLive)
        if (hp.lastUpdated) {
          const d = new Date(hp.lastUpdated)
          setHyperparamsLastSaved(
            d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB"
          )
        }
      }
    } catch (e) {
      console.warn("Failed fetching model hyperparameters", e)
    }
  }

  const handleSaveHyperparameters = async () => {
    setIsSavingHyperparams(true)
    setHyperparamsMessage(null)
    try {
      const res = await fetch("/api/settings/hyperparameters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minConfidenceThreshold,
          modelTemperature,
          autoInvalidationTimeout,
          highImpactNewsPause,
          engineLive,
          updatedBy: user?.name || "Super Admin",
        }),
      })
      const data = await res.json()
      if (data.success) {
        setHyperparamsMessage("Model hyperparameters berhasil disimpan permanen ke database Supabase.")
        const now = new Date()
        setHyperparamsLastSaved(
          now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB"
        )
        setTimeout(() => setHyperparamsMessage(null), 5000)
      } else {
        setHyperparamsMessage(data.error || "Gagal menyimpan model hyperparameters.")
      }
    } catch (err) {
      console.error("Save hyperparameters error", err)
      setHyperparamsMessage("Terjadi kesalahan jaringan saat menyimpan hyperparameters.")
    } finally {
      setIsSavingHyperparams(false)
    }
  }

  const handleResetHyperparameters = () => {
    if (!confirm("Reset semua model hyperparameters ke nilai default (Confidence: 75%, Temp: 0.2, Timeout: 240m)?")) return
    setMinConfidenceThreshold(75)
    setModelTemperature(0.2)
    setAutoInvalidationTimeout("240m")
    setHighImpactNewsPause(true)
    setEngineLive(true)
  }

  const fetchApiKeys = async () => {
    setLoadingKeys(true)
    try {
      const res = await fetch("/api/settings/webhooks/keys")
      const data = await res.json()
      if (data.success && Array.isArray(data.keys)) {
        setApiKeysList(data.keys)
      }
    } catch (e) {
      console.warn("Failed fetching API keys", e)
    } finally {
      setLoadingKeys(false)
    }
  }

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return
    setIsGeneratingKey(true)
    try {
      const res = await fetch("/api/settings/webhooks/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          createdByName: user?.name || "Super Admin",
          createdByEmail: user?.email || "admin@needpips.io",
        }),
      })
      const data = await res.json()
      if (data.success && data.apiKey) {
        setNewlyCreatedKey({ apiKey: data.apiKey, rawKey: data.rawKey })
        setApiKeysList((prev) => [data.apiKey, ...prev])
        setNewKeyName("")
        setShowGenerateModal(false)
      }
    } catch (err) {
      console.error("Create API key error:", err)
    } finally {
      setIsGeneratingKey(false)
    }
  }

  const handleRevokeApiKey = async (keyId: string) => {
    if (
      !confirm(
        "Peringatan: Cabut API key ini? Semua bot TradingView atau script Python yang menggunakan kunci ini akan langsung ditolak."
      )
    )
      return
    try {
      const res = await fetch("/api/settings/webhooks/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: keyId }),
      })
      const data = await res.json()
      if (data.success) {
        setApiKeysList((prev) =>
          prev.map((k) => (k.id === keyId ? { ...k, status: "REVOKED" } : k))
        )
      }
    } catch (err) {
      console.error("Revoke key error:", err)
    }
  }

  const handleSendTestWebhook = async () => {
    setIsSendingTestWebhook(true)
    setTestWebhookResponse(null)
    const activeKey =
      apiKeysList.find((k) => k.status === "ACTIVE")?.key ||
      "np_live_948f2b01ac741893c8340d"
    const isXau = testWebhookPair === "XAU/USD"
    const entry = isXau ? 2648.5 : 67800.0
    const sl =
      testWebhookDirection === "BUY"
        ? isXau
          ? 2640.0
          : 66950.0
        : isXau
        ? 2657.0
        : 68650.0
    const tp1 =
      testWebhookDirection === "BUY"
        ? isXau
          ? 2664.0
          : 69350.0
        : isXau
        ? 2633.0
        : 66250.0
    const tp2 =
      testWebhookDirection === "BUY"
        ? isXau
          ? 2680.0
          : 70900.0
        : isXau
        ? 2617.0
        : 64700.0

    try {
      const res = await fetch("/api/webhooks/tradingview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": activeKey,
        },
        body: JSON.stringify({
          ticker: testWebhookPair,
          action: testWebhookDirection,
          price: entry,
          sl,
          tp1,
          tp2,
          timeframe: "M15",
          confidence: 91,
          message: `Live Test Webhook Alert ingested from Admin Studio (${testWebhookPair} ${testWebhookDirection})`,
        }),
      })
      const data = await res.json()
      setTestWebhookResponse(JSON.stringify(data, null, 2))
      if (data.success) {
        refreshActiveSignals()
      }
    } catch (err: unknown) {
      setTestWebhookResponse(
        JSON.stringify(
          { error: err instanceof Error ? err.message : "Network error" },
          null,
          2
        )
      )
    } finally {
      setIsSendingTestWebhook(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchHyperparameters()
    fetchApiKeys()
  }, [])

  const handleUpdateUser = async (
    userId: string,
    action: "update-tier" | "update-role" | "update-status",
    payload: { tier?: string; role?: string; status?: string }
  ) => {
    setUpdatingUserId(userId)
    setUserUpdateMessage(null)
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, ...payload }),
      })
      const data = await res.json()
      if (data.success && data.user) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u))
        )
        setUserUpdateMessage(`Access permissions for ${data.user.email} updated successfully.`)
        setTimeout(() => setUserUpdateMessage(null), 3000)
      }
    } catch (e) {
      console.error("Error updating user", e)
    } finally {
      setUpdatingUserId(null)
    }
  }

  // Webhook / System API Key State
  const [apiKeyVisible, setApiKeyVisible] = useState<boolean>(false)

  const [publishError, setPublishError] = useState<string | null>(null)
  const [lastPublishedSignal, setLastPublishedSignal] = useState<any>(null)
  const [activeSignalsDb, setActiveSignalsDb] = useState<Record<string, any> | null>(null)
  const [liveMarketPrice, setLiveMarketPrice] = useState<number | null>(null)
  const [isFetchingPrice, setIsFetchingPrice] = useState<boolean>(false)

  const syncLivePrices = async (pairToSync = selectedPair, dir = direction, tf = timeframe) => {
    setIsFetchingPrice(true)
    try {
      const sym = pairToSync === "XAU/USD" ? "XAU-USD" : "BTC-USD"
      const res = await fetch(`/api/binance-chart?symbol=${sym}&tf=M15`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        const currentPrice = data.stats?.lastPrice
        if (currentPrice && !isNaN(currentPrice)) {
          setLiveMarketPrice(currentPrice)

          const isXau = pairToSync === "XAU/USD"
          const decimals = 2

          let entry = currentPrice

          // Dynamic Scalping vs Swing volatility multipliers per timeframe
          let xauSlDelta = 14.5
          let xauTp1Delta = 26.0
          let xauTp2Delta = 48.0
          let btcSlRatio = 0.015
          let btcTp1Ratio = 0.025
          let btcTp2Ratio = 0.048

          if (tf === "M1") {
            // Tight M1 micro-scalping ranges
            xauSlDelta = 2.80   // ~28 pips
            xauTp1Delta = 5.20  // ~52 pips (1:1.85 R:R)
            xauTp2Delta = 9.00  // ~90 pips
            btcSlRatio = 0.0035 // 0.35%
            btcTp1Ratio = 0.0070 // 0.70%
            btcTp2Ratio = 0.0130 // 1.30%
          } else if (tf === "M5") {
            // Agile M5 scalping ranges
            xauSlDelta = 5.50   // ~55 pips
            xauTp1Delta = 10.50 // ~105 pips (1:1.9 R:R)
            xauTp2Delta = 18.00 // ~180 pips
            btcSlRatio = 0.0065 // 0.65%
            btcTp1Ratio = 0.0130 // 1.30%
            btcTp2Ratio = 0.0240 // 2.40%
          } else if (tf === "M15") {
            // Intraday M15 momentum ranges
            xauSlDelta = 9.50   // ~95 pips
            xauTp1Delta = 18.00 // ~180 pips
            xauTp2Delta = 32.00 // ~320 pips
            btcSlRatio = 0.0110 // 1.10%
            btcTp1Ratio = 0.0220 // 2.20%
            btcTp2Ratio = 0.0390 // 3.90%
          } else if (tf === "H1") {
            // Session H1 swing ranges
            xauSlDelta = 14.50
            xauTp1Delta = 26.00
            xauTp2Delta = 48.00
            btcSlRatio = 0.0150
            btcTp1Ratio = 0.0250
            btcTp2Ratio = 0.0480
          } else if (tf === "H4") {
            // Macro H4 swing ranges
            xauSlDelta = 26.00
            xauTp1Delta = 48.00
            xauTp2Delta = 88.00
            btcSlRatio = 0.0250
            btcTp1Ratio = 0.0500
            btcTp2Ratio = 0.0900
          }

          let sl = 0
          let tp1 = 0
          let tp2 = 0

          if (dir === "BUY") {
            sl = isXau ? currentPrice - xauSlDelta : currentPrice * (1 - btcSlRatio)
            tp1 = isXau ? currentPrice + xauTp1Delta : currentPrice * (1 + btcTp1Ratio)
            tp2 = isXau ? currentPrice + xauTp2Delta : currentPrice * (1 + btcTp2Ratio)
          } else {
            sl = isXau ? currentPrice + xauSlDelta : currentPrice * (1 + btcSlRatio)
            tp1 = isXau ? currentPrice - xauTp1Delta : currentPrice * (1 - btcTp1Ratio)
            tp2 = isXau ? currentPrice - xauTp2Delta : currentPrice * (1 - btcTp2Ratio)
          }

          const formatNum = (num: number) =>
            num.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

          setEntryPrice(formatNum(entry))
          setSlPrice(formatNum(sl))
          setTp1Price(formatNum(tp1))
          setTp2Price(formatNum(tp2))
        }
      }
    } catch (err) {
      console.warn("Failed fetching live market price:", err)
    } finally {
      setIsFetchingPrice(false)
    }
  }

  const refreshActiveSignals = async () => {
    try {
      const res = await fetch("/api/signals", { cache: "no-store" })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.signals) {
          setActiveSignalsDb(json.signals)
        }
      }
    } catch (_) {}
  }

  useEffect(() => {
    refreshActiveSignals()
    syncLivePrices("XAU/USD", "BUY")
  }, [])

  const handlePublishSignal = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPublishing(true)
    setPublishError(null)

    try {
      const res = await fetch("/api/signals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: selectedPair,
          direction,
          entryZone: entryPrice,
          slPrice,
          tp1Price,
          tp2Price,
          confidenceScore,
          timeframe,
          confluenceNotes,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setPublishSuccess(true)
        setLastPublishedSignal(data.signal || {
          pair: selectedPair,
          signalType: direction,
          entryZone: entryPrice,
          target1: tp1Price,
          target2: tp2Price,
          invalidation: slPrice,
          timestamp: "Baru saja",
        })
        await refreshActiveSignals()
        setTimeout(() => setPublishSuccess(false), 10000)
      } else {
        setPublishError(data.error || "Gagal mempublikasikan sinyal")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error"
      setPublishError(msg)
    } finally {
      setIsPublishing(false)
    }
  }

  // PreferencesCard Rows Data for Admin Operational Controls
  const operationalPreferenceRows: PreferenceRow[] = [
    {
      icon: <KeyRound className="h-4 w-4" />,
      title: "API Ingestion Keys",
      hint: "2 live keys for Python bot & TradingView Webhooks",
    },
    {
      icon: <Fingerprint className="h-4 w-4" />,
      title: "Admin 2-Factor Auth",
      hint: "Enforced hardware key for signal broadcasting",
    },
    {
      icon: <Bell className="h-4 w-4" />,
      title: "Telegram & Discord Bot",
      hint: "Instant notification webhook broadcast (<200ms)",
    },
    {
      icon: <HardDrive className="h-4 w-4" />,
      title: "Quant Log Storage",
      hint: "30-day retention with cold storage backup",
    },
    {
      icon: <Workflow className="h-4 w-4" />,
      title: "Auto-Rebalance Quotas",
      hint: "Weekly audit for 30% affiliate commission payouts",
    },
  ]

  // ViewSwitch Options definition for Scope Environment
  const scopeOptions: ViewOption<"prod" | "staging" | "sandbox">[] = [
    {
      id: "prod",
      label: "Production Feed",
      short: "Prod Live",
      icon: (
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
      ),
    },
    {
      id: "staging",
      label: "Staging Pipeline",
      short: "Staging",
      icon: (
        <span className="h-2 w-2 rounded-full bg-amber-400" />
      ),
    },
    {
      id: "sandbox",
      label: "Quant Sandbox",
      short: "Sandbox",
      icon: (
        <span className="h-2 w-2 rounded-full bg-blue-400" />
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-white/20">
      <AppNavbar />

      {/* Role Protection Guard: Only Super Admin */}
      {user?.role !== "Super Admin" ? (
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full p-8 rounded-[24px] border border-white/[0.08] bg-zinc-950/70 backdrop-blur-md text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Admin Desk Access Restricted
            </h2>
            <p className="text-xs text-foreground/55 leading-relaxed">
              This terminal console is restricted to <strong>Super Admin</strong> personnel. Please sign in using institutional credentials or contact your desk administrator.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white text-zinc-950 font-semibold text-xs tracking-tight hover:bg-zinc-200 transition-all shadow-md"
              >
                Sign In as Admin
              </Link>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08] mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10.5px] font-mono text-rose-400 uppercase tracking-widest mb-2 font-semibold">
                <Shield className="h-3 w-3" />
                <span>Admin Management Desk</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                System Settings &amp; Quant Control
              </h1>
              <p className="text-xs sm:text-sm text-foreground/55 mt-1">
                Configure prediction weights, manual signal emission, subscriber limits, and telemetry webhooks.
              </p>
            </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* ViewSwitch: Pure ssych environment switcher */}
            <ViewSwitch
              options={scopeOptions}
              value={scopeView}
              onChange={(val) => setScopeView(val)}
              className="p-0.5"
            />

            {/* Inference Status LiveToggle */}
            <div className="flex items-center gap-2 text-xs font-mono text-foreground/60 bg-zinc-900/60 px-3 py-1.5 rounded-full border border-white/[0.08]">
              <span className="text-foreground/40">Inference:</span>
              <LiveToggle
                live={engineLive}
                onLiveChange={setEngineLive}
                variant="a"
                labels={{ on: "Online", off: "Standby" }}
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="mb-8">
          <SegmentedControl
            options={["Signal Studio", "20-Agent Council", "Pricing & Promo Desk", "Model Hyperparameters", "Role Access & Quotas", "Webhook Ingestion", "Historical Audit"]}
            value={activeTab}
            onChange={(val) => setActiveTab(val)}
            className="p-1"
          />
        </div>

        {/* TAB 1: Signal Studio (Admin Emit Signal to Public Feed) */}
        {activeTab === "Signal Studio" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7 rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-7 backdrop-blur-md">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-6 rounded-md bg-white/10 border border-white/15 flex items-center justify-center">
                    <Send className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-sm font-semibold tracking-tight text-white uppercase font-mono">
                    Emit New Quant Signal ({scopeView.toUpperCase()})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("20-Agent Council")}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono hover:bg-emerald-500/20 transition-all"
                >
                  <Cpu className="h-3 w-3" />
                  <span>AI Council Consensus ➔</span>
                </button>
              </div>

              {publishSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-400 mb-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Sinyal Berhasil Dipublikasikan ke Live Feed!
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400/80">
                        {selectedPair} • {direction} • Entry {entryPrice} • Target {tp1Price}
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/"
                    target="_blank"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500 text-zinc-950 text-xs font-semibold hover:bg-emerald-400 transition-all shrink-0 shadow-sm"
                  >
                    <span>Lihat di Beranda</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </motion.div>
              )}

              <form onSubmit={handlePublishSignal} className="space-y-5">
                {/* Pair & Direction */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono text-foreground/50 uppercase tracking-wider">
                        Target Instrument
                      </label>
                      <button
                        type="button"
                        onClick={() => syncLivePrices(selectedPair, direction)}
                        disabled={isFetchingPrice}
                        className="inline-flex items-center gap-1.5 text-[10.5px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
                        title="Sync latest live market price"
                      >
                        <RefreshCw className={cn("h-3 w-3", isFetchingPrice && "animate-spin")} />
                        <span>Live: {liveMarketPrice ? `$${liveMarketPrice.toLocaleString()}` : "Syncing..."}</span>
                      </button>
                    </div>
                    <SegmentedControl
                      options={["XAU/USD", "BTC/USD"]}
                      value={selectedPair}
                      onChange={(val) => {
                        setSelectedPair(val)
                        syncLivePrices(val, direction)
                      }}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono text-foreground/50 uppercase tracking-wider">
                        Order Direction
                      </label>
                      <span className="text-[10px] font-mono text-foreground/40">Auto-calibrates SL/TP</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDirection("BUY")
                          syncLivePrices(selectedPair, "BUY")
                        }}
                        className={cn(
                          "py-1.5 text-xs font-mono font-semibold rounded-full border transition-all",
                          direction === "BUY"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm"
                            : "bg-white/[0.03] text-foreground/50 border-white/[0.06] hover:text-white"
                        )}
                      >
                        LONG / BUY
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDirection("SELL")
                          syncLivePrices(selectedPair, "SELL")
                        }}
                        className={cn(
                          "py-1.5 text-xs font-mono font-semibold rounded-full border transition-all",
                          direction === "SELL"
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm"
                            : "bg-white/[0.03] text-foreground/50 border-white/[0.06] hover:text-white"
                        )}
                      >
                        SHORT / SELL
                      </button>
                    </div>
                  </div>
                </div>

                {/* Timeframe & Confidence Score */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-foreground/50 block mb-1.5 uppercase tracking-wider">
                      Setup Timeframe
                    </label>
                    <SegmentedControl
                      options={["M1", "M5", "M15", "H1", "H4"]}
                      value={timeframe}
                      onChange={(v) => {
                        setTimeframe(v)
                        syncLivePrices(selectedPair, direction, v)
                        if (v === "M1" || v === "M5") {
                          setConfluenceNotes(
                            `${v} sub-minute scalping orderflow sweep with tick-level CVD delta absorption and tight structural invalidation.`
                          )
                        } else if (v === "M15") {
                          setConfluenceNotes(
                            "M15 internal liquidity sweep at Asian session low with Bullish Order Block mitigation and DXY pullback confirmation."
                          )
                        } else {
                          setConfluenceNotes(
                            `${v} institutional swing structure with high-timeframe Fair Value Gap (FVG) retest and macro yield divergence.`
                          )
                        }
                      }}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-foreground/50 block mb-1.5 uppercase tracking-wider">
                      Quant Confidence: <span className="text-white font-medium">{confidenceScore}%</span>
                    </label>
                    <input
                      type="range"
                      min={60}
                      max={98}
                      value={confidenceScore}
                      onChange={(e) => setConfidenceScore(Number(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white mt-2"
                    />
                  </div>
                </div>

                {/* Price Mapping Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-xl border border-white/[0.06] bg-zinc-900/40">
                    <label className="text-[10px] font-mono text-foreground/45 block mb-1 uppercase">
                      Entry Price
                    </label>
                    <input
                      type="text"
                      value={entryPrice}
                      onChange={(e) => setEntryPrice(e.target.value)}
                      className="w-full bg-transparent font-mono text-xs text-white outline-none font-medium border-b border-transparent focus:border-white/30"
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
                    <label className="text-[10px] font-mono text-rose-400/80 block mb-1 uppercase">
                      Invalidation (SL)
                    </label>
                    <input
                      type="text"
                      value={slPrice}
                      onChange={(e) => setSlPrice(e.target.value)}
                      className="w-full bg-transparent font-mono text-xs text-rose-400 outline-none font-medium border-b border-transparent focus:border-rose-400/40"
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <label className="text-[10px] font-mono text-emerald-400/80 block mb-1 uppercase">
                      Target 1 (TP1)
                    </label>
                    <input
                      type="text"
                      value={tp1Price}
                      onChange={(e) => setTp1Price(e.target.value)}
                      className="w-full bg-transparent font-mono text-xs text-emerald-400 outline-none font-medium border-b border-transparent focus:border-emerald-400/40"
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <label className="text-[10px] font-mono text-emerald-400/80 block mb-1 uppercase">
                      Target 2 (TP2)
                    </label>
                    <input
                      type="text"
                      value={tp2Price}
                      onChange={(e) => setTp2Price(e.target.value)}
                      className="w-full bg-transparent font-mono text-xs text-emerald-400 outline-none font-medium border-b border-transparent focus:border-emerald-400/40"
                    />
                  </div>
                </div>

                {/* Confluence Rationale */}
                <div>
                  <label className="text-[11px] font-mono text-foreground/50 block mb-1.5 uppercase tracking-wider">
                    Confluence &amp; Structural Rationale
                  </label>
                  <textarea
                    rows={3}
                    value={confluenceNotes}
                    onChange={(e) => setConfluenceNotes(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-zinc-900/50 p-3 text-xs text-foreground/90 font-mono outline-none focus:border-white/20 resize-none leading-relaxed"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] font-mono text-foreground/45 flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-emerald-400" />
                    <span>Auto-paywalled for non-subscribers</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="px-6 py-2.5 rounded-full bg-white text-zinc-950 font-semibold text-xs tracking-tight hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center gap-2 outline-none disabled:opacity-50"
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Broadcasting...</span>
                      </>
                    ) : publishSuccess ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Broadcasted!</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Publish to {scopeView.toUpperCase()} Feed</span>
                      </>
                    )}
                  </button>
                </div>

                {publishError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                    {publishError}
                  </div>
                )}
              </form>
            </div>

            {/* Live Preview Column & PreferencesCard Controls */}
            <div className="lg:col-span-5 space-y-4">
              {/* Currently Live in Database Card */}
              {(() => {
                const livePairKey = selectedPair === "XAU/USD" ? "XAU-USD" : "BTC-USD"
                const activeSignal = activeSignalsDb?.[livePairKey]
                return activeSignal ? (
                  <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-950/10 p-5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                          Live Active Signal on Web
                        </span>
                      </div>
                      <Link
                        href="/"
                        target="_blank"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-white/70 hover:text-white transition-colors"
                      >
                        <span>Buka Beranda</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{activeSignal.pair}</span>
                        <span
                          className={cn(
                            "text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold",
                            activeSignal.signalType === "BUY"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          )}
                        >
                          {activeSignal.signalType}
                        </span>
                        <span className="text-[10px] font-mono text-foreground/40">{activeSignal.status}</span>
                      </div>
                      <span className="text-xs font-mono text-emerald-400">{activeSignal.confidenceScore}% Prob</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded-lg bg-zinc-950/60 border border-white/[0.04]">
                        <span className="text-foreground/45 block text-[10px]">ENTRY</span>
                        <span className="text-white font-medium">{activeSignal.entryZone}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950/60 border border-rose-500/20">
                        <span className="text-rose-400/70 block text-[10px]">SL</span>
                        <span className="text-rose-400 font-medium">{activeSignal.invalidation}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950/60 border border-emerald-500/20">
                        <span className="text-emerald-400/70 block text-[10px]">TP1</span>
                        <span className="text-emerald-400 font-medium">{activeSignal.target1}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-950/60 border border-emerald-500/20">
                        <span className="text-emerald-400/70 block text-[10px]">TP2</span>
                        <span className="text-emerald-400 font-medium">{activeSignal.target2}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-foreground/40 pt-1">
                      <span>Updated: {activeSignal.timestamp}</span>
                      <span>R:R {activeSignal.riskReward}</span>
                    </div>

                    {/* Algorithmic Reason / Confluence Notes Display */}
                    {activeSignal.reasons && activeSignal.reasons.length > 0 && (
                      <div className="pt-2.5 border-t border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-foreground/45 uppercase tracking-wider">
                          <span>Active Confluence Rationale</span>
                          <span className="text-emerald-400 font-semibold">{activeSignal.confidenceScore}% Prob</span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/[0.06] text-[11.5px] font-mono leading-relaxed">
                          <span className="text-emerald-400 font-medium block text-[11px] mb-0.5">
                            {activeSignal.reasons[0].title || "Quant AI Synthesis"}
                          </span>
                          <p className="text-zinc-300">
                            {activeSignal.reasons[0].description}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null
              })()}

              <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/40 p-6">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
                  <span className="text-[11px] font-mono text-foreground/50 uppercase tracking-wider">
                    Draft Input Preview
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Form Editor
                  </span>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-zinc-900/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{selectedPair}</span>
                      <span
                        className={cn(
                          "text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold",
                          direction === "BUY"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        )}
                      >
                        {direction}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">{confidenceScore}% Prob</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded-lg bg-zinc-950/60 border border-white/[0.04]">
                      <span className="text-foreground/45 block text-[10px]">ENTRY</span>
                      <span className="text-white font-medium">{entryPrice}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950/60 border border-rose-500/20">
                      <span className="text-rose-400/70 block text-[10px]">SL</span>
                      <span className="text-rose-400 font-medium">{slPrice}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950/60 border border-emerald-500/20">
                      <span className="text-emerald-400/70 block text-[10px]">TP1</span>
                      <span className="text-emerald-400 font-medium">{tp1Price}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-zinc-950/60 border border-emerald-500/20">
                      <span className="text-emerald-400/70 block text-[10px]">TP2</span>
                      <span className="text-emerald-400 font-medium">{tp2Price}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] space-y-1">
                    <span className="text-[10px] font-mono text-foreground/45 uppercase tracking-wider block">
                      Draft Confluence Rationale
                    </span>
                    <p className="text-[11px] font-mono text-zinc-300 leading-relaxed bg-zinc-950/50 p-2.5 rounded-lg border border-white/[0.04]">
                      {confluenceNotes || "Belum ada catatan konfluensi."}
                    </p>
                  </div>
                </div>
              </div>

              {/* PreferencesCard: Pure ssych Preferences & Settings component */}
              <PreferencesCard
                className="w-full"
                rows={operationalPreferenceRows}
              />
            </div>
          </div>
        )}

        {/* TAB: 20-Agent Quant Council Studio */}
        {activeTab === "20-Agent Council" && (
          <AgentCouncilStudio
            onPublishConsensus={async (consensus) => {
              const targetDir = consensus.verdict === "SELL" ? "SELL" : "BUY"
              setDirection(targetDir)
              setConfidenceScore(consensus.consensusScore)
              setConfluenceNotes(consensus.summaryRationale)
              await syncLivePrices(selectedPair, targetDir)
              await refreshActiveSignals()
              setActiveTab("Signal Studio")
            }}
          />
        )}

        {/* TAB: Pricing & Promo Desk */}
        {activeTab === "Pricing & Promo Desk" && (
          <PricingConfigStudio />
        )}


        {/* TAB 2: Model Hyperparameters */}
        {activeTab === "Model Hyperparameters" && (
          <div className="space-y-6">
            {/* Action Bar & Database Sync Status */}
            <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-5 sm:p-6 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <Cpu className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                    Model Hyperparameters &amp; Execution Guard
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Supabase PostgreSQL
                  </span>
                </div>
                <p className="text-xs text-foreground/50 font-mono">
                  {hyperparamsLastSaved
                    ? `Terakhir disimpan di database: ${hyperparamsLastSaved}`
                    : "Nilai saat ini sinkron dengan konfigurasi server Supabase."}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleResetHyperparameters}
                  disabled={isSavingHyperparams}
                  className="px-3.5 py-2 rounded-xl border border-white/[0.1] bg-white/[0.04] text-xs font-mono text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Default
                </button>

                <button
                  type="button"
                  onClick={handleSaveHyperparameters}
                  disabled={isSavingHyperparams}
                  className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs font-mono hover:bg-zinc-200 transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSavingHyperparams ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Menyimpan ke Supabase...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Simpan Hyperparameters
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Success / Error Notification Toast Banner */}
            {hyperparamsMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono",
                  hyperparamsMessage.includes("berhasil")
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>{hyperparamsMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHyperparamsMessage(null)}
                  className="text-foreground/40 hover:text-white"
                >
                  &times;
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Quant Probability Filtering */}
              <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-7">
                <div className="flex items-center gap-2 mb-4">
                  <Sliders className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                    Quant Probability Filtering
                  </h3>
                </div>
                <p className="text-xs text-foreground/60 leading-relaxed mb-6 font-mono">
                  Minimum statistical threshold required before AI models approve autonomous signal broadcast to subscriber feeds.
                </p>

                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-2">
                      <span className="text-foreground/70">Minimum Confidence Threshold</span>
                      <span className="text-white font-medium px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">
                        {minConfidenceThreshold}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={65}
                      max={90}
                      value={minConfidenceThreshold}
                      onChange={(e) => setMinConfidenceThreshold(Number(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                    <p className="text-[10.5px] font-mono text-foreground/45 mt-1.5">
                      Signals below {minConfidenceThreshold}% are automatically quarantined to drafts.
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-2">
                      <span className="text-foreground/70">Model Sampling Temperature</span>
                      <span className="text-white font-medium px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08]">
                        {modelTemperature.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={0.8}
                      step={0.05}
                      value={modelTemperature}
                      onChange={(e) => setModelTemperature(Number(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                    <p className="text-[10.5px] font-mono text-foreground/45 mt-1.5">
                      Low temperature (0.1–0.3) enforces strict deterministic, mathematically grounded outputs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Execution Safety Boundaries */}
              <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-7">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                    Execution Safety Boundaries
                  </h3>
                </div>
                <p className="text-xs text-foreground/60 leading-relaxed mb-6 font-mono">
                  Invalidation protection rules to mitigate drawdown during extreme volatility clusters (NFP, CPI, FOMC).
                </p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-zinc-900/40">
                    <div>
                      <span className="text-xs font-semibold text-white block">Auto Invalidation Timeout</span>
                      <span className="text-[11px] text-foreground/50 font-mono">Maximum lifespan of pending limit orders</span>
                    </div>
                    <SegmentedControl
                      options={["120m", "240m", "480m"]}
                      value={autoInvalidationTimeout}
                      onChange={(v) => setAutoInvalidationTimeout(v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-zinc-900/40">
                    <div>
                      <span className="text-xs font-semibold text-white block">High Impact News Pause</span>
                      <span className="text-[11px] text-foreground/50 font-mono">Halt signal broadcast ±15m around CPI releases</span>
                    </div>
                    <LiveToggle
                      live={highImpactNewsPause}
                      onLiveChange={(val) => setHighImpactNewsPause(val)}
                      variant="b"
                      labels={{ on: "Active", off: "Off" }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-zinc-900/40">
                    <div>
                      <span className="text-xs font-semibold text-white block">Quant Inference Engine</span>
                      <span className="text-[11px] text-foreground/50 font-mono">Master switch for real-time model synthesis</span>
                    </div>
                    <LiveToggle
                      live={engineLive}
                      onLiveChange={(val) => setEngineLive(val)}
                      variant="b"
                      labels={{ on: "Online", off: "Offline" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Role Access & Quotas */}
        {activeTab === "Role Access & Quotas" && (
          <div className="border border-white/[0.08] rounded-[24px] bg-zinc-950/40 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                  Tier Authorization &amp; Role Management
                </h2>
              </div>
              <span className="text-[11px] font-mono text-foreground/45">
                Active Registered Accounts: {usersList.length} Accounts
              </span>
            </div>

            <div className="space-y-4">
              {[
                {
                  role: "Super Admin",
                  desc: "Full permissions: Emit signals, override invalidation, manage subscriptions, modify model weights.",
                  users: `${usersList.filter((u) => u.role === "Super Admin").length || 1} desks`,
                  badge: "Full Access",
                  color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
                },
                {
                  role: "Affiliate Partner",
                  desc: "Portal access: Track custom referral link, view commission accrued (USDT), request payout.",
                  users: `${usersList.filter((u) => u.role === "Affiliate").length} partners`,
                  badge: "30% Revenue Share",
                  color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                },
                {
                  role: "Subscribed User (Pro / Weekly)",
                  desc: "Terminal access: Real-time unmasked signals, push notifications, performance journal audit.",
                  users: `${usersList.filter((u) => u.tier === "Monthly" || u.tier === "Weekly").length} active passes`,
                  badge: "Unthrottled Feed",
                  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                },
                {
                  role: "Public / Free User",
                  desc: "Public view: General sentiment bias, delayed history log, masked numerical SL/TP levels.",
                  users: `${usersList.filter((u) => u.tier === "Free").length} registered`,
                  badge: "Masked Paywall",
                  color: "text-foreground/50 bg-white/[0.04] border-white/[0.08]",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl border border-white/[0.06] bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">{item.role}</span>
                      <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border", item.color)}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/55 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="text-xs font-mono text-foreground/40 shrink-0">{item.users}</div>
                </div>
              ))}
            </div>

            {/* Individual Account Access & Tier Settings (Live Scalable Data Table) */}
            <div className="mt-8 pt-6 border-t border-white/[0.08] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-emerald-400" />
                    Live Account Access Desk &amp; Subscription Override
                  </h3>
                  <p className="text-xs text-foreground/50 mt-0.5">
                    High-density account directory with real-time role override, subscription tier provisioning, and access controls for 1,000+ users.
                  </p>
                </div>
              </div>

              <AdminUserTable
                users={usersList}
                loading={loadingUsers}
                updatingUserId={updatingUserId}
                onRefresh={fetchUsers}
                onUpdateUser={handleUpdateUser}
                successMessage={userUpdateMessage}
              />
            </div>

            {/* Admin Tier Signal Quota Policy Configuration Panel */}
            <div className="mt-8 pt-6 border-t border-white/[0.08] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-emerald-400" />
                    Tier Signal Quotas &amp; Access Policy Configuration
                  </h3>
                  <p className="text-xs text-foreground/50 mt-0.5">
                    Configure the maximum concurrent active signals allowed for each subscriber tier and numeric masking enforcement.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Synced to Terminal &amp; Profiles
                </span>
              </div>

              {/* 4-Tier Quota Allocation Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Free Tier Quota */}
                <div className="p-4 rounded-2xl border border-white/[0.06] bg-zinc-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Free Tier Max Active Signals
                      </span>
                      <span className="text-[11px] text-foreground/50">
                        Maximum active signals accessible by Free accounts
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {adminConfig.freeTierActiveQuota === 0
                        ? "0 (Paywalled)"
                        : `${adminConfig.freeTierActiveQuota} Signal${adminConfig.freeTierActiveQuota > 1 ? "s" : ""}`}
                    </span>
                  </div>

                  <SegmentedControl
                    options={["0 Signals", "1 Signal", "2 Signals", "3 Signals", "5 Signals"]}
                    value={
                      adminConfig.freeTierActiveQuota === 0
                        ? "0 Signals"
                        : adminConfig.freeTierActiveQuota === 1
                        ? "1 Signal"
                        : `${adminConfig.freeTierActiveQuota} Signals`
                    }
                    onChange={(val) => {
                      const num = parseInt(val.split(" ")[0]) || 0
                      updateAdminConfig({ freeTierActiveQuota: num })
                    }}
                    className="w-full"
                  />

                  {/* Custom Quota Stepper */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-foreground/60">
                    <span>Custom Limit:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ freeTierActiveQuota: Math.max(0, adminConfig.freeTierActiveQuota - 1) })}
                        className="px-2 py-0.5 text-xs rounded bg-white/5 hover:bg-white/10 text-foreground font-mono transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={adminConfig.freeTierActiveQuota}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0)
                          updateAdminConfig({ freeTierActiveQuota: val })
                        }}
                        className="w-16 px-2 py-0.5 text-center font-mono text-xs rounded bg-black border border-white/[0.1] text-white focus:outline-none focus:border-amber-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ freeTierActiveQuota: adminConfig.freeTierActiveQuota + 1 })}
                        className="px-2 py-0.5 text-xs rounded bg-white/5 hover:bg-white/10 text-foreground font-mono transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Weekly Tier Quota */}
                <div className="p-4 rounded-2xl border border-white/[0.06] bg-zinc-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Weekly Tier Max Active Signals
                      </span>
                      <span className="text-[11px] text-foreground/50">
                        Concurrent signal limit for Weekly Pass subscribers
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {adminConfig.weeklyTierActiveQuota >= 999
                        ? "Unlimited"
                        : `${adminConfig.weeklyTierActiveQuota} Signals`}
                    </span>
                  </div>

                  <SegmentedControl
                    options={["3 Signals", "5 Signals", "10 Signals", "15 Signals", "Unlimited"]}
                    value={
                      adminConfig.weeklyTierActiveQuota >= 999
                        ? "Unlimited"
                        : `${adminConfig.weeklyTierActiveQuota} Signals`
                    }
                    onChange={(val) => {
                      const num = val === "Unlimited" ? 999 : parseInt(val.split(" ")[0]) || 5
                      updateAdminConfig({ weeklyTierActiveQuota: num })
                    }}
                    className="w-full"
                  />

                  {/* Custom Quota Stepper */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-foreground/60">
                    <span>Custom Limit:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ weeklyTierActiveQuota: Math.max(1, (adminConfig.weeklyTierActiveQuota >= 999 ? 20 : adminConfig.weeklyTierActiveQuota) - 1) })}
                        className="px-2 py-0.5 text-xs rounded bg-white/5 hover:bg-white/10 text-foreground font-mono transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={adminConfig.weeklyTierActiveQuota >= 999 ? 999 : adminConfig.weeklyTierActiveQuota}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1)
                          updateAdminConfig({ weeklyTierActiveQuota: val })
                        }}
                        className="w-16 px-2 py-0.5 text-center font-mono text-xs rounded bg-black border border-white/[0.1] text-white focus:outline-none focus:border-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ weeklyTierActiveQuota: (adminConfig.weeklyTierActiveQuota >= 999 ? 15 : adminConfig.weeklyTierActiveQuota) + 1 })}
                        className="px-2 py-0.5 text-xs rounded bg-white/5 hover:bg-white/10 text-foreground font-mono transition-colors"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ weeklyTierActiveQuota: 999 })}
                        className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono transition-colors border border-emerald-500/20"
                      >
                        Unlimited
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Monthly Tier Quota */}
                <div className="p-4 rounded-2xl border border-white/[0.06] bg-zinc-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Monthly Tier Max Active Signals
                      </span>
                      <span className="text-[11px] text-foreground/50">
                        Concurrent signal limit for Monthly Pass subscribers
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {adminConfig.monthlyTierActiveQuota >= 999
                        ? "Unlimited"
                        : `${adminConfig.monthlyTierActiveQuota} Signals`}
                    </span>
                  </div>

                  <SegmentedControl
                    options={["10 Signals", "25 Signals", "50 Signals", "100 Signals", "Unlimited"]}
                    value={
                      adminConfig.monthlyTierActiveQuota >= 999
                        ? "Unlimited"
                        : `${adminConfig.monthlyTierActiveQuota} Signals`
                    }
                    onChange={(val) => {
                      const num = val === "Unlimited" ? 999 : parseInt(val.split(" ")[0]) || 25
                      updateAdminConfig({ monthlyTierActiveQuota: num })
                    }}
                    className="w-full"
                  />

                  {/* Custom Quota Stepper */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-foreground/60">
                    <span>Custom Limit:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ monthlyTierActiveQuota: Math.max(1, (adminConfig.monthlyTierActiveQuota >= 999 ? 50 : adminConfig.monthlyTierActiveQuota) - 5) })}
                        className="px-2 py-0.5 text-xs rounded bg-white/5 hover:bg-white/10 text-foreground font-mono transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={adminConfig.monthlyTierActiveQuota >= 999 ? 999 : adminConfig.monthlyTierActiveQuota}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1)
                          updateAdminConfig({ monthlyTierActiveQuota: val })
                        }}
                        className="w-16 px-2 py-0.5 text-center font-mono text-xs rounded bg-black border border-white/[0.1] text-white focus:outline-none focus:border-emerald-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ monthlyTierActiveQuota: (adminConfig.monthlyTierActiveQuota >= 999 ? 25 : adminConfig.monthlyTierActiveQuota) + 5 })}
                        className="px-2 py-0.5 text-xs rounded bg-white/5 hover:bg-white/10 text-foreground font-mono transition-colors"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ monthlyTierActiveQuota: 999 })}
                        className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono transition-colors border border-emerald-500/20"
                      >
                        Unlimited
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Enterprise / Admin Tier Quota */}
                <div className="p-4 rounded-2xl border border-white/[0.06] bg-zinc-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Enterprise &amp; Admin Tier Quota
                      </span>
                      <span className="text-[11px] text-foreground/50">
                        Full desk capacity for internal &amp; enterprise accounts
                      </span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                      {adminConfig.enterpriseTierActiveQuota >= 999
                        ? "Unlimited (999)"
                        : `${adminConfig.enterpriseTierActiveQuota} Signals`}
                    </span>
                  </div>

                  <SegmentedControl
                    options={["50 Signals", "100 Signals", "Unlimited"]}
                    value={
                      adminConfig.enterpriseTierActiveQuota >= 999
                        ? "Unlimited"
                        : `${adminConfig.enterpriseTierActiveQuota} Signals`
                    }
                    onChange={(val) => {
                      const num = val === "Unlimited" ? 999 : parseInt(val.split(" ")[0]) || 999
                      updateAdminConfig({ enterpriseTierActiveQuota: num })
                    }}
                    className="w-full"
                  />

                  {/* Custom Quota Stepper */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-foreground/60">
                    <span>Custom Limit:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ enterpriseTierActiveQuota: Math.max(1, (adminConfig.enterpriseTierActiveQuota >= 999 ? 100 : adminConfig.enterpriseTierActiveQuota) - 10) })}
                        className="px-2 py-0.5 text-xs rounded bg-white/5 hover:bg-white/10 text-foreground font-mono transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={adminConfig.enterpriseTierActiveQuota >= 999 ? 999 : adminConfig.enterpriseTierActiveQuota}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1)
                          updateAdminConfig({ enterpriseTierActiveQuota: val })
                        }}
                        className="w-16 px-2 py-0.5 text-center font-mono text-xs rounded bg-black border border-white/[0.1] text-white focus:outline-none focus:border-rose-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ enterpriseTierActiveQuota: (adminConfig.enterpriseTierActiveQuota >= 999 ? 100 : adminConfig.enterpriseTierActiveQuota) + 10 })}
                        className="px-2 py-0.5 text-xs rounded bg-white/5 hover:bg-white/10 text-foreground font-mono transition-colors"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAdminConfig({ enterpriseTierActiveQuota: 999 })}
                        className="px-2 py-0.5 text-[10px] rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-mono transition-colors border border-rose-500/20"
                      >
                        Unlimited
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Numeric SL/TP Masking Toggle */}
                <div className="p-4 rounded-2xl border border-white/[0.06] bg-zinc-900/40 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Mask Numeric SL / TP Levels for Free Tier
                    </span>
                    <span className="text-[11px] text-foreground/50 leading-relaxed block mt-0.5">
                      Softly blur exact stop-loss and take-profit targets for signals exceeding free tier limits.
                    </span>
                  </div>
                  <LiveToggle
                    live={adminConfig.freeTierMaskSlTp}
                    onLiveChange={(val: boolean) => updateAdminConfig({ freeTierMaskSlTp: val })}
                    labels={{ on: "Masked", off: "Unmasked" }}
                    variant="a"
                  />
                </div>

                {/* Historical Audit Access Toggle */}
                <div className="p-4 rounded-2xl border border-white/[0.06] bg-zinc-900/40 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Allow Settled Signal History Audit
                    </span>
                    <span className="text-[11px] text-foreground/50 leading-relaxed block mt-0.5">
                      Enable Free tier users to review historical settled signals (Hit TP / Hit SL) on the History ledger.
                    </span>
                  </div>
                  <LiveToggle
                    live={adminConfig.freeTierAllowHistory}
                    onLiveChange={(val: boolean) => updateAdminConfig({ freeTierAllowHistory: val })}
                    labels={{ on: "Allowed", off: "Locked" }}
                    variant="a"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Webhook Ingestion */}
        {activeTab === "Webhook Ingestion" && (
          <div className="space-y-6">
            {/* Action Bar Header */}
            <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-5 sm:p-6 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                    Admin Webhook Ingestion &amp; API Key Center
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Receiver Online
                  </span>
                </div>
                <p className="text-xs text-foreground/50 font-mono">
                  Emit signals directly to subscriber feeds from TradingView alerts, Python scripts, or algorithmic webhooks.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(true)}
                  className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs font-mono hover:bg-zinc-200 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Generate New API Key
                </button>
              </div>
            </div>

            {/* Modal / Dialog for New Key Generation */}
            {showGenerateModal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[20px] border border-white/[0.12] bg-zinc-900/90 p-5 sm:p-6 shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white font-mono flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-emerald-400" />
                    Buat Kunci API Baru (Webhook Ingestion)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="text-foreground/40 hover:text-white text-base"
                  >
                    &times;
                  </button>
                </div>
                <p className="text-xs text-foreground/60 mb-4 font-mono">
                  Berikan label deskriptif untuk bot atau strategi Anda (misal: <em>TradingView Gold M15 Alert</em>).
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Nama Kunci (cth: TradingView Strategy Alert Bot)"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-black/50 text-xs font-mono text-white placeholder:text-foreground/30 focus:outline-none focus:border-white/30"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGenerateModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-xs font-mono text-zinc-300 hover:text-white"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateApiKey}
                      disabled={isGeneratingKey || !newKeyName.trim()}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-xs font-mono hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {isGeneratingKey ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Membuat...
                        </>
                      ) : (
                        "Generate Key"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Newly Created Key Alert Banner */}
            {newlyCreatedKey && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold text-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>API Key Berhasil Dibuat: {newlyCreatedKey.apiKey.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewlyCreatedKey(null)}
                    className="text-xs text-foreground/50 hover:text-white"
                  >
                    Tutup Peringatan
                  </button>
                </div>
                <p className="text-[11px] font-mono text-emerald-300/80 leading-relaxed">
                  PENTING: Salin kunci API rahasia ini sekarang. Kunci ini tidak akan ditampilkan lagi secara penuh demi keamanan akun Anda.
                </p>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/60 border border-emerald-500/20 font-mono text-xs">
                  <span className="text-white flex-1 select-all break-all">{newlyCreatedKey.rawKey}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(newlyCreatedKey.rawKey)
                      setCopiedKeyId(newlyCreatedKey.apiKey.id)
                      setTimeout(() => setCopiedKeyId(null), 2500)
                    }}
                    className="px-3 py-1 rounded bg-emerald-500 text-black text-[11px] font-semibold flex items-center gap-1.5 hover:bg-emerald-400 shrink-0"
                  >
                    {copiedKeyId === newlyCreatedKey.apiKey.id ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Tersalin!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Salin Kunci
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Active Keys Table / List */}
            <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-xs font-semibold text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-emerald-400" />
                  Kunci API Terdaftar ({apiKeysList.length} Keys)
                </h3>
                <span className="text-[11px] font-mono text-foreground/45">
                  Tersimpan di Supabase
                </span>
              </div>

              {loadingKeys ? (
                <div className="py-8 text-center text-xs font-mono text-foreground/45 flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Memuat daftar kunci API...
                </div>
              ) : apiKeysList.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-foreground/45">
                  Belum ada API key terdaftar. Klik "Generate New API Key" untuk membuat.
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {apiKeysList.map((key) => {
                    const isActive = key.status === "ACTIVE"
                    return (
                      <div
                        key={key.id}
                        className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{key.name}</span>
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[9.5px] border",
                                isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              )}
                            >
                              {key.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-foreground/50 text-[11px]">
                            <span>ID: {key.id}</span>
                            <span>•</span>
                            <span>Dibuat oleh: {key.createdByName}</span>
                            {key.lastUsedAt && (
                              <>
                                <span>•</span>
                                <span>Terakhir aktif: {new Date(key.lastUsedAt).toLocaleDateString("id-ID")}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-[11px] text-zinc-300">
                            <span className="text-foreground/40">KEY:</span>
                            <span className="font-mono">{key.maskedKey}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(key.key)
                              setCopiedKeyId(key.id)
                              setTimeout(() => setCopiedKeyId(null), 2500)
                            }}
                            className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground/60 hover:text-white hover:bg-white/[0.08]"
                            title="Salin Key"
                          >
                            {copiedKeyId === key.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {isActive && (
                            <button
                              type="button"
                              onClick={() => handleRevokeApiKey(key.id)}
                              className="px-2.5 py-1 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11px] transition-all flex items-center gap-1"
                              title="Cabut Akses Kunci"
                            >
                              <Trash2 className="h-3 w-3" />
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Webhook Endpoint & Integration Snippets */}
            <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                    Webhook Receiver Endpoint &amp; Integration Guide
                  </h3>
                </div>
                <SegmentedControl
                  options={["TradingView JSON", "cURL Bash", "Python Script"]}
                  value={webhookCodeTab}
                  onChange={(v) => setWebhookCodeTab(v)}
                />
              </div>

              {/* URL Box */}
              <div>
                <span className="text-[11px] font-mono text-foreground/60 block mb-1.5">
                  Production Webhook URL (POST):
                </span>
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-white/[0.08] bg-black/60 font-mono text-xs">
                  <span className="text-emerald-400 flex-1 truncate">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/webhooks/tradingview`
                      : "https://needpips.io/api/webhooks/tradingview"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const url =
                        typeof window !== "undefined"
                          ? `${window.location.origin}/api/webhooks/tradingview`
                          : "https://needpips.io/api/webhooks/tradingview"
                      navigator.clipboard.writeText(url)
                      alert("Webhook URL berhasil disalin!")
                    }}
                    className="px-3 py-1 rounded bg-white/[0.08] text-white hover:bg-white/[0.15] text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                    Salin URL
                  </button>
                </div>
              </div>

              {/* Code Snippets */}
              <div className="p-4 rounded-xl border border-white/[0.06] bg-zinc-900/40 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                {webhookCodeTab === "TradingView JSON" && (
                  <pre className="text-zinc-300 leading-relaxed">
{`// Salin template JSON ini ke kolom "Message" pada TradingView Alert:
{
  "passphrase": "${apiKeysList.find((k) => k.status === "ACTIVE")?.key || "np_live_API_KEY_ANDA"}",
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "sl": {{plot_0}},
  "tp1": {{plot_1}},
  "tp2": {{plot_2}},
  "timeframe": "{{interval}}",
  "confidence": 88,
  "message": "Strategy alert triggered from PineScript"
}`}
                  </pre>
                )}

                {webhookCodeTab === "cURL Bash" && (
                  <pre className="text-zinc-300 leading-relaxed">
{`# Kirim sinyal instan via terminal cURL:
curl -X POST ${typeof window !== "undefined" ? window.location.origin : "https://needpips.io"}/api/webhooks/tradingview \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKeysList.find((k) => k.status === "ACTIVE")?.key || "np_live_API_KEY_ANDA"}" \\
  -d '{
    "pair": "XAU/USD",
    "action": "BUY",
    "price": 2645.50,
    "sl": 2636.00,
    "tp1": 2662.00,
    "tp2": 2678.00,
    "timeframe": "M15",
    "confidence": 92,
    "message": "M15 Bullish Order Block mitigation"
  }'`}
                  </pre>
                )}

                {webhookCodeTab === "Python Script" && (
                  <pre className="text-zinc-300 leading-relaxed">
{`# Python requests ingestion script:
import requests

webhook_url = "${typeof window !== "undefined" ? window.location.origin : "https://needpips.io"}/api/webhooks/tradingview"
payload = {
    "pair": "BTC/USD",
    "action": "BUY",
    "price": 67800.0,
    "sl": 66950.0,
    "tp1": 69350.0,
    "tp2": 70900.0,
    "confidence": 90,
    "message": "H1 Bullish Expansion consensus"
}
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${apiKeysList.find((k) => k.status === "ACTIVE")?.key || "np_live_API_KEY_ANDA"}"
}

res = requests.post(webhook_url, json=payload, headers=headers)
print(res.json())`}
                  </pre>
                )}
              </div>
            </div>

            {/* Live Webhook Test Simulator */}
            <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white uppercase font-mono tracking-wider">
                    Live Webhook Ingestion Ping Simulator
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-foreground/45">
                  Uji Integrasi Langsung ke Server
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono text-foreground/60 block mb-1">
                    Instrumen Target:
                  </label>
                  <SegmentedControl
                    options={["XAU/USD", "BTC/USD"]}
                    value={testWebhookPair}
                    onChange={(v) => setTestWebhookPair(v)}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-foreground/60 block mb-1">
                    Arah Order:
                  </label>
                  <SegmentedControl
                    options={["BUY", "SELL"]}
                    value={testWebhookDirection}
                    onChange={(v) => setTestWebhookDirection(v as "BUY" | "SELL")}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSendTestWebhook}
                  disabled={isSendingTestWebhook}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs font-mono hover:bg-zinc-200 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSendingTestWebhook ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Mengirim Webhook Payload...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Kirim Test Webhook Ping Sekarang
                    </>
                  )}
                </button>
              </div>

              {testWebhookResponse && (
                <div className="p-3.5 rounded-xl border border-white/[0.08] bg-black/70 font-mono text-xs text-emerald-300">
                  <div className="text-[10.5px] text-foreground/40 mb-1">// Respons Server (/api/webhooks/tradingview):</div>
                  <pre className="overflow-x-auto text-[11px] leading-relaxed">
                    {testWebhookResponse}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Historical Audit (Using pure DateRangePicker ssych component) */}
        {activeTab === "Historical Audit" && (
          <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-8 flex flex-col items-center">
            <div className="text-center max-w-xl mx-auto mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-foreground/70 uppercase tracking-widest mb-2 font-semibold">
                <Calendar className="h-3 w-3 text-emerald-400" />
                <span>Quant Backtest &amp; Audit Window</span>
              </div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Select Custom Date Range for Model Performance Audit
              </h2>
              <p className="text-xs text-foreground/50 mt-1">
                Isolate model win rates, execution slippage, and TP1/TP2 fill rates across historical trading cycles.
              </p>
            </div>

            {/* DateRangePicker: Pure ssych two-month sheet calendar */}
            <div className="border border-white/[0.08] rounded-[24px] bg-zinc-950/70 p-4 sm:p-6 shadow-2xl">
              <DateRangePicker
                today={new Date().toISOString().split("T")[0]}
                value={auditRange}
                onChange={(range) => setAuditRange(range)}
              />
            </div>
          </div>
        )}
      </main>
      )}
    </div>
  )
}
