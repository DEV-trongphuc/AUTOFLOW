-- ============================================================
-- Migration: Add workspace_id to voucher_campaigns
-- Fixes: SQLSTATE[42S22]: Column not found: 1054 Unknown column
--        'vcamp.workspace_id' in 'where clause'
-- Created: 2026-04-18
-- ============================================================

-- Step 1: Add the workspace_id column (DEFAULT 1 = default workspace,
--         matches the pattern used by every other isolated table)
ALTER TABLE `voucher_campaigns`
    ADD COLUMN `workspace_id` INT(11) NOT NULL DEFAULT 1
    AFTER `id`;

-- Step 2: Add an index so WHERE workspace_id = ? is fast
ALTER TABLE `voucher_campaigns`
    ADD INDEX `idx_voucher_campaigns_workspace` (`workspace_id`);

-- Step 3: (Optional safety) back-fill any existing rows to workspace 1
--         so no row has a NULL / 0 value that would break queries
UPDATE `voucher_campaigns` SET `workspace_id` = 1 WHERE `workspace_id` IS NULL OR `workspace_id` = 0;
