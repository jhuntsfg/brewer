-- Agent Onboarding Tracker schema
create extension if not exists "pgcrypto";

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  upline text,
  start_date date not null default current_date,
  type text not null check (type in ('licensed', 'unlicensed')),
  unique_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now()
);

create table if not exists agent_checks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  step_id text not null,
  checked boolean not null default false,
  checked_at timestamptz,
  checked_by text check (checked_by in ('agent', 'admin')),
  unique (agent_id, step_id)
);

create table if not exists agent_dates (
  agent_id uuid primary key references agents(id) on delete cascade,
  exam_date date,
  exam_date_set_at timestamptz,
  contracts_sent_at timestamptz
);

alter table agents enable row level security;
alter table agent_checks enable row level security;
alter table agent_dates enable row level security;

-- Only authenticated admin users may access tables directly via the anon/auth
-- client. Agent (token-based) access is mediated entirely by server-side API
-- routes using the service role key, which bypasses RLS after verifying the
-- token server-side.
create policy "Admin full access on agents"
  on agents for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Admin full access on agent_checks"
  on agent_checks for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Admin full access on agent_dates"
  on agent_dates for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
