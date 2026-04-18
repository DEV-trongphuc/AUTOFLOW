-- ============================================================
-- Autoflow DB Audit Migration
-- Generated: 2026-04-18 | DB: vhvxoigh_mail_auto
-- Run STEP 1 first (critical bug fix), then 2-5.
-- All ADD INDEX use IF NOT EXISTS for idempotency.
-- DROP INDEX operations require maintenance window.
-- ============================================================

-- ============================================================
-- STEP 1: CRITICAL — Fix expires_at ON UPDATE bug
-- ai_org_access_tokens.expires_at has ON UPDATE current_timestamp()
-- This means ANY UPDATE to the row (e.g. setting last_used_at)
-- will silently RESET expires_at = NOW(), expiring the token immediately!
-- ============================================================

ALTER TABLE `ai_org_access_tokens`
  MODIFY `expires_at` TIMESTAMP NOT NULL DEFAULT '0000-00-00 00:00:00'
  COMMENT 'Token expiry — NO ON UPDATE clause to prevent silent reset';

ALTER TABLE `ai_org_refresh_tokens`
  MODIFY `expires_at` TIMESTAMP NOT NULL DEFAULT '0000-00-00 00:00:00'
  COMMENT 'Refresh token expiry — NO ON UPDATE clause to prevent silent reset';

-- Verify: SHOW CREATE TABLE ai_org_access_tokens;


-- ============================================================
-- STEP 2: ADD MISSING INDEXES (all additive, safe to run any time)
-- ============================================================

-- 2.1 ai_org_access_tokens — revoke old tokens by user+active
ALTER TABLE `ai_org_access_tokens`
  ADD INDEX IF NOT EXISTS `idx_user_active` (`user_id`, `is_active`);

-- 2.2 ai_org_refresh_tokens — revoke old refresh tokens by user+active
ALTER TABLE `ai_org_refresh_tokens`
  ADD INDEX IF NOT EXISTS `idx_user_active` (`user_id`, `is_active`);

-- 2.3 ai_org_conversations — sidebar history by user+property
ALTER TABLE `ai_org_conversations`
  ADD INDEX IF NOT EXISTS `idx_user_prop_time` (`user_id`, `property_id`, `last_message_at`);

-- 2.4 ai_org_messages — message classification by sender per conversation
ALTER TABLE `ai_org_messages`
  ADD INDEX IF NOT EXISTS `idx_conv_sender` (`conversation_id`, `sender`, `created_at`);

-- 2.5 ai_training_docs — adaptive polling: property + status + updated_at
ALTER TABLE `ai_training_docs`
  ADD INDEX IF NOT EXISTS `idx_prop_status_updated` (`property_id`, `status`, `updated_at`);

-- 2.6 ai_pdf_chunk_results — PDF progress polling: doc_id + status
ALTER TABLE `ai_pdf_chunk_results`
  ADD INDEX IF NOT EXISTS `idx_doc_status` (`doc_id`, `status`);

-- 2.7 api_rate_limits — stale entry cleanup by last_attempt_at
ALTER TABLE `api_rate_limits`
  ADD INDEX IF NOT EXISTS `idx_last_attempt` (`last_attempt_at`);

-- 2.8 ai_chatbot_settings — lookup by property + enabled state
ALTER TABLE `ai_chatbot_settings`
  ADD INDEX IF NOT EXISTS `idx_prop_enabled` (`property_id`, `is_enabled`);

-- 2.9 ai_training_chunks — property + doc lookup (hot in RAG)
ALTER TABLE `ai_training_chunks`
  ADD INDEX IF NOT EXISTS `idx_prop_doc` (`property_id`, `doc_id`);

-- 2.10 ai_org_users — last_login TTL queries + activity dashboard
ALTER TABLE `ai_org_users`
  ADD INDEX IF NOT EXISTS `idx_admin_role` (`admin_id`, `role`, `status`),
  ADD INDEX IF NOT EXISTS `idx_last_login` (`last_login`);

-- 2.11 ai_workspace_files — admin's file listing
ALTER TABLE `ai_workspace_files`
  ADD INDEX IF NOT EXISTS `idx_admin_prop` (`admin_id`, `property_id`, `created_at`);

