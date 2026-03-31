-- ============================================================
-- SilkFutures Pathways — V31 Migration: Access Control & Visibility Tiers
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add sensitive_notes column to sessions
-- This field is ONLY visible to directors (admin role).
-- Mentors writing session notes can optionally put sensitive content here
-- instead of in the main notes field.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sensitive_notes TEXT DEFAULT '';

-- 2. Add visibility field to sessions
-- 'all' = visible to all mentors (default, backwards compatible)
-- 'director' = only visible to admin users
-- For now we default everything to 'all' so existing sessions aren't hidden
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'all'
  CHECK (visibility IN ('all', 'director'));

-- 3. Add a cached AI summary field for mentor-safe session summaries
-- This stores a pre-generated summary that mentors can see instead of full notes
-- from other mentors' sessions. NULL means not yet generated.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mentor_summary TEXT DEFAULT NULL;

-- 4. Update the sessions_full view to include the new columns
CREATE OR REPLACE VIEW sessions_full AS
SELECT
  s.*,
  m.name AS mentor_name,
  m.role AS mentor_role,
  yp.name AS young_person_name
FROM sessions s
JOIN mentors m ON s.mentor_id = m.id
JOIN young_people yp ON s.young_person_id = yp.id;

-- 5. Ensure Nathan and Toni are admin (safety net — should already be set)
UPDATE mentors SET role = 'admin' WHERE name IN ('Nathan', 'Toni') AND role != 'admin';

-- 6. Add Rhianna and Eva to mentors if not already there
INSERT INTO mentors (name, pin, role) VALUES
  ('Rhianna', '1234', 'mentor'),
  ('Eva', '1234', 'mentor')
ON CONFLICT (name) DO NOTHING;

-- Done. No data loss — all existing sessions remain visible to everyone
-- until mentors start using the sensitive_notes field or directors
-- mark sessions as director-only.
