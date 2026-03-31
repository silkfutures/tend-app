-- ============================================================
-- Migration v47: Non-Mentor Admin Role
-- Adds is_mentor field to distinguish admins who mentor from those who don't
-- ============================================================

-- Add is_mentor column (defaults to true for existing users)
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS is_mentor BOOLEAN NOT NULL DEFAULT true;

-- Comment explaining the field
COMMENT ON COLUMN mentors.is_mentor IS 'Whether this user delivers mentoring sessions. Admins who don''t mentor (e.g., directors) should have this set to false.';

-- Example: To set Toni as non-mentor admin:
-- UPDATE mentors SET is_mentor = false WHERE name = 'Toni';
