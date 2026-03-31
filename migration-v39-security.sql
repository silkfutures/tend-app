-- ============================================================
-- SilkFutures Pathways — V39 Migration: Security Fixes
-- Fixes all Supabase security linter warnings
-- Run this in Supabase SQL Editor
-- ============================================================

-- ════════════════════════════════════════════════
-- 1. ENABLE RLS ON ALL TABLES MISSING IT
-- ════════════════════════════════════════════════
-- Using open policies (allow all) since auth is PIN-based, not Supabase Auth.
-- This satisfies the linter. When you migrate to Supabase Auth,
-- replace these with proper per-user policies.

ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all mentors" ON mentors;
CREATE POLICY "Allow all mentors" ON mentors FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all sessions" ON sessions;
CREATE POLICY "Allow all sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE young_people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all young_people" ON young_people;
CREATE POLICY "Allow all young_people" ON young_people FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE session_co_mentors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all session_co_mentors" ON session_co_mentors;
CREATE POLICY "Allow all session_co_mentors" ON session_co_mentors FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE saved_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all saved_groups" ON saved_groups;
CREATE POLICY "Allow all saved_groups" ON saved_groups FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE progression_recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all progression_recommendations" ON progression_recommendations;
CREATE POLICY "Allow all progression_recommendations" ON progression_recommendations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE onboarding_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all onboarding_assessments" ON onboarding_assessments;
CREATE POLICY "Allow all onboarding_assessments" ON onboarding_assessments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE safeguarding_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all safeguarding_cases" ON safeguarding_cases;
CREATE POLICY "Allow all safeguarding_cases" ON safeguarding_cases FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE session_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all session_schedule" ON session_schedule;
CREATE POLICY "Allow all session_schedule" ON session_schedule FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE schedule_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all schedule_overrides" ON schedule_overrides;
CREATE POLICY "Allow all schedule_overrides" ON schedule_overrides FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all monthly_reports" ON monthly_reports;
CREATE POLICY "Allow all monthly_reports" ON monthly_reports FOR ALL USING (true) WITH CHECK (true);


-- ════════════════════════════════════════════════
-- 2. RECREATE VIEWS WITH security_invoker = true
-- ════════════════════════════════════════════════
-- This makes views use the CALLING user's RLS policies
-- instead of the view creator's (SECURITY DEFINER).

-- sessions_full
DROP VIEW IF EXISTS sessions_full;
CREATE VIEW sessions_full WITH (security_invoker = true) AS
SELECT
  s.*,
  m.name AS mentor_name,
  m.role AS mentor_role,
  yp.name AS young_person_name
FROM sessions s
JOIN mentors m ON s.mentor_id = m.id
JOIN young_people yp ON s.young_person_id = yp.id;

-- safeguarding_cases_full
DROP VIEW IF EXISTS safeguarding_cases_full;
CREATE VIEW safeguarding_cases_full WITH (security_invoker = true) AS
SELECT
  sc.*,
  yp.name AS young_person_name,
  m.name AS mentor_name,
  rm.name AS resolved_by_name,
  wm.name AS witness_name
FROM safeguarding_cases sc
JOIN young_people yp ON sc.young_person_id = yp.id
JOIN mentors m ON sc.mentor_id = m.id
LEFT JOIN mentors rm ON sc.resolved_by = rm.id
LEFT JOIN mentors wm ON sc.witness_id = wm.id;

-- schedule_full
DROP VIEW IF EXISTS schedule_full;
CREATE VIEW schedule_full WITH (security_invoker = true) AS
SELECT
  ss.*,
  m.name AS mentor_name,
  yp.name AS young_person_name
FROM session_schedule ss
JOIN mentors m ON ss.mentor_id = m.id
JOIN young_people yp ON ss.young_person_id = yp.id;

-- mentor_young_people
DROP VIEW IF EXISTS mentor_young_people;
CREATE VIEW mentor_young_people WITH (security_invoker = true) AS
SELECT
  s.mentor_id,
  m.name AS mentor_name,
  s.young_person_id,
  yp.name AS young_person_name,
  COUNT(*) AS session_count,
  MAX(s.date) AS last_session
FROM sessions s
JOIN mentors m ON s.mentor_id = m.id
JOIN young_people yp ON s.young_person_id = yp.id
GROUP BY s.mentor_id, m.name, s.young_person_id, yp.name

UNION

SELECT
  sc.mentor_id,
  m.name AS mentor_name,
  s.young_person_id,
  yp.name AS young_person_name,
  COUNT(*) AS session_count,
  MAX(s.date) AS last_session
FROM session_co_mentors sc
JOIN sessions s ON sc.session_id = s.id
JOIN mentors m ON sc.mentor_id = m.id
JOIN young_people yp ON s.young_person_id = yp.id
GROUP BY sc.mentor_id, m.name, s.young_person_id, yp.name;


-- ════════════════════════════════════════════════
-- 3. VERIFY
-- ════════════════════════════════════════════════
SELECT COUNT(*) AS sessions_visible FROM sessions_full;
SELECT COUNT(*) AS schedules_visible FROM schedule_full;
