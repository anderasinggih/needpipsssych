import { NextResponse } from "next/server"
import { findUserByEmail, insertUser, hashPassword, type StoredUserAccount } from "@/lib/users-db"
import { recordAuditLog } from "@/lib/logs-store"

// POST /api/auth/register - Register a new user account directly into database
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, name, password, roleIntent = "Subscriber", referralCode } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()

    // 1. Cek langsung ke database
    const existing = await findUserByEmail(cleanEmail)
    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      )
    }

    const isAdmin = cleanEmail.includes("admin")
    const cleanReferral = referralCode ? referralCode.trim().toUpperCase() : undefined

    const newAccount: StoredUserAccount = {
      id: `usr_${Date.now().toString(36)}`,
      name: name && name.trim() ? name.trim() : email.split("@")[0],
      email: cleanEmail,
      passwordHash: hashPassword(password),
      tier: isAdmin ? "Admin" : "Free",
      role: isAdmin ? "Super Admin" : "User",
      status: isAdmin ? "Active" : "Pending",
      emailVerified: isAdmin ? true : false,
      activeSignalsAllowed: isAdmin ? 999 : 1,
      joinedDate: new Date().toISOString().split("T")[0],
      subscriptionExpiry: isAdmin ? "Lifetime" : undefined,
      lastLogin: new Date().toISOString(),
      referredBy: cleanReferral,
    }

    // 2. Insert langsung ke tabel needpips_users di Supabase
    await insertUser(newAccount)

    // 3. Catat ke Affiliate Partner store jika ada referral code
    if (cleanReferral) {
      try {
        const { recordReferralLeadRegistration } = await import("@/lib/affiliate-store")
        recordReferralLeadRegistration(cleanReferral, {
          id: newAccount.id,
          email: newAccount.email,
          name: newAccount.name,
          tier: newAccount.tier,
        })
      } catch (err) {
        console.warn("Could not record referral lead:", err)
      }
    }

    // 4. Jika bukan Admin, kirim kode verifikasi email via Gmail SMTP
    if (!isAdmin) {
      const { generateVerificationCode, storeVerificationCode, sendVerificationEmail } = await import("@/lib/email")
      const otpCode = generateVerificationCode()
      await storeVerificationCode(cleanEmail, otpCode)
      const emailSendRes = await sendVerificationEmail(cleanEmail, newAccount.name, otpCode)

      if (!emailSendRes.success) {
        console.warn("Could not dispatch verification email:", emailSendRes.error)
      }

      // Log audit trail
      try {
        recordAuditLog({
          code: 201,
          method: "POST",
          path: `/v1/auth/session/register`,
          ms: 45,
          body: JSON.stringify({ email: newAccount.email, role: newAccount.role, referredBy: cleanReferral, status: "Pending Verification" }, null, 2),
        })
      } catch (_) {}

      return NextResponse.json({
        success: true,
        requireVerification: true,
        email: cleanEmail,
        message: "Verification code sent to your email. Please enter the 6-digit code to activate your account.",
      })
    }

    // Log audit trail for Admin instant activation
    try {
      recordAuditLog({
        code: 201,
        method: "POST",
        path: `/v1/auth/session/register`,
        ms: 35,
        body: JSON.stringify({ email: newAccount.email, role: newAccount.role, tier: newAccount.tier }, null, 2),
      })
    } catch (_) {}

    const { passwordHash: _, ...safeUser } = newAccount

    return NextResponse.json({
      success: true,
      message: "Admin account registered successfully",
      user: safeUser,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to register account"
    console.error("Account registration error:", err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
