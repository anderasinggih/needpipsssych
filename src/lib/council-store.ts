import { query } from "./db"
import { QuantAgentConfig } from "@/components/admin/agent-council-studio"

export interface CouncilStoreData {
  agents: QuantAgentConfig[]
  lastUpdated: string
}

export const DEFAULT_COUNCIL_AGENTS: QuantAgentConfig[] = [
  { id: 1, modelName: "deepseek-r1-quant-q8", apiKey: "", status: "idle", weight: 95 },
  { id: 2, modelName: "claude-3-7-sonnet-cot", apiKey: "", status: "idle", weight: 95 },
  { id: 3, modelName: "gpt-4o-macro-specialist", apiKey: "", status: "idle", weight: 90 },
  { id: 4, modelName: "qwen-2-5-72b-math-instruct", apiKey: "", status: "idle", weight: 88 },
  { id: 5, modelName: "mistral-large-orderflow", apiKey: "", status: "idle", weight: 85 },
  { id: 6, modelName: "gemini-2-0-pro-macro", apiKey: "", status: "idle", weight: 80 },
  { id: 7, modelName: "llama-3-3-70b-liquidity-hunter", apiKey: "", status: "idle", weight: 88 },
  { id: 8, modelName: "phi-4-microstructure-eval", apiKey: "", status: "idle", weight: 75 },
  { id: 9, modelName: "deepseek-v3-delta-spread", apiKey: "", status: "idle", weight: 85 },
  { id: 10, modelName: "grok-2-fast-momentum", apiKey: "", status: "idle", weight: 82 },
  { id: 11, modelName: "command-r-plus-volatility", apiKey: "", status: "idle", weight: 78 },
  { id: 12, modelName: "nemotron-70b-macro-rates", apiKey: "", status: "idle", weight: 84 },
  { id: 13, modelName: "yi-lightning-pattern-engine", apiKey: "", status: "idle", weight: 76 },
  { id: 14, modelName: "codellama-70b-execution-guard", apiKey: "", status: "idle", weight: 85 },
  { id: 15, modelName: "custom-quant-svm-cluster", apiKey: "", status: "idle", weight: 90 },
  { id: 16, modelName: "xgboost-orderflow-imbalance", apiKey: "", status: "idle", weight: 92 },
  { id: 17, modelName: "transformer-timeseries-lstm", apiKey: "", status: "idle", weight: 86 },
  { id: 18, modelName: "random-forest-regime-detector", apiKey: "", status: "idle", weight: 80 },
  { id: 19, modelName: "bert-financial-sentiment-core", apiKey: "", status: "idle", weight: 75 },
  { id: 20, modelName: "reinforcement-learning-ppo-v4", apiKey: "", status: "idle", weight: 94 },
]

let cachedCouncil: CouncilStoreData = {
  agents: DEFAULT_COUNCIL_AGENTS,
  lastUpdated: new Date().toISOString(),
}

export async function getCouncilStoreFromDb(): Promise<CouncilStoreData> {
  try {
    const res = await query(
      "SELECT value FROM needpips_system_settings WHERE key = $1 LIMIT 1",
      ["agent_council"]
    )
    if (res.rows.length > 0 && res.rows[0].value) {
      const val = res.rows[0].value
      cachedCouncil = typeof val === "string" ? JSON.parse(val) : (val as CouncilStoreData)
      return cachedCouncil
    }

    await query(
      "INSERT INTO needpips_system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO NOTHING",
      ["agent_council", JSON.stringify(cachedCouncil)]
    )
    return cachedCouncil
  } catch (err) {
    console.warn("Failed fetching council from Supabase:", err)
    return cachedCouncil
  }
}

export function getCouncilStore(): CouncilStoreData {
  return cachedCouncil
}

export async function saveCouncilStore(data: CouncilStoreData): Promise<void> {
  cachedCouncil = data
  try {
    await query(
      `INSERT INTO needpips_system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      ["agent_council", JSON.stringify(data)]
    )
  } catch (err) {
    console.error("Failed saving council store to Supabase:", err)
  }
}
