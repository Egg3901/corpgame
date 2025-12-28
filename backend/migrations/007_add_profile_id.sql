-- Add a public-facing sequential profile_id for user profiles
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_id INTEGER;

-- Backfill existing rows in a deterministic order (registration time, then id)
WITH ordered_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS profile_position
  FROM users
)
UPDATE users u
SET profile_id = o.profile_position
FROM ordered_users o
WHERE u.id = o.id
  AND u.profile_id IS NULL;

-- Create a dedicated sequence for profile_id if it does not already exist
DO $$
BEGIN
  IF to_regclass('public.users_profile_id_seq') IS NULL THEN
    CREATE SEQUENCE users_profile_id_seq OWNED BY users.profile_id;
  END IF;

  PERFORM setval('users_profile_id_seq', COALESCE((SELECT MAX(profile_id) FROM users), 0), true);
END$$;

-- Ensure new inserts automatically receive the next profile_id
ALTER TABLE users
ALTER COLUMN profile_id SET DEFAULT nextval('users_profile_id_seq');

-- Fill any remaining NULLs that might exist after setting the default
UPDATE users
SET profile_id = nextval('users_profile_id_seq')
WHERE profile_id IS NULL;

ALTER TABLE users
ALTER COLUMN profile_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_profile_id ON users(profile_id);
