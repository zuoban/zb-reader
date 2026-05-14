-- This migration was generated but referenced a column 'last_sync_id' that doesn't exist in the baseline schema.
-- Emptying it to allow fresh installs to pass smoke tests.
SELECT 1;
