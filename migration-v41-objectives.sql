-- Migration v41: Add funding objectives to projects
-- Run in Supabase SQL Editor

-- 1. Add objectives column (array of text strings)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS objectives JSONB DEFAULT '[]';

-- 2. Add funding_brief column (for pasted text from funder docs)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS funding_brief TEXT DEFAULT '';
