-- Add bio field to users table for profile descriptions
ALTER TABLE users
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT 'I''m a new user, say hi!';