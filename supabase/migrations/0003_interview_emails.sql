create table if not exists interview_emails (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references interviews(id) on delete cascade not null,
  sent_to text not null,
  subject text,
  sent_at timestamptz not null default now()
);

alter table interview_emails enable row level security;

create policy "Admin full access on interview_emails"
  on interview_emails for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
