export type Language = "en" | "id"

export const translations = {
  en: {
    // Brand & General
    "brand.name": "needpips",
    "brand.terminal": "Terminal",
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.saved": "Saved",
    "common.cancel": "Cancel",
    "common.verified": "Verified",
    "common.active": "Active",
    "common.unlimited": "Unlimited",
    "common.upgrade": "Upgrade to VIP",
    "common.signOut": "Sign Out",
    "common.signIn": "Sign In / Register",
    "common.expires": "Expires:",

    // Navigation
    "nav.home": "Home Page",
    "nav.terminal": "Terminal",
    "nav.news": "Market News",
    "nav.history": "History",
    "nav.affiliate": "Affiliate",
    "nav.log": "Request Log",
    "nav.admin": "Admin Desk",
    "nav.passes": "Passes",

    // Profile Page
    "profile.pageTitle": "NeedPips Account Profile",
    "profile.loading": "Loading NeedPips account profile...",
    "profile.overview": "Account Overview & Signal Quotas",
    "profile.memberDesk": "NeedPips Member Desk",
    "profile.accountId": "Account ID",
    "profile.accountIdHint": "Registered unique client desk identifier",
    "profile.membershipTier": "Membership Tier",
    "profile.membershipTierHint": "Active subscription tier entitlement",
    "profile.signalQuota": "Signal Quota",
    "profile.signalQuotaHint": "Active signals allowed as set by admin policy",
    "profile.memberSince": "Member Since",
    "profile.memberSinceHint": "Account registration date",
    "profile.accountStatus": "Account Status",
    "profile.accountStatusHint": "Authentication credentials active",
    "profile.statusVerified": "Verified",
    "profile.activeSignal": "Active Signal",
    "profile.activeSignals": "Active Signals",

    // Language Settings Section in Profile
    "profile.langTitle": "Interface Language Settings",
    "profile.langSubtitle": "Choose your preferred terminal language. Synced directly to your account in the database.",
    "profile.langEn": "English (US)",
    "profile.langEnDesc": "Institutional Wall Street terminology & quantitative notation",
    "profile.langId": "Bahasa Indonesia",
    "profile.langIdDesc": "Bahasa Indonesia formal dengan istilah trading standar",
    "profile.langSavedFeedback": "Language preference saved to your account in database.",

    // Subscription Card
    "profile.subTitle": "Subscription Status & Signal Access Entitlements",
    "profile.freePlan": "Free Plan",
    "profile.freeTierLabel": "Free Tier Entitlement:",
    "profile.vipTierLabel": "VIP Tier Entitlement:",
    "profile.freeTierText": "Free Tier accounts have active access to 1 live signal preview on the Terminal with partially masked numerical SL/TP targets. Full settled trade outcome history remains completely accessible under History.",
    "profile.vipTierText": "VIP Pass Active: Unrestricted access to all live quantitative signal coordinate bounds (Entry, SL, TP1, TP2, TP3) across XAU/USD & BTC/USD in real-time.",
    "profile.unlockTitle": "Unlock Unrestricted Quant Signals:",
    "profile.managePassTitle": "Manage Subscription Pass:",
    "profile.unlockText": "Upgrade to a Weekly or Monthly Pass for zero numeric masking, raw institutional trade coordinates, and instant live signal notifications.",
    "profile.managePassText": "Your active pass is managed securely. Review tier durations or explore institutional options on the pricing desk.",
    "profile.explorePricing": "Explore VIP Passes & Pricing",
    "profile.accountActive": "Account Status: Active & Verified",

    // Pricing Page
    "pricing.badge": "Transparent Institutional Access",
    "pricing.heroTitle": "Institutional Quantitative Passes",
    "pricing.heroSubtitle": "Predictable flat-rate pricing. Instant QRIS payment settlement with zero-wait automated verification.",
    "pricing.weeklyPass": "Weekly Pass",
    "pricing.monthlyPass": "Monthly Pass",
    "pricing.proceedQris": "Proceed to QRIS Payment",
    "pricing.instantQris": "Instant QRIS Automated Activation",

    // Affiliate Page
    "affiliate.badge": "Affiliate Desk · 10% Flat Commission",
    "affiliate.title": "Referral & Commission Desk",
    "affiliate.unclaimed": "Unclaimed Balance",
    "affiliate.withdraw": "Withdraw Balance",
    "affiliate.copyLink": "Copy Link",
    "affiliate.copied": "Copied!",
    "affiliate.clicks": "Total Referral Link Clicks",
    "affiliate.subscribers": "Active Paid Subscribers",
    "affiliate.commissions": "Total Accumulated Commission (IDR)",

    // Terminal
    "terminal.activeSignals": "Active Signals",
    "terminal.liquidityFlow": "Institutional Liquidity Flow",
    "terminal.invalidation": "Invalidation",
    "terminal.target": "Target",
  },
  id: {
    // Brand & General
    "brand.name": "needpips",
    "brand.terminal": "Terminal",
    "common.loading": "Memuat...",
    "common.save": "Simpan",
    "common.saved": "Tersimpan",
    "common.cancel": "Batal",
    "common.verified": "Terverifikasi",
    "common.active": "Aktif",
    "common.unlimited": "Tanpa Batas",
    "common.upgrade": "Tingkatkan ke VIP",
    "common.signOut": "Keluar Akun",
    "common.signIn": "Masuk / Daftar",
    "common.expires": "Berakhir:",

    // Navigation
    "nav.home": "Beranda",
    "nav.terminal": "Terminal",
    "nav.news": "Berita Pasar",
    "nav.history": "Riwayat Sinyal",
    "nav.affiliate": "Afiliasi",
    "nav.log": "Log Permintaan",
    "nav.admin": "Meja Admin",
    "nav.passes": "Paket Langganan",

    // Profile Page
    "profile.pageTitle": "Profil Akun NeedPips",
    "profile.loading": "Memuat profil akun NeedPips...",
    "profile.overview": "Ikhtisar Akun & Kuota Sinyal",
    "profile.memberDesk": "Meja Anggota NeedPips",
    "profile.accountId": "ID Akun",
    "profile.accountIdHint": "Pengidentifikasi unik meja klien terdaftar",
    "profile.membershipTier": "Paket Langganan",
    "profile.membershipTierHint": "Tingkat hak akses langganan aktif",
    "profile.signalQuota": "Kuota Sinyal",
    "profile.signalQuotaHint": "Jumlah sinyal aktif yang diizinkan sesuai kebijakan admin",
    "profile.memberSince": "Bergabung Sejak",
    "profile.memberSinceHint": "Tanggal pendaftaran akun",
    "profile.accountStatus": "Status Akun",
    "profile.accountStatusHint": "Kredensial autentikasi aktif",
    "profile.statusVerified": "Terverifikasi",
    "profile.activeSignal": "Sinyal Aktif",
    "profile.activeSignals": "Sinyal Aktif",

    // Language Settings Section in Profile
    "profile.langTitle": "Pengaturan Bahasa Antarmuka",
    "profile.langSubtitle": "Pilih bahasa tampilan terminal. Pilihan ini tersimpan langsung di database akun Anda.",
    "profile.langEn": "English (US)",
    "profile.langEnDesc": "Terminologi institusional Wall Street & notasi kuantitatif",
    "profile.langId": "Bahasa Indonesia",
    "profile.langIdDesc": "Bahasa Indonesia formal dengan istilah trading standar",
    "profile.langSavedFeedback": "Preferensi bahasa tersimpan ke akun Anda di database.",

    // Subscription Card
    "profile.subTitle": "Status Langganan & Hak Akses Sinyal",
    "profile.freePlan": "Paket Gratis",
    "profile.freeTierLabel": "Hak Akses Paket Free:",
    "profile.vipTierLabel": "Hak Akses Paket VIP:",
    "profile.freeTierText": "Akun Free memiliki akses ke 1 pratinjau sinyal aktif di Terminal dengan target numerik SL/TP yang disamarkan. Riwayat hasil trading penuh tetap dapat diakses di menu Riwayat.",
    "profile.vipTierText": "VIP Pass Aktif: Akses tanpa batas ke semua koordinat batas sinyal kuantitatif (Entry, SL, TP1, TP2, TP3) untuk XAU/USD & BTC/USD secara real-time.",
    "profile.unlockTitle": "Buka Akses Penuh Sinyal Kuantitatif:",
    "profile.managePassTitle": "Kelola Paket Langganan:",
    "profile.unlockText": "Tingkatkan ke Weekly atau Monthly Pass untuk akses tanpa sensor angka, koordinat eksekusi institusional, dan notifikasi instan.",
    "profile.managePassText": "Paket aktif Anda dikelola dengan aman. Tinjau durasi paket atau pelajari opsi institusional di meja langganan.",
    "profile.explorePricing": "Lihat Paket VIP & Harga",
    "profile.accountActive": "Status Akun: Aktif & Terverifikasi",

    // Pricing Page
    "pricing.badge": "Akses Institusional Transparan",
    "pricing.heroTitle": "Paket Kuantitatif Institusional",
    "pricing.heroSubtitle": "Harga flat rate transparan. Pembayaran instan via QRIS dengan verifikasi otomatis tanpa antre.",
    "pricing.weeklyPass": "Paket Mingguan",
    "pricing.monthlyPass": "Paket Bulanan",
    "pricing.proceedQris": "Lanjut ke Pembayaran QRIS",
    "pricing.instantQris": "Aktivasi Otomatis Instan via QRIS",

    // Affiliate Page
    "affiliate.badge": "Meja Afiliasi · Komisi Flat 10%",
    "affiliate.title": "Meja Referral & Komisi",
    "affiliate.unclaimed": "Saldo Belum Ditarik",
    "affiliate.withdraw": "Tarik Saldo",
    "affiliate.copyLink": "Salin Link",
    "affiliate.copied": "Tersalin!",
    "affiliate.clicks": "Total Klik Link Referral",
    "affiliate.subscribers": "Pelanggan Berbayar Aktif",
    "affiliate.commissions": "Total Akumulasi Komisi (IDR)",

    // Terminal
    "terminal.activeSignals": "Sinyal Aktif",
    "terminal.liquidityFlow": "Aliran Likuiditas Institusional",
    "terminal.invalidation": "Invalidasi",
    "terminal.target": "Target",
  },
} as const

export type TranslationKey = keyof typeof translations.en
