-- Migration: Safeguarding case management
-- Run this in Supabase SQL Editor

-- Safeguarding cases — one per flagged session, tracks resolution
CREATE TABLE IF NOT EXISTS safeguarding_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id),
  young_person_id UUID NOT NULL REFERENCES young_people(id),
  mentor_id UUID NOT NULL REFERENCES mentors(id),
  date DATE NOT NULL,
  concern TEXT NOT NULL DEFAULT '',
  session_notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  resolved_by UUID REFERENCES mentors(id),
  witness_id UUID REFERENCES mentors(id),
  action_taken TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sg_cases_status ON safeguarding_cases(status);
CREATE INDEX IF NOT EXISTS idx_sg_cases_yp ON safeguarding_cases(young_person_id);

-- View with names resolved
CREATE OR REPLACE VIEW safeguarding_cases_full AS
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
