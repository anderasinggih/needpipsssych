import { query } from "./db"
import { recordAuditLog } from "@/lib/logs-store"
import { getPricingStore } from "./pricing-store"

export interface ReferralLeadItem {
  id: string
  userId?: string
  handle: string
  name: string
  registeredAt: string
  plan: string
  status: "Active Paid" | "Expired" | "Registered"
  commissionEarned: string
  commissionAmount: number // in IDR
  tier: string
  referralCode: string
}

export interface PayoutRecord {
  id: string
  amount: number // in IDR
  date: string
  status: "Settled" | "Processing"
  walletAddress: string // Bank Account / E-Wallet info (BCA, Mandiri, Dana, GoPay, etc.)
}

export interface AffiliatePartnerData {
  userId: string
  email: string
  affiliateCode: string
  walletAddress: string // Bank Account / E-Wallet info
  commissionRatePercent: number // 10%
  currentTier: string // "Affiliate 10%"
  unclaimedCommission: number // in IDR
  accumulatedPayout: number // in IDR
  totalClicks: number
  leads: ReferralLeadItem[]
  payouts: PayoutRecord[]
  clicksHistory: number[]
}

export interface AffiliateStoreData {
  affiliates: Record<string, AffiliatePartnerData> // keyed by affiliateCode (uppercase)
  userCodeMap: Record<string, string> // userId -> affiliateCode
  lastUpdated: string
}

let cachedAffiliates: AffiliateStoreData = {
  affiliates: {},
  userCodeMap: {},
  lastUpdated: new Date().toISOString(),
}

export async function getAffiliateStoreFromDb(): Promise<AffiliateStoreData> {
  try {
    const res = await query(
      "SELECT value FROM needpips_system_settings WHERE key = $1 LIMIT 1",
      ["affiliates"]
    )
    if (res.rows.length > 0 && res.rows[0].value) {
      const val = res.rows[0].value
      cachedAffiliates = typeof val === "string" ? JSON.parse(val) : (val as AffiliateStoreData)
      return cachedAffiliates
    }

    await query(
      "INSERT INTO needpips_system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO NOTHING",
      ["affiliates", JSON.stringify(cachedAffiliates)]
    )
    return cachedAffiliates
  } catch (err) {
    console.warn("Failed reading affiliates from database:", err)
    return cachedAffiliates
  }
}

export function getAffiliateStore(): AffiliateStoreData {
  return cachedAffiliates
}

