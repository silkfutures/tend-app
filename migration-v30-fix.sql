-- =============================================
-- Pathways v30 FIX — Run this in Supabase SQL Editor
-- Safe to re-run. Fixes: RLS on all tables,
-- deleted_at column, locations seed data.
-- =============================================

-- 1. Add deleted_at column to sessions (safe to re-run)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions(deleted_at);

-- 2. Add project_id column to sessions (safe to re-run)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS project_id UUID;

-- 3. Create projects table (safe to re-run)
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

-- 4. Create locations table (safe to re-run)
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  area TEXT DEFAULT '',
  address TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Seed default locations (safe to re-run)
INSERT INTO locations (name, area) VALUES
  ('SilkFutures', 'Cardiff'),
  ('Set Pace', 'Cardiff'),
  ('Grangetown', 'Grangetown'),
  ('Ely', 'Ely'),
  ('Trowbridge', 'Trowbridge')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 6. RLS POLICIES — Allow all access via anon key
-- This app uses PIN login, not Supabase Auth,
-- so every table needs open RLS.
-- =============================================

-- Sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all sessions" ON sessions;
CREATE POLICY "Allow all sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- Projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all projects" ON projects;
CREATE POLICY "Allow all projects" ON projects FOR ALL USING (true) WITH CHECK (true);

-- Locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all locations" ON locations;
CREATE POLICY "Allow all locations" ON locations FOR ALL USING (true) WITH CHECK (true);

-- Mentors
ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all mentors" ON mentors;
CREATE POLICY "Allow all mentors" ON mentors FOR ALL USING (true) WITH CHECK (true);

-- Young people
ALTER TABLE young_people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all young_people" ON young_people;
CREATE POLICY "Allow all young_people" ON young_people FOR ALL USING (true) WITH CHECK (true);

-- Session co-mentors
ALTER TABLE session_co_mentors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all session_co_mentors" ON session_co_mentors;
CREATE POLICY "Allow all session_co_mentors" ON session_co_mentors FOR ALL USING (true) WITH CHECK (true);

-- Saved groups
ALTER TABLE saved_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all saved_groups" ON saved_groups;
CREATE POLICY "Allow all saved_groups" ON saved_groups FOR ALL USING (true) WITH CHECK (true);

-- Progression recommendations
ALTER TABLE progression_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all progression_recommendations" ON progression_recommendations;
CREATE POLICY "Allow all progression_recommendations" ON progression_recommendations FOR ALL USING (true) WITH CHECK (true);

-- Onboarding assessments
ALTER TABLE onboarding_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all onboarding_assessments" ON onboarding_assessments;
CREATE POLICY "Allow all onboarding_assessments" ON onboarding_assessments FOR ALL USING (true) WITH CHECK (true);

-- YP feedback
ALTER TABLE yp_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to yp_feedback" ON yp_feedback;
DROP POLICY IF EXISTS "Allow all yp_feedback" ON yp_feedback;
CREATE POLICY "Allow all yp_feedback" ON yp_feedback FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- 7. Update the sessions_full view to include deleted_at
-- This ensures getDeletedSessions() can filter by deleted_at
-- =============================================
CREATE OR REPLACE VIEW sessions_full AS
SELECT
  s.*,
  m.name AS mentor_name,
  m.role AS mentor_role,
  yp.name AS young_person_name,
  yp.current_step AS young_person_step
FROM sessions s
LEFT JOIN mentors m ON s.mentor_id = m.id
LEFT JOIN young_people yp ON s.young_person_id = yp.id;

-- =============================================
-- 8. Verify deleted_at exists
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'deleted_at'
  ) THEN
    RAISE EXCEPTION 'deleted_at column was NOT created — check permissions';
  END IF;
END $$;

-- =============================================
-- 9. Done! You should see "Success. No rows returned"
-- =============================================
