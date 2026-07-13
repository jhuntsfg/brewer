create table if not exists interviewers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table interviewers enable row level security;

create policy "Admin full access on interviewers"
  on interviewers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Seed current team
insert into interviewers (name, email) values
  ('Adam Disney',       'adiz4512@gmail.com'),
  ('Brantley Oxendine', 'brantley05@gmail.com'),
  ('Tyler Brewer',      'breweragency25@gmail.com'),
  ('Brittany Zemek',    'brittany.zemek.sfg@gmail.com'),
  ('Bryan Hunt',        'bryan.hunt.sfg@gmail.com'),
  ('Daniel Steel',      'dannysteelnh@gmail.com'),
  ('Elizabeth Dickey',  'elizabeth.dickey.sfg@gmail.com'),
  ('Erik Schmidt',      'eschmidt.sfg@gmail.com'),
  ('Jordan Hunt',       'jhuntquility@gmail.com'),
  ('Jordan Hunt',       'lcolesfg1@gmail.com'),
  ('Corey Scott',       'lumbeenative2011@gmail.com'),
  ('Monique Parrott',   'm.parrott.sfg@gmail.com')
on conflict (email) do nothing;
