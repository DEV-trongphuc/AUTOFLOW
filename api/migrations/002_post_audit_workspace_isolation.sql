-- ============================================================
-- DOMATION Platform: Migration Post-Audit Bug Fixes
-- Version  : 002_post_audit_workspace_isolation
-- Created  : 2026-04-22
-- Applies  : BUG-PE-1 | BUG-WC-1 | BUG-SE-1 | Phase 5A gaps
-- Safe     : All use IF NOT EXISTS / no data loss risk
-- ============================================================

-- ============================================================
-- [1] BUG-PE-1 FIX: Them workspace_id vao bang purchase_events
-- purchase_events khong co workspace_id nen subscriber moi tu
-- public track API se co NULL workspace_id, khong hien trong
-- CRM va khong trigger automation dung workspace.
-- ============================================================

ALTER TABLE `purchase_events`
  ADD COLUMN IF NOT EXISTS `workspace_id` INT(11) NOT NULL DEFAULT 1
    COMMENT 'Workspace owning this purchase event config'
  AFTER `id`;

-- Backfill: set tat ca existing records ve workspace_id = 1
-- (single-tenant default). Multi-tenant: update thu cong.
UPDATE `purchase_events`
SET `workspace_id` = 1
WHERE `workspace_id` = 0 OR `workspace_id` IS NULL;

-- Index de filter nhanh theo workspace
ALTER TABLE `purchase_events`
  ADD INDEX IF NOT EXISTS `idx_pe_workspace` (`workspace_id`);


-- ============================================================
-- [2] DATA INTEGRITY: Subscribers co workspace_id = NULL
-- Record tao truoc fix BUG-PE-1 co the co NULL workspace_id
-- -> backfill ve DEFAULT 1 tranh bi "vo hinh" trong CRM.
-- ============================================================

UPDATE `subscribers`
SET `workspace_id` = 1
WHERE `workspace_id` IS NULL OR `workspace_id` = 0;


-- ============================================================
-- [3] PERFORMANCE INDEXES cho cac bug fix moi
-- Them index de tranh full table scan sau khi co WHERE
-- workspace_id = ? trong tat ca recipient/subscriber queries.
-- ============================================================

DROP PROCEDURE IF EXISTS `domation_add_index`;

DELIMITER $$
CREATE PROCEDURE `domation_add_index`(
    IN tbl VARCHAR(64),
    IN idx VARCHAR(64),
    IN col_def TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = tbl
          AND INDEX_NAME   = idx
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD INDEX `', idx, '` ', col_def);
        PREPARE s FROM @ddl;
        EXECUTE s;
        DEALLOCATE PREPARE s;
        SELECT CONCAT('Created index ', idx, ' on ', tbl) AS migration_log;
    ELSE
        SELECT CONCAT('Index ', idx, ' already exists on ', tbl, ' - skipped') AS migration_log;
    END IF;
END$$
DELIMITER ;

-- [BUG-WC-1] worker_campaign.php recipient query: workspace_id + status
CALL domation_add_index('subscribers', 'idx_sub_workspace_status', '(`workspace_id`, `status`)');

-- [BUG-PE-1] purchase_events subscriber lookup: workspace_id + email
CALL domation_add_index('subscribers', 'idx_sub_workspace_email', '(`workspace_id`, `email`(32))');

-- [BUG-SE-1] sync_engine.php loadMaps: workspace_id + phone_number
CALL domation_add_index('subscribers', 'idx_sub_workspace_phone', '(`workspace_id`, `phone_number`)');

-- [Phase 5A] web_events visitor journey query
CALL domation_add_index('web_events', 'idx_we_visitor_created', '(`visitor_id`, `created_at`)');

-- Cleanup helper procedure
DROP PROCEDURE IF EXISTS `domation_add_index`;


-- ============================================================
-- [4] VERIFY sau khi chay migration
-- Bo comment truoc moi lenh de kiem tra.
-- ============================================================

-- SHOW COLUMNS FROM `purchase_events` LIKE 'workspace_id';
-- SHOW INDEX FROM `subscribers` WHERE Key_name LIKE 'idx_sub_workspace%';
-- SELECT COUNT(*) FROM `subscribers` WHERE workspace_id IS NULL OR workspace_id = 0;
-- SELECT COUNT(*) FROM `purchase_events` WHERE workspace_id IS NULL OR workspace_id = 0;
-- SHOW INDEX FROM `web_events` WHERE Key_name = 'idx_we_visitor_created';

-- ============================================================
-- END OF MIGRATION 002
-- ============================================================
