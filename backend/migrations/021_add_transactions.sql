-- Transaction tracking for all money movements
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  -- For user transactions
  from_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- For corporation transactions
  corporation_id INTEGER REFERENCES corporations(id) ON DELETE SET NULL,
  -- Metadata
  description TEXT,
  reference_id INTEGER, -- e.g., share_transaction_id, market_entry_id
  reference_type VARCHAR(50), -- e.g., 'share_purchase', 'market_entry'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX idx_transactions_corporation ON transactions(corporation_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- Composite index for user transaction history
CREATE INDEX idx_transactions_user_any ON transactions(from_user_id, to_user_id);

COMMENT ON TABLE transactions IS 'Tracks all money movements in the system';
COMMENT ON COLUMN transactions.transaction_type IS 'Type: corp_revenue, ceo_salary, user_transfer, share_purchase, share_sale, share_issue, market_entry, unit_build, corp_founding';

