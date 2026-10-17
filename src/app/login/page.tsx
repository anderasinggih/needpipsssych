"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeft, Check, Lock, Mail, ShieldCheck, User, Users, KeyRound, RotateCw } from "lucide-react"
import { AppNavbar } from "@/components/layout/app-navbar"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

export default function AuthPage() {
  const router = useRouter()
  const { login, register, verifyEmail, resendVerificationCode } = useAuth()
  const [authMode, setAuthMode] = useState<string>("Sign In")
  const isSignIn = authMode === "Sign In"

  // Form Fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [referralCode, setReferralCode] = useState<string>("")

  // Verification Step State
  const [verificationStep, setVerificationStep] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Status State
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const ref = params.get("ref")
      if (ref) {
        const cleanRef = ref.trim().toUpperCase()
        setReferralCode(cleanRef)
        setAuthMode("Create Account")
        // Record click to affiliate endpoint
        fetch(`/api/affiliate?ref=${encodeURIComponent(cleanRef)}&click=true`).catch(() => {})
      }
    }
  }, [])

  // Cooldown countdown effect
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      if (isSignIn) {
        const res = await login(email, password)
        if (!res.success) {
          if (res.requireVerification) {
            setVerificationEmail(res.email || email)
            setVerificationStep(true)
            setResendCooldown(60)
            setErrorMessage(res.error || "Please verify your email to continue.")
          } else {
            setErrorMessage(res.error || "Invalid email or password.")
          }
          setLoading(false)
          return
        }
      } else {
        const res = await register(email, name, password, "User", referralCode || undefined)
        if (!res.success) {
          setErrorMessage(res.error || "Registration failed. Email may already be in use.")
          setLoading(false)
          return
        }
        if (res.requireVerification) {
          setVerificationEmail(res.email || email)
          setVerificationStep(true)
          setResendCooldown(60)
          setLoading(false)
          return
        }
      }

      setLoading(false)
      setSuccess(true)
      setTimeout(() => {
        router.push("/")
      }, 600)
    } catch (err: unknown) {
      setLoading(false)
      const msg = err instanceof Error ? err.message : "Authentication error"
      setErrorMessage(msg)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      const res = await verifyEmail(verificationEmail, otpCode.trim())
      if (!res.success) {
        setErrorMessage(res.error || "Invalid verification code.")
        setLoading(false)
        return
      }

      setLoading(false)
      setSuccess(true)
      setTimeout(() => {
        router.push("/")
      }, 800)
    } catch (err: unknown) {
      setLoading(false)
      const msg = err instanceof Error ? err.message : "Verification error"
      setErrorMessage(msg)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0 || loading) return
    setLoading(true)
    setErrorMessage(null)
    setResendSuccess(false)

    try {
      const res = await resendVerificationCode(verificationEmail)
      if (res.success) {
        setResendCooldown(60)
        setResendSuccess(true)
        setTimeout(() => setResendSuccess(false), 4000)
      } else {
        setErrorMessage(res.error || "Failed resending code.")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error"
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-white/20">
      <AppNavbar />

      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-[440px] rounded-[24px] border border-white/[0.08] bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <AnimatePresence mode="wait">
            {verificationStep ? (
              /* OTP Email Verification Step */
              <motion.div
                key="verification-step"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-3">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-widest block mb-1">
                    Security Verification
                  </span>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                    Verify Email Address
                  </h1>
                  <p className="text-xs text-foreground/50 mt-1 leading-relaxed">
                    A 6-digit authentication code has been sent to{" "}
                    <strong className="text-white font-mono">{verificationEmail}</strong>.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {resendSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>New verification code sent to your inbox!</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-mono text-foreground/50 block mb-1.5 uppercase tracking-wider text-center">
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full text-center tracking-[0.4em] font-mono text-2xl py-3 px-4 rounded-xl bg-zinc-900/80 border border-white/15 focus:border-emerald-400 text-white outline-none transition-all placeholder:text-foreground/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || success || otpCode.length < 6}
                    className="w-full py-2.5 rounded-full bg-white text-zinc-950 font-semibold text-xs tracking-tight hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                  >
                    {loading ? (
                      <span>Verifying Token...</span>
                    ) : success ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Email Verified · Access Granted</span>
                      </>
                    ) : (
                      <span>Verify &amp; Activate Desk</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationStep(false)
                        setErrorMessage(null)
                      }}
                      className="text-foreground/45 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>Back / Edit Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0 || loading}
                      className={cn(
                        "transition-colors flex items-center gap-1",
                        resendCooldown > 0 ? "text-foreground/30 cursor-not-allowed" : "text-emerald-400 hover:text-emerald-300"
                      )}
                    >
                      <RotateCw className={cn("h-3 w-3", loading && "animate-spin")} />
                      <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              /* Sign In / Create Account Form */
              <motion.div
                key="auth-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Header */}
                <div className="text-center mb-6">
                  <span className="text-[11px] font-mono text-foreground/45 uppercase tracking-widest block mb-1">
                    NeedPips Access Desk
                  </span>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">
                    {isSignIn ? "Sign In to Terminal" : "Create Access Account"}
                  </h1>
                  <p className="text-xs text-foreground/50 mt-1">
                    {isSignIn
                      ? "Enter your credentials to access live unmasked quant feeds."
                      : "Register an account to monitor XAU/USD & BTC/USD consensus signals."}
                  </p>
                </div>

                {/* Mode Switcher */}
                <div className="flex justify-center mb-6">
                  <SegmentedControl
                    options={["Sign In", "Create Account"]}
                    value={authMode}
                    onChange={(v) => {
                      setAuthMode(v)
                      setSuccess(false)
                      setErrorMessage(null)
                    }}
                    className="p-1"
                  />
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isSignIn && (
                    <div>
                      <label className="text-[11px] font-mono text-foreground/50 block mb-1 uppercase tracking-wider">
                        Full Name / Desk Handle
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-white/[0.08] focus-within:border-white/25 transition-colors">
                        <User className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Analyst Desk 1"
                          className="w-full bg-transparent text-xs text-white outline-none placeholder:text-foreground/30 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-mono text-foreground/50 block mb-1 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-white/[0.08] focus-within:border-white/25 transition-colors">
                      <Mail className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="analyst@needpips.io"
                        className="w-full bg-transparent text-xs text-white outline-none placeholder:text-foreground/30 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-foreground/50 block mb-1 uppercase tracking-wider">
                      Password
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-white/[0.08] focus-within:border-white/25 transition-colors">
                      <Lock className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-transparent text-xs text-white outline-none placeholder:text-foreground/30 font-mono"
                      />
                    </div>
                  </div>

                  {/* Referral Code Field during Registration */}
                  {!isSignIn && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-mono text-foreground/50 uppercase tracking-wider">
                          Referral Code (Optional)
                        </label>
                        {referralCode && (
                          <span className="text-[10px] font-mono text-emerald-400">
                            Partner Linked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-white/[0.08] focus-within:border-white/25 transition-colors">
                        <Users className="h-3.5 w-3.5 text-foreground/40 shrink-0" />
                        <input
                          type="text"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                          placeholder="e.g. VIP-ALPHA or PARTNER CODE"
                          className="w-full bg-transparent text-xs text-white outline-none placeholder:text-foreground/30 font-mono uppercase"
                        />
                      </div>
                      <p className="text-[10px] font-mono text-emerald-400/80 mt-1.5 flex items-center gap-1">
                        <span>✓</span> All accounts automatically granted Affiliate status (10% flat commission per referral transaction)
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || success}
                    className="w-full mt-2 py-2.5 rounded-full bg-white text-zinc-950 font-semibold text-xs tracking-tight hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                  >
                    {loading ? (
                      <span>Authenticating...</span>
                    ) : success ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Access Granted</span>
                      </>
                    ) : (
                      <span>{isSignIn ? "Sign In to Terminal" : "Register & Verify Email"}</span>
                    )}
                  </button>
                </form>

                {/* Footer Information */}
                <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
                  <p className="text-[11px] font-mono text-foreground/45">
                    Non-custodial infrastructure. Access credentials are tied to your private web profile.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
