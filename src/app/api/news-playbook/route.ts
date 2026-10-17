import { NextResponse } from "next/server"
import {
  getCachedPlaybook,
  saveCachedPlaybook,
  type NewsAIPlaybook,
} from "@/lib/news-playbook-store"

interface GeneratePlaybookPayload {
  id: string
  event: string
  currency: string
  impact: string
  forecast?: string
  previous?: string
  rationale?: string
  affectedAssets?: ("XAU/USD" | "BTC/USD")[]
}

/**
 * Panggil Google Gemini API Asli
 */
async function callGeminiApi(
  apiKey: string,
  payload: GeneratePlaybookPayload
): Promise<NewsAIPlaybook> {
  const prompt = `Anda adalah seorang Senior Macro Quant Trader di NeedPips.
Analisis data rilis ekonomi berikut dan buat skenario eksekusi trading objektif:
- Event: ${payload.event}
- Currency: ${payload.currency}
- Impact: ${payload.impact}
- Forecast: ${payload.forecast || "N/A"}
- Prior / Previous: ${payload.previous || "N/A"}
- Primary Assets: ${payload.affectedAssets?.join(", ") || "XAU/USD, BTC/USD"}

Kembalikan output HANYA dalam format JSON valid (tanpa markdown backticks, tanpa teks pengantar) dengan struktur persis berikut:
{
  "executiveSummary": "Ringkasan analisis fundamental dan dampaknya terhadap likuiditas pasar",
  "scenarioA": {
    "title": "Scenario A: Actual > Forecast",
    "subtitle": "Label kondisi (misal: Strong Currency Impulse)",
    "description": "Analisis detail apa yang terjadi pada orderflow jika data rilis di atas ekspektasi",
    "targetBias": "Bias instrumen utama (misal: Gold Short Sweep)",
    "targetLevel": "Target level likuiditas/harga teknikal terdekat",
    "invalidationLevel": "Level invalidasi jika skenario gagal"
  },
  "scenarioB": {
    "title": "Scenario B: Actual < Forecast",
    "subtitle": "Label kondisi (misal: Currency Retracement Impulse)",
    "description": "Analisis detail apa yang terjadi pada orderflow jika data rilis di bawah ekspektasi",
    "targetBias": "Bias instrumen utama (misal: Gold Long Breakout)",
    "targetLevel": "Target level likuiditas/harga teknikal terdekat",
    "invalidationLevel": "Level invalidasi jika skenario gagal"
  },
  "primaryAssetBias": {
    "asset": "${payload.affectedAssets?.[0] || "XAU/USD"}",
    "bias": "Bullish Expansion ATAU Bearish Liquidity Sweep ATAU Range Consolidation",
    "confidence": 85
  }
}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API Error (${res.status}): ${errText}`)
  }

  const json = await res.json()
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
  const parsed = JSON.parse(rawText)

  return {
    eventId: payload.id,
    eventName: payload.event,
    currency: payload.currency,
    impact: payload.impact,
    generatedAt: new Date().toISOString(),
    isAiGenerated: true,
    sourceModel: "Google Gemini 2.0 Flash (Live AI Inference)",
    executiveSummary: parsed.executiveSummary || "Analisis pasar makro langsung dari model AI.",
    scenarioA: parsed.scenarioA,
    scenarioB: parsed.scenarioB,
    primaryAssetBias: parsed.primaryAssetBias || {
      asset: payload.affectedAssets?.[0] || "XAU/USD",
      bias: "Range Consolidation",
      confidence: 80,
    },
  }
}

/**
 * Panggil OpenAI API Asli
 */
