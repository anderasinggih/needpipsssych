import { query } from "./db"
import { LogRow } from "@/components/ui/request-log"

export interface LogStoreData {
  logs: LogRow[]
  lastUpdated: string
}

export async function getLogsFromDb(category?: string): Promise<LogRow[]> {
  try {
    let sql = `SELECT * FROM needpips_audit_logs ORDER BY created_at DESC LIMIT 50`
    const res = await query(sql)
    
    let logs: LogRow[] = res.rows.map((r: any) => {
      const d = new Date(r.created_at)
      const timeStr = d.toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" })
      return {
        id: r.id,
        code: r.code,
        method: r.method,
        path: r.path,
        ms: r.ms,
        time: timeStr,
        body: r.body,
      }
    })

    if (category && category !== "All") {
      if (category === "Inference") {
        logs = logs.filter((l) => l.path.includes("inference") || l.path.includes("quant"))
      } else if (category === "Market") {
        logs = logs.filter((l) => l.path.includes("market") || l.path.includes("orderbook") || l.path.includes("tape"))
      } else if (category === "Errors") {
        logs = logs.filter((l) => l.code >= 400)
      }
    }

    return logs
  } catch (err) {
    console.error("Failed fetching logs from Supabase:", err)
    return []
  }
}

export function getLogsStore(): LogStoreData {
  // Synchronous adapter for existing callers
  return {
    logs: [],
    lastUpdated: new Date().toISOString(),
  }
}

export function saveLogsStore(data: LogStoreData): void {
  // No-op, replaced by Supabase PostgreSQL persistence
}

export function recordAuditLog(logItem: Omit<LogRow, "id" | "time"> & { time?: string }): LogRow {
  const id = `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
  const now = new Date()
  const timeStr =
    logItem.time ||
    now.toLocaleTimeString("en-GB", { hour12: false, timeZone: "UTC" })

  const bodyStr = typeof logItem.body === "string" ? logItem.body : JSON.stringify(logItem.body, null, 2)

  // Persist directly to Supabase needpips_audit_logs in background
  query(
    `INSERT INTO needpips_audit_logs (id, code, method, path, ms, body, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [id, logItem.code, logItem.method, logItem.path, logItem.ms, bodyStr]
  ).catch((err) => {
    console.warn("Failed inserting audit log to Supabase:", err)
  })

  return {
    id,
    code: logItem.code,
    method: logItem.method,
    path: logItem.path,
    ms: logItem.ms,
    time: timeStr,
    body: bodyStr,
  }
}
