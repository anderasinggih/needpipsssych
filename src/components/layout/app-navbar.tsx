"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Zap, Activity, FileText, Shield, Newspaper, Home, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountDropdown, type Account } from "@/components/ui/account-dropdown"
import { LiveTickerTape } from "@/components/layout/live-ticker-tape"
import { User } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n"

export function AppNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, switchTier, mounted } = useAuth()
  const { language, setLanguage, t } = useLanguage()

  // Accounts list dynamically reflect current user
  const currentAccountList: Account[] = user
    ? [
        {
          label: user.name,
          address: user.email,
          wallet: `${user.tier} Pass`,
        },
      ]
    : [
        { label: "Guest Trader", address: "guest@needpips.io", wallet: "Free Pass" },
      ]

  // Role-based navigation filtering:
  const navLinks = [
    { href: "/landing", label: t("nav.home"), icon: Home, visible: true },
    { href: "/", label: t("nav.terminal"), icon: Activity, visible: true },
    { href: "/news", label: t("nav.news"), icon: Newspaper, visible: true },
    {
      href: "/history",
      label: t("nav.history"),
      icon: Activity,
      visible: !!user, // Hanya terlihat jika sudah login
    },
    {
      href: "/affiliate",
      label: t("nav.affiliate"),
      icon: Users,
      visible: !!user, // Semua pengguna terdaftar otomatis menjadi affiliator
    },
    {
      href: "/log",
      label: t("nav.log"),
      icon: FileText,
      visible: user?.role === "Super Admin", // Audit log teknis hanya untuk Super Admin
    },
    {
      href: "/settings",
      label: t("nav.admin"),
      icon: Shield,
      visible: user?.role === "Super Admin", // Admin panel hanya untuk Super Admin
    },
    { href: "/pricing", label: t("nav.passes"), icon: Zap, visible: true },
  ].filter((link) => link.visible)

  return (
    <div className="w-full sticky top-0 z-50">
      {/* 1. Global Full-Width Continuous Rolling Ticker Tape (Live Real Data) */}
      <div className="border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-md w-full">
        <LiveTickerTape className="w-full max-w-full" />
      </div>

      {/* 2. Top Navigation Bar */}
      <header className="border-b border-white/[0.08] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 bg-zinc-950/70 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          {/* Brand identity */}
          <Link href="/" className="flex items-center gap-2 shrink-0 outline-none">
            <div className="h-6 w-6 rounded-md bg-white/10 border border-white/15 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-white">needpips</span>
              <span className="text-[10px] font-mono text-foreground/45 uppercase tracking-widest hidden md:inline-block">Terminal</span>
            </div>
          </Link>

          <div className="h-4 w-px bg-white/[0.08] hidden sm:block shrink-0" />

          {/* Navigation Switcher: Horizontally scrollable on mobile */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {navLinks.map((link) => {
              const active =
                pathname === link.href ||
                (link.href === "/admin" && pathname === "/settings") ||
                (link.href === "/settings" && pathname === "/admin")
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-[11.5px] sm:text-[12px] font-medium px-2.5 sm:px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 shrink-0 whitespace-nowrap",
                    active
                      ? "bg-white/10 text-white font-medium"
                      : "text-foreground/60 hover:text-foreground/90 hover:bg-white/[0.04]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 opacity-70 shrink-0" />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right Controls: Language Switcher, User Badge / Profile & Account Dropdown */}
        <div className="flex items-center gap-2 shrink-0 min-h-[36px]">
          {/* Quick Language Toggle Pill */}
          <div className="flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5 text-[10.5px] font-mono shrink-0">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={cn(
                "px-2 py-0.5 rounded-full transition-all font-semibold",
                language === "en"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-foreground/45 hover:text-foreground/80"
              )}
              title="Switch to English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage("id")}
              className={cn(
                "px-2 py-0.5 rounded-full transition-all font-semibold",
                language === "id"
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-foreground/45 hover:text-foreground/80"
              )}
              title="Ganti ke Bahasa Indonesia"
            >
              ID
            </button>
          </div>

          {!mounted ? (
            <div className="h-8 w-24 rounded-full bg-white/[0.04] animate-pulse" />
          ) : user ? (
            <>
              {/* 1. Membership Tier Pass Badge Only */}
              <Link
                href={user.tier === "Free" ? "/pricing" : "/profile"}
                className={cn(
                  "text-[10px] sm:text-[11px] font-mono px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-colors shrink-0",
                  user.tier === "Free"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300 hover:bg-amber-500/20"
                    : user.tier === "Admin"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/20"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20"
                )}
                title={user.tier === "Free" ? "Free Tier · Click to view Passes" : `${user.tier} Pass Active`}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    user.tier === "Free"
                      ? "bg-amber-400"
                      : user.tier === "Admin"
                      ? "bg-rose-400"
                      : "bg-emerald-400"
                  )}
                />
                <span className="font-semibold uppercase tracking-wider">
                  {user.tier} PASS
                </span>
              </Link>

              {/* 2. User Account Dropdown (No fake trade balance) */}
              <div className="hidden sm:block">
                <AccountDropdown
                  accounts={currentAccountList}
                  showBalance={false}
                  onProfileClick={() => router.push("/profile")}
                  onLogout={logout}
                  className="w-[190px] lg:w-[220px]"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-[12px] font-mono text-zinc-950 font-semibold px-3.5 py-1.5 rounded-full bg-white hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
              >
                <User className="h-3.5 w-3.5" />
                <span>{t("common.signIn")}</span>
              </Link>
            </div>
          )}
        </div>
      </header>
    </div>
  )
}
