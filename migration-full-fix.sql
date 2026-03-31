-- =============================================
-- Pathways FULL FIX Migration
-- Run this in Supabase SQL Editor
-- Fixes: deleted_at, locations, projects, RLS
-- =============================================

-- 1. Add deleted_at column (safe to re-run)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions(deleted_at);

-- 2. Add project_id column (safe to re-run)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS project_id UUID;

-- 3. Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  funder TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  locations JSONB DEFAULT '[]',
  start_date DATE,
  end_date DATE,
  budget TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'planned')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  area TEXT DEFAULT '',
  address TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Seed default locations
INSERT INTO locations (name, area) VALUES
  ('SilkFutures', 'Cardiff'),
  ('Set Pace', 'Cardiff'),
  ('Grangetown', 'Grangetown'),
  ('Ely', 'Ely'),
  ('Trowbridge', 'Trowbridge')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 6. RLS POLICIES — Allow all access
-- This is critical. Without these, Supabase
-- blocks all reads/writes from the anon key.
-- =============================================

-- Sessions RLS (should already exist but ensure it's open)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Projects RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all projects" ON projects FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Locations RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all locations" ON locations FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Mentors RLS
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all mentors" ON mentors FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Young people RLS
ALTER TABLE young_people ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all young_people" ON young_people FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Session co-mentors RLS
ALTER TABLE session_co_mentors ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all session_co_mentors" ON session_co_mentors FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Saved groups RLS
ALTER TABLE saved_groups ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all saved_groups" ON saved_groups FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Progression recommendations RLS
ALTER TABLE progression_recommendations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all progression_recommendations" ON progression_recommendations FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Onboarding assessments RLS
ALTER TABLE onboarding_assessments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Allow all onboarding_assessments" ON onboarding_assessments FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Verify: check deleted_at exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'deleted_at'
  ) THEN
    RAISE EXCEPTION 'deleted_at column was NOT created — check permissions';
  END IF;
END $$;

-- 8. Done! You should see "Success. No rows returned" if everything worked.