export function saveAffiliateStore(data: AffiliateStoreData): void {
  cachedAffiliates = data
  query(
    `INSERT INTO needpips_system_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    ["affiliates", JSON.stringify(data)]
  ).catch((err) => {
    console.error("Failed writing affiliates store to database:", err)
  })
}

export function getOrCreateAffiliateForUser(user: {
  id: string
  email: string
  name: string
  role?: string
}): AffiliatePartnerData {
  const store = getAffiliateStore()

  // 1. Check if user already mapped to code
  let code = store.userCodeMap[user.id]
  if (code && store.affiliates[code]) {
    store.affiliates[code].commissionRatePercent = 10
    store.affiliates[code].currentTier = "Affiliate 10%"
    if (
      !store.affiliates[code].walletAddress ||
      store.affiliates[code].walletAddress.includes("TRC20") ||
      store.affiliates[code].walletAddress.includes("Wallet Not Set") ||
      store.affiliates[code].walletAddress.includes("Belum Dikonfigurasi")
    ) {
      store.affiliates[code].walletAddress = "Not Configured (BCA / Mandiri / Dana / GoPay)"
    }
    return store.affiliates[code]
  }

  // 2. Generate clean custom code from user's email/name
  const baseCode = (user.name || user.email.split("@")[0])
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10)
  code = baseCode ? `${baseCode}-88` : `REF-${user.id.slice(-6).toUpperCase()}`

  // Check collision
  let counter = 1
  let finalCode = code
  while (store.affiliates[finalCode] && store.affiliates[finalCode].userId !== user.id) {
    finalCode = `${code}-${counter++}`
  }

  const newAffiliate: AffiliatePartnerData = {
    userId: user.id,
    email: user.email,
    affiliateCode: finalCode,
    walletAddress: "Not Configured (BCA / Mandiri / Dana / GoPay)",
    commissionRatePercent: 10,
    currentTier: "Affiliate 10%",
    unclaimedCommission: 0,
    accumulatedPayout: 0,
    totalClicks: 0,
    leads: [],
    payouts: [],
    clicksHistory: [0, 0, 0, 0, 0],
  }

  store.affiliates[finalCode] = newAffiliate
  store.userCodeMap[user.id] = finalCode
  store.lastUpdated = new Date().toISOString()
  saveAffiliateStore(store)

  return newAffiliate
}

export function recordReferralLeadRegistration(
  referralCode: string,
  newUser: {
    id: string
    email: string
    name: string
    tier?: string
  }
): { success: boolean; lead?: ReferralLeadItem } {
  if (!referralCode) return { success: false }

  const store = getAffiliateStore()
  const cleanCode = referralCode.trim().toUpperCase()

  let targetAffiliate: AffiliatePartnerData | undefined = store.affiliates[cleanCode]
  if (!targetAffiliate) {
    const foundKey = Object.keys(store.affiliates).find(
      (k) => k.toUpperCase() === cleanCode
    )
    if (foundKey) {
      targetAffiliate = store.affiliates[foundKey]
    }
  }

  if (!targetAffiliate) {
    console.warn(`Referral code not found in affiliate store: ${referralCode}`)
    return { success: false }
  }

  // Prevent self-referral
  if (targetAffiliate.userId === newUser.id) {
    return { success: false }
  }

  // Check if lead already registered
  const alreadyLead = targetAffiliate.leads.some(
    (l) => l.userId === newUser.id || l.handle === newUser.email
  )
  if (alreadyLead) {
    return { success: true }
  }

  // Determine plan and commission in IDR (Flat 10% on every transaction)
  let planName = "Trial Free"
  let commissionAmount = 0
  let status: "Active Paid" | "Registered" = "Registered"

  const pricingStore = getPricingStore()
  const weeklyPrice = pricingStore.plans?.weekly?.priceIdr || 30000
  const monthlyPrice = pricingStore.plans?.monthly?.priceIdr || 80000

  const rate = (targetAffiliate.commissionRatePercent || 10) / 100 // Dynamic flat rate (default 10%)
  if (newUser.tier === "Monthly") {
    planName = `Monthly Pass (IDR ${monthlyPrice.toLocaleString("id-ID")})`
    commissionAmount = Math.round(monthlyPrice * rate)
    status = "Active Paid"
  } else if (newUser.tier === "Weekly") {
    planName = `Weekly Pass (IDR ${weeklyPrice.toLocaleString("id-ID")})`
    commissionAmount = Math.round(weeklyPrice * rate)
    status = "Active Paid"
  } else {
    planName = "Trial Free"
    commissionAmount = 0
    status = "Registered"
  }

  const emailParts = newUser.email.split("@")
  const maskedHandle =
    emailParts[0].length > 3
      ? `${emailParts[0].slice(0, 3)}***@${emailParts[1] || "mail.com"}`
      : `${newUser.email}`

  const now = new Date()
  const formattedDate = `${now.toISOString().split("T")[0]} ${now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })} WIB`

  const newLead: ReferralLeadItem = {
    id: `lead_${Date.now().toString(36)}`,
    userId: newUser.id,
    handle: maskedHandle,
    name: newUser.name,
    registeredAt: formattedDate,
    plan: planName,
    status,
    commissionEarned:
      commissionAmount > 0
        ? `+IDR ${commissionAmount.toLocaleString("id-ID")}`
        : "IDR 0",
    commissionAmount,
    tier: "Affiliate 10%",
    referralCode: targetAffiliate.affiliateCode,
  }

  targetAffiliate.leads.unshift(newLead)
  targetAffiliate.unclaimedCommission = Math.round(targetAffiliate.unclaimedCommission + commissionAmount)
  targetAffiliate.accumulatedPayout = Math.round(targetAffiliate.accumulatedPayout + commissionAmount)

  store.lastUpdated = now.toISOString()
  saveAffiliateStore(store)

  recordAuditLog({
    code: 201,
    method: "POST",
    path: "/api/affiliate/lead-recorded",
    ms: 14,
    body: JSON.stringify({
      referralCode: targetAffiliate.affiliateCode,
      affiliateUser: targetAffiliate.email,
      leadUser: newUser.email,
      commissionAddedIdr: commissionAmount,
    }),
  })

  return { success: true, lead: newLead }
}

export function recordReferralClick(referralCode: string): void {
  if (!referralCode) return
  const store = getAffiliateStore()
  const cleanCode = referralCode.trim().toUpperCase()
  const affiliate = store.affiliates[cleanCode]
  if (affiliate) {
    affiliate.totalClicks += 1
    if (affiliate.clicksHistory && affiliate.clicksHistory.length > 0) {
      affiliate.clicksHistory[affiliate.clicksHistory.length - 1] += 1
    }
    store.lastUpdated = new Date().toISOString()
    saveAffiliateStore(store)
  }
}

export function upgradeReferralLeadCommission(userId: string, newTier: string): void {
  const store = getAffiliateStore()
  let hasModified = false

  for (const aff of Object.values(store.affiliates)) {
    const leadIndex = aff.leads.findIndex((l) => l.userId === userId)
    if (leadIndex !== -1) {
      const lead = aff.leads[leadIndex]
      let planName = lead.plan
      let commissionAdded = 0

      const pricingStore = getPricingStore()
      const weeklyPrice = pricingStore.plans?.weekly?.priceIdr || 30000
      const monthlyPrice = pricingStore.plans?.monthly?.priceIdr || 80000
      const rate = (aff.commissionRatePercent || 10) / 100

      if (newTier === "Monthly") {
        planName = `Monthly Pass (IDR ${monthlyPrice.toLocaleString("id-ID")})`
        const targetComm = Math.round(monthlyPrice * rate)
        commissionAdded = Math.max(0, targetComm - lead.commissionAmount)
        lead.status = "Active Paid"
        lead.commissionAmount = targetComm
        lead.commissionEarned = `+IDR ${targetComm.toLocaleString("id-ID")}`
        lead.plan = planName
      } else if (newTier === "Weekly") {
        planName = `Weekly Pass (IDR ${weeklyPrice.toLocaleString("id-ID")})`
        const targetComm = Math.round(weeklyPrice * rate)
        commissionAdded = Math.max(0, targetComm - lead.commissionAmount)
        lead.status = "Active Paid"
        lead.commissionAmount = targetComm
        lead.commissionEarned = `+IDR ${targetComm.toLocaleString("id-ID")}`
        lead.plan = planName
      } else if (newTier === "Free") {
        lead.status = "Registered"
        lead.plan = "Trial Free"
      }

      if (commissionAdded > 0) {
        aff.unclaimedCommission = Math.round(aff.unclaimedCommission + commissionAdded)
        aff.accumulatedPayout = Math.round(aff.accumulatedPayout + commissionAdded)
      }

      hasModified = true
    }
  }

  if (hasModified) {
    store.lastUpdated = new Date().toISOString()
    saveAffiliateStore(store)
  }
}
