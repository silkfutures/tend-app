-- Migration v42: Add parent/guardian detail fields to young_people
-- Run this in Supabase SQL Editor

ALTER TABLE young_people ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE young_people ADD COLUMN IF NOT EXISTS parent_relationship TEXT;
ALTER TABLE young_people ADD COLUMN IF NOT EXISTS parent_phone TEXT;
