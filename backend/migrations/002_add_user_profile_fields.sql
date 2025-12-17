-- Add new user profile fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS player_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('m', 'f', 'nonbinary')),
ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 18 AND age <= 80),
ADD COLUMN IF NOT EXISTS starting_state VARCHAR(2);

-- Create index on player_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_player_name ON users(player_name);




