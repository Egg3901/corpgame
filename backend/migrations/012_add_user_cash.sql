-- Add cash column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cash DECIMAL(15,2) NOT NULL DEFAULT 500000.00 CHECK (cash >= 0);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_cash ON users(cash);


