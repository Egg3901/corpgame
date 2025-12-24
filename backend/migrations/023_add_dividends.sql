-- Add dividend fields to corporations table
ALTER TABLE corporations ADD COLUMN IF NOT EXISTS dividend_percentage DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE corporations ADD COLUMN IF NOT EXISTS special_dividend_last_paid_at TIMESTAMP NULL;
ALTER TABLE corporations ADD COLUMN IF NOT EXISTS special_dividend_last_amount DECIMAL(15,2) NULL;

-- Index for querying recent special dividends
CREATE INDEX IF NOT EXISTS idx_corporations_special_dividend_last_paid ON corporations(special_dividend_last_paid_at DESC);

-- Comments
COMMENT ON COLUMN corporations.dividend_percentage IS 'Percentage of total profit paid as dividends (0-100)';
COMMENT ON COLUMN corporations.special_dividend_last_paid_at IS 'Timestamp of last special dividend payment';
COMMENT ON COLUMN corporations.special_dividend_last_amount IS 'Total amount of last special dividend paid';

