-- Create shareholders table
-- This table serves dual purpose:
-- 1. Shareholders view: Shows who owns shares in a corporation (used on corporation detail page)
-- 2. Portfolios view: Shows which stocks a user owns (used on user portfolio page)
CREATE TABLE IF NOT EXISTS shareholders (
    id SERIAL PRIMARY KEY,
    corporation_id INTEGER NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shares INTEGER NOT NULL CHECK (shares > 0),
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(corporation_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_shareholders_corporation_id ON shareholders(corporation_id);
CREATE INDEX IF NOT EXISTS idx_shareholders_user_id ON shareholders(user_id);
