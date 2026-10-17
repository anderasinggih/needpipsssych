import { NextRequest, NextResponse } from "next/server"
import { getCouncilStoreFromDb, getCouncilStore, saveCouncilStore, type CouncilStoreData, DEFAULT_COUNCIL_AGENTS } from "@/lib/council-store"
import { type QuantAgentConfig } from "@/components/admin/agent-council-studio"
import { recordAuditLog } from "@/lib/logs-store"

export async function GET() {
  try {
    const store = await getCouncilStoreFromDb()
    return NextResponse.json({
      success: true,
      agents: store.agents,
      lastUpdated: store.lastUpdated,
    })
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const store = await getCouncilStoreFromDb()

    if (body.action === "reset") {
      // Re-initialize with clean default 20 agents
      const freshStore: CouncilStoreData = {
        agents: DEFAULT_COUNCIL_AGENTS,
        lastUpdated: new Date().toISOString(),
      }
      await saveCouncilStore(freshStore)
      recordAuditLog({
        code: 200,
        method: "POST",
        path: "/api/council",
        ms: 12,
        body: JSON.stringify({ action: "reset", modelsCount: freshStore.agents.length }),
      })
      return NextResponse.json({
        success: true,
        agents: freshStore.agents,
        lastUpdated: freshStore.lastUpdated,
      })
    }
    if (Array.isArray(body.agents)) {
      // Full batch update
      const updatedStore: CouncilStoreData = {
        agents: body.agents,
        lastUpdated: new Date().toISOString(),
      }
      await saveCouncilStore(updatedStore)

      recordAuditLog({
        code: 200,
        method: "POST",
        path: "/api/council",
        ms: 18,
        body: JSON.stringify({
          action: "batch_update_weights",
          modelsCount: updatedStore.agents.length,
          avgWeight: Math.round(
            updatedStore.agents.reduce((acc, a) => acc + (a.weight || 0), 0) /
              updatedStore.agents.length
          ),
        }),
      })

      return NextResponse.json({
        success: true,
        agents: updatedStore.agents,
        lastUpdated: updatedStore.lastUpdated,
      })
    }


    if (body.agentId && body.updates) {
      // Single agent update
      const updatedAgents = store.agents.map((agent) =>
        agent.id === body.agentId ? { ...agent, ...body.updates } : agent
      )
      const updatedStore: CouncilStoreData = {
        agents: updatedAgents,
        lastUpdated: new Date().toISOString(),
      }
      await saveCouncilStore(updatedStore)

      recordAuditLog({
        code: 200,
        method: "POST",
        path: "/api/council",
        ms: 8,
        body: JSON.stringify({
          action: "single_agent_update",
          agentId: body.agentId,
          updates: body.updates,
        }),
      })

      return NextResponse.json({
        success: true,
        agents: updatedStore.agents,
        lastUpdated: updatedStore.lastUpdated,
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid payload: 'agents' array or 'agentId' with 'updates' required." },
      { status: 400 }
    )
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Internal Server Error"
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    )
  }
}
