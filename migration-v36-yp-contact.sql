-- Migration: Add contact details to young_people table
-- Run this in Supabase SQL Editor

ALTER TABLE young_people ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE young_people ADD COLUMN IF NOT EXISTS dob TEXT DEFAULT '';
ALTER TABLE young_people ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE young_people ADD COLUMN IF NOT EXISTS postcode TEXT DEFAULT '';

-- Rebuild the sessions_full view (it uses s.* so no change needed, but
-- let's also rebuild safeguarding_cases_full in case it was affected)
DROP VIEW IF EXISTS sessions_full;
CREATE VIEW sessions_full AS
SELECT
  s.*,
  m.name AS mentor_name,
  m.role AS mentor_role,
  yp.name AS young_person_name
FROM sessions s
JOIN mentors m ON s.mentor_id = m.id
JOIN young_people yp ON s.young_person_id = yp.id;
