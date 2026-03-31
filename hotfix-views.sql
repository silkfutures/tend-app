-- Hotfix: Make session_id nullable in safeguarding_cases (cases from Log Session don't have a single session_id)
ALTER TABLE safeguarding_cases ALTER COLUMN session_id DROP NOT NULL;

-- Rebuild sessions_full view (in case it was dropped and not recreated)
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

-- Rebuild safeguarding_cases_full view
DROP VIEW IF EXISTS safeguarding_cases_full;
CREATE VIEW safeguarding_cases_full AS
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

-- Verify sessions are visible
SELECT COUNT(*) AS total_sessions FROM sessions_full;
