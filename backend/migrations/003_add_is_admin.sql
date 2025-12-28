-- Add administrative flag for users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure existing rows have a value
UPDATE users
SET is_admin = COALESCE(is_admin, FALSE)
WHERE is_admin IS NULL;
