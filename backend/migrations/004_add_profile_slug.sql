-- Add profile_slug column for unique profile links
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_slug TEXT;

-- Populate profile_slug for existing rows if missing
UPDATE users
SET profile_slug = LOWER(REGEXP_REPLACE(username, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE profile_slug IS NULL;

-- Ensure no empty slugs (fallback to id)
UPDATE users
SET profile_slug = CONCAT('player-', id)
WHERE profile_slug IS NULL OR profile_slug = '';

ALTER TABLE users
ALTER COLUMN profile_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_profile_slug ON users(profile_slug);
