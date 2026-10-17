import { query } from "./db"

export interface AdminTierQuotas {
  freeTierActiveQuota: number
  weeklyTierActiveQuota: number
  monthlyTierActiveQuota: number
  enterpriseTierActiveQuota: number
  freeTierMaskSlTp: boolean
  freeTierAllowHistory: boolean
  freeTierRefreshRateSeconds: number
}

export const DEFAULT_TIER_QUOTAS: AdminTierQuotas = {
  freeTierActiveQuota: 1,
  weeklyTierActiveQuota: 5,
  monthlyTierActiveQuota: 25,
  enterpriseTierActiveQuota: 999,
  freeTierMaskSlTp: true,
  freeTierAllowHistory: true,
  freeTierRefreshRateSeconds: 60,
}

const SETTINGS_KEY = "tier_quotas"

export async function getTierQuotas(): Promise<AdminTierQuotas> {
  try {
    const res = await query(
      "SELECT value FROM needpips_system_settings WHERE key = $1 LIMIT 1",
      [SETTINGS_KEY]
    )
    if (res.rows.length > 0 && res.rows[0].value) {
      const val = typeof res.rows[0].value === "string" ? JSON.parse(res.rows[0].value) : res.rows[0].value
      return {
        ...DEFAULT_TIER_QUOTAS,
        ...val,
      }
    }

    // Insert default if not present
    await query(
      "INSERT INTO needpips_system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO NOTHING",
      [SETTINGS_KEY, JSON.stringify(DEFAULT_TIER_QUOTAS)]
    )
    return DEFAULT_TIER_QUOTAS
  } catch (err) {
    console.warn("Failed fetching tier quotas from Supabase, using defaults:", err)
    return DEFAULT_TIER_QUOTAS
  }
}

export async function updateTierQuotas(
  updates: Partial<AdminTierQuotas>
): Promise<AdminTierQuotas> {
  try {
    const current = await getTierQuotas()
    const merged = { ...current, ...updates }

    const res = await query(
      `INSERT INTO needpips_system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
       RETURNING value`,
      [SETTINGS_KEY, JSON.stringify(merged)]
    )

    if (res.rows.length > 0 && res.rows[0].value) {
      return {
        ...DEFAULT_TIER_QUOTAS,
        ...res.rows[0].value,
      }
    }
    return merged
  } catch (err) {
    console.error("Failed saving tier quotas to Supabase:", err)
    throw err
  }
}

// -------------------------------------------------------------
// MODEL HYPERPARAMETERS PERSISTENCE
// -------------------------------------------------------------
export interface ModelHyperparameters {
  minConfidenceThreshold: number
  modelTemperature: number
  autoInvalidationTimeout: string
  highImpactNewsPause: boolean
  engineLive: boolean
  lastUpdated?: string
  updatedBy?: string
}

export const DEFAULT_HYPERPARAMETERS: ModelHyperparameters = {
  minConfidenceThreshold: 75,
  modelTemperature: 0.2,
  autoInvalidationTimeout: "240m",
  highImpactNewsPause: true,
  engineLive: true,
}

const HYPERPARAMETERS_KEY = "model_hyperparameters"

export async function getModelHyperparameters(): Promise<ModelHyperparameters> {
  try {
    const res = await query(
      "SELECT value FROM needpips_system_settings WHERE key = $1 LIMIT 1",
      [HYPERPARAMETERS_KEY]
    )
    if (res.rows.length > 0 && res.rows[0].value) {
      const val =
        typeof res.rows[0].value === "string"
          ? JSON.parse(res.rows[0].value)
          : res.rows[0].value
      return {
        ...DEFAULT_HYPERPARAMETERS,
        ...val,
      }
    }

    // Insert default if not present
    await query(
      "INSERT INTO needpips_system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO NOTHING",
      [HYPERPARAMETERS_KEY, JSON.stringify(DEFAULT_HYPERPARAMETERS)]
    )
    return DEFAULT_HYPERPARAMETERS
  } catch (err) {
    console.warn("Failed fetching model hyperparameters from Supabase, using defaults:", err)
    return DEFAULT_HYPERPARAMETERS
  }
}

export async function updateModelHyperparameters(
  updates: Partial<ModelHyperparameters>
): Promise<ModelHyperparameters> {
  try {
    const current = await getModelHyperparameters()
    const merged = {
      ...current,
      ...updates,
      lastUpdated: new Date().toISOString(),
    }

    const res = await query(
      `INSERT INTO needpips_system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
       RETURNING value`,
      [HYPERPARAMETERS_KEY, JSON.stringify(merged)]
    )

    if (res.rows.length > 0 && res.rows[0].value) {
      const val =
        typeof res.rows[0].value === "string"
          ? JSON.parse(res.rows[0].value)
          : res.rows[0].value
      return {
        ...DEFAULT_HYPERPARAMETERS,
        ...val,
      }
    }
    return merged
  } catch (err) {
    console.error("Failed saving model hyperparameters to Supabase:", err)
    throw err
  }
}

