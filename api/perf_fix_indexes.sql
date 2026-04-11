-- ============================================================
-- AUTOFLOW: Critical Performance Indexes
-- Chay file nay trong phpMyAdmin -> SQL tab
-- Tat ca dung IF NOT EXISTS -- an toan, khong hai data
-- ============================================================

-- 1. ai_conversations: composite index cho list_conversations
--    Dung cho: ORDER BY last_message_at DESC + WHERE property_id = ?
ALTER TABLE `ai_conversations`
  ADD INDEX IF NOT EXISTS `idx_prop_last_msg_visitor`
  (`property_id`, `last_message_at`, `visitor_id`);

-- 2. subscribers: FULLTEXT index cho search
--    Thay the 5x LIKE '%keyword%' khong dung duoc index
ALTER TABLE `subscribers`
  ADD FULLTEXT INDEX IF NOT EXISTS `ft_subscriber_search`
  (`email`, `first_name`, `last_name`, `phone_number`, `company_name`);

-- 3. ai_training_docs: index cho GROUP BY property_id
--    (dung trong web_tracking action=list)
ALTER TABLE `ai_training_docs`
  ADD INDEX IF NOT EXISTS `idx_atd_property_source`
  (`property_id`, `source_type`);

-- 4. ai_chatbot_settings: index cho GROUP BY property_id + is_enabled
ALTER TABLE `ai_chatbot_settings`
  ADD INDEX IF NOT EXISTS `idx_acs_property_enabled`
  (`property_id`, `is_enabled`);

-- 5. web_visitors: index cho JOIN s.id = v.subscriber_id
ALTER TABLE `web_visitors`
  ADD INDEX IF NOT EXISTS `idx_wv_subscriber_id`
  (`subscriber_id`);

-- 6. subscriber_activity: index cho forms.php submission count
ALTER TABLE `subscriber_activity`
  ADD INDEX IF NOT EXISTS `idx_sa_type_ref`
  (`type`, `reference_id`);

-- 7. subscriber_lists: index cho lists.php stats breakdown
ALTER TABLE `subscriber_lists`
  ADD INDEX IF NOT EXISTS `idx_sl_list_id`
  (`list_id`);

-- ============================================================
-- ANALYZE: Cap nhat query planner stats (chay sau khi them index)
-- ============================================================
ANALYZE TABLE `ai_conversations`;
ANALYZE TABLE `ai_messages`;
ANALYZE TABLE `subscribers`;
ANALYZE TABLE `meta_subscribers`;
ANALYZE TABLE `zalo_subscribers`;
ANALYZE TABLE `ai_training_docs`;
ANALYZE TABLE `web_visitors`;
ANALYZE TABLE `subscriber_activity`;
ANALYZE TABLE `subscriber_lists`;
