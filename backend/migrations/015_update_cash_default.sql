-- Update default cash value to 500000.00 for new users
-- This migration updates the default value for the cash column
ALTER TABLE users 
ALTER COLUMN cash SET DEFAULT 500000.00;

-- Note: This only affects new rows. Existing users keep their current cash values.
-- To update existing users to 500000.00, run:
-- UPDATE users SET cash = 500000.00 WHERE cash IS NULL OR cash = 10000.00;
