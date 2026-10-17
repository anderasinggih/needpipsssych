"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AppNavbar } from "@/components/layout/app-navbar"
import { RequestLog, type LogRow } from "@/components/ui/request-log"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { FileText, Filter, Terminal, CheckCircle2, Clock, Lock } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function LogPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<"All" | "Inference" | "Market" | "Errors">("All")
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Fetch live system logs from backend API
  useEffect(() => {
    let mounted = true

    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/logs", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (data.success && Array.isArray(data.logs) && mounted) {
          setLogs(data.logs)
        }
      } catch (err) {
        console.warn("Could not fetch system logs:", err)
      }
    }

    fetchLogs()
    const interval = setInterval(fetchLogs, 4000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const filteredLogs = logs.filter((l) => {
    if (filter === "Inference") return l.path.includes("inference")
    if (filter === "Market") return l.path.includes("market")
    if (filter === "Errors") return l.code >= 400
    return true
  })

  const isSuperAdmin = user?.role === "Super Admin"

  return (
    <div className="min-h-screen bg-black text-foreground font-sans antialiased selection:bg-zinc-800 flex flex-col">
      {/* Unified App Navbar (contains global TickerTape) */}
      <AppNavbar />

      {!isSuperAdmin ? (
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full p-8 rounded-[24px] border border-white/[0.08] bg-zinc-950/70 backdrop-blur-md text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-white tracking-tight">
              Audit Trail Access Restricted
            </h2>
            <p className="text-xs text-foreground/55 leading-relaxed">
              Internal request telemetry &amp; inference audit logs are restricted to <strong>Super Admin</strong> desks.
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white text-zinc-950 font-semibold text-xs tracking-tight hover:bg-zinc-200 transition-all shadow-md"
              >
                Sign In as Admin
              </Link>
            </div>
          </div>
        </main>
      ) : (
        /* 3. Main Log Content Body */
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
              <Terminal className="h-4 w-4 text-white/70" />
              Request &amp; Inference Log
            </h1>
            <p className="text-xs text-foreground/45">
              Live audit trail of HTTP requests, market depth polling, and quantitative inference calls.
            </p>
          </div>

          <SegmentedControl
            options={["All", "Inference", "Market", "Errors"]}
            value={filter}
            onChange={(v) => setFilter(v as typeof filter)}
            label="Log Category Filter"
          />
        </div>

        {/* Log Viewer Container */}
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-4 sm:p-6 backdrop-blur-md">
          <RequestLog
            logs={filteredLogs}
            title="System request log"
            caption="session to date"
          />
        </div>
      </main>
      )}

      {/* Footer */}
      <footer className="border-t border-white/[0.08] px-4 sm:px-6 py-3 mt-auto bg-zinc-950/80 text-foreground/45 text-xs font-mono flex items-center justify-between">
        <div>needpips terminal · Request Log</div>
        <div>needpips intelligence</div>
      </footer>
    </div>
  )
}
