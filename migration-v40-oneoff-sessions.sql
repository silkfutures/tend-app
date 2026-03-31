-- Migration v40: One-off session support
-- Run in Supabase SQL Editor (one block at a time)

-- 1. Add schedule_type column (defaults to 'recurring' for existing rows)
ALTER TABLE session_schedule
ADD COLUMN IF NOT EXISTS schedule_type TEXT NOT NULL DEFAULT 'recurring'
CHECK (schedule_type IN ('one_off', 'recurring'));

-- 2. Add one_off_date for one-off sessions
ALTER TABLE session_schedule
ADD COLUMN IF NOT EXISTS one_off_date DATE;

-- 3. Update the view to include new columns
CREATE OR REPLACE VIEW schedule_full AS
SELECT
  ss.*,
  m.name AS mentor_name,
  m.email AS mentor_email,
  yp.name AS young_person_name
FROM session_schedule ss
JOIN mentors m ON ss.mentor_id = m.id
JOIN young_people yp ON ss.young_person_id = yp.id;
