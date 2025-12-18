-- Create market_entries table to track corporation presence in state markets
CREATE TABLE IF NOT EXISTS market_entries (
    id SERIAL PRIMARY KEY,
    corporation_id INTEGER NOT NULL REFERENCES corporations(id) ON DELETE CASCADE,
    state_code VARCHAR(2) NOT NULL,
    sector_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(corporation_id, state_code, sector_type)
);

-- Create indexes for market_entries
CREATE INDEX IF NOT EXISTS idx_market_entries_corporation_id ON market_entries(corporation_id);
CREATE INDEX IF NOT EXISTS idx_market_entries_state_code ON market_entries(state_code);
CREATE INDEX IF NOT EXISTS idx_market_entries_sector_type ON market_entries(sector_type);

-- Create business_units table to track retail, production, service units per market entry
CREATE TABLE IF NOT EXISTS business_units (
    id SERIAL PRIMARY KEY,
    market_entry_id INTEGER NOT NULL REFERENCES market_entries(id) ON DELETE CASCADE,
    unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('retail', 'production', 'service')),
    count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(market_entry_id, unit_type)
);

-- Create index for business_units
CREATE INDEX IF NOT EXISTS idx_business_units_market_entry_id ON business_units(market_entry_id);

-- Create state_metadata table for state information and multipliers
CREATE TABLE IF NOT EXISTS state_metadata (
    state_code VARCHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    population_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00 CHECK (population_multiplier >= 1.00 AND population_multiplier <= 5.00)
);

-- Insert state metadata with regions and population-based multipliers
INSERT INTO state_metadata (state_code, name, region, population_multiplier) VALUES
    -- West (largest states)
    ('CA', 'California', 'West', 5.00),
    ('WA', 'Washington', 'West', 2.50),
    ('OR', 'Oregon', 'West', 1.50),
    ('NV', 'Nevada', 'West', 1.20),
    ('AZ', 'Arizona', 'West', 2.40),
    ('UT', 'Utah', 'West', 1.20),
    ('CO', 'Colorado', 'West', 2.00),
    ('NM', 'New Mexico', 'West', 1.00),
    ('HI', 'Hawaii', 'West', 1.00),
    ('AK', 'Alaska', 'West', 1.00),
    ('ID', 'Idaho', 'West', 1.00),
    ('MT', 'Montana', 'West', 1.00),
    ('WY', 'Wyoming', 'West', 1.00),
    
    -- Southwest
    ('TX', 'Texas', 'Southwest', 4.50),
    ('OK', 'Oklahoma', 'Southwest', 1.40),
    
    -- Midwest
    ('IL', 'Illinois', 'Midwest', 3.80),
    ('OH', 'Ohio', 'Midwest', 3.50),
    ('MI', 'Michigan', 'Midwest', 3.00),
    ('IN', 'Indiana', 'Midwest', 2.10),
    ('WI', 'Wisconsin', 'Midwest', 1.90),
    ('MN', 'Minnesota', 'Midwest', 1.80),
    ('MO', 'Missouri', 'Midwest', 1.90),
    ('IA', 'Iowa', 'Midwest', 1.10),
    ('KS', 'Kansas', 'Midwest', 1.10),
    ('NE', 'Nebraska', 'Midwest', 1.00),
    ('SD', 'South Dakota', 'Midwest', 1.00),
    ('ND', 'North Dakota', 'Midwest', 1.00),
    
    -- Southeast
    ('FL', 'Florida', 'Southeast', 3.50),
    ('GA', 'Georgia', 'Southeast', 3.30),
    ('NC', 'North Carolina', 'Southeast', 3.20),
    ('VA', 'Virginia', 'Southeast', 2.70),
    ('TN', 'Tennessee', 'Southeast', 2.20),
    ('SC', 'South Carolina', 'Southeast', 1.70),
    ('AL', 'Alabama', 'Southeast', 1.60),
    ('KY', 'Kentucky', 'Southeast', 1.50),
    ('LA', 'Louisiana', 'Southeast', 1.50),
    ('MS', 'Mississippi', 'Southeast', 1.10),
    ('AR', 'Arkansas', 'Southeast', 1.10),
    ('WV', 'West Virginia', 'Southeast', 1.00),
    
    -- Northeast
    ('NY', 'New York', 'Northeast', 4.00),
    ('PA', 'Pennsylvania', 'Northeast', 3.80),
    ('NJ', 'New Jersey', 'Northeast', 2.90),
    ('MA', 'Massachusetts', 'Northeast', 2.20),
    ('MD', 'Maryland', 'Northeast', 1.95),
    ('CT', 'Connecticut', 'Northeast', 1.20),
    ('NH', 'New Hampshire', 'Northeast', 1.00),
    ('ME', 'Maine', 'Northeast', 1.00),
    ('RI', 'Rhode Island', 'Northeast', 1.00),
    ('VT', 'Vermont', 'Northeast', 1.00),
    ('DE', 'Delaware', 'Northeast', 1.00)
ON CONFLICT (state_code) DO NOTHING;
