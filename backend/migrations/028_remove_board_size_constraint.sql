-- Remove the board_size constraint since board size is now determined by appointments
-- Drop the old constraint
ALTER TABLE corporations DROP CONSTRAINT IF EXISTS corporations_board_size_check;

-- board_size is now just informational/legacy - not enforced
-- Keep the column for backwards compatibility but remove the constraint
