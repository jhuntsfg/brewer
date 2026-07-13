create table if not exists agent_schedules (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Sun, 1=Mon … 6=Sat
  start_time time not null,
  end_time time not null,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint end_after_start check (end_time > start_time)
);

create index if not exists agent_schedules_agent_id_idx on agent_schedules(agent_id);
