import { query } from "./db"
import crypto from "crypto"

export interface AdminApiKey {
  id: string
  name: string
  key: string
  maskedKey: string
  createdByName: string
  createdByEmail: string
  createdAt: string
  lastUsedAt?: string
  status: "ACTIVE" | "REVOKED"
}

const SETTINGS_KEY = "admin_api_keys"

function maskKey(key: string): string {
  if (key.length <= 12) return key
  return `${key.slice(0, 10)}••••••••${key.slice(-4)}`
}

export async function getAdminApiKeys(): Promise<AdminApiKey[]> {
  try {
    const res = await query(
      "SELECT value FROM needpips_system_settings WHERE key = $1 LIMIT 1",
      [SETTINGS_KEY]
    )
    if (res.rows.length > 0 && res.rows[0].value) {
      const val =
        typeof res.rows[0].value === "string"
          ? JSON.parse(res.rows[0].value)
          : res.rows[0].value
      if (Array.isArray(val)) {
        return val
      }
    }

    // Default seed key if table entry is empty
    const defaultKey = "np_live_948f2b01ac741893c8340d"
    const seed: AdminApiKey[] = [
      {
        id: "key_primary_admin",
        name: "Primary TradingView / Python Key",
        key: defaultKey,
        maskedKey: maskKey(defaultKey),
        createdByName: "System Seed",
        createdByEmail: "admin@needpips.io",
        createdAt: "2026-09-01T00:00:00.000Z",
        lastUsedAt: new Date().toISOString(),
        status: "ACTIVE",
      },
    ]

    await query(
      "INSERT INTO needpips_system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO NOTHING",
      [SETTINGS_KEY, JSON.stringify(seed)]
    )
    return seed
  } catch (err) {
    console.warn("Failed fetching admin API keys from Supabase, using fallback:", err)
    return []
  }
}

export async function saveAdminApiKeys(keys: AdminApiKey[]): Promise<void> {
  await query(
    `INSERT INTO needpips_system_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [SETTINGS_KEY, JSON.stringify(keys)]
  )
}

export async function generateAdminApiKey(
  name: string,
  user: { name?: string; email?: string }
): Promise<{ apiKey: AdminApiKey; rawKey: string }> {
  const keys = await getAdminApiKeys()
  const randomHex = crypto.randomBytes(16).toString("hex")
  const rawKey = `np_live_${randomHex}`
  const id = `key_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`

  const newKeyRecord: AdminApiKey = {
    id,
    name: name.trim() || "TradingView Webhook Alert",
    key: rawKey,
    maskedKey: maskKey(rawKey),
    createdByName: user.name || "Super Admin",
    createdByEmail: user.email || "admin@needpips.io",
    createdAt: new Date().toISOString(),
    status: "ACTIVE",
  }

  keys.unshift(newKeyRecord)
  await saveAdminApiKeys(keys)

  return { apiKey: newKeyRecord, rawKey }
}

export async function revokeAdminApiKey(id: string): Promise<boolean> {
  const keys = await getAdminApiKeys()
  const target = keys.find((k) => k.id === id)
  if (!target) return false

  target.status = "REVOKED"
  await saveAdminApiKeys(keys)
  return true
}

export async function validateAdminApiKey(
  incomingKey: string
): Promise<{ valid: boolean; keyRecord?: AdminApiKey }> {
  if (!incomingKey) return { valid: false }
  const cleanKey = incomingKey.trim()

  const keys = await getAdminApiKeys()
  const match = keys.find((k) => k.key === cleanKey && k.status === "ACTIVE")

  if (!match) return { valid: false }

  // Update lastUsedAt asynchronously
  match.lastUsedAt = new Date().toISOString()
  saveAdminApiKeys(keys).catch((e) => console.warn("Failed updating key lastUsedAt:", e))

  return { valid: true, keyRecord: match }
}
