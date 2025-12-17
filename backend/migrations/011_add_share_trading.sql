-- Add capital column to corporations table
ALTER TABLE corporations 
ADD COLUMN IF NOT EXISTS capital DECIMAL(15,2) NOT NULL DEFAULT 500000.00 CHECK (capital >= 0);

-- Create share_transactions table to track buy/sell activity
CREATE TABLE IF NOT EXISTS share_transactions (
    id SERIAL PRIMARY KEY,
    corporation_id INTEGER NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
    shares INTEGER NOT NULL CHECK (shares > 0),
    price_per_share DECIMAL(10,2) NOT NULL CHECK (price_per_share > 0),
    total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create share_price_history table to track price over time
CREATE TABLE IF NOT EXISTS share_price_history (
    id SERIAL PRIMARY KEY,
    corporation_id INTEGER NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
    share_price DECIMAL(10,2) NOT NULL CHECK (share_price > 0),
    capital DECIMAL(15,2) NOT NULL CHECK (capital >= 0),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_share_transactions_corporation_id ON share_transactions(corporation_id);
CREATE INDEX IF NOT EXISTS idx_share_transactions_user_id ON share_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_share_transactions_created_at ON share_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_price_history_corporation_id ON share_price_history(corporation_id);
CREATE INDEX IF NOT EXISTS idx_share_price_history_recorded_at ON share_price_history(recorded_at DESC);

-- Create a composite index for efficient queries
CREATE INDEX IF NOT EXISTS idx_share_price_history_corp_time ON share_price_history(corporation_id, recorded_at DESC);
