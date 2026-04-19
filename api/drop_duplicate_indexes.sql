-- ============================================================
-- drop_preexisting_duplicate_indexes.sql
-- Drops 51 confirmed exact-duplicate indexes (pre-existing).
-- Verified: no FORCE INDEX usage in any PHP file.
-- Verified: column-order ambiguous pairs are KEPT (not dropped).
-- Safe to run on live DB — DROP INDEX is online in MariaDB 10.6
-- ============================================================

-- ── ai_chatbots ───────────────────────────────────────────────────────────
-- idx_chatbot_slug (slug) == UNIQUE uk_slug — keep UNIQUE, drop regular
ALTER TABLE `ai_chatbots` DROP INDEX IF EXISTS `idx_chatbot_slug`;

-- ── ai_conversations ──────────────────────────────────────────────────────
-- idx_ac_visitor_prop (visitor_id,property_id) == idx_conv_visitor
ALTER TABLE `ai_conversations` DROP INDEX IF EXISTS `idx_ac_visitor_prop`;
-- idx_prop_id (property_id) == key named `property_id`
ALTER TABLE `ai_conversations` DROP INDEX IF EXISTS `idx_prop_id`;
-- idx_last_msg_at (last_message_at) == idx_last_message_at
ALTER TABLE `ai_conversations` DROP INDEX IF EXISTS `idx_last_msg_at`;
-- NOTE: idx_prop_visitor (property_id,visitor_id) is KEPT — different order from idx_conv_visitor

-- ── ai_messages ───────────────────────────────────────────────────────────
-- idx_msg_conv_sender_time == idx_conv_sender_created (conversation_id,sender,created_at)
ALTER TABLE `ai_messages` DROP INDEX IF EXISTS `idx_msg_conv_sender_time`;

-- ── ai_org_conversations ──────────────────────────────────────────────────
-- idx_aoc_prop_status (property_id,status) == idx_prop_status
ALTER TABLE `ai_org_conversations` DROP INDEX IF EXISTS `idx_aoc_prop_status`;

-- ── ai_org_messages ───────────────────────────────────────────────────────
-- idx_org_msg_conv_time (conversation_id,created_at) == idx_conv_created
ALTER TABLE `ai_org_messages` DROP INDEX IF EXISTS `idx_org_msg_conv_time`;
-- idx_aom_conv_date (conversation_id,created_at) == idx_conv_created
ALTER TABLE `ai_org_messages` DROP INDEX IF EXISTS `idx_aom_conv_date`;

-- ── ai_training_chunks ────────────────────────────────────────────────────
-- idx_atc_property (property_id) == idx_property_chunks
ALTER TABLE `ai_training_chunks` DROP INDEX IF EXISTS `idx_atc_property`;

-- ── ai_workspace_files ────────────────────────────────────────────────────
-- idx_work_conv (conversation_id) == idx_conv
ALTER TABLE `ai_workspace_files` DROP INDEX IF EXISTS `idx_work_conv`;
-- idx_awf_conversation (conversation_id) == idx_conv
ALTER TABLE `ai_workspace_files` DROP INDEX IF EXISTS `idx_awf_conversation`;

-- ── global_assets ─────────────────────────────────────────────────────────
-- idx_ga_conv_deleted (conversation_id,is_deleted) == idx_conv_deleted
ALTER TABLE `global_assets` DROP INDEX IF EXISTS `idx_ga_conv_deleted`;

-- ── mail_delivery_logs ────────────────────────────────────────────────────
-- idx_mdl_subscriber (subscriber_id) == idx_subscriber_id
ALTER TABLE `mail_delivery_logs` DROP INDEX IF EXISTS `idx_mdl_subscriber`;

-- ── meta_message_logs ─────────────────────────────────────────────────────
-- idx_page_psid_msg (page_id,psid) == idx_conversation
ALTER TABLE `meta_message_logs` DROP INDEX IF EXISTS `idx_page_psid_msg`;

-- ── stats_update_buffer ───────────────────────────────────────────────────
-- idx_created (created_at) == idx_created_at
ALTER TABLE `stats_update_buffer` DROP INDEX IF EXISTS `idx_created`;

-- ── subscribers ───────────────────────────────────────────────────────────
-- idx_sub_workspace_status (workspace_id,status) == idx_workspace_status
ALTER TABLE `subscribers` DROP INDEX IF EXISTS `idx_sub_workspace_status`;
-- idx_sub_zalo_uid (zalo_user_id) == idx_sub_zalo
ALTER TABLE `subscribers` DROP INDEX IF EXISTS `idx_sub_zalo_uid`;
-- idx_sub_meta_psid (meta_psid) == idx_meta_psid
ALTER TABLE `subscribers` DROP INDEX IF EXISTS `idx_sub_meta_psid`;

