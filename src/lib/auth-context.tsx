"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

export type SubscriptionTier = "Free" | "Weekly" | "Monthly" | "Enterprise" | "Admin"

export interface UserProfile {
  id: string
  name: string
  email: string
  tier: SubscriptionTier
  role: "User" | "Affiliate" | "Super Admin"
  activeSignalsAllowed: number
  joinedDate: string
  subscriptionExpiry?: string
  referredBy?: string
  emailVerified?: boolean
  status?: string
  language?: "en" | "id"
}

export interface AdminQuotaConfig {
  freeTierActiveQuota: number // Max active signals on Free tier (e.g. 1)
  weeklyTierActiveQuota: number // Max active signals on Weekly tier (e.g. 5)
  monthlyTierActiveQuota: number // Max active signals on Monthly tier (e.g. 25)
  enterpriseTierActiveQuota: number // Max active signals on Enterprise / Admin tier (e.g. 999)
  freeTierMaskSlTp: boolean // whether to mask detailed numeric SL/TP for free tier
  freeTierAllowHistory: boolean
  freeTierRefreshRateSeconds: number
}

interface AuthContextType {
  user: UserProfile | null
  adminConfig: AdminQuotaConfig
  updateAdminConfig: (newConfig: Partial<AdminQuotaConfig>) => void
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string; requireVerification?: boolean; email?: string }>
  register: (email: string, name: string, password?: string, roleIntent?: string, referralCode?: string) => Promise<{ success: boolean; error?: string; requireVerification?: boolean; email?: string }>
  verifyEmail: (email: string, code: string) => Promise<{ success: boolean; error?: string }>
  resendVerificationCode: (email: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  switchTier: (tier: SubscriptionTier) => void
  updateProfile: (updated: Partial<UserProfile>) => void
  mounted: boolean
}

