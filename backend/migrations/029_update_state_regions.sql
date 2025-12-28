-- Update state regions to match US Census Bureau standard
-- This migration updates the region column in state_metadata to use the official
-- US Census Bureau 4-region system: Northeast, Midwest, South, West

-- Northeast: New England + Mid-Atlantic
UPDATE state_metadata SET region = 'Northeast'
WHERE state_code IN ('CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA');

-- Midwest: East North Central + West North Central
UPDATE state_metadata SET region = 'Midwest'
WHERE state_code IN ('IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD');

-- South: South Atlantic + East South Central + West South Central
UPDATE state_metadata SET region = 'South'
WHERE state_code IN ('DE', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV', 'KY', 'TN', 'AL', 'MS', 'AR', 'LA', 'OK', 'TX');

-- West: Mountain + Pacific
UPDATE state_metadata SET region = 'West'
WHERE state_code IN ('AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA');
