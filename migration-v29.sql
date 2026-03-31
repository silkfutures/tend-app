-- =============================================
-- Pathways v29 Migration  
-- Paste this into Supabase SQL Editor and click RUN
-- Safe to run multiple times
-- =============================================

-- Add soft-delete column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions(deleted_at);

-- Done! That's it. Deploy v29 code after running this.