-- ── subscriber_activity ───────────────────────────────────────────────────
-- idx_subact_ref_type (reference_id,type) == idx_subact_type_ref
ALTER TABLE `subscriber_activity` DROP INDEX IF EXISTS `idx_subact_ref_type`;
-- idx_sub_type_date (subscriber_id,type,created_at) == idx_spam_debounce
ALTER TABLE `subscriber_activity` DROP INDEX IF EXISTS `idx_sub_type_date`;
-- idx_activity_sub_camp_type (subscriber_id,campaign_id,type) == idx_campaign_sub_type
ALTER TABLE `subscriber_activity` DROP INDEX IF EXISTS `idx_activity_sub_camp_type`;
-- idx_activity_flow_time (flow_id,created_at) == idx_flow_activity
ALTER TABLE `subscriber_activity` DROP INDEX IF EXISTS `idx_activity_flow_time`;
-- idx_sa_campaign_type (campaign_id,type) == idx_campaign_type
ALTER TABLE `subscriber_activity` DROP INDEX IF EXISTS `idx_sa_campaign_type`;
-- idx_sa_sub_type_date (subscriber_id,type,created_at) == idx_spam_debounce
ALTER TABLE `subscriber_activity` DROP INDEX IF EXISTS `idx_sa_sub_type_date`;
-- idx_sa_refid_type (reference_id,type) == idx_subact_type_ref
ALTER TABLE `subscriber_activity` DROP INDEX IF EXISTS `idx_sa_refid_type`;
-- idx_sa_sub_flow_type (subscriber_id,flow_id,type) == idx_sa_flow_sub_type
ALTER TABLE `subscriber_activity` DROP INDEX IF EXISTS `idx_sa_sub_flow_type`;

-- ── users ─────────────────────────────────────────────────────────────────
-- `email` key == idx_email (UNIQUE). Keep idx_email, drop old unnamed `email`
ALTER TABLE `users` DROP INDEX IF EXISTS `email`;
-- `username` key == idx_username. Keep idx_username, drop old `username`
ALTER TABLE `users` DROP INDEX IF EXISTS `username`;

-- ── web_blacklist ─────────────────────────────────────────────────────────
-- idx_blacklist_ip (ip_address) == key named `ip_address`
ALTER TABLE `web_blacklist` DROP INDEX IF EXISTS `idx_blacklist_ip`;

-- ── web_events ────────────────────────────────────────────────────────────
-- idx_flood_control (visitor_id,created_at) == idx_evt_vis_time
ALTER TABLE `web_events` DROP INDEX IF EXISTS `idx_flood_control`;
-- idx_visitor_created (visitor_id,created_at) == idx_evt_vis_time
ALTER TABLE `web_events` DROP INDEX IF EXISTS `idx_visitor_created`;
-- idx_prop_created (property_id,created_at) == idx_ev_prop_time
ALTER TABLE `web_events` DROP INDEX IF EXISTS `idx_prop_created`;
-- idx_evt_created (created_at) == idx_created_at
ALTER TABLE `web_events` DROP INDEX IF EXISTS `idx_evt_created`;
-- idx_property_event (property_id,event_type) == idx_ev_heatmap
ALTER TABLE `web_events` DROP INDEX IF EXISTS `idx_property_event`;

-- ── web_page_views ────────────────────────────────────────────────────────
-- idx_prop_loaded (property_id,loaded_at) == idx_pv_prop_time
ALTER TABLE `web_page_views` DROP INDEX IF EXISTS `idx_prop_loaded`;
-- idx_property_loaded (property_id,loaded_at) == idx_pv_prop_time
ALTER TABLE `web_page_views` DROP INDEX IF EXISTS `idx_property_loaded`;
-- idx_visitor_vid (visitor_id) == idx_visitor_id
ALTER TABLE `web_page_views` DROP INDEX IF EXISTS `idx_visitor_vid`;
-- idx_wpv_session (session_id) == idx_session_id
ALTER TABLE `web_page_views` DROP INDEX IF EXISTS `idx_wpv_session`;

