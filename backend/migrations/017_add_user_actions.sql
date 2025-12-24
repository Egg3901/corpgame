-- Add actions column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS actions INTEGER NOT NULL DEFAULT 10;

-- Comment: actions represents the number of actions a user can perform per turn
-- Users start with 10 actions, and gain +2 per hour (+3 if they are a CEO)