async function callOpenAiApi(
  apiKey: string,
  payload: GeneratePlaybookPayload
): Promise<NewsAIPlaybook> {
  const prompt = `Anda adalah Senior Macro Quant Trader di NeedPips.
Analisis data rilis ekonomi berikut:
- Event: ${payload.event}
- Currency: ${payload.currency}
- Impact: ${payload.impact}
- Forecast: ${payload.forecast || "N/A"}
- Prior: ${payload.previous || "N/A"}
- Assets: ${payload.affectedAssets?.join(", ") || "XAU/USD, BTC/USD"}

Kembalikan respon HANYA dalam JSON format persis dengan field:
{
  "executiveSummary": "string",
  "scenarioA": {
    "title": "Scenario A: Actual > Forecast",
    "subtitle": "string",
    "description": "string",
    "targetBias": "string",
    "targetLevel": "string",
    "invalidationLevel": "string"
  },
  "scenarioB": {
    "title": "Scenario B: Actual < Forecast",
    "subtitle": "string",
    "description": "string",
    "targetBias": "string",
    "targetLevel": "string",
    "invalidationLevel": "string"
  },
  "primaryAssetBias": {
    "asset": "${payload.affectedAssets?.[0] || "XAU/USD"}",
    "bias": "Bullish Expansion",
    "confidence": 85
  }
}`

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI API Error (${res.status}): ${errText}`)
  }

  const json = await res.json()
  const content = json.choices?.[0]?.message?.content || "{}"
  const parsed = JSON.parse(content)

  return {
    eventId: payload.id,
    eventName: payload.event,
    currency: payload.currency,
    impact: payload.impact,
    generatedAt: new Date().toISOString(),
    isAiGenerated: true,
    sourceModel: "OpenAI GPT-4o-mini (Live AI Inference)",
    executiveSummary: parsed.executiveSummary || "Analisis pasar makro langsung dari model AI.",
    scenarioA: parsed.scenarioA,
    scenarioB: parsed.scenarioB,
    primaryAssetBias: parsed.primaryAssetBias || {
      asset: payload.affectedAssets?.[0] || "XAU/USD",
      bias: "Range Consolidation",
      confidence: 80,
    },
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing event id parameter" }, { status: 400 })
    }

    const cached = getCachedPlaybook(id)
    if (cached) {
      return NextResponse.json({
        cached: true,
        playbook: cached,
      })
    }

    return NextResponse.json({
      cached: false,
      playbook: null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to read playbook store" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const payload: GeneratePlaybookPayload = await req.json()

    if (!payload.id) {
      return NextResponse.json({ error: "Missing event id" }, { status: 400 })
    }

    // 1. Cek cache persisten dari Supabase
    const existing = await getCachedPlaybook(payload.id)
    if (existing && existing.isAiGenerated && existing.sourceModel.includes("Live AI Inference")) {
      return NextResponse.json({
        cached: true,
        message: "Retrieved from persistent cache without re-generation.",
        playbook: existing,
      })
    }

    // 2. Periksa keberadaan API Key AI Asli
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    const openAiKey = process.env.OPENAI_API_KEY

    if (!geminiKey && !openAiKey) {
      // TIDAK ADA DATA PALSU ATAU DUMMY NGARANG!
      // Kembalikan status resmi bahwa AI Key belum dikonfigurasi.
      return NextResponse.json({
        cached: false,
        noAiKey: true,
        message:
          "AI Provider belum terhubung. Silakan pasang GEMINI_API_KEY atau OPENAI_API_KEY di .env.local untuk mengaktifkan analisa model AI asli.",
        playbook: null,
      })
    }

    // 3. Panggil Live AI Asli
    let aiPlaybook: NewsAIPlaybook
    if (geminiKey) {
      aiPlaybook = await callGeminiApi(geminiKey, payload)
    } else {
      aiPlaybook = await callOpenAiApi(openAiKey!, payload)
    }

    // 4. Simpan hasil asli dari AI ke cache persisten Supabase agar tidak memanggil ulang
    await saveCachedPlaybook(aiPlaybook)

    return NextResponse.json({
      cached: false,
      message: "Generated by real AI and saved to cache.",
      playbook: aiPlaybook,
    })
  } catch (error: any) {
    console.error("AI Generation Error:", error)
    return NextResponse.json(
      {
        cached: false,
        error: error.message || "Failed to generate AI playbook",
        playbook: null,
      },
      { status: 500 }
    )
  }
}