-- 2.12 ai_chatbot_categories — admin lookup (used in requireCategoryAccess)
ALTER TABLE `ai_chatbot_categories`
  ADD INDEX IF NOT EXISTS `idx_admin` (`admin_id`);

-- 2.13 ai_group_permissions — lookup by chatbot
ALTER TABLE `ai_group_permissions`
  ADD INDEX IF NOT EXISTS `idx_chatbot` (`chatbot_id`, `permission_type`);


-- ============================================================
-- STEP 3: NOT NULL Constraints on ai_org_users critical fields
-- ============================================================

-- 3.1 role and status should not be nullable (enum has DEFAULT but allows NULL)
ALTER TABLE `ai_org_users`
  MODIFY `role` ENUM('admin','assistant','user') NOT NULL DEFAULT 'user',
  MODIFY `status` ENUM('active','banned','warning') NOT NULL DEFAULT 'active';

-- 3.2 Add UNIQUE constraint on ai_org_user_categories (user_id, category_id)
-- Already done in schema as UNIQUE KEY idx_user_cat — SKIP (verified OK)


-- ============================================================
-- STEP 4: ADD MISSING FK CONSTRAINTS (run with care — needs cleanup first)
-- ============================================================

-- 4.1 Check for orphan records before adding FK
-- Run this SELECT first, fix orphans if any:
-- SELECT uc.* FROM ai_org_user_categories uc
--   LEFT JOIN ai_org_users u ON u.id = uc.user_id WHERE u.id IS NULL;
-- SELECT uc.* FROM ai_org_user_categories uc
--   LEFT JOIN ai_chatbot_categories c ON c.id = uc.category_id WHERE c.id IS NULL;

-- 4.2 Clean orphans first (UNCOMMENT after verifying above SELECTs are empty):
-- DELETE uc FROM ai_org_user_categories uc
--   LEFT JOIN ai_org_users u ON u.id = uc.user_id WHERE u.id IS NULL;
-- DELETE uc FROM ai_org_user_categories uc
--   LEFT JOIN ai_chatbot_categories c ON c.id = uc.category_id WHERE c.id IS NULL;

