import { query } from "./db"

export interface PlaybookScenario {
  title: string
  subtitle: string
  description: string
  targetBias: string
  targetLevel: string
  invalidationLevel: string
}

export interface NewsAIPlaybook {
  eventId: string
  eventName: string
  currency: string
  impact: string
  generatedAt: string
  isAiGenerated: boolean
  sourceModel: string
  executiveSummary: string
  scenarioA: PlaybookScenario
  scenarioB: PlaybookScenario
  primaryAssetBias: {
    asset: "XAU/USD" | "BTC/USD"
    bias: "Bullish Expansion" | "Bearish Liquidity Sweep" | "Range Consolidation"
    confidence: number // 0 - 100%
  }
}

export type PlaybookStoreMap = Record<string, NewsAIPlaybook>

let cachedPlaybooks: PlaybookStoreMap = {}

export async function getCachedPlaybook(eventId: string): Promise<NewsAIPlaybook | null> {
  if (cachedPlaybooks[eventId]) return cachedPlaybooks[eventId]
  try {
    const res = await query(
      "SELECT value FROM needpips_system_settings WHERE key = $1 LIMIT 1",
      ["news_playbooks"]
    )
    if (res.rows.length > 0 && res.rows[0].value) {
      const val = res.rows[0].value
      cachedPlaybooks = typeof val === "string" ? JSON.parse(val) : (val as PlaybookStoreMap)
      return cachedPlaybooks[eventId] || null
    }
    return null
  } catch (err) {
    console.warn("Failed fetching playbook from Supabase:", err)
    return null
  }
}

export async function saveCachedPlaybook(playbook: NewsAIPlaybook): Promise<void> {
  cachedPlaybooks[playbook.eventId] = playbook
  try {
    await query(
      `INSERT INTO needpips_system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      ["news_playbooks", JSON.stringify(cachedPlaybooks)]
    )
  } catch (err) {
    console.error("Failed saving playbook to Supabase:", err)
  }
}
