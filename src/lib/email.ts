import nodemailer from "nodemailer"
import { query } from "./db"

// Create reusable SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "needpips81@gmail.com",
    pass: (process.env.SMTP_PASS || "bmuhvdddwdyjtnuo").replace(/\s+/g, ""),
  },
})

/**
 * Generate a cryptographically sound 6-digit numeric OTP code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Persist verification OTP into Supabase PostgreSQL
 */
export async function storeVerificationCode(email: string, code: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase()
  const id = `otp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes validity

  // Invalidate previous unverified OTPs for this email
  await query(
    `DELETE FROM needpips_email_verifications WHERE LOWER(email) = $1 AND verified = FALSE`,
    [cleanEmail]
  )

  await query(
    `INSERT INTO needpips_email_verifications (id, email, code, expires_at, verified)
     VALUES ($1, $2, $3, $4, FALSE)`,
    [id, cleanEmail, code, expiresAt.toISOString()]
  )
}

/**
 * Verify OTP entered by user against Supabase records
 */
export async function verifyEmailCode(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase()
  const cleanCode = code.trim()

  const res = await query(
    `SELECT * FROM needpips_email_verifications
     WHERE LOWER(email) = $1 AND code = $2 AND verified = FALSE
     ORDER BY created_at DESC LIMIT 1`,
    [cleanEmail, cleanCode]
  )

  if (res.rows.length === 0) {
    return { success: false, error: "Invalid verification code or code has expired." }
  }

  const record = res.rows[0]
  const now = new Date()
  const expiresAt = new Date(record.expires_at)

  if (now > expiresAt) {
    return { success: false, error: "Verification code has expired. Please request a new code." }
  }

  // Mark verification token as used
  await query(
    `UPDATE needpips_email_verifications SET verified = TRUE WHERE id = $1`,
    [record.id]
  )

  // Mark user account as verified & active in Supabase
  await query(
    `UPDATE needpips_users 
     SET email_verified = TRUE, status = 'Active' 
     WHERE LOWER(email) = $1`,
    [cleanEmail]
  )

  return { success: true }
}

/**
 * Send dark-mode HTML email with OTP verification code
 */
export async function sendVerificationEmail(
  toEmail: string,
  userName: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const fromAddress = process.env.SMTP_FROM || '"NeedPips Quant Terminal" <needpips81@gmail.com>'
    const displayName = userName && userName.trim() ? userName.trim() : "Analyst"

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NeedPips Terminal Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #0c0c0e; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); text-align: left;">
              <div style="font-size: 11px; font-family: monospace; letter-spacing: 0.15em; text-transform: uppercase; color: #10b981; font-weight: 600; margin-bottom: 4px;">
                ● NEEDPIPS QUANT DESK
              </div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.02em; color: #ffffff;">
                Verify Your Terminal Account
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 28px 32px; text-align: left;">
              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: rgba(255, 255, 255, 0.65);">
                Hello <strong style="color: #ffffff;">${displayName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: rgba(255, 255, 255, 0.65);">
                Thank you for creating an account on NeedPips. Use the one-time authentication code below to activate your desk credentials and access real-time algorithmic consensus feeds:
              </p>

              <!-- OTP Box -->
              <div style="background-color: #141417; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 10px; font-family: monospace; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255, 255, 255, 0.4); margin-bottom: 8px;">
                  ONE-TIME VERIFICATION CODE
                </span>
                <span style="display: inline-block; font-size: 32px; font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; font-weight: 700; letter-spacing: 0.28em; color: #34d399; text-shadow: 0 0 20px rgba(52, 211, 153, 0.25);">
                  ${otpCode}
                </span>
                <span style="display: block; font-size: 10px; font-family: monospace; color: rgba(255, 255, 255, 0.4); margin-top: 8px;">
                  Valid for 15 minutes · Do not share this code
                </span>
              </div>

              <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.6; color: rgba(255, 255, 255, 0.4);">
                If you did not initiate this request, you can safely ignore this email. Your email address will remain unverified and inactive.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #08080a; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
              <p style="margin: 0; font-size: 11px; font-family: monospace; color: rgba(255, 255, 255, 0.35);">
                NeedPips Algorithmic Analytics · Non-Custodial Institutional Research
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

    await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: `[NeedPips] Your Verification Code: ${otpCode}`,
      text: `Hello ${displayName},\n\nYour NeedPips verification code is: ${otpCode}\n\nThis code is valid for 15 minutes.\n\nNeedPips Quant Desk`,
      html: htmlContent,
    })

    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send verification email"
    console.error("Email send error:", errorMsg)
    return { success: false, error: errorMsg }
  }
}
