-- Email log table to track all automated emails sent
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_type TEXT NOT NULL, -- 'weekly_admin', 'fortnightly_mentor', 'reminder', 'safeguarding', etc
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  metadata JSONB, -- Additional context (mentor_id, date_range, sessions included, etc)
  sent_successfully BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Index for querying by type and date
CREATE INDEX IF NOT EXISTS idx_email_log_type_date ON email_log(email_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log(recipient_email, created_at DESC);

-- Add RLS policies
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Admin can see all email logs
CREATE POLICY "email_log_admin_all" ON email_log FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM mentors WHERE mentors.id = auth.uid() AND mentors.role = 'admin'
  ));

-- Mentors can see their own emails
CREATE POLICY "email_log_mentor_own" ON email_log FOR SELECT TO authenticated
  USING (
    recipient_email = (SELECT email FROM mentors WHERE id = auth.uid())
  );
