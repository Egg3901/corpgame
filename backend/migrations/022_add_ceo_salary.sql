-- Add CEO salary field to corporations (default $100,000 per 96 hours)
ALTER TABLE corporations ADD COLUMN IF NOT EXISTS ceo_salary DECIMAL(15,2) DEFAULT 100000.00;

-- Comment on the column
COMMENT ON COLUMN corporations.ceo_salary IS 'CEO salary per 96 hours. Set to 0 if corporation cannot afford to pay.';


