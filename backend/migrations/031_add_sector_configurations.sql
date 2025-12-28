-- Migration: Add sector configuration tables for unified truth source
-- FID-20251228-001: Unified Sector Configuration System
-- This migration creates tables to store all sector/product/resource configuration
-- data that was previously hardcoded in constants/sectors.ts

-- ============================================================================
-- CORE CONFIGURATION TABLES
-- ============================================================================

-- Master sector list with properties
CREATE TABLE sector_configs (
    id SERIAL PRIMARY KEY,
    sector_name VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_production_only BOOLEAN NOT NULL DEFAULT FALSE,
    can_extract BOOLEAN NOT NULL DEFAULT FALSE,
    produced_product VARCHAR(100) NULL,
    primary_resource VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per unit type economics configuration
CREATE TABLE sector_unit_configs (
    id SERIAL PRIMARY KEY,
    sector_name VARCHAR(100) NOT NULL REFERENCES sector_configs(sector_name) ON DELETE CASCADE,
    unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('production', 'retail', 'service', 'extraction')),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    base_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
    base_cost DECIMAL(15,2) NOT NULL DEFAULT 0,
    labor_cost DECIMAL(15,2) NOT NULL DEFAULT 400,
    output_rate DECIMAL(10,4) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sector_name, unit_type)
);

-- What each unit type consumes (inputs)
CREATE TABLE sector_unit_inputs (
    id SERIAL PRIMARY KEY,
    sector_name VARCHAR(100) NOT NULL,
    unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('production', 'retail', 'service', 'extraction')),
    input_type VARCHAR(20) NOT NULL CHECK (input_type IN ('resource', 'product')),
    input_name VARCHAR(100) NOT NULL,
    consumption_rate DECIMAL(10,4) NOT NULL DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sector_name, unit_type, input_type, input_name),
    FOREIGN KEY (sector_name, unit_type) REFERENCES sector_unit_configs(sector_name, unit_type) ON DELETE CASCADE
);

-- What each unit type produces (outputs)
CREATE TABLE sector_unit_outputs (
    id SERIAL PRIMARY KEY,
    sector_name VARCHAR(100) NOT NULL,
    unit_type VARCHAR(20) NOT NULL CHECK (unit_type IN ('production', 'extraction')),
    output_type VARCHAR(20) NOT NULL CHECK (output_type IN ('resource', 'product')),
    output_name VARCHAR(100) NOT NULL,
    output_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sector_name, unit_type, output_type, output_name),
    FOREIGN KEY (sector_name, unit_type) REFERENCES sector_unit_configs(sector_name, unit_type) ON DELETE CASCADE
);

