# NeedPips SSYCH Terminal

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.3-20232a?style=for-the-badge&logo=react&logoColor=61dafb" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TradingView-Webhook_Ready-2962FF?style=for-the-badge&logo=tradingview&logoColor=white" alt="TradingView" />
</p>

An institutional-grade market telemetry and algorithmic signal terminal tailored for high-frequency commodities (XAU/USD) and multi-asset intelligence. Features real-time liquidity profiling, automated webhook ingestion, dynamic affiliate tiers, and low-latency execution journaling.

---

## Key Modules

- **Live Market Telemetry & Liquidity Matrix**  
  Real-time order book depth decomposition, Cumulative Volume Delta (CVD) tracking, and institutional liquidity pool estimation.
- **TradingView Ingestion Engine**  
  Authenticated webhook endpoint with millisecond execution processing, supporting multi-timeframe scalping setups (`M1`, `M5`, `M15`, `H1`, `H4`) and dynamic risk-to-reward ratios.
- **Dynamic Trade Journaling**  
  Automated lifecycle tracking from pending triggers (`Open`) to execution (`Running`), take-profit milestones (`Win`), and stop invalidations (`Loss`).
- **Bilingual Interface (i18n)**  
  Built-in internationalization supporting English (`en`) and Indonesian (`id`) with user preference persistence via Supabase.
- **Affiliate & Subscription Management**  
  Configurable pass tier pricing with real-time commission calculation and synchronized webhook confirmation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Frontend** | React 19, Tailwind CSS v4, Motion, Lucide Icons |
| **Database** | PostgreSQL via Supabase (Connection Pooling) |
| **Integration** | TradingView PineScript Webhooks, Binance Market Data |
| **Email & Auth** | Nodemailer (SMTP), Session Token Gateways |

---

## Project Structure

```text
needpips-ssych/
├── src/
│   ├── app/
│   │   ├── admin/           # Admin desk & system configuration
│   │   ├── affiliate/       # Dynamic commission & referral dashboard
│   │   ├── api/
│   │   │   ├── auth/        # Authentication & profile endpoints
│   │   │   ├── pricing/     # Pass tier price resolution
│   │   │   ├── signals/     # Algorithmic signal feeds
│   │   │   ├── telemetry/   # Real-time institutional flow calculations
│   │   │   └── webhooks/    # TradingView alert ingestion
│   │   ├── history/         # Audit logs & trade performance journal
│   │   ├── news/            # Live economic & market wire feed
│   │   ├── pricing/         # Institutional access tier checkout
│   │   ├── profile/         # User preferences & language switcher
│   │   └── settings/        # Signal studio & risk parameters
│   ├── components/
│   │   ├── layout/          # Navbar, sidebar, header components
│   │   └── ui/              # Charting, tables, cards, telemetry scrubber
│   └── lib/                 # Database clients, i18n store, pricing engines
└── public/                  # Static assets & brand media
```

---

## Getting Started

### 1. Prerequisites
- Node.js `20.x` or later
- npm, pnpm, or bun

### 2. Environment Setup
Copy the example environment file and configure your credentials:

```bash
cp .env.example .env.local
```

Fill in required variables in `.env.local`:
```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

Terminal will be accessible at:
```
http://localhost:3001
```

---

## TradingView Webhook Integration

Configure your TradingView PineScript alerts to send an `HTTP POST` request to:
`https://your-domain.com/api/webhooks/tradingview`

### Sample Alert Payload
```json
{
  "passphrase": "your_admin_api_key",
  "ticker": "XAU-USD",
  "action": "BUY",
  "price": 2652.80,
  "sl": 2645.00,
  "tp1": 2665.00,
  "tp2": 2678.00,
  "timeframe": "M5",
  "confidence": 88,
  "message": "Order Flow Imbalance + Bullish FVG Fill"
}
```

---

## License

Private and proprietary. All rights reserved.
