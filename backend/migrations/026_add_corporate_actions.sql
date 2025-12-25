-- Create corporate_actions table to track supply rush and marketing campaigns
CREATE TABLE IF NOT EXISTS corporate_actions (
    id SERIAL PRIMARY KEY,
    corporation_id INTEGER NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('supply_rush', 'marketing_campaign')),
    cost DECIMAL(15,2) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_corporate_actions_corporation_id ON corporate_actions(corporation_id);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_expires_at ON corporate_actions(expires_at);
CREATE INDEX IF NOT EXISTS idx_corporate_actions_corp_type ON corporate_actions(corporation_id, action_type);
-- Composite index for active actions queries (used with WHERE expires_at > NOW() in application)
CREATE INDEX IF NOT EXISTS idx_corporate_actions_corp_type_expires ON corporate_actions(corporation_id, action_type, expires_at);

