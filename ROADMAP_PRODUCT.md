# NeedPips Architecture & Product Roadmap

Dokumen ini mencatat rencana bisnis, role pengguna, dan model monetisasi platform **NeedPips Terminal**.
Fokus tahap awal saat ini adalah **Frontend & UX Polish (100% ssych Pure UI)** sebelum masuk ke integrasi backend.

---

## 1. Product Overview
- **Nama Platform**: NeedPips Terminal
- **Tujuan Utama**: Platform analisis & prediksi kuantitatif berbasis AI (Signal / Quant Analytics Tools) untuk instrumen utama:
  - **XAU/USD (Gold Spot)**
  - **BTC/USD (Bitcoin)**
- **Mekanisme Operasional**:
  - Model inferensi di-generate dan divalidasi oleh **Admin**.
  - Sinyal & analisis dipublikasikan untuk diperjualbelikan kepada pelanggan.
  - Platform bersifat **Non-Custodial / Analysis Only** (tidak menyediakan fitur buy/sell manual brokerage langsung).

---

## 2. Multi-Tier Role System
1. **Admin**:
   - Pemegang kendali generate sinyal & model evaluasi (Liquidity sweep, SMC/FVG validator, Orderflow delta).
   - Mengatur parameter invalidation level (SL), target level (TP), dan conviction score.
   - Manajemen katalog langganan, user list, payout komisi affiliator.
2. **User (Subscriber / Trader)**:
   - Mengakses dashboard analisis real-time (**Main Interface**).
   - Melihat live orderbook L2, Depth curve, Macro trade tape, dan Sankey liquidity routing.
   - Membaca live AI deliberation feed dan audit log request.
3. **Affiliator**:
   - Memiliki link referral khusus untuk mempromosikan akses ke NeedPips Terminal.
   - Memantau metrik performa referral (klik, registrasi, konversi langganan aktif).
   - Mendapatkan persentase komisi bagi hasil berulang (*recurring commission*).

---

## 3. Subscription & Monetization Model
- **Tier Durasi**:
  - **Weekly Pass (Mingguan)**: Cocok untuk trader yang ingin mencoba akurasi sinyal dalam rentang sesi trading tertentu.
  - **Monthly Pass (Bulanan)**: Langganan reguler akses penuh tanpa batas ke semua update sinyal XAU & BTC.
  - **Quarterly / Annual Pass (Opsional)**: Tier diskon berjangka panjang.
- **Paywall / Entitlement**:
  - Halaman `Main Interface` dan `Request Log` memerlukan sesi akun aktif dengan status langganan valid.
  - User tier gratis hanya mendapatkan delay data / snapshot, sedangkan tier berbayar mendapatkan sub-10ms realtime telemetry.

---

## 4. Current Frontend Status
- **Stack**: Next.js 16 (Turbopack), Tailwind CSS v4, Motion, Lucide Icons.
- **Design System**: 100% Pure ssych Design System (Sora + JetBrains Mono, Dark Mode, hairline borders, no inline CSS).
- **Halaman Aktif**:
  - `/` (**Main Interface**): Chart Scrubber, Microstructure KPIs, Deliberation Blotter, Orderflow Delta, Agent Consensus Radar, Orderbook, Depth, Tape, Sankey Flow.
  - `/log` (**Request Log**): Audit trail inferensi kuantitatif & latency breakdown dengan payload copy.


1. Payment Gateway Otomatis QRIS (/pricing & Lynk.id) [SELESAI - AKTIF]
Kondisi: Tombol "Activate Weekly Pass" dan "Activate Monthly Pass" kini terhubung langsung ke checkout resmi Lynk.id (0-Wait Verification tanpa verifikasi dokumen berbelit).
- Weekly Pass (Rp 30.000): https://lynk.id/skaladigital/movvp3991njn/checkout
- Monthly Pass (Rp 80.000): https://lynk.id/skaladigital/yjxxlgwq405l/checkout
Endpoint Webhook Receiver: `/api/webhooks/lynk` aktif menerima notifikasi transaksi sukses secara real-time via HTTP POST. Sistem otomatis memvalidasi email pembeli, meng-upgrade status akun ke "Pro" di Supabase (7 hari / 30 hari), dan langsung menyetorkan komisi referal 10% IDR ke saldo affiliator pengajak.
Fitur UI: Modal checkout QRIS interaktif dengan konfirmasi email akun, tautan Lynk.id otomatis, dan indikator kanal pembayaran QRIS lengkap (BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay).

