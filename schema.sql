-- ═══════════════════════════════════════
-- TEND — Supabase Schema
-- Run this entire file in the SQL Editor
-- ═══════════════════════════════════════

-- Organisations
create table if not exists organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Mentors (linked to Supabase auth.users)
create table if not exists mentors (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  org_id uuid references organisations(id) on delete cascade,
  role text not null default 'mentor', -- 'admin' or 'mentor'
  created_at timestamptz default now()
);

-- Young people
create table if not exists young_people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id) on delete cascade,
  name text not null,
  dob date,
  phone text,
  email text,
  postcode text,
  created_at timestamptz default now()
);

-- Sessions
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id) on delete cascade,
  young_person_id uuid references young_people(id) on delete cascade,
  mentor_id uuid references mentors(id),
  date date not null default current_date,
  focus_step text default 'Reset',
  arrival_score int,
  notes text,
  ai_summary text,
  indicators jsonb default '{}',
  safeguarding_concern text,
  created_at timestamptz default now()
);

-- Safeguarding cases
create table if not exists safeguarding_cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organisations(id) on delete cascade,
  young_person_id uuid references young_people(id),
  session_id uuid references sessions(id),
  reported_by uuid references mentors(id),
  concern text,
  status text default 'open', -- 'open' or 'resolved'
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════

alter table organisations enable row level security;
alter table mentors enable row level security;
alter table young_people enable row level security;
alter table sessions enable row level security;
alter table safeguarding_cases enable row level security;

-- Service role bypasses RLS (used by API routes)
-- These policies allow the anon key to read/write
-- since we control access via the API layer

create policy "Service role full access to organisations"
  on organisations for all using (true);

create policy "Service role full access to mentors"
  on mentors for all using (true);

create policy "Service role full access to young_people"
  on young_people for all using (true);

create policy "Service role full access to sessions"
  on sessions for all using (true);

create policy "Service role full access to safeguarding_cases"
  on safeguarding_cases for all using (true);

-- ═══════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════

create index if not exists idx_mentors_org on mentors(org_id);
create index if not exists idx_young_people_org on young_people(org_id);
create index if not exists idx_sessions_org on sessions(org_id);
create index if not exists idx_sessions_yp on sessions(young_person_id);
create index if not exists idx_sessions_date on sessions(date desc);
create index if not exists idx_sg_cases_org on safeguarding_cases(org_id);
