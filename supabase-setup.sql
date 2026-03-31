-- ============================================================
-- SilkFutures Pathways — Database Setup
-- Run this ONCE in Supabase SQL Editor (safe to re-run)
-- ============================================================

-- MENTORS TABLE
-- No pre-assigned mentees. Access is derived from session history.
CREATE TABLE IF NOT EXISTS mentors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL DEFAULT '1234',
  role TEXT NOT NULL DEFAULT 'mentor' CHECK (role IN ('admin', 'mentor')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- YOUNG PEOPLE TABLE
CREATE TABLE IF NOT EXISTS young_people (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- SESSIONS TABLE
-- Core session log. Links mentor to young person.
-- For group sessions, one row per young person per session.
-- group_id ties group session rows together.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES mentors(id),
  young_person_id UUID NOT NULL REFERENCES young_people(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  focus_step TEXT NOT NULL CHECK (focus_step IN ('Reset','Reframe','Rebuild','Release','Rise')),
  session_length TEXT NOT NULL DEFAULT '1 Hour',
  partner_org TEXT NOT NULL DEFAULT 'SilkFutures',
  is_group BOOLEAN NOT NULL DEFAULT false,
  group_id UUID,  -- shared across rows for the same group session
  scores JSONB DEFAULT '{}',
  quick JSONB DEFAULT '{}',
  step_averages JSONB DEFAULT '{}',
  notes TEXT DEFAULT '',
  mentor_reflection TEXT DEFAULT '',
  safeguarding TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- CO-MENTORS TABLE (for group sessions)
-- If Isaak and Benjamin co-run a group session, both get visibility.
CREATE TABLE IF NOT EXISTS session_co_mentors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentors(id),
  UNIQUE(session_id, mentor_id)
);

-- SAVED GROUPS TABLE
-- Reusable group templates so mentors can quickly load a group.
-- member_ids is a JSON array of young_people UUIDs.
CREATE TABLE IF NOT EXISTS saved_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  member_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- PROGRESSION RECOMMENDATIONS
-- Mentor recommends a young person to progress. Admin approves/declines.
CREATE TABLE IF NOT EXISTS progression_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  young_person_id UUID NOT NULL REFERENCES young_people(id),
  mentor_id UUID NOT NULL REFERENCES mentors(id),
  from_stage TEXT NOT NULL,
  to_stage TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  reviewed_by UUID REFERENCES mentors(id),
  review_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- ONBOARDING ASSESSMENTS
-- Initial intake assessment for new young people.
-- Responses map covertly to pathway stages to set a baseline.
CREATE TABLE IF NOT EXISTS onboarding_assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  young_person_id UUID NOT NULL REFERENCES young_people(id),
  mentor_id UUID NOT NULL REFERENCES mentors(id),
  responses JSONB NOT NULL DEFAULT '{}',
  suggested_stage TEXT NOT NULL DEFAULT 'Reset',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progression_yp ON progression_recommendations(young_person_id);
CREATE INDEX IF NOT EXISTS idx_progression_status ON progression_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_yp ON onboarding_assessments(young_person_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_sessions_mentor ON sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_yp ON sessions(young_person_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_group ON sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_co_mentors_mentor ON session_co_mentors(mentor_id);

-- YP FEEDBACK TABLE
-- Optional post-session feedback from the young person's perspective.
CREATE TABLE IF NOT EXISTS yp_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  young_person_id UUID NOT NULL REFERENCES young_people(id),
  responses JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yp_feedback_session ON yp_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_yp_feedback_yp ON yp_feedback(young_person_id);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Mentors (your actual team)
INSERT INTO mentors (name, pin, role) VALUES
  ('Nathan', '1234', 'admin'),
  ('Toni', '1234', 'admin'),
  ('Benjamin', '1234', 'mentor'),
  ('Kaylum', '1234', 'mentor'),
  ('Isaak', '1234', 'mentor')
ON CONFLICT (name) DO NOTHING;

-- Young people from your existing sessions
INSERT INTO young_people (name) VALUES
  ('Trevae'), ('Malachi'), ('Marcellus'), ('Mckai'), ('Davide'), ('Benny')
ON CONFLICT (name) DO NOTHING;

-- Seed sessions (Nathan's existing data)
DO $$
DECLARE
  nathan_id UUID;
  trevae_id UUID;
  malachi_id UUID;
  marcellus_id UUID;
  mckai_id UUID;
BEGIN
  SELECT id INTO nathan_id FROM mentors WHERE name = 'Nathan';
  SELECT id INTO trevae_id FROM young_people WHERE name = 'Trevae';
  SELECT id INTO malachi_id FROM young_people WHERE name = 'Malachi';
  SELECT id INTO marcellus_id FROM young_people WHERE name = 'Marcellus';
  SELECT id INTO mckai_id FROM young_people WHERE name = 'Mckai';

  -- Only insert if sessions table is empty (first run)
  IF NOT EXISTS (SELECT 1 FROM sessions LIMIT 1) THEN

    INSERT INTO sessions (mentor_id, young_person_id, date, focus_step, session_length, partner_org, scores, quick, step_averages, notes, mentor_reflection, safeguarding) VALUES
    (
      nathan_id, trevae_id, '2026-03-10', 'Reset', '1 Hour', 'SilkFutures',
      '{"Reset_0":2,"Reset_1":2,"Reset_2":3,"Reset_3":2,"Reset_4":2}',
      '{"regulation":3,"engagement":2,"overall":3,"confidence":2,"relationalConnection":3,"adaptedAgenda":4}',
      '{"Reset":"2.2"}',
      'First session back after a month of distance. Followed his lead — he was watching for fish at the bay. No structure, no pressure. He visibly relaxed. By the end he invited me fishing next week — an invitation back into his world on his terms.',
      'The biggest win was catching and releasing the internal agenda in real time. Chose to follow rather than redirect.',
      ''
    ),
    (
      nathan_id, malachi_id, '2026-03-10', 'Reframe', '1 Hour', 'SilkFutures',
      '{"Reframe_0":3,"Reframe_1":3,"Reframe_2":3,"Reframe_3":2,"Reset_0":3,"Reset_1":3,"Reset_2":3}',
      '{"regulation":3,"engagement":4,"overall":4,"confidence":3,"relationalConnection":4,"adaptedAgenda":2}',
      '{"Reset":"3.0","Reframe":"2.8"}',
      'Came in unsure about a line from last time. Instead of scrapping it we went back in together and fixed it — then opened into three quarters of a new song. Pulse Cards: nan passing, court case stress but cautious optimism, song title Same Shit Different Day, named Asha (loyalty, met in care) as who deserves a song.',
      'Going back into the old work rather than ditching it was the right move. Showed him creative doubt doesn''t mean starting over.',
      'Active court case — stress acknowledged but cautious optimism. Recent bereavement (nan). Both on the radar.'
    ),
    (
      nathan_id, marcellus_id, '2026-03-10', 'Reframe', '1 Hour', 'SilkFutures',
      '{"Reframe_0":4,"Reframe_1":3,"Reframe_2":3,"Reframe_3":3,"Reset_0":4,"Reset_1":3,"Reset_2":4}',
      '{"regulation":4,"engagement":4,"overall":4,"confidence":4,"relationalConnection":4,"adaptedAgenda":2}',
      '{"Reset":"3.7","Reframe":"3.3"}',
      'Brought up sensitivity — mum''s illness weighing on him, dad shouting more at home. Said he wishes he wasn''t so sensitive. Opened a conversation about sensitivity as the foundation of leadership. Built a whole track from scratch — asked me to send it to him. That felt like pride.',
      'The arc today: came in feeling like sensitivity was something to fix, left having made something from scratch he wanted to keep.',
      'Mum''s illness ongoing and significant. Dad''s stress response (shouting more) noted. Marcellus carrying emotional load at home. Worth monitoring.'
    ),
    (
      nathan_id, mckai_id, '2026-03-10', 'Reset', '1 Hour', 'SilkFutures',
      '{"Reset_0":3,"Reset_1":2,"Reset_2":3,"Reset_3":3,"Reset_4":2}',
      '{"regulation":3,"engagement":3,"overall":3,"confidence":3,"relationalConnection":3,"adaptedAgenda":3}',
      '{"Reset":"2.6"}',
      'Arrived tired. Played kalimba and hand drum together instead of going straight to screens. Pulse Cards: song title Hard. Named Marcellus as who deserves a song — because his mum is ill. It would say: it''s gonna be ok.',
      'Mckai named Hard and then immediately wrote a song for someone else going through something difficult. That''s empathy that doesn''t announce itself.',
      'Sleep quality is a real issue — uncomfortable bed, shared room, fell off bed. Worth flagging for pastoral support.'
    );

  END IF;
END $$;

-- ============================================================
-- VIEWS (for easy querying)
-- ============================================================

-- View: sessions with mentor and young person names joined
CREATE OR REPLACE VIEW sessions_full AS
SELECT
  s.*,
  m.name AS mentor_name,
  m.role AS mentor_role,
  yp.name AS young_person_name
FROM sessions s
JOIN mentors m ON s.mentor_id = m.id
JOIN young_people yp ON s.young_person_id = yp.id;

-- View: which mentors have worked with which young people
-- This is what controls mentor access — no pre-assignment needed.
CREATE OR REPLACE VIEW mentor_young_people AS
SELECT DISTINCT
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

SELECT DISTINCT
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

-- RLS for yp_feedback (allow all for now — tighten with auth later)
ALTER TABLE yp_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to yp_feedback" ON yp_feedback FOR ALL USING (true) WITH CHECK (true);
