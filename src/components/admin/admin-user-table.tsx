"use client"

import { useState, useMemo } from "react"
import {
  Search,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Filter,
  Users,
  Copy,
  CheckCheck,
  Download,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface AdminUserAccount {
  id: string
  name: string
  email: string
  tier: "Free" | "Weekly" | "Monthly" | "Enterprise" | "Admin"
  role: "User" | "Affiliate" | "Super Admin"
  status: "Active" | "Suspended" | "Pending"
  activeSignalsAllowed: number
  joinedDate: string
  subscriptionExpiry?: string
  lastLogin?: string
  emailVerified?: boolean
}

interface AdminUserTableProps {
  users: AdminUserAccount[]
  loading: boolean
  updatingUserId: string | null
  onRefresh: () => void
  onUpdateUser: (
    userId: string,
    action: "update-tier" | "update-role" | "update-status",
    payload: { tier?: string; role?: string; status?: string }
  ) => Promise<void>
  successMessage?: string | null
}

export function AdminUserTable({
  users,
  loading,
  updatingUserId,
  onRefresh,
  onUpdateUser,
  successMessage,
}: AdminUserTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [tierFilter, setTierFilter] = useState<string>("All")
  const [roleFilter, setRoleFilter] = useState<string>("All")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Copy helper
  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  // Export CSV for 1,000+ accounts
  const handleExportCsv = () => {
    if (filteredUsers.length === 0) return
    const headers = ["ID", "Name", "Email", "Tier", "Role", "Status", "Signals Allowed", "Joined Date", "Last Login"]
    const rows = filteredUsers.map((u) => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      u.email,
      u.tier,
      u.role,
      u.status,
      u.activeSignalsAllowed,
      u.joinedDate,
      u.lastLogin || "",
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `needpips_subscribers_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter accounts
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        searchTerm.trim() === "" ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchTier =
        tierFilter === "All" ||
        u.tier.toLowerCase() === tierFilter.toLowerCase()

      const matchRole =
        roleFilter === "All" ||
        u.role.toLowerCase() === roleFilter.toLowerCase()

      const matchStatus =
        statusFilter === "All" ||
        u.status.toLowerCase() === statusFilter.toLowerCase()

      return matchSearch && matchTier && matchRole && matchStatus
    })
  }, [users, searchTerm, tierFilter, roleFilter, statusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * pageSize
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize)

  // Counts
  const totalAdmins = users.filter((u) => u.role === "Super Admin").length
  const totalAffiliates = users.filter((u) => u.role === "Affiliate").length
  const totalPasses = users.filter((u) => u.tier === "Monthly" || u.tier === "Weekly").length
  const totalFree = users.filter((u) => u.tier === "Free").length

  return (
    <div className="space-y-4">
      {/* 1. Quick Directory Vitals Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl border border-white/[0.06] bg-zinc-900/40">
          <span className="text-[10px] font-mono uppercase text-foreground/45 block">
            Total Accounts
          </span>
          <span className="text-sm font-semibold font-mono text-white mt-0.5 block">
            {users.length} registered
          </span>
        </div>
        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <span className="text-[10px] font-mono uppercase text-emerald-400/80 block">
            Paid Passes
          </span>
          <span className="text-sm font-semibold font-mono text-emerald-400 mt-0.5 block">
            {totalPasses} active
          </span>
        </div>
        <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <span className="text-[10px] font-mono uppercase text-amber-400/80 block">
            Affiliate Partners
          </span>
          <span className="text-sm font-semibold font-mono text-amber-400 mt-0.5 block">
            {totalAffiliates} partners
          </span>
        </div>
        <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
          <span className="text-[10px] font-mono uppercase text-rose-400/80 block">
            Super Admins
          </span>
          <span className="text-sm font-semibold font-mono text-rose-400 mt-0.5 block">
            {totalAdmins} desks
          </span>
        </div>
      </div>

      {/* 2. Success Banner */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2">
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 3. Search and Filter Bar */}
      <div className="p-3 rounded-2xl border border-white/[0.08] bg-zinc-900/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
          <input
            type="text"
            placeholder="Search accounts by name, email, or user ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.06] text-xs text-white placeholder:text-foreground/40 focus:outline-none focus:border-white/20 transition-all font-mono"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Tier Filter */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.06] rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-mono text-foreground/45 uppercase">Tier:</span>
            <select
              value={tierFilter}
              onChange={(e) => {
                setTierFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-transparent text-xs font-mono text-white outline-none cursor-pointer"
            >
              <option value="All" className="bg-zinc-950 text-white">All Tiers</option>
              <option value="Free" className="bg-zinc-950 text-white">Free</option>
              <option value="Weekly" className="bg-zinc-950 text-white">Weekly</option>
              <option value="Monthly" className="bg-zinc-950 text-white">Monthly</option>
              <option value="Admin" className="bg-zinc-950 text-white">Admin</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.06] rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-mono text-foreground/45 uppercase">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-transparent text-xs font-mono text-white outline-none cursor-pointer"
            >
              <option value="All" className="bg-zinc-950 text-white">All Roles</option>
              <option value="User" className="bg-zinc-950 text-white">User</option>
              <option value="Affiliate" className="bg-zinc-950 text-white">Affiliate</option>
              <option value="Super Admin" className="bg-zinc-950 text-white">Super Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/[0.06] rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-mono text-foreground/45 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-transparent text-xs font-mono text-white outline-none cursor-pointer"
            >
              <option value="All" className="bg-zinc-950 text-white">All Status</option>
              <option value="Active" className="bg-zinc-950 text-white">Active</option>
              <option value="Suspended" className="bg-zinc-950 text-white">Suspended</option>
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={filteredUsers.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-[11px] font-mono text-foreground/75 transition-all"
            title="Export filtered accounts to CSV"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-zinc-900 hover:bg-zinc-800 text-[11px] font-mono text-foreground/75 transition-all"
            title="Refresh Account Directory"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* 4. High-Density Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10.5px] font-mono text-foreground/45 uppercase tracking-wider">
                <th className="py-3 px-4">User &amp; Contact</th>
                <th className="py-3 px-3">Account ID</th>
                <th className="py-3 px-3">Subscription Tier</th>
                <th className="py-3 px-3">System Role</th>
                <th className="py-3 px-3 text-center">Signals Quota</th>
                <th className="py-3 px-3">Joined Date</th>
                <th className="py-3 px-4 text-right">Access Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs font-mono text-foreground/40">
                    <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-white/50" />
                    Loading account ledger directory...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs font-mono text-foreground/40">
                    No accounts found matching current query or filters.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((usr) => {
                  const isUpdating = updatingUserId === usr.id
                  const isSuperAdmin = usr.role === "Super Admin"
                  const isActive = usr.status === "Active"

                  return (
                    <tr
                      key={usr.id}
                      className={cn(
                        "hover:bg-white/[0.02] transition-colors text-xs font-mono",
                        isUpdating && "opacity-50 pointer-events-none"
                      )}
                    >
                      {/* 1. User Contact */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center font-mono text-[11px] font-semibold shrink-0 border",
                              isSuperAdmin
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                : usr.tier === "Monthly" || usr.tier === "Weekly"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : "bg-white/[0.05] border-white/[0.08] text-white/80"
                            )}
                          >
                            {usr.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white truncate font-sans text-xs">
                                {usr.name}
                              </span>
                              {usr.emailVerified && (
                                <span className="text-[9px] text-emerald-400/90 font-mono" title="Email Verified">
                                  ✓
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-foreground/40 truncate block">
                              {usr.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. User ID */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleCopy(usr.id)}
                          className="group inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.03] hover:bg-white/[0.08] text-[10.5px] text-foreground/50 hover:text-white transition-all font-mono"
                          title="Click to copy ID"
                        >
                          <span>{usr.id}</span>
                          {copiedId === usr.id ? (
                            <CheckCheck className="h-2.5 w-2.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-70" />
                          )}
                        </button>
                      </td>

                      {/* 3. Subscription Tier Selector */}
                      <td className="py-3 px-3">
                        <select
                          value={usr.tier}
                          onChange={(e) =>
                            onUpdateUser(usr.id, "update-tier", { tier: e.target.value })
                          }
                          className={cn(
                            "px-2 py-1 rounded-lg border text-[11px] font-mono outline-none cursor-pointer transition-colors bg-zinc-950",
                            usr.tier === "Admin"
                              ? "text-rose-400 border-rose-500/30 bg-rose-500/5"
                              : usr.tier === "Monthly" || usr.tier === "Weekly"
                              ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
                              : "text-foreground/60 border-white/[0.08] bg-zinc-900/50"
                          )}
                        >
                          <option value="Free">Free Pass</option>
                          <option value="Weekly">Weekly Pass</option>
                          <option value="Monthly">Monthly Pass</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </td>

                      {/* 4. Role Selector */}
                      <td className="py-3 px-3">
                        <select
                          value={usr.role}
                          onChange={(e) =>
                            onUpdateUser(usr.id, "update-role", { role: e.target.value })
                          }
                          className={cn(
                            "px-2 py-1 rounded-lg border text-[11px] font-mono outline-none cursor-pointer transition-colors bg-zinc-950",
                            usr.role === "Super Admin"
                              ? "text-rose-400 border-rose-500/30 bg-rose-500/5 font-semibold"
                              : usr.role === "Affiliate"
                              ? "text-amber-400 border-amber-500/30 bg-amber-500/5"
                              : "text-foreground/60 border-white/[0.08] bg-zinc-900/50"
                          )}
                        >
                          <option value="User">User</option>
                          <option value="Affiliate">Affiliate Partner</option>
                          <option value="Super Admin">Super Admin</option>
                        </select>
                      </td>

                      {/* 5. Signals Allowed */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={cn(
                            "text-[10.5px] px-2 py-0.5 rounded-full border",
                            usr.activeSignalsAllowed >= 999
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : "text-foreground/50 bg-white/[0.03] border-white/[0.06]"
                          )}
                        >
                          {usr.activeSignalsAllowed >= 999 ? "∞ Uncapped" : `${usr.activeSignalsAllowed} active`}
                        </span>
                      </td>

                      {/* 6. Joined Date */}
                      <td className="py-3 px-3 text-[11px] text-foreground/45">
                        {usr.joinedDate ? new Date(usr.joinedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>

                      {/* 7. Access Status Toggle */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() =>
                            onUpdateUser(usr.id, "update-status", {
                              status: isActive ? "Suspended" : "Active",
                            })
                          }
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10.5px] font-mono transition-all",
                            isActive
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400"
                              : "text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400"
                          )}
                          title={isActive ? "Click to suspend account" : "Click to activate account"}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", isActive ? "bg-emerald-400" : "bg-rose-400")} />
                          <span>{isActive ? "Active" : "Suspended"}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Footer */}
        <div className="p-3 border-t border-white/[0.06] bg-white/[0.01] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-foreground/50">
          <div className="flex items-center gap-2">
            <span>
              Showing {filteredUsers.length === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + pageSize, filteredUsers.length)} of {filteredUsers.length} accounts
            </span>
            <div className="flex items-center gap-1 ml-3 border-l border-white/[0.08] pl-3">
              <span className="text-[10.5px] uppercase text-foreground/40">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-zinc-900 border border-white/[0.08] rounded px-1.5 py-0.5 text-white text-[11px] outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1.5 rounded-lg border border-white/[0.06] bg-zinc-900/40 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-white transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 py-0.5 text-[11px] text-white font-medium">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-lg border border-white/[0.06] bg-zinc-900/40 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-white transition-all"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
