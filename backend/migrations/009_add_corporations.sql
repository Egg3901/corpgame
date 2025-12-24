-- Create corporations table
CREATE TABLE IF NOT EXISTS corporations (
    id SERIAL PRIMARY KEY,
    ceo_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    logo VARCHAR(500),
    shares INTEGER NOT NULL DEFAULT 500000,
    public_shares INTEGER NOT NULL DEFAULT 100000,
    share_price DECIMAL(10,2) NOT NULL DEFAULT 1.00 CHECK (share_price >= 1.00),
    type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_corporations_ceo_id ON corporations(ceo_id);
CREATE INDEX IF NOT EXISTS idx_corporations_name ON corporations(name);


