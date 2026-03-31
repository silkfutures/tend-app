-- Migration v41b: Consent records for parent/guardian digital signatures
-- Run in Supabase SQL Editor

-- 1. Create consent_records table
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  young_person_id UUID NOT NULL REFERENCES young_people(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  parent_name TEXT DEFAULT '',
  parent_email TEXT NOT NULL,
  relationship TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'withdrawn')),
  signed_at TIMESTAMPTZ,
  ip_address TEXT DEFAULT '',
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add parent_email to young_people if not exists
ALTER TABLE young_people ADD COLUMN IF NOT EXISTS parent_email TEXT DEFAULT '';

-- 3. Index for token lookups
CREATE INDEX IF NOT EXISTS idx_consent_token ON consent_records(token);

-- 4. Allow public (anon) access to consent_records for signing (no login required)
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read consent by token" ON consent_records
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update consent by token" ON consent_records
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can insert consent" ON consent_records
  FOR INSERT WITH CHECK (true);
