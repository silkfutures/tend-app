-- Migration: Add start_time to sessions
-- Run this in Supabase SQL Editor

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS start_time TEXT DEFAULT '';

-- Update the sessions_full view to include start_time
CREATE OR REPLACE VIEW sessions_full AS
SELECT
  s.*,
  m.name AS mentor_name,
  m.role AS mentor_role,
  yp.name AS young_person_name
FROM sessions s
JOIN mentors m ON s.mentor_id = m.id
JOIN young_people yp ON s.young_person_id = yp.id;
