"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  User,
  Shield,
  LogOut,
  ArrowUpRight,
  CheckCircle2,
  Zap,
  Globe,
  Check,
} from "lucide-react"
import { AppNavbar } from "@/components/layout/app-navbar"
import { VitalsStrip, type Vital } from "@/components/ui/vitals-strip"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, mounted, adminConfig } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    if (mounted && !user) {
      router.push("/login")
    }
  }, [mounted, user, router])

  const handleLanguageChange = async (newLang: "en" | "id") => {
    await setLanguage(newLang)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 3000)
  }

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-zinc-800">
        <AppNavbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-foreground/50">
              {t("profile.loading")}
            </span>
          </div>
        </main>
      </div>
    )
  }

  const tierQuota =
    user.tier === "Admin" || user.tier === "Enterprise"
      ? adminConfig.enterpriseTierActiveQuota
      : user.tier === "Monthly"
      ? adminConfig.monthlyTierActiveQuota
      : user.tier === "Weekly"
      ? adminConfig.weeklyTierActiveQuota
      : adminConfig.freeTierActiveQuota

  const displayQuota =
    tierQuota >= 999
      ? t("common.unlimited")
      : tierQuota === 0
      ? "0 (Locked)"
      : `${tierQuota} ${tierQuota > 1 ? t("profile.activeSignals") : t("profile.activeSignal")}`

  const userVitals: Vital[] = [
    {
      label: t("profile.accountId"),
      value: user.id.slice(0, 12),
      hint: t("profile.accountIdHint"),
    },
    {
      label: t("profile.membershipTier"),
      value: `${user.tier} Pass`,
      hint: t("profile.membershipTierHint"),
    },
    {
      label: t("profile.signalQuota"),
      value: displayQuota,
      hint: t("profile.signalQuotaHint"),
    },
    {
      label: t("profile.memberSince"),
      value: user.joinedDate.slice(0, 10),
      hint: t("profile.memberSinceHint"),
    },
    {
      label: t("profile.accountStatus"),
      value: t("profile.statusVerified"),
      hint: t("profile.accountStatusHint"),
    },
  ]

  const isFreeTier = user.tier === "Free"

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-zinc-800">
      <AppNavbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* User Identity Header */}
        <section className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-zinc-950/70 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {user.name}
                  </h1>
                  <span
                    className={cn(
                      "text-[10px] font-mono px-2.5 py-0.5 rounded-full border uppercase tracking-wider font-semibold",
                      isFreeTier
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : user.tier === "Admin"
                        ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    )}
                  >
                    {user.tier} Pass
                  </span>
                </div>
                <p className="text-xs font-mono text-foreground/50">
                  {user.email} · Role: {user.role}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center">
              {isFreeTier && (
                <Link
                  href="/pricing"
                  className="text-xs font-mono text-zinc-950 font-semibold bg-white hover:bg-zinc-200 px-3.5 py-1.5 rounded-full transition-all active:scale-[0.98] flex items-center gap-1 shadow-sm"
                >
                  <span>{t("common.upgrade")}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  logout()
                  router.push("/login")
                }}
                className="text-xs font-mono text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-full border border-rose-500/20 hover:bg-rose-500/10 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t("common.signOut")}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Language Preference Settings Card (Saved to Database) */}
        <section className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-zinc-950/60 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">
                {t("profile.langTitle")}
              </h2>
            </div>
            <span className="text-[11px] font-mono text-emerald-400/90 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              <span>DB Synced (needpips_users)</span>
            </span>
          </div>

          <p className="text-xs text-foreground/60 leading-relaxed">
            {t("profile.langSubtitle")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* English Card */}
            <button
              type="button"
              onClick={() => handleLanguageChange("en")}
              className={cn(
                "p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 group cursor-pointer",
                language === "en"
                  ? "bg-emerald-500/[0.07] border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04] hover:border-white/20"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🇺🇸</span>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {t("profile.langEn")}
                    </div>
                    <div className="text-[10px] font-mono text-foreground/45">
                      code: en
                    </div>
                  </div>
                </div>
                {language === "en" && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" />
                    <span>{t("common.active")}</span>
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-foreground/60 leading-relaxed">
                {t("profile.langEnDesc")}
              </p>
            </button>

            {/* Bahasa Indonesia Card */}
            <button
              type="button"
              onClick={() => handleLanguageChange("id")}
              className={cn(
                "p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-3 group cursor-pointer",
                language === "id"
                  ? "bg-emerald-500/[0.07] border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04] hover:border-white/20"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🇮🇩</span>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {t("profile.langId")}
                    </div>
                    <div className="text-[10px] font-mono text-foreground/45">
                      code: id
                    </div>
                  </div>
                </div>
                {language === "id" && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" />
                    <span>{t("common.active")}</span>
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-foreground/60 leading-relaxed">
                {t("profile.langIdDesc")}
              </p>
            </button>
          </div>

          {savedNotice && (
            <div className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{t("profile.langSavedFeedback")}</span>
            </div>
          )}
        </section>

        {/* SSYCH Vitals Strip Component: Real Client Credentials */}
        <section className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-zinc-950/60 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <span className="text-xs font-mono uppercase tracking-wider text-foreground/50 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-white/70" />
              {t("profile.overview")}
            </span>
            <span className="text-[11px] font-mono text-foreground/40">
              {t("profile.memberDesk")}
            </span>
          </div>

          <div className="overflow-x-auto scrollbar-none py-1">
            <VitalsStrip vitals={userVitals} align="between" />
          </div>
        </section>

        {/* Subscription Pass Entitlement Status Card */}
        <section className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-zinc-950/60 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">
                {t("profile.subTitle")}
              </h2>
            </div>
            <span className="text-xs font-mono text-foreground/50">
              {user.subscriptionExpiry
                ? `${t("common.expires")} ${user.subscriptionExpiry}`
                : t("profile.freePlan")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Current Access Coverage */}
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
              <span className="text-[10.5px] font-mono text-foreground/45 uppercase tracking-wider block">
                {isFreeTier ? t("profile.freeTierLabel") : t("profile.vipTierLabel")}
              </span>
              <p className="text-foreground/75 leading-relaxed">
                {isFreeTier
                  ? t("profile.freeTierText")
                  : t("profile.vipTierText")}
              </p>
              <div className="pt-2 flex items-center gap-2 text-[11px] font-mono text-foreground/55">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>{t("profile.accountActive")}</span>
              </div>
            </div>

            {/* Upgrade / Account Plans CTA */}
            <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10.5px] font-mono text-foreground/45 uppercase tracking-wider block mb-1">
                  {isFreeTier
                    ? t("profile.unlockTitle")
                    : t("profile.managePassTitle")}
                </span>
                <p className="text-foreground/70 leading-relaxed">
                  {isFreeTier
                    ? t("profile.unlockText")
                    : t("profile.managePassText")}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                >
                  <span>{t("profile.explorePricing")}</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
