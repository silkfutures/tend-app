-- =============================================
-- Pathways v30 Migration — Projects & Impact
-- Paste into Supabase SQL Editor and RUN
-- =============================================

-- 1. Projects / Funding Streams
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

-- 2. Locations (managed in settings, referenced by sessions and projects)
CREATE TABLE IF NOT EXISTS locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  area TEXT DEFAULT '',
  address TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default locations from existing partner_orgs
INSERT INTO locations (name, area) VALUES
  ('SilkFutures', 'Cardiff'),
  ('Set Pace', 'Cardiff'),
  ('Grangetown', 'Grangetown'),
  ('Ely', 'Ely'),
  ('Trowbridge', 'Trowbridge')
ON CONFLICT (name) DO NOTHING;

-- 3. Link sessions to projects (optional — a session can belong to a project)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);

-- 4. Done!
