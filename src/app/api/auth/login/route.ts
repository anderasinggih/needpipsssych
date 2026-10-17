import { NextResponse } from "next/server"
import { findUserByEmail, updateUserRecord, verifyPassword, hashPassword, isHashed } from "@/lib/users-db"
import { recordAuditLog } from "@/lib/logs-store"

// POST /api/auth/login - Real login & credential check directly against database
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    const cleanEmail = email.trim().toLowerCase()

    // 1. Ambil data akun user langsung dari database
    const user = await findUserByEmail(cleanEmail)

    if (!user) {
      return NextResponse.json(
        { success: false, error: "No account found with this email. Please register." },
        { status: 404 }
      )
    }

    if (user.status === "Suspended") {
      return NextResponse.json(
        { success: false, error: "This account has been suspended. Contact support." },
        { status: 403 }
      )
    }

    // 2. Verifikasi password (aman scrypt timing-safe / legacy fallback)
    const isPasswordValid = verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: "Incorrect password. Please try again." },
        { status: 401 }
      )
    }

    // 3. Verifikasi status email
    if (user.emailVerified === false && user.role !== "Super Admin") {
      try {
        const { generateVerificationCode, storeVerificationCode, sendVerificationEmail } = await import("@/lib/email")
        const otpCode = generateVerificationCode()
        await storeVerificationCode(cleanEmail, otpCode)
        await sendVerificationEmail(cleanEmail, user.name, otpCode)
      } catch (_) {}

      return NextResponse.json(
        {
          success: false,
          requireVerification: true,
          email: user.email,
          error: "Your email address has not been verified yet. A verification code has been dispatched to your inbox.",
        },
        { status: 403 }
      )
    }

    // 4. Update last login timestamp & migrasikan password lama menjadi scrypt hash otomatis
    try {
      const updates: Record<string, any> = {
        lastLogin: new Date().toISOString(),
      }
      if (!isHashed(user.passwordHash)) {
        updates.passwordHash = hashPassword(password)
      }
      await updateUserRecord(user.id, updates)
    } catch (_) {}

    // Log audit trail
    try {
      recordAuditLog({
        code: 200,
        method: "POST",
        path: `/v1/auth/session/login`,
        ms: 24,
        body: JSON.stringify({ email: user.email, role: user.role, tier: user.tier }, null, 2),
      })
    } catch (_) {}

    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: safeUser,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Authentication error"
    console.error("Supabase login error:", err)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
