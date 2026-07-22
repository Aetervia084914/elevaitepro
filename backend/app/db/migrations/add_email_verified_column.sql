-- Add email_verified column to candidates table
-- Default FALSE so existing users are considered unverified until they verify
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
