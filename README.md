# NeatHealer — Self-Healing Website Control Center

AI-powered, multi-tenant SaaS that monitors websites in real-time, auto-repairs incidents using four AI providers (OpenAI, Claude, DeepSeek, Gemini), and stays stable 24/7 — powered by **Next.js + Supabase**.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Supabase Setup](#supabase-setup)
3. [Environment Variables](#environment-variables)
4. [Database Migration](#database-migration)
5. [Edge Functions](#edge-functions)
6. [Local Development](#local-development)
7. [Deploy to Vercel](#deploy-to-vercel)
8. [Plans & Quotas](#plans--quotas)
9. [Chaos Engineering](#chaos-engineering)

---

## Architecture

```
Browser / Mobile
    │
    ▼
Next.js (Vercel)  ──►  Supabase Auth + PostgreSQL (RLS)
    │                       │
    ▼                       ▼
API Routes              pg_cron (every 30s)
                            │
                            ▼
                  Edge Function: orchestrate
                    ├── health checks (HEAD requests)
                    ├── AI decision (OpenAI/Claude/DeepSeek/Gemini)
                    └── INSERT pending_actions
                                │
                           SQL trigger
                                │
                                ▼
                  Edge Function: process-action
                    ├── repair / restart / rollback / kill
                    ├── sla_metrics update
                    └── Slack / email / webhook notification
```

---

## Supabase Setup

### 1. Create a project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Note your **Project URL** and **API keys** (Settings → API).

### 2. Enable required extensions & configure settings

Open the **SQL Editor** in the Supabase dashboard and run:

```sql
-- Configure app settings (replace with your actual values)
ALTER DATABASE postgres SET app.supabase_url    = 'https://YOUR_REF.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pg_net"  SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" SCHEMA cron;
```

> **Note**: `pg_cron` is available on the **Pro plan** and above. On the Free plan, use a [Vercel Cron Job](https://vercel.com/docs/cron-jobs) calling `POST /api/orchestrate` (add a simple proxy route that forwards to the Edge Function).

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `ENCRYPTION_KEY` | 64-char hex string (32 bytes) for AES-256-GCM |
| `NEXT_PUBLIC_APP_URL` | Your production URL (e.g. `https://neathealer.app`) |
| `RESEND_API_KEY` | Resend.com API key for email notifications |
| `SUPER_ADMIN_EMAIL` | Email of the super-admin who can access `/admin` |
| `ENABLE_CHAOS_MODE` | `true` only in staging — enables fault injection |

**Generate the encryption key:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Migration

In the Supabase SQL Editor, paste and run the contents of:

```
supabase/migrations/001_init.sql
```

This creates all tables, RLS policies, triggers, functions, and pg_cron schedules.

---

## Edge Functions

Deploy all three Edge Functions via the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy orchestrate
supabase functions deploy process-action
supabase functions deploy process-batch-import
```

Set Edge Function secrets:

```bash
supabase secrets set ENCRYPTION_KEY=your_64_char_hex
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set ENABLE_CHAOS_MODE=false

# Optional global AI fallback keys
supabase secrets set GLOBAL_OPENAI_KEY=sk-...
supabase secrets set GLOBAL_CLAUDE_KEY=sk-ant-...
```

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env
cp .env.example .env.local
# Fill in .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repo in [vercel.com](https://vercel.com).
3. Add all environment variables from `.env.example`.
4. Deploy.

Vercel automatically runs `npm run build`. The app will be live at your Vercel URL.

---

## Plans & Quotas

| Plan | Sites | Price |
|------|-------|-------|
| Basic | 1 | Free |
| Premium | 3 | $19/mo |
| Enterprise | 10 | $49/mo |
| Unlimited | ∞ | Custom |
| Custom | n | Set via Admin panel |

The SQL trigger `enforce_site_limit` blocks inserts when the limit is reached — no application-level bypass is possible.

---

## Chaos Engineering

Chaos mode injects random failures (~10% probability per cycle) to test the auto-repair pipeline. **Enable only in staging:**

```bash
supabase secrets set ENABLE_CHAOS_MODE=true
```

Or set `ENABLE_CHAOS_MODE=true` in `.env.local` for local testing. A banner will appear in the dashboard when active.

---

## Guards Summary

| Guard | Implementation |
|-------|---------------|
| **ActionGuard** | Max 3 actions/min per module, tracked in `modules.action_count_minute` |
| **LoopDetector** | Tracks `consecutive_failures` per module |
| **CircuitBreaker** | Opens for 60s after 3 consecutive failures (`circuit_open_until`) |
| **Timeout** | 10s per HTTP health check (`AbortSignal.timeout`) |
| **StateGuard** | `previous_config` backed up before every config change |
