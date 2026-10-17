import { Pool } from "pg"

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.jdveagnkqnhjaziwdiuv:Lalalalisa123!@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"

// Global pool instance to prevent connection exhaustion in development
declare global {
  var _needpipsPgPool: Pool | undefined
}

export const dbPool =
  global._needpipsPgPool ||
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })

if (process.env.NODE_ENV !== "production") {
  global._needpipsPgPool = dbPool
}

export async function query(text: string, params?: any[]) {
  const start = Date.now()
  const res = await dbPool.query(text, params)
  const duration = Date.now() - start
  if (process.env.NODE_ENV === "development" && duration > 500) {
    console.warn(`[Supabase DB Slow Query] ${duration}ms:`, text.slice(0, 100))
  }
  return res
}