-- Product reference values and pricing config
CREATE TABLE product_configs (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL UNIQUE,
    reference_value DECIMAL(15,2) NOT NULL DEFAULT 1000,
    min_price DECIMAL(15,2) NOT NULL DEFAULT 10,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resource base prices
CREATE TABLE resource_configs (
    id SERIAL PRIMARY KEY,
    resource_name VARCHAR(100) NOT NULL UNIQUE,
    base_price DECIMAL(15,2) NOT NULL DEFAULT 100,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_sector_unit_configs_sector ON sector_unit_configs(sector_name);
CREATE INDEX idx_sector_unit_inputs_sector ON sector_unit_inputs(sector_name);
CREATE INDEX idx_sector_unit_inputs_input ON sector_unit_inputs(input_type, input_name);
CREATE INDEX idx_sector_unit_outputs_sector ON sector_unit_outputs(sector_name);
CREATE INDEX idx_sector_unit_outputs_output ON sector_unit_outputs(output_type, output_name);

-- ============================================================================
-- SEED DATA: PRODUCTS
-- ============================================================================

INSERT INTO product_configs (product_name, reference_value, min_price, display_order) VALUES
('Technology Products', 5000, 10, 1),
('Manufactured Goods', 1500, 10, 2),
('Electricity', 200, 10, 3),
('Food Products', 500, 10, 4),
('Construction Capacity', 2500, 10, 5),
('Pharmaceutical Products', 8000, 10, 6),
('Defense Equipment', 15000, 10, 7),
('Logistics Capacity', 1000, 10, 8),
('Steel', 850, 10, 9);

-- ============================================================================
-- SEED DATA: RESOURCES
-- ============================================================================

INSERT INTO resource_configs (resource_name, base_price, display_order) VALUES
('Oil', 75, 1),
('Iron Ore', 120, 2),
('Rare Earth', 9000, 3),
('Copper', 8500, 4),
('Fertile Land', 3500, 5),
('Lumber', 200, 6),
('Chemical Compounds', 5000, 7),
('Coal', 80, 8);

-- ============================================================================
-- SEED DATA: SECTORS
-- ============================================================================

INSERT INTO sector_configs (sector_name, display_order, is_production_only, can_extract, produced_product, primary_resource) VALUES
('Technology', 1, FALSE, FALSE, 'Technology Products', 'Rare Earth'),
('Finance', 2, FALSE, FALSE, NULL, NULL),
('Healthcare', 3, FALSE, FALSE, NULL, NULL),
('Light Industry', 4, TRUE, FALSE, 'Manufactured Goods', NULL),
('Energy', 5, FALSE, TRUE, 'Electricity', NULL),
('Retail', 6, FALSE, FALSE, NULL, NULL),
('Real Estate', 7, FALSE, FALSE, NULL, NULL),
('Transportation', 8, FALSE, FALSE, 'Logistics Capacity', NULL),
('Media', 9, FALSE, FALSE, NULL, NULL),
('Telecommunications', 10, FALSE, FALSE, NULL, 'Copper'),
('Agriculture', 11, FALSE, TRUE, 'Food Products', 'Fertile Land'),
('Defense', 12, FALSE, FALSE, 'Defense Equipment', NULL),
('Hospitality', 13, FALSE, FALSE, NULL, NULL),
('Construction', 14, FALSE, FALSE, 'Construction Capacity', NULL),
('Pharmaceuticals', 15, FALSE, TRUE, 'Pharmaceutical Products', 'Chemical Compounds'),
('Mining', 16, TRUE, TRUE, NULL, NULL),
('Heavy Industry', 17, TRUE, FALSE, 'Steel', NULL),
('Forestry', 18, FALSE, TRUE, NULL, NULL);

-- ============================================================================
-- SEED DATA: UNIT CONFIGS - PRODUCTION UNITS
-- ============================================================================

-- Production units for sectors that can produce
INSERT INTO sector_unit_configs (sector_name, unit_type, is_enabled, base_revenue, base_cost, labor_cost, output_rate) VALUES
('Technology', 'production', TRUE, 800, 600, 400, 1.0),
('Light Industry', 'production', TRUE, 800, 600, 400, 1.0),
('Energy', 'production', TRUE, 800, 600, 400, 1.0),
('Transportation', 'production', TRUE, 800, 600, 400, 1.0),
('Agriculture', 'production', TRUE, 800, 600, 400, 1.0),
('Defense', 'production', TRUE, 800, 600, 400, 1.0),
('Construction', 'production', TRUE, 800, 600, 400, 1.0),
('Pharmaceuticals', 'production', TRUE, 800, 600, 400, 1.0),
('Heavy Industry', 'production', TRUE, 800, 600, 400, 1.0),
('Telecommunications', 'production', TRUE, 800, 600, 400, 1.0);

-- Non-producing sectors don't have production units
INSERT INTO sector_unit_configs (sector_name, unit_type, is_enabled, base_revenue, base_cost, labor_cost, output_rate) VALUES
('Finance', 'production', FALSE, 0, 0, 0, NULL),
('Healthcare', 'production', FALSE, 0, 0, 0, NULL),
('Retail', 'production', FALSE, 0, 0, 0, NULL),
('Real Estate', 'production', FALSE, 0, 0, 0, NULL),
('Media', 'production', FALSE, 0, 0, 0, NULL),
('Hospitality', 'production', FALSE, 0, 0, 0, NULL),
('Mining', 'production', FALSE, 0, 0, 0, NULL),
('Forestry', 'production', FALSE, 0, 0, 0, NULL);

-- ============================================================================
-- SEED DATA: UNIT CONFIGS - RETAIL UNITS
-- ============================================================================

INSERT INTO sector_unit_configs (sector_name, unit_type, is_enabled, base_revenue, base_cost, labor_cost, output_rate) VALUES
('Finance', 'retail', TRUE, 500, 300, 250, NULL),
('Healthcare', 'retail', TRUE, 500, 300, 250, NULL),
('Retail', 'retail', TRUE, 500, 300, 250, NULL),
('Real Estate', 'retail', TRUE, 500, 300, 250, NULL),
('Transportation', 'retail', TRUE, 500, 300, 250, NULL),
('Media', 'retail', TRUE, 500, 300, 250, NULL),
('Telecommunications', 'retail', TRUE, 500, 300, 250, NULL),
('Agriculture', 'retail', TRUE, 500, 300, 250, NULL),
('Defense', 'retail', TRUE, 500, 300, 250, NULL),
('Hospitality', 'retail', TRUE, 500, 300, 250, NULL),
('Construction', 'retail', TRUE, 500, 300, 250, NULL),
('Pharmaceuticals', 'retail', TRUE, 500, 300, 250, NULL);

-- Production-only sectors cannot build retail
INSERT INTO sector_unit_configs (sector_name, unit_type, is_enabled, base_revenue, base_cost, labor_cost, output_rate) VALUES
('Technology', 'retail', FALSE, 0, 0, 0, NULL),
('Light Industry', 'retail', FALSE, 0, 0, 0, NULL),
('Energy', 'retail', FALSE, 0, 0, 0, NULL),
('Mining', 'retail', FALSE, 0, 0, 0, NULL),
('Heavy Industry', 'retail', FALSE, 0, 0, 0, NULL),
('Forestry', 'retail', FALSE, 0, 0, 0, NULL);

-- ============================================================================
-- SEED DATA: UNIT CONFIGS - SERVICE UNITS
-- ============================================================================

INSERT INTO sector_unit_configs (sector_name, unit_type, is_enabled, base_revenue, base_cost, labor_cost, output_rate) VALUES
('Finance', 'service', TRUE, 400, 200, 150, NULL),
('Healthcare', 'service', TRUE, 400, 200, 150, NULL),
('Energy', 'service', TRUE, 400, 200, 150, NULL),
('Retail', 'service', TRUE, 400, 200, 150, NULL),
('Real Estate', 'service', TRUE, 400, 200, 150, NULL),
('Transportation', 'service', TRUE, 400, 200, 150, NULL),
('Media', 'service', TRUE, 400, 200, 150, NULL),
('Telecommunications', 'service', TRUE, 400, 200, 150, NULL),
('Agriculture', 'service', TRUE, 400, 200, 150, NULL),
('Defense', 'service', TRUE, 400, 200, 150, NULL),
('Hospitality', 'service', TRUE, 400, 200, 150, NULL),
('Construction', 'service', TRUE, 400, 200, 150, NULL),
('Pharmaceuticals', 'service', TRUE, 400, 200, 150, NULL);

-- Production-only sectors cannot build service
INSERT INTO sector_unit_configs (sector_name, unit_type, is_enabled, base_revenue, base_cost, labor_cost, output_rate) VALUES
('Technology', 'service', FALSE, 0, 0, 0, NULL),
('Light Industry', 'service', FALSE, 0, 0, 0, NULL),
('Mining', 'service', FALSE, 0, 0, 0, NULL),
('Heavy Industry', 'service', FALSE, 0, 0, 0, NULL),
('Forestry', 'service', FALSE, 0, 0, 0, NULL);

-- ============================================================================
-- SEED DATA: UNIT CONFIGS - EXTRACTION UNITS
-- ============================================================================

INSERT INTO sector_unit_configs (sector_name, unit_type, is_enabled, base_revenue, base_cost, labor_cost, output_rate) VALUES
('Energy', 'extraction', TRUE, 1000, 700, 500, 2.0),
('Agriculture', 'extraction', TRUE, 1000, 700, 500, 2.0),
('Pharmaceuticals', 'extraction', TRUE, 1000, 700, 500, 2.0),
('Mining', 'extraction', TRUE, 1000, 700, 500, 2.0),
('Forestry', 'extraction', TRUE, 1000, 700, 500, 2.0);

-- Sectors that cannot extract
INSERT INTO sector_unit_configs (sector_name, unit_type, is_enabled, base_revenue, base_cost, labor_cost, output_rate) VALUES
('Technology', 'extraction', FALSE, 0, 0, 0, NULL),
('Finance', 'extraction', FALSE, 0, 0, 0, NULL),
('Healthcare', 'extraction', FALSE, 0, 0, 0, NULL),
('Light Industry', 'extraction', FALSE, 0, 0, 0, NULL),
('Retail', 'extraction', FALSE, 0, 0, 0, NULL),
('Real Estate', 'extraction', FALSE, 0, 0, 0, NULL),
('Transportation', 'extraction', FALSE, 0, 0, 0, NULL),
('Media', 'extraction', FALSE, 0, 0, 0, NULL),
('Telecommunications', 'extraction', FALSE, 0, 0, 0, NULL),
('Defense', 'extraction', FALSE, 0, 0, 0, NULL),
('Hospitality', 'extraction', FALSE, 0, 0, 0, NULL),
('Construction', 'extraction', FALSE, 0, 0, 0, NULL),
('Heavy Industry', 'extraction', FALSE, 0, 0, 0, NULL);

-- ============================================================================
-- SEED DATA: PRODUCTION UNIT INPUTS
-- ============================================================================

-- Technology production consumes Rare Earth resource
INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Technology', 'production', 'resource', 'Rare Earth', 0.5),
('Technology', 'production', 'product', 'Electricity', 0.5);

-- Telecommunications production consumes Copper resource
INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Telecommunications', 'production', 'resource', 'Copper', 0.5),
('Telecommunications', 'production', 'product', 'Technology Products', 0.5),
('Telecommunications', 'production', 'product', 'Electricity', 0.5);

-- Light Industry consumes Steel product
INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Light Industry', 'production', 'product', 'Steel', 0.5),
('Light Industry', 'production', 'product', 'Electricity', 0.5);

-- Heavy Industry consumes Iron Ore + Coal resources
INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Heavy Industry', 'production', 'resource', 'Iron Ore', 0.5),
('Heavy Industry', 'production', 'resource', 'Coal', 0.3),
('Heavy Industry', 'production', 'product', 'Electricity', 0.75);

-- Energy consumes Oil + Coal resources
INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Energy', 'production', 'resource', 'Oil', 0.3),
('Energy', 'production', 'resource', 'Coal', 0.2);

-- Agriculture consumes Fertile Land resource
INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Agriculture', 'production', 'resource', 'Fertile Land', 0.5),
('Agriculture', 'production', 'product', 'Manufactured Goods', 0.3),
('Agriculture', 'production', 'product', 'Electricity', 0.5);

-- Transportation consumes Steel product
INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Transportation', 'production', 'product', 'Steel', 0.5),
('Transportation', 'production', 'product', 'Electricity', 0.5);

-- Defense consumes Steel product
INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Defense', 'production', 'product', 'Steel', 0.5),
('Defense', 'production', 'product', 'Technology Products', 0.4),
('Defense', 'production', 'product', 'Electricity', 0.5);

-- Construction consumes Lumber resource and Steel product
INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Construction', 'production', 'resource', 'Lumber', 0.5),
('Construction', 'production', 'product', 'Steel', 0.5),
('Construction', 'production', 'product', 'Manufactured Goods', 0.3),
('Construction', 'production', 'product', 'Electricity', 0.5);

-- Pharmaceuticals consumes Chemical Compounds resource
INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Pharmaceuticals', 'production', 'resource', 'Chemical Compounds', 0.5),
('Pharmaceuticals', 'production', 'product', 'Technology Products', 0.25),
('Pharmaceuticals', 'production', 'product', 'Electricity', 0.5);

-- ============================================================================
-- SEED DATA: PRODUCTION UNIT OUTPUTS
-- ============================================================================

INSERT INTO sector_unit_outputs (sector_name, unit_type, output_type, output_name, output_rate) VALUES
('Technology', 'production', 'product', 'Technology Products', 1.0),
('Light Industry', 'production', 'product', 'Manufactured Goods', 1.0),
('Energy', 'production', 'product', 'Electricity', 1.0),
('Transportation', 'production', 'product', 'Logistics Capacity', 1.0),
('Agriculture', 'production', 'product', 'Food Products', 1.0),
('Defense', 'production', 'product', 'Defense Equipment', 1.0),
('Construction', 'production', 'product', 'Construction Capacity', 1.0),
('Pharmaceuticals', 'production', 'product', 'Pharmaceutical Products', 1.0),
('Heavy Industry', 'production', 'product', 'Steel', 1.0);

-- ============================================================================
-- SEED DATA: RETAIL UNIT INPUTS
-- ============================================================================

INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Finance', 'retail', 'product', 'Technology Products', 2.0),
('Healthcare', 'retail', 'product', 'Pharmaceutical Products', 2.0),
('Retail', 'retail', 'product', 'Manufactured Goods', 2.0),
('Real Estate', 'retail', 'product', 'Construction Capacity', 2.0),
('Transportation', 'retail', 'product', 'Logistics Capacity', 2.0),
('Media', 'retail', 'product', 'Technology Products', 2.0),
('Telecommunications', 'retail', 'product', 'Technology Products', 2.0),
('Agriculture', 'retail', 'product', 'Food Products', 2.0),
('Defense', 'retail', 'product', 'Defense Equipment', 1.0),
('Hospitality', 'retail', 'product', 'Food Products', 2.0),
('Construction', 'retail', 'product', 'Construction Capacity', 2.0),
('Pharmaceuticals', 'retail', 'product', 'Pharmaceutical Products', 2.0);

-- ============================================================================
-- SEED DATA: SERVICE UNIT INPUTS
-- ============================================================================

INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
-- Finance services
('Finance', 'service', 'product', 'Technology Products', 1.5),
('Finance', 'service', 'product', 'Electricity', 0.5),
-- Healthcare services
('Healthcare', 'service', 'product', 'Pharmaceutical Products', 1.5),
('Healthcare', 'service', 'product', 'Electricity', 0.5),
('Healthcare', 'service', 'product', 'Technology Products', 0.4),
-- Energy services
('Energy', 'service', 'product', 'Electricity', 0.5),
-- Retail services
('Retail', 'service', 'product', 'Manufactured Goods', 1.5),
('Retail', 'service', 'product', 'Electricity', 0.5),
('Retail', 'service', 'product', 'Logistics Capacity', 0.3),
-- Real Estate services
('Real Estate', 'service', 'product', 'Construction Capacity', 1.5),
('Real Estate', 'service', 'product', 'Electricity', 0.5),
('Real Estate', 'service', 'product', 'Logistics Capacity', 0.25),
-- Transportation services
('Transportation', 'service', 'product', 'Logistics Capacity', 1.5),
('Transportation', 'service', 'product', 'Electricity', 0.5),
-- Media services
('Media', 'service', 'product', 'Technology Products', 1.5),
('Media', 'service', 'product', 'Electricity', 0.5),
-- Telecommunications services
('Telecommunications', 'service', 'product', 'Technology Products', 1.5),
('Telecommunications', 'service', 'product', 'Electricity', 0.5),
-- Agriculture services
('Agriculture', 'service', 'product', 'Food Products', 1.5),
('Agriculture', 'service', 'product', 'Electricity', 0.5),
-- Defense services
('Defense', 'service', 'product', 'Technology Products', 1.0),
('Defense', 'service', 'product', 'Defense Equipment', 1.0),
('Defense', 'service', 'product', 'Electricity', 0.5),
-- Hospitality services
('Hospitality', 'service', 'product', 'Food Products', 1.5),
('Hospitality', 'service', 'product', 'Electricity', 0.5),
-- Construction services
('Construction', 'service', 'product', 'Construction Capacity', 1.5),
('Construction', 'service', 'product', 'Electricity', 0.5),
-- Pharmaceuticals services
('Pharmaceuticals', 'service', 'product', 'Pharmaceutical Products', 1.5),
('Pharmaceuticals', 'service', 'product', 'Electricity', 0.5);

-- ============================================================================
-- SEED DATA: EXTRACTION UNIT OUTPUTS
-- ============================================================================

INSERT INTO sector_unit_outputs (sector_name, unit_type, output_type, output_name, output_rate) VALUES
('Energy', 'extraction', 'resource', 'Oil', 2.0),
('Agriculture', 'extraction', 'resource', 'Fertile Land', 2.0),
('Pharmaceuticals', 'extraction', 'resource', 'Chemical Compounds', 2.0),
('Mining', 'extraction', 'resource', 'Iron Ore', 2.0),
('Mining', 'extraction', 'resource', 'Coal', 2.0),
('Mining', 'extraction', 'resource', 'Copper', 2.0),
('Mining', 'extraction', 'resource', 'Rare Earth', 2.0),
('Forestry', 'extraction', 'resource', 'Lumber', 2.0);

-- ============================================================================
-- SEED DATA: EXTRACTION UNIT INPUTS (minimal)
-- ============================================================================

INSERT INTO sector_unit_inputs (sector_name, unit_type, input_type, input_name, consumption_rate) VALUES
('Mining', 'extraction', 'product', 'Manufactured Goods', 0.35),
('Mining', 'extraction', 'product', 'Electricity', 0.25),
('Energy', 'extraction', 'product', 'Logistics Capacity', 0.3),
('Energy', 'extraction', 'product', 'Electricity', 0.25),
('Forestry', 'extraction', 'product', 'Electricity', 0.25),
('Agriculture', 'extraction', 'product', 'Electricity', 0.25),
('Pharmaceuticals', 'extraction', 'product', 'Electricity', 0.25);