const DEFAULT_ADMIN_CONFIG: AdminQuotaConfig = {
  freeTierActiveQuota: 1, // Default: 1 active signal previewed on Free tier
  weeklyTierActiveQuota: 5, // Default: 5 active concurrent signals on Weekly tier
  monthlyTierActiveQuota: 25, // Default: 25 active concurrent signals on Monthly tier
  enterpriseTierActiveQuota: 999, // Default: Unlimited on Enterprise/Admin tier
  freeTierMaskSlTp: true,
  freeTierAllowHistory: true,
  freeTierRefreshRateSeconds: 60,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const USER_STORAGE_KEY = "needpips_auth_user"
const ADMIN_CONFIG_KEY = "needpips_admin_quota_config"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [adminConfig, setAdminConfig] = useState<AdminQuotaConfig>(DEFAULT_ADMIN_CONFIG)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(ADMIN_CONFIG_KEY)
      if (savedConfig) {
        setAdminConfig(JSON.parse(savedConfig))
      }

      // Fetch live tier quotas from Supabase
      fetch("/api/settings/quotas")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.quotas) {
            setAdminConfig((prev) => {
              const merged = { ...prev, ...data.quotas }
              try {
                localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(merged))
              } catch (_) {}
              return merged
            })
          }
        })
        .catch((err) => console.warn("Could not sync quotas from Supabase", err))

      const savedUser = localStorage.getItem(USER_STORAGE_KEY)
      if (savedUser) {
        const parsed: UserProfile = JSON.parse(savedUser)
        setUser(parsed)

        // Live Revalidation: Fetch latest user record directly from Supabase
        if (parsed.email) {
          fetch(`/api/auth/me?email=${encodeURIComponent(parsed.email)}`, { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.user) {
                setUser(data.user)
                try {
                  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
                } catch (_) {}
              }
            })
            .catch((err) => console.warn("Could not revalidate user from Supabase", err))
        }
      } else {
        // User starts unauthenticated (has no account / not signed in yet)
        setUser(null)
      }
    } catch (e) {
      console.warn("Could not read auth from localStorage", e)
      setUser(null)
    } finally {
      setMounted(true)
    }
  }, [])

  // Auto-sync session with Supabase so edits in Supabase Dashboard reflect live on the web
  useEffect(() => {
    if (!user?.email) return

    const syncUserWithSupabase = () => {
      fetch(`/api/auth/me?email=${encodeURIComponent(user.email)}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.user) {
            setUser((prev) => {
              if (!prev) return data.user
              if (
                prev.tier !== data.user.tier ||
                prev.role !== data.user.role ||
                prev.name !== data.user.name ||
                prev.activeSignalsAllowed !== data.user.activeSignalsAllowed ||
                prev.language !== data.user.language
              ) {
                try {
                  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
                } catch (_) {}
                return data.user
              }
              return prev
            })
          }
        })
        .catch(() => {})
    }

    const interval = setInterval(syncUserWithSupabase, 4000)
    window.addEventListener("focus", syncUserWithSupabase)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", syncUserWithSupabase)
    }
  }, [user?.email])

  const updateAdminConfig = (newConfig: Partial<AdminQuotaConfig>) => {
    setAdminConfig((prev) => {
      const updated = { ...prev, ...newConfig }
      try {
        localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(updated))
      } catch (e) {
        console.warn("Could not save admin config", e)
      }

      // Persist to Supabase database in background
      fetch("/api/settings/quotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch((err) => {
        console.warn("Could not sync updated quotas to Supabase", err)
      })

      return updated
    })
  }

  const login = async (
    email: string,
    password: string = "password123"
  ): Promise<{ success: boolean; error?: string; requireVerification?: boolean; email?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success && data.user) {
        setUser(data.user)
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
        } catch (_) {}
        return { success: true }
      }
      return {
        success: false,
        error: data.error || "Authentication failed",
        requireVerification: data.requireVerification,
        email: data.email,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error"
      return { success: false, error: msg }
    }
  }

  const register = async (
    email: string,
    name: string,
    password: string = "password123",
    roleIntent: string = "Subscriber",
    referralCode?: string
  ): Promise<{ success: boolean; error?: string; requireVerification?: boolean; email?: string }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, roleIntent, referralCode }),
      })
      const data = await res.json()
      if (data.requireVerification) {
        return {
          success: true,
          requireVerification: true,
          email: data.email || email,
        }
      }
      if (data.success && data.user) {
        setUser(data.user)
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
        } catch (_) {}
        return { success: true }
      }
      return { success: false, error: data.error || "Registration failed" }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error"
      return { success: false, error: msg }
    }
  }

  const verifyEmail = async (
    email: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (data.success && data.user) {
        setUser(data.user)
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user))
        } catch (_) {}
        return { success: true }
      }
      return { success: false, error: data.error || "Verification failed" }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error"
      return { success: false, error: msg }
    }
  }

  const resendVerificationCode = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "resend" }),
      })
      const data = await res.json()
      return { success: data.success, error: data.error }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error"
      return { success: false, error: msg }
    }
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem(USER_STORAGE_KEY)
    } catch (e) {
      console.warn(e)
    }
  }

  const switchTier = (newTier: SubscriptionTier) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated: UserProfile = {
        ...prev,
        tier: newTier,
        subscriptionExpiry: newTier === "Free" ? undefined : "2026-11-12",
      }
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
  }

  const updateProfile = (updatedProps: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev
      const updated: UserProfile = {
        ...prev,
        ...updatedProps,
      }
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {}

      // Persist to Supabase database in background
      if (prev.id || prev.email) {
        fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: prev.id,
            email: prev.email,
            ...updatedProps,
          }),
        }).catch((err) => {
          console.warn("Failed persisting profile update to Supabase:", err)
        })
      }

      return updated
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        adminConfig,
        updateAdminConfig,
        login,
        register,
        verifyEmail,
        resendVerificationCode,
        logout,
        switchTier,
        updateProfile,
        mounted,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
