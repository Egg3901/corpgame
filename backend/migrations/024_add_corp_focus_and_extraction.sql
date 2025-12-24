-- Add corporation focus column
-- Focus determines what unit types a corporation can build
ALTER TABLE corporations 
ADD COLUMN IF NOT EXISTS focus VARCHAR(20) NOT NULL DEFAULT 'diversified'
CHECK (focus IN ('extraction', 'production', 'retail', 'service', 'diversified'));

-- Update the business_units check constraint to include 'extraction' unit type
-- First drop the existing constraint, then add the new one
ALTER TABLE business_units 
DROP CONSTRAINT IF EXISTS business_units_unit_type_check;

ALTER TABLE business_units 
ADD CONSTRAINT business_units_unit_type_check 
CHECK (unit_type IN ('retail', 'production', 'service', 'extraction'));

-- Fix any corporations with invalid sector types
-- Valid sectors: Technology, Finance, Healthcare, Manufacturing, Energy, Retail, 
-- Real Estate, Transportation, Media, Telecommunications, Agriculture, Defense, 
-- Hospitality, Construction, Pharmaceuticals, Mining
UPDATE corporations 
SET type = 'Manufacturing' 
WHERE type IS NOT NULL 
AND type NOT IN (
    'Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Energy', 
    'Retail', 'Real Estate', 'Transportation', 'Media', 'Telecommunications', 
    'Agriculture', 'Defense', 'Hospitality', 'Construction', 'Pharmaceuticals', 'Mining'
);

-- Create index on focus for faster lookups
CREATE INDEX IF NOT EXISTS idx_corporations_focus ON corporations(focus);

-- Create index on type for faster lookups
CREATE INDEX IF NOT EXISTS idx_corporations_type ON corporations(type);