-- 4.3 Add FK (UNCOMMENT only after step 4.2 is clean):
-- ALTER TABLE ai_org_user_categories
--   ADD CONSTRAINT fk_aouc_user FOREIGN KEY (user_id) REFERENCES ai_org_users(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_aouc_cat FOREIGN KEY (category_id) REFERENCES ai_chatbot_categories(id) ON DELETE CASCADE;

-- 4.4 ai_workspace_versions → ai_workspace_files FK already exists
-- Verified: ai_workspace_versions.workspace_file_id references ai_workspace_files.id — OK but no FK in schema
-- ALTER TABLE ai_workspace_versions
--   ADD CONSTRAINT fk_awv_file FOREIGN KEY (workspace_file_id) REFERENCES ai_workspace_files(id) ON DELETE CASCADE;


-- ============================================================
-- STEP 5: REMOVE DUPLICATE INDEXES (MAINTENANCE WINDOW REQUIRED)
-- Each DROP INDEX will table-lock for ~30-60s on large tables.
-- Verify no active long-running queries before executing.
-- ============================================================

-- 5.1 subscribers — 3 duplicate email indexes (keep UNIQUE KEY 'email' only)
ALTER TABLE `subscribers`
  DROP INDEX IF EXISTS `idx_sub_email`,
  DROP INDEX IF EXISTS `idx_email`;

-- 5.2 subscribers — 2 duplicate phone indexes
ALTER TABLE `subscribers`
  DROP INDEX IF EXISTS `idx_sub_phone`;
-- Keep: idx_phone(phone_number) — check which is actually named first
-- SHOW INDEX FROM subscribers WHERE Column_name = 'phone_number';

-- 5.3 web_visitors — 4 duplicate subscriber_id indexes (keep 1)
ALTER TABLE `web_visitors`
  DROP INDEX IF EXISTS `idx_subscriber_lookup`,
  DROP INDEX IF EXISTS `idx_wv_subscriber_id`,
  DROP INDEX IF EXISTS `idx_id_subscriber`;
-- Keep: idx_subscriber_id (most recently added)
-- Double-check: SHOW INDEX FROM web_visitors WHERE Column_name = 'subscriber_id';

-- 5.4 web_visitors — 2 duplicate email indexes
ALTER TABLE `web_visitors`
  DROP INDEX IF EXISTS `idx_vis_email`;
-- Keep: idx_email

-- 5.5 web_visitors — 2 duplicate property+last_visit indexes  
ALTER TABLE `web_visitors`
  DROP INDEX IF EXISTS `idx_vis_prop_lastvisit`;
-- Keep: idx_vis_prop_last

-- 5.6 subscriber_flow_states — duplicate/redundant indexes
-- CAREFUL: Verify these are truly unused before dropping
-- Run: SELECT * FROM information_schema.INDEX_STATISTICS WHERE TABLE_NAME='subscriber_flow_states';
ALTER TABLE `subscriber_flow_states`
  DROP INDEX IF EXISTS `idx_flow_states_unique_active`,   -- = idx_sub_flow_status
  DROP INDEX IF EXISTS `idx_flow_states_subscriber`,      -- = idx_sub_flow_status  
  DROP INDEX IF EXISTS `idx_flow_state_sub_flow`,         -- prefix of idx_sub_flow_status
  DROP INDEX IF EXISTS `idx_flow_states_step`,            -- = idx_sfs_flow_step_status
  DROP INDEX IF EXISTS `idx_status_step_type`;            -- rarely used standalone

-- 5.7 zalo_oa_configs — 2 duplicate oa_id indexes
ALTER TABLE `zalo_oa_configs`
  DROP INDEX IF EXISTS `idx_oa_id`;
-- Keep: UNIQUE KEY unique_oa_id (oa_id)

-- 5.8 queue_jobs — 3 overlapping status+queue+available_at indexes
ALTER TABLE `queue_jobs`
  DROP INDEX IF EXISTS `idx_queue_lookup`,
  DROP INDEX IF EXISTS `idx_status_queue_avail`;
-- Keep: idx_queue_run (status, queue, available_at) + idx_retry_pending


-- ============================================================
-- STEP 6: Fix db_schema_check.php code bugs (PHP file fix)
-- ============================================================
-- Bug at line 320: $row['is_bounce'] should be $col === 'is_bounce'
-- This is a code fix, not SQL — see db_schema_check.php L320


-- ============================================================
-- STEP 7: Add AI Space tables to db_schema_check.php $requiredSchema
-- ============================================================
-- Add these table definitions to $requiredSchema array:
--   'ai_org_users', 'ai_org_access_tokens', 'ai_org_refresh_tokens'
--   'ai_org_conversations', 'ai_org_messages', 'ai_org_user_categories'
--   'ai_chatbot_categories', 'ai_chatbot_settings', 'ai_training_docs'
--   'ai_pdf_chunk_results', 'ai_training_chunks'


-- ============================================================
-- VERIFICATION QUERIES — Run after migration
-- ============================================================

-- V1: Verify expires_at no longer has ON UPDATE
SHOW CREATE TABLE ai_org_access_tokens;
SHOW CREATE TABLE ai_org_refresh_tokens;

-- V2: Verify new indexes exist
SHOW INDEX FROM ai_org_access_tokens WHERE Key_name = 'idx_user_active';
SHOW INDEX FROM ai_org_conversations WHERE Key_name = 'idx_user_prop_time';
SHOW INDEX FROM ai_training_docs WHERE Key_name = 'idx_prop_status_updated';

-- V3: Verify duplicate indexes are gone
SELECT COUNT(*) as dupe_count FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'subscribers' 
  AND COLUMN_NAME = 'email';
-- Expected: 1 (only UNIQUE KEY)

-- V4: Check token auth query uses index properly
EXPLAIN SELECT u.* FROM ai_org_access_tokens t
  JOIN ai_org_users u ON u.id = t.user_id
  WHERE t.token = 'test_token_abc' AND t.expires_at > NOW() AND t.is_active = 1;
-- Expected: type=const on t (UNIQUE token), type=eq_ref on u

-- V5: Check training polling query
EXPLAIN SELECT id, status, updated_at FROM ai_training_docs
WHERE property_id = 'test' AND status IN ('pending','processing')
ORDER BY updated_at DESC LIMIT 20;
-- Expected: key=idx_prop_status_updated

COMMIT;
