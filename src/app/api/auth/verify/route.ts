import { NextResponse } from "next/server"
import { verifyEmailCode, storeVerificationCode, generateVerificationCode, sendVerificationEmail } from "@/lib/email"
import { findUserByEmail } from "@/lib/users-db"
import { recordAuditLog } from "@/lib/logs-store"

// POST /api/auth/verify - Verify OTP code sent to user email
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, code, action } = body

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Handle Resend action
    if (action === "resend") {
      const user = await findUserByEmail(cleanEmail)
      if (!user) {
        return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
      }

      const newOtp = generateVerificationCode()
      await storeVerificationCode(cleanEmail, newOtp)
      const sendRes = await sendVerificationEmail(cleanEmail, user.name, newOtp)

      if (!sendRes.success) {
        return NextResponse.json(
          { success: false, error: sendRes.error || "Failed sending verification email" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "New verification code has been sent to your email",
      })
    }

    if (!code) {
      return NextResponse.json({ success: false, error: "Verification code is required" }, { status: 400 })
    }

    const result = await verifyEmailCode(cleanEmail, code)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    // Fetch updated user
    const updatedUser = await findUserByEmail(cleanEmail)

    try {
      recordAuditLog({
        code: 200,
        method: "POST",
        path: "/api/auth/verify",
        ms: 18,
        body: JSON.stringify({ email: cleanEmail, status: "Verified" }),
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: "Email address verified successfully. Account activated.",
      user: updatedUser,
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 })
  }
}
