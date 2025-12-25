-- Create board_appointments table to track appointed board members
-- This replaces the automatic "top shareholders" system
CREATE TABLE IF NOT EXISTS board_appointments (
    id SERIAL PRIMARY KEY,
    corporation_id INTEGER NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    appointed_by_proposal_id INTEGER REFERENCES board_proposals(id) ON DELETE SET NULL,
    UNIQUE(corporation_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_board_appointments_corp ON board_appointments(corporation_id);
CREATE INDEX IF NOT EXISTS idx_board_appointments_user ON board_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_board_appointments_proposal ON board_appointments(appointed_by_proposal_id);
