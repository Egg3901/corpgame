-- Add last_seen_at column to track user activity for online status
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at);

-- Initialize last_seen_at with last_login_at for existing users
UPDATE users 
SET last_seen_at = last_login_at 
WHERE last_seen_at IS NULL AND last_login_at IS NOT NULL;


