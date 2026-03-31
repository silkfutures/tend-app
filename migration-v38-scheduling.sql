-- Migration: Scheduling system + mentor email field
-- Run in Supabase SQL Editor

-- Add email to mentors (for future monthly reports)
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';

-- Recurring schedule: which mentor sees which YP on which day
CREATE TABLE IF NOT EXISTS session_schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES mentors(id),
  young_person_id UUID NOT NULL REFERENCES young_people(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...6=Saturday
  start_time TEXT NOT NULL DEFAULT '14:00',
  session_length TEXT NOT NULL DEFAULT '1 Hour',
  location TEXT NOT NULL DEFAULT 'SilkFutures',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_mentor ON session_schedule(mentor_id);
CREATE INDEX IF NOT EXISTS idx_schedule_active ON session_schedule(is_active);

-- Schedule overrides: cancel or reschedule specific dates
CREATE TABLE IF NOT EXISTS schedule_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES session_schedule(id) ON DELETE CASCADE,
  original_date DATE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('cancel', 'reschedule')),
  new_date DATE,
  new_time TEXT,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- View with names
CREATE OR REPLACE VIEW schedule_full AS
SELECT
  ss.*,
  m.name AS mentor_name,
  yp.name AS young_person_name
FROM session_schedule ss
JOIN mentors m ON ss.mentor_id = m.id
JOIN young_people yp ON ss.young_person_id = yp.id;

-- Monthly report snapshots (stores generated reports)
CREATE TABLE IF NOT EXISTS monthly_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID REFERENCES mentors(id),
  report_type TEXT NOT NULL CHECK (report_type IN ('admin', 'mentor')),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_mentor ON monthly_reports(mentor_id);
CREATE INDEX IF NOT EXISTS idx_reports_month ON monthly_reports(year, month);