2. Notifikasi Broadcast Bot Telegram & Discord
Kondisi Saat Ini: Di notification audio center dan panel preferensi, ada tulisan "Telegram Push Channel (@needpips_alpha_vip)". Saat tombol test ditekan, sistem hanya menampilkan browser popup alert().
Yang Belum Ada: Belum ada worker bot Telegram (process.env.TELEGRAM_BOT_TOKEN) yang otomatis mem-forward sinyal baru dari admin langsung ke channel Telegram subscriber.
3. Webhook Ingestion API Key & TradingView Receiver (/settings - Tab Webhook Ingestion) [SELESAI - AKTIF]
Kondisi: Sistem manajemen API key lengkap terhubung ke Supabase (`/api/settings/webhooks/keys`). Admin dapat membuat kunci baru, menyalin secret raw key, melihat tanggal pemakaian terakhir, dan mencabut (revoke) kunci kapan saja.
Endpoint Receiver: `/api/webhooks/tradingview` aktif dan dapat menerima payload sinyal otomatis (TradingView PineScript Alert, Python script, atau cURL) dengan autentikasi `x-api-key`, header `Authorization: Bearer`, atau parameter `passphrase`. Sinyal valid langsung di-publish ke feed subscriber PROD dan dicatat di audit log.
Fitur Tambahan: Panduan integrasi kode (TradingView JSON, cURL, Python) dan panel Live Webhook Ingestion Ping Simulator untuk pengujian langsung dari dashboard.

4. Model Hyperparameters Persistence (/settings - Tab Hyperparameters) [SELESAI - AKTIF]
Kondisi: Slider Minimum Confidence Threshold, Model Sampling Temperature, Auto Invalidation Timeout, High Impact News Pause, dan Quant Inference Engine Master Switch kini tersimpan permanen di tabel `needpips_system_settings` Supabase PostgreSQL via endpoint `/api/settings/hyperparameters`.
Fitur: Tombol "Simpan Hyperparameters" (dengan audit trail otomatis & feedback toast), tombol "Reset Default", serta indikator status sinkronisasi database real-time. Angka tidak lagi hilang saat halaman di-refresh.

5. Historical Audit Backtest Window (/settings - Tab Historical Audit)
Kondisi Saat Ini: Menampilkan kalender visual pure UI DateRangePicker.
Yang Belum Ada: Memilih rentang tanggal belum mengeksekusi perhitungan simulasi backtest otomatis atau export log PDF/Excel pada rentang tanggal tersebut.
6. Sistem Afiliasi & Payout Komisi 10% IDR (/affiliate) [SELESAI - AKTIF]
Kondisi: Saldo dan payout sudah 100% IDR (Rupiah). Komisi flat 10% dari setiap transaksi referal terintegrasi otomatis. Rekening bank dan e-wallet lokal (BCA, Mandiri, Dana, GoPay) tersimpan di database. Semua pengguna teregister otomatis menjadi affiliator dengan kode referal aktif.

7. Sankey Institutional Flow Map (/) [SELESAI - SEMPURNA]
Kondisi: Visual aliran likuiditas (LBMA Spot Settlement, Central Bank Reserves, COMEX Speculators, Gold ETFs, BTC Spot ETFs, Coinbase Prime, Deribit Options) diskalakan secara dinamis & 100% seimbang (conserved flow) berdasarkan live orderflow, taker delta, dan volume Binance.
Penyempurnaan:
- Label tengah (Hub) dinamis: "Bullion Clearing" (XAU) / "Orderflow Pool" (BTC).
- Layout lebar SVG diperluas (560px & label width 125px) sehingga tidak ada teks yang terpotong.
- Format nominal likuiditas institucional standar hedge fund ($ Millions).
- Catatan transparansi metodologi kuantitatif (Econometric Orderflow Proxy) ditampilkan langsung pada UI untuk menjaga integritas institusional.

Rekomendasi Prioritas Selanjutnya:
Dari daftar di atas, mana yang ingin kita hidupkan terlebih dahulu?

Payment Gateway / Otomatisasi Langganan (Misal: Integrasi Midtrans / Xendit / QRIS agar user bayar langsung aktif VIP tanpa admin manual)?
Bot Telegram Broadcast Otomatis (Agar sinyal yang di-publish admin langsung terkirim otomatis ke Channel Telegram)?
Webhook TradingView Ingestion (Bisa push sinyal otomatis dari alert bot TradingView)?
Penyimpanan Permanen Model Hyperparameters ke Database?