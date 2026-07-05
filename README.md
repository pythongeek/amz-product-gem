# Amazon FBA AI Research Platform 🇧🇩

> AI-powered Amazon FBA product research tool for Bangladeshi entrepreneurs — Full V2.0
> সম্পূর্ণ বাংলায় Amazon FBA প্রোডাক্ট রিসার্চ প্ল্যাটফর্ম

## ✨ Features (সকল মডিউল)

| Module | Feature |
|--------|---------|
| 🔐 **Auth** | GitHub + Google OAuth via Supabase Auth |
| 🔍 **Research** | AI-powered product analysis with Kimi API |
| 📊 **Scoring** | 13-point validation checklist (2026 standards) |
| 🧮 **Calculator** | FBA fulfillment calculator with 2026 rates |
| 🚀 **Launch** | Day 0-90 launch strategy generator |
| 📄 **Reports** | Bangla research report with HTML export |
| 🔔 **Alerts** | Product monitoring with cron-jobs.org |
| 📦 **Vault** | Saved products dashboard with folders |

## 🛠 Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Hono + tRPC 11 + Drizzle ORM
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (GitHub + Google)
- **AI**: Kimi API (Moonshot) for Bangla content generation
- **Cron**: cron-jobs.org for scheduled monitoring
- **Hosting**: Vercel (serverless)

## 📋 Prerequisites

1. [Supabase](https://supabase.com) account — Free PostgreSQL database
2. [Kimi AI](https://platform.moonshot.cn) API key — For Bangla AI analysis
3. [Vercel](https://vercel.com) account — For deployment
4. [cron-jobs.org](https://cron-job.org) account — For monitoring (optional)

## 🚀 Deployment Guide

### Step 1: Supabase Setup

1. Create a new Supabase project
2. Go to **Project Settings → API** and copy:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY` (under Project Settings → Database → Service role secret)
3. Go to **Authentication → Providers** and enable:
   - GitHub OAuth (add your GitHub OAuth app credentials)
   - Google OAuth (add your Google OAuth app credentials)
4. Get the PostgreSQL connection string from **Project Settings → Database → Connection string**

### Step 2: Kimi AI API Key

1. Go to [Moonshot Platform](https://platform.moonshot.cn)
2. Create an account and generate an API key
3. Copy the API key for `KIMI_API_KEY`

### Step 3: Deploy to Vercel

#### Option A: One-Click Deploy (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Connect your GitHub repository
2. Add the following environment variables in Vercel:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# Kimi AI
KIMI_API_KEY=your-kimi-api-key
KIMI_BASE_URL=https://api.moonshot.cn/v1

# Security
JWT_SECRET=your-random-secret-key-min-32-chars
CRON_SECRET=your-cron-secret-for-cron-jobs-org

# Frontend (also needed)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Deploy!

#### Option B: Manual Deploy

```bash
# 1. Clone and install
git clone <your-repo>
cd amazon-fba-ai-research
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Push database schema
npm run db:push

# 4. Build
npm run build

# 5. Deploy to Vercel
vercel --prod
```

### Step 4: Cron Job Setup (Optional)

For product monitoring alerts:

1. Go to [cron-jobs.org](https://cron-job.org)
2. Create a new cron job
3. Set URL: `https://your-app.vercel.app/api/cron/monitor`
4. Method: `POST`
5. Header: `x-cron-secret: YOUR_CRON_SECRET`
6. Schedule: Every 6 hours (or your preference)

### Step 5: Database Schema Push

```bash
# Push schema to Supabase
npm run db:push
```

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase service role key |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `KIMI_API_KEY` | ✅ | Moonshot Kimi API key |
| `KIMI_BASE_URL` | ✅ | Kimi API base URL |
| `JWT_SECRET` | ✅ | Random secret for JWT |
| `CRON_SECRET` | ⚪ | Secret for cron job authentication |
| `VITE_SUPABASE_URL` | ✅ | Same as SUPABASE_URL (for frontend) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Same as SUPABASE_ANON_KEY (for frontend) |

## 🏗 Project Structure

```
├── api/                    # Backend (Hono + tRPC)
│   ├── routers/            # tRPC routers
│   ├── lib/                # Utilities (Kimi, Supabase)
│   └── boot.ts             # Server entry
├── db/
│   └── schema.ts           # Database schema
├── src/
│   ├── pages/              # All pages (Bangla UI)
│   ├── components/         # Layout, UI components
│   └── hooks/              # useAuth, etc.
└── contracts/              # Shared types
```

## 🌐 All UI in Bangla

Every user-facing text is in clear, correct Bangla:
- ড্যাশবোর্ড (Dashboard)
- প্রোডাক্ট রিসার্চ (Product Research)
- FBA ক্যালকুলেটর (FBA Calculator)
- লঞ্চ স্ট্র্যাটেজি (Launch Strategy)
- বাংলা রিপোর্ট (Bangla Reports)
- অ্যালার্টস (Alerts)
- সেটিংস (Settings)

## 📄 License

MIT License — Built for Bangladeshi Entrepreneurs 🇧🇩
