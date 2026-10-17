import { query } from "@/lib/db"
import { UserProfile } from "@/lib/auth-context"
import crypto from "crypto"

export interface StoredUserAccount extends UserProfile {
  passwordHash?: string
  status: "Active" | "Suspended" | "Pending"
  lastLogin?: string
}

/**
 * Securely hashes password using Node.js crypto.scrypt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const derivedKey = crypto.scryptSync(password, salt, 64)
  return `scrypt$${salt}$${derivedKey.toString("hex")}`
}

/**
 * Verifies password against stored hash with timing safe equal,
 * with graceful transparent fallback for plain text legacy passwords.
 */
export function verifyPassword(password: string, storedHashOrPlain?: string): boolean {
  if (!storedHashOrPlain) return false
  if (storedHashOrPlain.startsWith("scrypt$")) {
    const parts = storedHashOrPlain.split("$")
    if (parts.length !== 3) return false
    const salt = parts[1]
    const originalHash = parts[2]
    try {
      const key = crypto.scryptSync(password, salt, 64)
      return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), key)
    } catch {
      return false
    }
  }
  // Plain text fallback (for existing legacy records before migration)
  return password === storedHashOrPlain
}

export function isHashed(stored?: string): boolean {
  return Boolean(stored && stored.startsWith("scrypt$"))
}

function mapRowToUser(row: any): StoredUserAccount {
  // Normalize tier gracefully (support 'pro', 'monthly', 'weekly', 'admin', etc.)
  let tier: UserProfile["tier"] = "Free"
  const rawTier = String(row.tier || "").trim().toLowerCase()
  if (rawTier === "pro" || rawTier === "monthly") {
    tier = "Monthly"
  } else if (rawTier === "weekly") {
    tier = "Weekly"
  } else if (rawTier === "admin") {
    tier = "Admin"
  } else if (rawTier === "enterprise") {
    tier = "Enterprise"
  } else {
    tier = "Free"
  }

  // Normalize role gracefully (support 'admin', 'super admin', 'affiliate', etc.)
  let role: UserProfile["role"] = "User"
  const rawRole = String(row.role || "").trim().toLowerCase()
  if (rawRole === "super admin" || rawRole === "admin") {
    role = "Super Admin"
  } else if (rawRole === "affiliate") {
    role = "Affiliate"
  } else {
    role = "User"
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    tier,
    role,
    status: row.status || "Active",
    activeSignalsAllowed: row.active_signals_allowed !== undefined && row.active_signals_allowed !== null ? Number(row.active_signals_allowed) : (tier === "Free" ? 1 : 999),
    joinedDate: row.joined_date ? new Date(row.joined_date).toISOString() : new Date().toISOString(),
    subscriptionExpiry: row.subscription_expiry || undefined,
    lastLogin: row.last_login ? new Date(row.last_login).toISOString() : undefined,
    referredBy: row.referred_by || undefined,
    emailVerified: row.email_verified !== undefined && row.email_verified !== null ? Boolean(row.email_verified) : true,
    language: (row.language === "id" ? "id" : "en") as "en" | "id",
  }
}

export async function findUserByEmail(email: string): Promise<StoredUserAccount | null> {
  const cleanEmail = email.trim().toLowerCase()
  const res = await query(
    `SELECT * FROM needpips_users WHERE LOWER(email) = $1 LIMIT 1`,
    [cleanEmail]
  )
  if (res.rows.length === 0) return null
  return mapRowToUser(res.rows[0])
}

export async function findUserById(id: string): Promise<StoredUserAccount | null> {
  const res = await query(
    `SELECT * FROM needpips_users WHERE id = $1 LIMIT 1`,
    [id]
  )
  if (res.rows.length === 0) return null
  return mapRowToUser(res.rows[0])
}

export async function insertUser(user: StoredUserAccount): Promise<StoredUserAccount> {
  await query(
    `INSERT INTO needpips_users (
      id, name, email, password_hash, tier, role, status,
      active_signals_allowed, joined_date, subscription_expiry,
      referred_by, email_verified, language, last_login
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
    [
      user.id,
      user.name,
      user.email.toLowerCase(),
      user.passwordHash || "",
      user.tier,
      user.role,
      user.status,
      user.activeSignalsAllowed,
      user.joinedDate,
      user.subscriptionExpiry || null,
      user.referredBy || null,
      user.emailVerified ?? false,
      user.language || "en",
    ]
  )
  return user
}

export async function fetchAllUsers(): Promise<StoredUserAccount[]> {
  const res = await query(`SELECT * FROM needpips_users ORDER BY created_at DESC`)
  return res.rows.map(mapRowToUser)
}

export async function updateUserRecord(
  id: string,
  updates: Partial<StoredUserAccount>
): Promise<void> {
  const fields: string[] = []
  const values: any[] = []
  let idx = 1

  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`)
    values.push(updates.name)
  }
  if (updates.passwordHash !== undefined) {
    fields.push(`password_hash = $${idx++}`)
    values.push(updates.passwordHash)
  }
  if (updates.tier !== undefined) {
    fields.push(`tier = $${idx++}`)
    values.push(updates.tier)
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${idx++}`)
    values.push(updates.role)
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${idx++}`)
    values.push(updates.status)
  }
  if (updates.activeSignalsAllowed !== undefined) {
    fields.push(`active_signals_allowed = $${idx++}`)
    values.push(updates.activeSignalsAllowed)
  }
  if (updates.subscriptionExpiry !== undefined) {
    fields.push(`subscription_expiry = $${idx++}`)
    values.push(updates.subscriptionExpiry)
  }
  if (updates.emailVerified !== undefined) {
    fields.push(`email_verified = $${idx++}`)
    values.push(updates.emailVerified)
  }
  if (updates.language !== undefined) {
    fields.push(`language = $${idx++}`)
    values.push(updates.language)
  }
  if (updates.lastLogin !== undefined) {
    fields.push(`last_login = $${idx++}`)
    values.push(updates.lastLogin ? new Date(updates.lastLogin) : new Date())
  }

  if (fields.length === 0) return

  values.push(id)
  await query(
    `UPDATE needpips_users SET ${fields.join(", ")} WHERE id = $${idx}`,
    values
  )
}
