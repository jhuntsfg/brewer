alter table agent_schedules add column if not exists timezone text not null default 'America/New_York';
