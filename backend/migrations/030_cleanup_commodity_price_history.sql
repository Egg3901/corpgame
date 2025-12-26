-- Migration: Clean up commodity price history with invalid resource names
-- Date: 2025-12-25
-- Description: Removes invalid commodity price history entries where resource_name
--              contains array indices ("0", "1", "2", etc.) instead of actual
--              resource names like "Oil", "Steel", "Rare Earth", etc.
--              This fixes data corruption from the bug in recordMarketPrices cron job.

-- Delete all commodity price history entries with numeric resource names
-- These were created due to Object.entries() bug on array
DELETE FROM commodity_price_history
WHERE resource_name ~ '^\d+$';

-- Optional: If you want to clear ALL commodity price history to start fresh
-- Uncomment the line below instead of the DELETE above:
-- TRUNCATE TABLE commodity_price_history;
