-- Create commodity_price_history table to track commodity prices over time
CREATE TABLE IF NOT EXISTS commodity_price_history (
    id SERIAL PRIMARY KEY,
    resource_name VARCHAR(100) NOT NULL,
    price DECIMAL(15,2) NOT NULL CHECK (price > 0),
    supply DECIMAL(15,2) NOT NULL DEFAULT 0,
    demand DECIMAL(15,2) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product_price_history table to track product prices over time
CREATE TABLE IF NOT EXISTS product_price_history (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(15,2) NOT NULL CHECK (price > 0),
    supply DECIMAL(15,2) NOT NULL DEFAULT 0,
    demand DECIMAL(15,2) NOT NULL DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_commodity_price_history_resource_name ON commodity_price_history(resource_name);
CREATE INDEX IF NOT EXISTS idx_commodity_price_history_recorded_at ON commodity_price_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_commodity_price_history_resource_time ON commodity_price_history(resource_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_price_history_product_name ON product_price_history(product_name);
CREATE INDEX IF NOT EXISTS idx_product_price_history_recorded_at ON product_price_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_price_history_product_time ON product_price_history(product_name, recorded_at DESC);

