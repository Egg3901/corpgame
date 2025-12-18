-- Lower the share price floor from $1.00 to $0.01
-- This allows stock prices to reflect true fundamental value

-- Drop the old constraint on corporations table
ALTER TABLE corporations DROP CONSTRAINT IF EXISTS corporations_share_price_check;

-- Add new constraint with $0.01 minimum
ALTER TABLE corporations ADD CONSTRAINT corporations_share_price_check CHECK (share_price >= 0.01);

-- Drop the old constraint on share_transactions table (if any)
ALTER TABLE share_transactions DROP CONSTRAINT IF EXISTS share_transactions_share_price_check;

-- Add new constraint with $0.01 minimum for transactions
ALTER TABLE share_transactions ADD CONSTRAINT share_transactions_share_price_check CHECK (price_per_share >= 0.01);
