create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  interviewee_name text not null,
  phone text,
  email text,
  scheduled_at timestamptz not null,
  owner text not null default '',
  showed boolean,
  hired boolean,
  enrollment_status text check (enrollment_status in ('enrolled', 'pending', 'licensed')),
  notes text,
  source text not null default 'manual' check (source in ('calendly', 'manual')),
  canceled_at timestamptz,
  linked_agent_id uuid references agents(id) on delete set null,
  calendly_event_uri text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table interviews enable row level security;

create policy "Admin full access on interviews"
  on interviews for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
