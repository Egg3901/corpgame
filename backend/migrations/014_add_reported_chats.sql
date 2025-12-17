-- Create reported_chats table for reporting message conversations
CREATE TABLE IF NOT EXISTS reported_chats (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_not_self_report CHECK (reporter_id != reported_user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_reported_chats_reporter_id ON reported_chats(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reported_chats_reported_user_id ON reported_chats(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reported_chats_reviewed ON reported_chats(reviewed);
CREATE INDEX IF NOT EXISTS idx_reported_chats_created_at ON reported_chats(created_at DESC);

-- Composite index for admin queries (unreviewed reports)
CREATE INDEX IF NOT EXISTS idx_reported_chats_reviewed_created ON reported_chats(reviewed, created_at DESC);