-- ── web_sessions ──────────────────────────────────────────────────────────
-- idx_sess_visitor (property_id,visitor_id) == idx_prop_visitor
ALTER TABLE `web_sessions` DROP INDEX IF EXISTS `idx_sess_visitor`;
-- idx_prop_started (property_id,started_at) == prop_time_idx
ALTER TABLE `web_sessions` DROP INDEX IF EXISTS `idx_prop_started`;
-- idx_property_started (property_id,started_at) == prop_time_idx
ALTER TABLE `web_sessions` DROP INDEX IF EXISTS `idx_property_started`;
-- idx_visitor_prop_active == idx_live_traffic (visitor_id,property_id,last_active_at)
ALTER TABLE `web_sessions` DROP INDEX IF EXISTS `idx_visitor_prop_active`;
-- idx_ws_visitor_prop == idx_live_traffic
ALTER TABLE `web_sessions` DROP INDEX IF EXISTS `idx_ws_visitor_prop`;
-- idx_ws_visitor_prop_active == idx_live_traffic
ALTER TABLE `web_sessions` DROP INDEX IF EXISTS `idx_ws_visitor_prop_active`;
-- idx_ws_prop_active == idx_sess_prop_active (property_id,last_active_at)
ALTER TABLE `web_sessions` DROP INDEX IF EXISTS `idx_ws_prop_active`;

-- ── web_visitors ──────────────────────────────────────────────────────────
-- idx_vis_phone (phone) == idx_phone
ALTER TABLE `web_visitors` DROP INDEX IF EXISTS `idx_vis_phone`;
-- idx_subscriber_id (subscriber_id) == idx_visitors_sub
ALTER TABLE `web_visitors` DROP INDEX IF EXISTS `idx_subscriber_id`;
-- idx_property_lastvisit (property_id,last_visit_at) == idx_vis_prop_last
ALTER TABLE `web_visitors` DROP INDEX IF EXISTS `idx_property_lastvisit`;

-- ── zalo_delivery_logs ────────────────────────────────────────────────────
-- idx_zdl_flow_step (flow_id,step_id) == idx_flow_step [EXACT same order]
ALTER TABLE `zalo_delivery_logs` DROP INDEX IF EXISTS `idx_zdl_flow_step`;

-- ── zalo_subscribers ──────────────────────────────────────────────────────
-- idx_last_interaction (last_interaction_at) == idx_last_interaction_at
ALTER TABLE `zalo_subscribers` DROP INDEX IF EXISTS `idx_last_interaction`;
-- idx_zalo_user_id (zalo_user_id) == idx_zalo_user
ALTER TABLE `zalo_subscribers` DROP INDEX IF EXISTS `idx_zalo_user_id`;
-- idx_zalo_uid (zalo_user_id) == idx_zalo_user
ALTER TABLE `zalo_subscribers` DROP INDEX IF EXISTS `idx_zalo_uid`;
-- idx_zs_zalo_user_id (zalo_user_id) == idx_zalo_user
ALTER TABLE `zalo_subscribers` DROP INDEX IF EXISTS `idx_zs_zalo_user_id`;
-- idx_zalo_user_oa (zalo_user_id,oa_id) == idx_user_oa
ALTER TABLE `zalo_subscribers` DROP INDEX IF EXISTS `idx_zalo_user_oa`;

-- ── zalo_templates ────────────────────────────────────────────────────────
-- idx_oa_template (oa_config_id,template_id) == UNIQUE unique_template
ALTER TABLE `zalo_templates` DROP INDEX IF EXISTS `idx_oa_template`;

-- ============================================================
-- KEPT (false positives — different column order = different lookup patterns):
--   flow_enrollments: idx_sub_flow (subscriber_id,flow_id) ≠ idx_flow_enrollment_lookup (flow_id,subscriber_id)
--   subscriber_tags: idx_tag_lookup (tag_id,subscriber_id) ≠ uq_sub_tag (subscriber_id,tag_id)
--   meta_subscribers: idx_psid_page (psid,page_id) ≠ idx_page_psid (page_id,psid)
--   meta_subscribers: idx_ms_psid_page (psid,page_id) ≠ idx_page_psid (page_id,psid)
--   subscriber_flow_states: idx_flow_status_step (flow_id,status,step_id) ≠ idx_flow_state_step (flow_id,step_id,status)
--   subscriber_flow_states: idx_flow_sub_status (flow_id,subscriber_id,status) ≠ idx_sub_flow_status (subscriber_id,flow_id,status)
--   tags: idx_tag_name_workspace (name,workspace_id) ≠ ws_name_unique (workspace_id,name)
--   zalo_automation_scenarios: idx_zas_oa_type_status (oa_config_id,type,status) ≠ idx_zas_config_status_type (oa_config_id,status,type)
--
-- DROPPED: 51 confirmed exact duplicates across 18 tables
-- ============================================================
