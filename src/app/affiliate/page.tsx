"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import {
  Users,
  Copy,
  Check,
  Percent,
  Wallet,
  Award,
  CircleDollarSign,
  Lock,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Edit2,
  Save,
  X,
  CreditCard,
  Building,
} from "lucide-react"
import { AppNavbar } from "@/components/layout/app-navbar"
import { KpiCardRow } from "@/components/ui/kpi-card-row"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { PreferencesCard, type PreferenceRow } from "@/components/ui/preferences-card"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export interface ReferralLeadItem {
  id: string
  userId?: string
  handle: string
  name: string
  registeredAt: string
  plan: string
  status: "Active Paid" | "Expired" | "Registered"
  commissionEarned: string
  commissionAmount: number
  tier: string
  referralCode: string
}

function formatIdr(amount: number): string {
  return `IDR ${amount.toLocaleString("id-ID")}`
}

export default function AffiliatePage() {
  const { user } = useAuth()
  const [copied, setCopied] = useState<boolean>(false)
  const [payoutTab, setPayoutTab] = useState<string>("All Referrals")

  // Dynamic backend telemetry state
  const [leads, setLeads] = useState<ReferralLeadItem[]>([])
  const [unclaimedBalance, setUnclaimedBalance] = useState<number>(0)
  const [accumulatedPayout, setAccumulatedPayout] = useState<number>(0)
  const [totalClicks, setTotalClicks] = useState<number>(0)
  const [referralCode, setReferralCode] = useState<string>("")
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [tempWallet, setTempWallet] = useState<string>("")
  const [isEditingWallet, setIsEditingWallet] = useState<boolean>(false)
  const [currentTier, setCurrentTier] = useState<string>("Affiliate 10%")
  const [commissionRate, setCommissionRate] = useState<number>(10)
  const [clicksHistory, setClicksHistory] = useState<number[]>([0, 0, 0, 0, 0])

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  // Dynamic live pricing plans for commission schedule
  const [pricingPlans, setPricingPlans] = useState<{ weeklyPrice: number; monthlyPrice: number }>({
    weeklyPrice: 30000,
    monthlyPrice: 80000,
  })

  // Fetch live pricing to dynamically compute commission schedule
  useEffect(() => {
    fetch("/api/pricing")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.plans) {
          setPricingPlans({
            weeklyPrice: data.plans.weekly?.priceIdr || 30000,
            monthlyPrice: data.plans.monthly?.priceIdr || 80000,
          })
        }
      })
      .catch((err) => console.warn("Failed fetching live pricing for affiliate desk:", err))
  }, [])

  // 1. Fetch live affiliate telemetry
  const fetchAffiliateTelemetry = async () => {
    if (!user) return
    try {
      setIsLoading(true)
      const res = await fetch(
        `/api/affiliate?userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(
          user.email
        )}&name=${encodeURIComponent(user.name)}`
      )
      const data = await res.json()
      if (data.success && data.affiliate) {
        const aff = data.affiliate
        setLeads(aff.leads || [])
        setUnclaimedBalance(aff.unclaimedCommission || 0)
        setAccumulatedPayout(aff.accumulatedPayout || 0)
        setTotalClicks(aff.totalClicks || 0)
        setReferralCode(
          aff.affiliateCode ||
            (user ? `REF-${user.name.toUpperCase().replace(/\s+/g, "").slice(0, 8)}` : "")
        )
        setWalletAddress(aff.walletAddress || "")
        setTempWallet(aff.walletAddress || "")
        setCurrentTier(aff.currentTier || "Affiliate 10%")
        setCommissionRate(aff.commissionRatePercent || 10)
        if (aff.clicksHistory && aff.clicksHistory.length > 0) {
          setClicksHistory(aff.clicksHistory)
        }
      }
    } catch (err) {
      console.warn("Could not fetch /api/affiliate:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchAffiliateTelemetry()
    }
  }, [user])

  // Live dynamic referral link
  const origin = typeof window !== "undefined" ? window.location.origin : "https://needpips.io"
  const referralLink = `${origin}/login?ref=${referralCode}`

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2400)
  }

  // Handle Withdraw Payout Request in IDR
  const handleWithdraw = async () => {
    if (unclaimedBalance <= 0) {
      alert("No commission balance available to withdraw (IDR 0).")
      return
    }

    if (
      !confirm(
        `Confirm payout request of ${formatIdr(unclaimedBalance)} to designated account:\n${walletAddress}?`
      )
    ) {
      return
    }

    setIsWithdrawing(true)
    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw", userId: user?.id }),
      })
      const data = await res.json()
      if (data.success) {
        setUnclaimedBalance(0)
        setFeedbackMessage(
          data.message ||
            `Payout request of ${formatIdr(unclaimedBalance)} successfully submitted.`
        )
        setTimeout(() => setFeedbackMessage(null), 4000)
        fetchAffiliateTelemetry()
      } else {
        alert(data.error || "Failed to process withdrawal request.")
      }
    } catch (err) {
      console.error("Error withdrawing", err)
    } finally {
      setIsWithdrawing(false)
    }
  }

  // Handle Save Wallet / Bank Account
  const handleSaveWallet = async () => {
    if (!tempWallet.trim()) return
    try {
      const res = await fetch("/api/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-wallet",
          userId: user?.id,
          walletAddress: tempWallet.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setWalletAddress(tempWallet.trim())
        setIsEditingWallet(false)
        setFeedbackMessage("Payout account details successfully updated.")
        setTimeout(() => setFeedbackMessage(null), 3000)
      }
    } catch (err) {
      console.error("Error updating wallet", err)
    }
  }

  const paidSubscribers = leads.filter((l) => l.status === "Active Paid").length

  const affiliatePreferenceRows: PreferenceRow[] = [
    {
      icon: <Percent className="h-[15px] w-[15px] text-emerald-400" />,
      title: "Commission Rate",
      hint: `${commissionRate}% flat rate on all referred subscriptions & renewals`,
    },
    {
      icon: <CreditCard className="h-[15px] w-[15px] text-amber-400" />,
      title: "Settlement Account (IDR)",
      hint:
        walletAddress && walletAddress.trim() !== ""
          ? walletAddress
          : "Not configured (Click 'Edit Account' to set BCA / Mandiri / Dana / GoPay)",
    },
    {
      icon: <Award className="h-[15px] w-[15px] text-sky-400" />,
      title: "Program Eligibility",
      hint: "Automatically unlocked for all registered terminal members",
    },
    {
      icon: <CircleDollarSign className="h-[15px] w-[15px] text-purple-400" />,
      title: "Settlement SLA",
      hint: "Processed within 1x24 hours upon withdrawal request",
    },
  ]

  // Every logged in user has access to Affiliate Desk!
  const isAuthenticated = !!user

  // Filtered Leads
  const filteredLeads = leads.filter((lead) => {
    if (payoutTab === "All Referrals") return true
    if (payoutTab === "Paid Conversions") return lead.status === "Active Paid"
    if (payoutTab === "Pending Trials") return lead.status === "Registered"
    return true
  })

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-white/20">
      <AppNavbar />

      {!isAuthenticated ? (
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full p-8 rounded-[24px] border border-white/[0.08] bg-zinc-950/70 backdrop-blur-md text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              NeedPips Affiliate Program
            </h2>
            <p className="text-xs text-foreground/55 leading-relaxed">
              Earn a flat <strong>10% commission</strong> on every transaction from traders who register using your referral link. Sign in or create an account to access your unique referral desk.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white text-zinc-950 font-semibold text-xs tracking-tight hover:bg-zinc-200 transition-all shadow-md"
              >
                Sign In / Create Account
              </Link>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
          {/* Feedback banner */}
          <AnimatePresence>
            {feedbackMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{feedbackMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 1. Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10.5px] font-mono text-emerald-300 uppercase tracking-widest mb-2 font-semibold">
                <Users className="h-3 w-3 text-emerald-400" />
                <span>Affiliate Desk · 10% Flat Commission</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Referral &amp; Commission Desk
              </h1>
              <p className="text-xs sm:text-sm text-foreground/55 mt-1">
                Account: <strong className="text-white">{user?.name}</strong> ({user?.email}) · Referral Code:{" "}
                <span className="font-mono text-emerald-400 font-semibold">{referralCode}</span>
              </p>
            </div>

            {/* Quick Balance Status Badge in IDR */}
            <div className="p-4 rounded-2xl border border-white/[0.08] bg-zinc-950/70 backdrop-blur-md flex items-center gap-4 shrink-0">
              <div>
                <span className="text-[10px] font-mono text-foreground/45 uppercase tracking-wider block">
                  Unclaimed Balance
                </span>
                <span className="text-xl font-mono font-semibold text-emerald-400">
                  {formatIdr(unclaimedBalance)}
                </span>
              </div>
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing || unclaimedBalance <= 0}
                className="px-3.5 py-2 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 active:scale-95 transition-all flex items-center gap-1.5 shadow disabled:opacity-50 cursor-pointer"
              >
                <Wallet className="h-3.5 w-3.5" />
                <span>{isWithdrawing ? "Processing..." : "Withdraw Balance"}</span>
              </button>
            </div>
          </div>

          {/* 2. KPI Metrics Row (Pure ssych KpiCardRow) in IDR */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-foreground/50">
                Referral Performance &amp; Accumulated Returns
              </span>
              <button
                onClick={fetchAffiliateTelemetry}
                className="text-[11px] font-mono text-foreground/40 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin text-emerald-400")} />
                <span>Sync Data</span>
              </button>
            </div>

            <div className="w-full overflow-x-auto pb-2">
              <KpiCardRow
                items={[
                  {
                    label: "Total Referral Link Clicks",
                    data: clicksHistory.length > 0 ? clicksHistory : [0, 0, 0, 0, 0],
                    format: (v) => Math.round(v).toLocaleString("id-ID"),
                    delta: `+${totalClicks} Visits`,
                    since: "Last 30 Days",
                    up: totalClicks > 0,
                  },
                  {
                    label: "Active Paid Subscribers",
                    data: [0, 0, Math.min(paidSubscribers, 1), paidSubscribers],
                    format: (v) => Math.round(v).toLocaleString("id-ID"),
                    delta: `${paidSubscribers} Active Users`,
                    since: "Converted",
                    up: paidSubscribers > 0,
                  },
                  {
                    label: "Accumulated Commissions (IDR)",
                    data: [0, 0, Math.round(accumulatedPayout * 0.5), Math.round(accumulatedPayout)],
                    format: (v) => formatIdr(v),
                    delta: `+${formatIdr(unclaimedBalance)} Available`,
                    since: "Active Balance",
                    up: unclaimedBalance > 0,
                  },
                ]}
                labels={["4 Weeks Ago", "3 Weeks Ago", "2 Weeks Ago", "1 Week Ago", "Today"]}
                className="w-full max-w-none"
              />
            </div>
          </section>

          {/* 3. Referral Link Sharing Desk & Preferences Card */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Link Generator & Copy Box */}
            <div className="lg:col-span-7 rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-7 backdrop-blur-md space-y-6">
              <div>
                <span className="text-[11px] font-mono text-foreground/45 uppercase tracking-widest block mb-1">
                  Dedicated Referral Link
                </span>
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Share NeedPips &amp; Earn 10% on Every Transaction
                </h2>
                <p className="text-xs text-foreground/55 mt-1 leading-relaxed">
                  Every trader registering via your referral link{" "}
                  <code className="text-emerald-400 font-mono">?ref={referralCode}</code> and subscribing to a Weekly or Monthly pass automatically earns you a flat <strong className="text-white">10% commission</strong> credited directly to your balance.
                </p>
              </div>

              {/* Interactive Link Copy Box */}
              <div className="p-3 sm:p-4 rounded-xl border border-white/[0.08] bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                <div className="truncate text-foreground/90 font-medium select-all">
                  {referralLink}
                </div>
                <button
                  onClick={handleCopy}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer",
                    copied
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white text-zinc-950 hover:bg-zinc-200"
                  )}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Commission Details Box (Dynamically synced with Pricing Desk) */}
              <div className="p-4 rounded-2xl border border-white/[0.06] bg-zinc-900/40 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white">Commission Schedule</span>
                  <span className="font-mono text-emerald-400 font-semibold">{commissionRate}% Flat Rate</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl border border-white/[0.06] bg-black/40">
                    <span className="text-[10px] text-foreground/45 block">
                      Weekly Pass (IDR {pricingPlans.weeklyPrice.toLocaleString("id-ID")})
                    </span>
                    <span className="text-emerald-400 font-semibold block mt-0.5">
                      +IDR {Math.round(pricingPlans.weeklyPrice * (commissionRate / 100)).toLocaleString("id-ID")} / transaction
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-white/[0.06] bg-black/40">
                    <span className="text-[10px] text-foreground/45 block">
                      Monthly Pass (IDR {pricingPlans.monthlyPrice.toLocaleString("id-ID")})
                    </span>
                    <span className="text-emerald-400 font-semibold block mt-0.5">
                      +IDR {Math.round(pricingPlans.monthlyPrice * (commissionRate / 100)).toLocaleString("id-ID")} / transaction
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Partner Settlement Rules & PreferencesCard */}
            <div className="lg:col-span-5 rounded-[24px] border border-white/[0.08] bg-zinc-950/60 p-6 sm:p-7 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-mono text-foreground/45 uppercase tracking-widest block mb-0.5">
                    Settlement Details
                  </span>
                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    Payout Account (IDR)
                  </h2>
                </div>

                {!isEditingWallet ? (
                  <button
                    onClick={() => {
                      setTempWallet(walletAddress)
                      setIsEditingWallet(true)
                    }}
                    className="text-xs font-mono text-foreground/50 hover:text-white flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.04] cursor-pointer"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit Account</span>
                  </button>
                ) : null}
              </div>

              {isEditingWallet && (
                <div className="p-3 rounded-xl border border-white/10 bg-zinc-900/80 space-y-2">
                  <label className="text-[10px] font-mono text-foreground/50 uppercase block">
                    Bank / E-Wallet &amp; Account Number:
                  </label>
                  <input
                    type="text"
                    value={tempWallet}
                    onChange={(e) => setTempWallet(e.target.value)}
                    placeholder="e.g. BCA 1234567890 a.n. Budi Santoso / Dana 0812345678"
                    className="w-full bg-zinc-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none focus:border-emerald-400"
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setIsEditingWallet(false)}
                      className="px-2.5 py-1 rounded text-xs font-mono text-foreground/60 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveWallet}
                      className="px-3 py-1 rounded bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="h-3 w-3" />
                      <span>Save Account</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="w-full flex justify-center pt-1">
                <PreferencesCard
                  rows={affiliatePreferenceRows}
                  width={360}
                  className="w-full max-w-full"
                />
              </div>
            </div>
          </section>

          {/* 4. Recent Referral Ledger */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono text-foreground/45 uppercase tracking-widest block mb-0.5">
                  Audit Trail
                </span>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    Your Referred User Directory
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-white/70 border border-white/10">
                    {filteredLeads.length} Users
                  </span>
                </div>
              </div>

              <SegmentedControl
                options={["All Referrals", "Paid Conversions", "Pending Trials"]}
                value={payoutTab}
                onChange={(val) => setPayoutTab(val)}
                className="p-1"
              />
            </div>

            <div className="rounded-[24px] border border-white/[0.08] bg-zinc-950/50 p-5 sm:p-6 overflow-x-auto">
              {filteredLeads.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Users className="h-8 w-8 text-foreground/30 mx-auto" />
                  <p className="text-xs font-mono text-foreground/50">
                    No referred traders registered yet under your referral link.
                  </p>
                  <p className="text-[11px] text-foreground/40 font-mono">
                    Share your referral link on social channels or trading desks to start generating recurring commissions.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[11px] font-mono text-foreground/45 uppercase tracking-wider">
                      <th className="pb-3 pr-4 font-medium">User Account</th>
                      <th className="pb-3 px-4 font-medium">Registered Date</th>
                      <th className="pb-3 px-4 font-medium">Subscription Tier</th>
                      <th className="pb-3 px-4 font-medium">Commission Rate</th>
                      <th className="pb-3 px-4 font-medium text-right">Earned Commission</th>
                      <th className="pb-3 pl-4 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 pr-4 font-mono text-white font-medium">
                          {lead.handle}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-foreground/50 whitespace-nowrap">
                          {lead.registeredAt}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground/85 whitespace-nowrap">
                          {lead.plan}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-foreground/60 whitespace-nowrap">
                          10% Flat
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-400 whitespace-nowrap">
                          {lead.commissionEarned}
                        </td>
                        <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-mono font-semibold",
                              lead.status === "Active Paid"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-white/[0.06] text-foreground/60"
                            )}
                          >
                            {lead.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </main>
      )}
    </div>
  )
}
