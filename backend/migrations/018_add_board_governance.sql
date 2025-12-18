-- Add new corporation fields for board governance
ALTER TABLE corporations ADD COLUMN IF NOT EXISTS hq_state VARCHAR(2);
ALTER TABLE corporations ADD COLUMN IF NOT EXISTS board_size INTEGER DEFAULT 3 CHECK (board_size >= 3 AND board_size <= 7);
ALTER TABLE corporations ADD COLUMN IF NOT EXISTS elected_ceo_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for elected_ceo_id lookup
CREATE INDEX IF NOT EXISTS idx_corporations_elected_ceo ON corporations(elected_ceo_id);

-- Board proposals table
CREATE TABLE IF NOT EXISTS board_proposals (
    id SERIAL PRIMARY KEY,
    corporation_id INTEGER NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
    proposer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proposal_type VARCHAR(50) NOT NULL, -- 'ceo_nomination', 'sector_change', 'hq_change', 'board_size', 'appoint_member'
    proposal_data JSONB NOT NULL, -- { nominee_id, new_sector, new_state, new_size, appointee_id }
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'passed', 'failed'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Board votes table
CREATE TABLE IF NOT EXISTS board_votes (
    id SERIAL PRIMARY KEY,
    proposal_id INTEGER NOT NULL REFERENCES board_proposals(id) ON DELETE CASCADE,
    voter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote VARCHAR(10) NOT NULL CHECK (vote IN ('aye', 'nay')),
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(proposal_id, voter_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposals_corp ON board_proposals(corporation_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON board_proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_expires ON board_proposals(expires_at);
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON board_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON board_votes(voter_id);
