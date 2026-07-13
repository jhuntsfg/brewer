# Agent Onboarding Tracker

Full-stack onboarding tracker for insurance agency agents. Next.js (App Router) +
Tailwind CSS + Supabase, built per `AgentOnboardingTracker_ClaudeCodeSpec.docx`.

## Stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4
- Supabase (Postgres + Auth)
- Deploy target: Vercel

## One-time setup

### 1. Database

Run `supabase/migrations/0001_init.sql` once in the Supabase project's **SQL Editor**
(Dashboard → SQL Editor → New query → paste the file → Run). It creates the
`agents`, `agent_checks`, and `agent_dates` tables and enables RLS (admin access
only via authenticated Supabase Auth session; agent token access is mediated by
server-side API routes using the service role key).

### 2. Admin user

In Supabase Dashboard → Authentication → Users → Add user, create the admin
(Chel's) email/password. That's the login used at `/`.

### 3. Environment variables

Copy `.env.example` to `.env.local` for local dev, and add the same three vars
in Vercel → Project Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only — never exposed to the client)

## Local development

```bash
npm install
npm run dev
```

## Deploy

Push to GitHub, then import the repo in Vercel (Project → New → Import Git
Repository), add the three env vars above, and deploy. No build configuration
overrides are needed — it's a standard Next.js app.

## Routes

- `/` — admin login (Supabase Auth email/password)
- `/dashboard` — admin dashboard (protected)
- `/dashboard/[agentId]` — admin agent detail / pipeline / checklist
- `/agent/[token]` — agent self-view, no login required

## Notes

- The 35-step checklist and funnel-stage/stall-detection rules are pure
  functions in `lib/steps.ts`, `lib/funnel.ts`, and `lib/stall.ts` — nothing
  about the step list is stored in the database, only per-agent check state.
- Supabase free tier pauses projects after 7 days of inactivity; this is
  expected per spec.
