-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Máy chủ: localhost:3306
-- Thời gian đã tạo: Th4 23, 2026 lúc 07:16 PM
-- Phiên bản máy phục vụ: 10.6.18-MariaDB-cll-lve-log
-- Phiên bản PHP: 8.4.19

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `vhvxoigh_mail_auto`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `activity_buffer`
--

CREATE TABLE `activity_buffer` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subscriber_id` char(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `details` text DEFAULT NULL,
  `reference_id` varchar(100) DEFAULT NULL,
  `flow_id` varchar(50) DEFAULT NULL,
  `campaign_id` varchar(50) DEFAULT NULL,
  `extra_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`extra_data`)),
  `processed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `admin_logs`
--

CREATE TABLE `admin_logs` (
  `id` int(11) NOT NULL,
  `admin_id` varchar(100) NOT NULL,
  `action` varchar(50) NOT NULL,
  `target_type` varchar(50) NOT NULL,
  `target_id` varchar(255) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_allowed_emails`
--

CREATE TABLE `ai_allowed_emails` (
  `id` int(11) NOT NULL,
  `email` varchar(191) NOT NULL,
  `group_id` varchar(100) DEFAULT 'default',
  `role` enum('admin','user') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_chatbots`
--

CREATE TABLE `ai_chatbots` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category_id` varchar(100) DEFAULT NULL,
  `slug` varchar(100) DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_chatbot_categories`
--

CREATE TABLE `ai_chatbot_categories` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) DEFAULT NULL,
  `admin_id` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `brand_color` varchar(50) DEFAULT '#ffa900',
  `gemini_api_key` varchar(255) DEFAULT '',
  `bot_avatar` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_chatbot_meta_settings`
--

CREATE TABLE `ai_chatbot_meta_settings` (
  `id` int(11) NOT NULL,
  `property_id` varchar(100) NOT NULL,
  `settings_key` varchar(100) NOT NULL,
  `settings_value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_chatbot_scenarios`
--

CREATE TABLE `ai_chatbot_scenarios` (
  `id` varchar(60) NOT NULL,
  `property_id` varchar(100) NOT NULL,
  `title` varchar(255) NOT NULL DEFAULT '',
  `trigger_keywords` text NOT NULL,
  `match_mode` enum('contains','exact','regex') NOT NULL DEFAULT 'contains',
  `reply_text` mediumtext NOT NULL,
  `buttons` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`buttons`)),
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `priority` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `flow_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`flow_data`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_chatbot_settings`
--

CREATE TABLE `ai_chatbot_settings` (
  `property_id` varchar(100) NOT NULL,
  `is_enabled` tinyint(1) DEFAULT 1,
  `bot_name` varchar(255) DEFAULT 'AI Assistant',
  `company_name` varchar(255) DEFAULT '',
  `brand_color` varchar(50) DEFAULT '#ffa900',
  `bot_avatar` text DEFAULT NULL,
  `welcome_msg` text DEFAULT NULL,
  `teaser_msg` text DEFAULT NULL,
  `persona_prompt` text DEFAULT NULL,
  `gemini_api_key` varchar(255) DEFAULT NULL,
  `model_id` varchar(100) DEFAULT 'gemini-2.0-flash',
  `quick_actions` longtext DEFAULT NULL CHECK (json_valid(`quick_actions`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `gemini_cache_name` varchar(255) DEFAULT NULL,
  `gemini_cache_expires_at` datetime DEFAULT NULL,
  `chunk_size` int(11) DEFAULT 1000,
  `chunk_overlap` int(11) DEFAULT 120,
  `system_instruction` longtext DEFAULT NULL,
  `fast_replies` longtext DEFAULT NULL CHECK (json_valid(`fast_replies`)),
  `similarity_threshold` float DEFAULT 0.55,
  `top_k` int(11) DEFAULT 12,
  `history_limit` int(11) DEFAULT 15,
  `temperature` float DEFAULT 1,
  `max_output_tokens` int(11) DEFAULT 4096,
  `widget_position` varchar(50) DEFAULT 'bottom-right',
  `excluded_pages` longtext DEFAULT NULL CHECK (json_valid(`excluded_pages`)),
  `excluded_paths` longtext DEFAULT NULL CHECK (json_valid(`excluded_paths`)),
  `auto_open_excluded_pages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`auto_open_excluded_pages`)),
  `auto_open_excluded_paths` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`auto_open_excluded_paths`)),
  `auto_open` tinyint(1) DEFAULT 0,
  `notification_emails` text DEFAULT NULL,
  `notification_cc_emails` text DEFAULT NULL,
  `notification_subject` varchar(255) DEFAULT NULL,
  `ai_version` int(11) DEFAULT 1,
  `intent_configs` longtext DEFAULT NULL,
  `webhook_url` varchar(500) DEFAULT NULL,
  `webhook_secret` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_chat_queries`
--

CREATE TABLE `ai_chat_queries` (
  `id` varchar(100) NOT NULL,
  `property_id` varchar(100) NOT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `query_text` text DEFAULT NULL,
  `response_text` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_conversations`
--

CREATE TABLE `ai_conversations` (
  `id` varchar(100) NOT NULL,
  `visitor_id` varchar(100) DEFAULT NULL,
  `property_id` varchar(100) DEFAULT NULL,
  `status` enum('ai','human','closed') DEFAULT 'ai',
  `metadata` longtext DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_message` text DEFAULT NULL,
  `last_message_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `active_scenario_id` varchar(60) DEFAULT NULL,
  `active_node_id` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_feedback`
--

CREATE TABLE `ai_feedback` (
  `id` int(10) UNSIGNED NOT NULL,
  `org_user_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'Who submitted (NULL = anonymous/guest)',
  `category_id` varchar(64) DEFAULT NULL COMMENT 'Which AI Space category',
  `property_id` varchar(64) DEFAULT NULL COMMENT 'Which bot/chatbot',
  `conversation_id` varchar(128) DEFAULT NULL COMMENT 'Conversation context',
  `type` enum('bug','suggestion','praise','other') NOT NULL DEFAULT 'other',
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `screenshot_url` varchar(512) DEFAULT NULL COMMENT 'Uploaded screenshot path',
  `page_url` varchar(512) DEFAULT NULL COMMENT 'URL where feedback was submitted',
  `user_agent` varchar(512) DEFAULT NULL,
  `status` enum('new','in_review','resolved','closed') NOT NULL DEFAULT 'new',
  `admin_note` text DEFAULT NULL COMMENT 'Internal admin notes',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_group_permissions`
--

CREATE TABLE `ai_group_permissions` (
  `id` int(11) NOT NULL,
  `group_id` varchar(100) NOT NULL,
  `chatbot_id` varchar(100) NOT NULL,
  `permission_type` enum('view','chat','admin') DEFAULT 'chat'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_messages`
--

CREATE TABLE `ai_messages` (
  `id` int(11) NOT NULL,
  `conversation_id` varchar(100) DEFAULT NULL,
  `sender` enum('visitor','ai','human','system') NOT NULL DEFAULT 'visitor',
  `message` text DEFAULT NULL,
  `metadata` longtext DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_org_access_tokens`
--

CREATE TABLE `ai_org_access_tokens` (
  `id` int(11) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token` char(64) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' COMMENT 'Token expiry — NO ON UPDATE clause to prevent silent reset',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_org_conversations`
--

CREATE TABLE `ai_org_conversations` (
  `id` varchar(100) NOT NULL,
  `visitor_id` varchar(100) DEFAULT NULL,
  `user_id` varchar(100) DEFAULT NULL,
  `user_email` varchar(191) DEFAULT NULL,
  `property_id` varchar(100) DEFAULT NULL,
  `status` enum('ai','human','closed') DEFAULT 'ai',
  `is_pinned` tinyint(1) DEFAULT 0,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Array of strings' CHECK (json_valid(`tags`)),
  `sentiment` enum('positive','neutral','negative') DEFAULT NULL,
  `last_message` text DEFAULT NULL,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `metadata` longtext DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `title` varchar(255) DEFAULT NULL,
  `summary` text DEFAULT NULL,
  `is_public` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_org_messages`
--

CREATE TABLE `ai_org_messages` (
  `id` int(11) NOT NULL,
  `conversation_id` varchar(100) DEFAULT NULL,
  `sender` enum('visitor','ai','human','system') NOT NULL,
  `model` varchar(100) DEFAULT NULL,
  `tokens` int(11) DEFAULT 0,
  `processing_time` float DEFAULT NULL COMMENT 'Seconds taken',
  `rating` tinyint(4) DEFAULT NULL COMMENT '1=Like, -1=Dislike',
  `message` text DEFAULT NULL,
  `metadata` longtext DEFAULT NULL CHECK (json_valid(`metadata`)),
  `source_metadata` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_org_refresh_tokens`
--

CREATE TABLE `ai_org_refresh_tokens` (
  `id` int(11) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `token` char(64) NOT NULL,
  `expires_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' COMMENT 'Refresh token expiry — NO ON UPDATE clause to prevent silent reset',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `device_info` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_org_users`
--

CREATE TABLE `ai_org_users` (
  `id` int(11) NOT NULL,
  `user_id` varchar(100) DEFAULT NULL,
  `admin_id` varchar(100) DEFAULT NULL COMMENT 'Autoflow platform owner/admin ID — used for org isolation',
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `role` enum('admin','assistant','user') NOT NULL DEFAULT 'user',
  `status` enum('active','banned','warning') NOT NULL DEFAULT 'active',
  `status_reason` text DEFAULT NULL,
  `status_expiry` datetime DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_org_user_categories`
--

CREATE TABLE `ai_org_user_categories` (
  `id` int(11) NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `category_id` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_pdf_chunk_results`
--

CREATE TABLE `ai_pdf_chunk_results` (
  `id` varchar(50) NOT NULL,
  `doc_id` varchar(50) NOT NULL,
  `chunk_index` int(11) NOT NULL,
  `page_start` int(11) NOT NULL,
  `page_end` int(11) NOT NULL,
  `chapters_json` mediumtext DEFAULT NULL,
  `status` enum('pending','done','error') DEFAULT 'pending',
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp() COMMENT 'Thời gian cập nhật trạng thái chunk'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_rag_search_cache`
--

CREATE TABLE `ai_rag_search_cache` (
  `query_hash` char(32) NOT NULL,
  `property_id` varchar(100) DEFAULT NULL,
  `results` longtext DEFAULT NULL CHECK (json_valid(`results`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_suggested_links`
--

CREATE TABLE `ai_suggested_links` (
  `id` int(11) NOT NULL,
  `property_id` varchar(100) DEFAULT NULL,
  `url` text DEFAULT NULL,
  `source_url` text DEFAULT NULL,
  `title` text DEFAULT NULL,
  `status` enum('pending','crawled','skipped') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_term_stats`
--

CREATE TABLE `ai_term_stats` (
  `term` varchar(100) NOT NULL,
  `property_id` varchar(100) NOT NULL,
  `df` int(11) DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_training_chunks`
--

CREATE TABLE `ai_training_chunks` (
  `id` varchar(100) NOT NULL,
  `property_id` varchar(100) DEFAULT NULL,
  `doc_id` varchar(100) NOT NULL,
  `content` longtext DEFAULT NULL,
  `metadata_text` longtext DEFAULT NULL,
  `embedding` longtext DEFAULT NULL COMMENT 'JSON array of float embeddings',
  `embedding_binary` longblob DEFAULT NULL,
  `section_name` varchar(255) DEFAULT NULL,
  `sub_section_name` varchar(255) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `priority_level` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `vector_norm` double DEFAULT 0,
  `relevance_boost` int(11) DEFAULT 0,
  `token_count` int(11) DEFAULT 0,
  `page_start` int(11) DEFAULT NULL,
  `page_end` int(11) DEFAULT NULL,
  `chapter_index` int(11) DEFAULT NULL,
  `chapter_title` varchar(500) DEFAULT NULL,
  `section_title` varchar(500) DEFAULT NULL,
  `chunk_index` int(11) DEFAULT 0,
  `total_chunks` int(11) DEFAULT 1,
  `status` varchar(50) DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_training_docs`
--

CREATE TABLE `ai_training_docs` (
  `id` varchar(100) NOT NULL,
  `parent_id` varchar(100) DEFAULT '0',
  `property_id` varchar(100) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `source_type` varchar(50) DEFAULT 'manual',
  `version` int(11) DEFAULT 1,
  `is_active` tinyint(1) DEFAULT 1,
  `status` enum('pending','processing','trained','error') NOT NULL DEFAULT 'pending',
  `priority` int(11) DEFAULT 0,
  `content` longtext DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `chatbot_id` varchar(100) DEFAULT NULL,
  `filename` varchar(255) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `type` enum('url','text','file','folder','sitemap') DEFAULT 'text',
  `book_title` varchar(500) DEFAULT NULL,
  `book_author` varchar(255) DEFAULT NULL,
  `total_pages` int(11) DEFAULT NULL,
  `is_global_workspace` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Dùng file này làm knowledge base toàn cục cho mọi cuộc chat',
  `uploaded_by` varchar(100) DEFAULT NULL COMMENT 'Email/tên người upload'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_usage_logs`
--

CREATE TABLE `ai_usage_logs` (
  `id` int(11) NOT NULL,
  `user_email` varchar(191) NOT NULL,
  `chatbot_id` varchar(100) NOT NULL,
  `message_count` int(11) DEFAULT 0,
  `prompt_tokens` int(11) DEFAULT 0,
  `completion_tokens` int(11) DEFAULT 0,
  `duration_seconds` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_user_drive_permissions`
--

CREATE TABLE `ai_user_drive_permissions` (
  `id` int(11) NOT NULL,
  `user_email` varchar(191) NOT NULL,
  `access_token` text DEFAULT NULL,
  `refresh_token` text DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `granted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_vector_cache`
--

CREATE TABLE `ai_vector_cache` (
  `hash` varchar(32) NOT NULL,
  `vector` longtext DEFAULT NULL CHECK (json_valid(`vector`)),
  `vector_binary` longblob DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `id` varchar(255) DEFAULT NULL,
  `chunk_id` varchar(255) DEFAULT NULL,
  `vector_id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_workspace_files`
--

CREATE TABLE `ai_workspace_files` (
  `id` int(11) NOT NULL,
  `conversation_id` varchar(100) NOT NULL,
  `property_id` varchar(100) NOT NULL,
  `admin_id` varchar(100) DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_type` varchar(100) NOT NULL,
  `file_size` int(11) NOT NULL,
  `file_url` text NOT NULL,
  `source` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_workspace_versions`
--

CREATE TABLE `ai_workspace_versions` (
  `id` int(11) NOT NULL,
  `workspace_file_id` int(11) NOT NULL,
  `content` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `version_name` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `api_rate_limits`
--

CREATE TABLE `api_rate_limits` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(64) NOT NULL,
  `action` varchar(50) NOT NULL,
  `attempts` int(11) DEFAULT 1,
  `last_attempt_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `blocked_until` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `campaigns`
--

CREATE TABLE `campaigns` (
  `id` char(36) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `preheader_text` varchar(255) DEFAULT NULL,
  `sender_email` varchar(191) DEFAULT NULL,
  `sender_name` varchar(255) DEFAULT NULL,
  `reply_to` varchar(191) DEFAULT NULL,
  `status` enum('draft','scheduled','sending','sent','archived','waiting_flow','paused') DEFAULT 'draft',
  `type` enum('regular','email','zalo_zns','ab_testing','autoresponder') DEFAULT 'email',
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`config`)),
  `template_id` char(36) DEFAULT NULL,
  `content_body` longtext DEFAULT NULL,
  `target_config` longtext DEFAULT NULL CHECK (json_valid(`target_config`)),
  `scheduled_at` datetime DEFAULT NULL,
  `timezone` varchar(50) DEFAULT 'UTC',
  `sent_at` datetime DEFAULT NULL,
  `tracking_enabled` tinyint(1) DEFAULT 1,
  `count_sent` int(11) DEFAULT 0,
  `count_opened` int(11) DEFAULT 0,
  `count_unique_opened` int(11) DEFAULT 0,
  `count_clicked` int(11) DEFAULT 0,
  `count_unique_clicked` int(11) DEFAULT 0,
  `count_bounced` int(11) DEFAULT 0,
  `count_spam` int(11) DEFAULT 0,
  `count_unsubscribed` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_deleted` tinyint(1) DEFAULT 0,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `total_target_audience` int(11) DEFAULT 0,
  `stat_opens` int(11) DEFAULT 0,
  `stat_clicks` int(11) DEFAULT 0,
  `stat_device_mobile` int(11) DEFAULT 0,
  `stat_device_desktop` int(11) DEFAULT 0,
  `stats` longtext DEFAULT NULL CHECK (json_valid(`stats`)),
  `workspace_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `campaign_reminders`
--

CREATE TABLE `campaign_reminders` (
  `id` char(36) NOT NULL,
  `campaign_id` char(36) NOT NULL,
  `type` enum('no_open','no_click','always') DEFAULT NULL,
  `trigger_mode` enum('delay','date') DEFAULT NULL,
  `delay_days` int(11) DEFAULT 0,
  `delay_hours` int(11) DEFAULT 0,
  `scheduled_at` datetime DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `template_id` char(36) DEFAULT NULL,
  `sender_email` varchar(191) DEFAULT NULL COMMENT 'Email người gửi cho reminder (fallback từ campaign nếu NULL)',
  `sender_name` varchar(255) DEFAULT NULL COMMENT 'Tên người gửi cho reminder (fallback từ campaign nếu NULL)',
  `html_content` mediumtext DEFAULT NULL COMMENT 'P11-M1 Cached HTML build for reminder'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `custom_events`
--

CREATE TABLE `custom_events` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `notification_enabled` tinyint(1) DEFAULT 0,
  `notification_emails` text DEFAULT NULL,
  `notification_subject` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `email_sections`
--

CREATE TABLE `email_sections` (
  `id` char(36) NOT NULL,
  `workspace_id` int(11) DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `data_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`data_json`)),
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `flows`
--

CREATE TABLE `flows` (
  `id` char(36) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','paused','draft','archived') DEFAULT 'draft',
  `steps` longtext DEFAULT NULL CHECK (json_valid(`steps`)),
  `config` longtext DEFAULT NULL CHECK (json_valid(`config`)),
  `stat_enrolled` int(11) DEFAULT 0,
  `stat_completed` int(11) DEFAULT 0,
  `stat_open_rate` float DEFAULT 0,
  `stat_click_rate` float DEFAULT 0,
  `stat_total_sent` int(11) DEFAULT 0,
  `stat_total_opened` int(11) DEFAULT 0,
  `stat_unique_opened` int(11) DEFAULT 0,
  `stat_total_clicked` int(11) DEFAULT 0,
  `stat_unique_clicked` int(11) DEFAULT 0,
  `stat_total_zalo_clicked` int(11) NOT NULL DEFAULT 0 COMMENT 'Total ZNS / Zalo CS link clicks',
  `stat_unique_zalo_clicked` int(11) NOT NULL DEFAULT 0 COMMENT 'Unique subscribers who clicked ZNS / Zalo CS links',
  `stat_total_failed` int(11) DEFAULT 0,
  `stat_total_unsubscribed` int(11) DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `stat_zns_sent` int(11) DEFAULT 0 COMMENT 'Total ZNS messages sent',
  `stat_zns_failed` int(11) DEFAULT 0 COMMENT 'Total ZNS messages failed',
  `trigger_type` varchar(50) DEFAULT NULL,
  `stat_zalo_sent` int(11) NOT NULL DEFAULT 0 COMMENT 'Total Zalo CS messages sent',
  `workspace_id` int(11) DEFAULT 1,
  `stat_meta_sent` int(11) NOT NULL DEFAULT 0 COMMENT 'Total Meta Facebook messages sent'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `flow_enrollments`
--

CREATE TABLE `flow_enrollments` (
  `id` char(36) NOT NULL,
  `flow_id` char(36) NOT NULL,
  `subscriber_id` char(36) NOT NULL,
  `current_step_id` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed','waiting') DEFAULT 'pending',
  `next_run_at` datetime DEFAULT NULL,
  `context` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`context`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `enrolled_at` datetime DEFAULT NULL COMMENT 'Thời gian subscriber vào flow'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `flow_event_queue`
--

CREATE TABLE `flow_event_queue` (
  `id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `target_id` varchar(191) DEFAULT NULL,
  `subscriber_id` char(36) NOT NULL,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `processed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `flow_snapshots`
--

CREATE TABLE `flow_snapshots` (
  `id` varchar(36) NOT NULL,
  `flow_id` varchar(255) NOT NULL,
  `label` varchar(500) NOT NULL,
  `flow_data` longtext NOT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `forms`
--

CREATE TABLE `forms` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `target_list_id` char(36) DEFAULT NULL,
  `fields_json` longtext DEFAULT NULL CHECK (json_valid(`fields_json`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `notification_enabled` tinyint(1) DEFAULT 0,
  `notification_emails` text DEFAULT NULL,
  `notification_cc_emails` text DEFAULT NULL,
  `notification_subject` varchar(255) DEFAULT NULL,
  `workspace_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `geoip_blocks`
--

CREATE TABLE `geoip_blocks` (
  `ip_from` int(10) UNSIGNED NOT NULL,
  `ip_to` int(10) UNSIGNED NOT NULL,
  `country_code` char(2) DEFAULT NULL,
  `country_name` varchar(64) DEFAULT NULL,
  `city_name` varchar(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `global_assets`
--

CREATE TABLE `global_assets` (
  `id` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `unique_name` varchar(255) NOT NULL,
  `url` text NOT NULL,
  `type` varchar(100) DEFAULT NULL,
  `extension` varchar(10) DEFAULT NULL,
  `size` bigint(20) DEFAULT 0,
  `source` varchar(50) DEFAULT 'workspace',
  `chatbot_id` varchar(100) DEFAULT NULL,
  `property_id` varchar(100) DEFAULT NULL,
  `conversation_id` varchar(100) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `admin_id` varchar(100) DEFAULT NULL,
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `is_deleted` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `integrations`
--

CREATE TABLE `integrations` (
  `id` char(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `config` longtext DEFAULT NULL,
  `status` enum('active','paused','error') DEFAULT 'active',
  `last_sync_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `sync_status` varchar(20) DEFAULT 'idle',
  `workspace_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `link_clicks`
--

CREATE TABLE `link_clicks` (
  `id` varchar(36) NOT NULL,
  `short_link_id` varchar(36) NOT NULL,
  `ip_hash` varchar(100) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `device_type` varchar(50) DEFAULT NULL,
  `os` varchar(50) DEFAULT NULL,
  `country` varchar(50) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `clicked_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `lists`
--

CREATE TABLE `lists` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `source` varchar(100) DEFAULT 'Manual',
  `type` enum('static','sync') DEFAULT 'static',
  `subscriber_count` int(11) DEFAULT 0,
  `phone_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `workspace_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `login_attempts`
--

CREATE TABLE `login_attempts` (
  `id` int(10) UNSIGNED NOT NULL,
  `ip_hash` char(64) NOT NULL COMMENT 'SHA-256 of client IP for privacy',
  `email_hash` char(64) DEFAULT NULL COMMENT 'SHA-256 of attempted email',
  `attempted_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks failed login attempts for server-side rate limiting';

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `mail_delivery_logs`
--

CREATE TABLE `mail_delivery_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `recipient` varchar(191) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `campaign_id` char(36) DEFAULT NULL,
  `flow_id` char(36) DEFAULT NULL,
  `reminder_id` char(36) DEFAULT NULL,
  `status` enum('success','failed') DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `sent_at` timestamp NULL DEFAULT current_timestamp(),
  `subscriber_id` char(36) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `meta_app_configs`
--

CREATE TABLE `meta_app_configs` (
  `id` varchar(64) NOT NULL,
  `page_name` varchar(255) NOT NULL,
  `page_id` varchar(100) NOT NULL,
  `app_id` varchar(255) DEFAULT NULL,
  `page_access_token` text NOT NULL,
  `app_secret` varchar(255) DEFAULT NULL,
  `verify_token` varchar(255) DEFAULT NULL,
  `avatar_url` text DEFAULT NULL,
  `status` enum('active','inactive','disconnected') DEFAULT 'active',
  `mode` enum('live','dev') DEFAULT 'live',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `token_expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `meta_automation_scenarios`
--

CREATE TABLE `meta_automation_scenarios` (
  `id` varchar(64) NOT NULL,
  `meta_config_id` varchar(64) NOT NULL,
  `type` enum('welcome','keyword','ai_reply','holiday','default') NOT NULL DEFAULT 'keyword',
  `trigger_text` text DEFAULT NULL,
  `match_type` enum('exact','contains') DEFAULT 'contains',
  `title` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `message_type` enum('text','image','video') DEFAULT 'text',
  `image_url` text DEFAULT NULL,
  `attachment_id` varchar(255) DEFAULT NULL,
  `buttons` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`buttons`)),
  `status` enum('active','inactive') DEFAULT 'active',
  `ai_chatbot_id` varchar(64) DEFAULT NULL,
  `schedule_type` enum('full','custom') DEFAULT 'full',
  `start_time` time DEFAULT '00:00:00',
  `end_time` time DEFAULT '23:59:59',
  `active_days` text DEFAULT NULL,
  `priority_override` int(11) DEFAULT 0,
  `holiday_start_at` datetime DEFAULT NULL,
  `holiday_end_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `meta_conversations`
--

CREATE TABLE `meta_conversations` (
  `id` varchar(64) NOT NULL,
  `page_id` varchar(100) NOT NULL,
  `psid` varchar(100) NOT NULL,
  `last_message_id` varchar(100) DEFAULT NULL,
  `last_message_snippet` text DEFAULT NULL,
  `last_message_time` datetime DEFAULT NULL,
  `unread_count` int(11) DEFAULT 0,
  `status` enum('open','done','spam') DEFAULT 'open',
  `assigned_to` varchar(64) DEFAULT NULL,
  `ai_enabled` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `meta_customer_journey`
--

CREATE TABLE `meta_customer_journey` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `page_id` varchar(100) NOT NULL,
  `psid` varchar(100) NOT NULL,
  `event_type` enum('message_sent','message_received','postback','read','delivery','regex_matched','tag_added','form_submit') NOT NULL,
  `event_name` varchar(255) DEFAULT NULL,
  `event_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`event_data`)),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `meta_message_logs`
--

CREATE TABLE `meta_message_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `mid` varchar(100) DEFAULT NULL,
  `page_id` varchar(100) NOT NULL,
  `psid` varchar(100) NOT NULL,
  `direction` enum('inbound','outbound') NOT NULL,
  `message_type` enum('text','image','video','audio','file','template','fallback') DEFAULT 'text',
  `content` mediumtext DEFAULT NULL,
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`attachments`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `status` enum('sent','delivered','read','failed') DEFAULT 'sent',
  `error_message` text DEFAULT NULL,
  `timestamp` bigint(20) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `meta_subscribers`
--

CREATE TABLE `meta_subscribers` (
  `id` varchar(64) NOT NULL,
  `page_id` varchar(100) NOT NULL,
  `psid` varchar(100) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `avatar_url` text DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `locale` varchar(20) DEFAULT NULL,
  `timezone` varchar(10) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tags`)),
  `custom_fields` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_fields`)),
  `is_subscribed` tinyint(1) DEFAULT 1,
  `last_active_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `profile_pic` text DEFAULT NULL,
  `lead_score` int(11) DEFAULT 0,
  `notes` text DEFAULT NULL,
  `token_expires_at` bigint(20) DEFAULT NULL,
  `ai_paused_until` datetime DEFAULT NULL,
  `profile_link` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `otp_codes`
--

CREATE TABLE `otp_codes` (
  `id` varchar(36) NOT NULL,
  `profile_id` varchar(36) NOT NULL,
  `receiver_email` varchar(255) NOT NULL,
  `code_hash` varchar(255) NOT NULL,
  `status` enum('pending','verified','expired') DEFAULT 'pending',
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `verified_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `otp_profiles`
--

CREATE TABLE `otp_profiles` (
  `id` varchar(36) NOT NULL,
  `workspace_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `token_length` int(11) DEFAULT 6,
  `token_type` enum('numeric','alpha','alphanumeric') DEFAULT 'numeric',
  `ttl_minutes` int(11) DEFAULT 5,
  `email_template_id` varchar(36) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `permissions`
--

CREATE TABLE `permissions` (
  `id` int(11) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `purchase_events`
--

CREATE TABLE `purchase_events` (
  `id` char(36) NOT NULL,
  `workspace_id` int(11) NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `notification_enabled` tinyint(1) DEFAULT 0,
  `notification_emails` text DEFAULT NULL,
  `notification_subject` varchar(255) DEFAULT NULL,
  `revenue` decimal(15,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `queue_jobs`
--

CREATE TABLE `queue_jobs` (
  `id` varchar(64) NOT NULL,
  `queue` varchar(50) NOT NULL DEFAULT 'default',
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `reserved_at` datetime DEFAULT NULL,
  `available_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `finished_at` datetime DEFAULT NULL,
  `error_message` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `queue_throttle`
--

CREATE TABLE `queue_throttle` (
  `throttle_key` varchar(120) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `raw_event_buffer`
--

CREATE TABLE `raw_event_buffer` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `type` varchar(20) NOT NULL,
  `payload` longtext NOT NULL CHECK (json_valid(`payload`)),
  `processed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_slug` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `segments`
--

CREATE TABLE `segments` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` mediumtext DEFAULT NULL,
  `criteria` longtext NOT NULL CHECK (json_valid(`criteria`)),
  `subscriber_count` int(11) DEFAULT 0,
  `auto_cleanup_days` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ai_analysis` longtext DEFAULT NULL,
  `ai_analysis_at` timestamp NULL DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT NULL,
  `notify_on_join` tinyint(1) DEFAULT 0,
  `notify_subject` varchar(255) DEFAULT NULL,
  `notify_email` varchar(255) DEFAULT NULL,
  `notify_cc` varchar(255) DEFAULT NULL,
  `workspace_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `segment_count_update_queue`
--

CREATE TABLE `segment_count_update_queue` (
  `segment_id` varchar(255) NOT NULL,
  `queued_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `segment_exclusions`
--

CREATE TABLE `segment_exclusions` (
  `id` int(11) NOT NULL,
  `segment_id` varchar(50) NOT NULL,
  `subscriber_id` char(36) NOT NULL,
  `excluded_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `short_links`
--

CREATE TABLE `short_links` (
  `id` varchar(36) NOT NULL,
  `workspace_id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `target_url` text DEFAULT NULL,
  `is_survey_checkin` tinyint(1) DEFAULT 0,
  `survey_id` varchar(36) DEFAULT NULL,
  `status` enum('active','paused') NOT NULL DEFAULT 'active',
  `access_pin` varchar(10) DEFAULT NULL,
  `submit_count` int(11) NOT NULL DEFAULT 0,
  `qr_config_json` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `spam_cooldown`
--

CREATE TABLE `spam_cooldown` (
  `ip_address` varchar(45) NOT NULL,
  `violation_count` int(11) DEFAULT 0,
  `cooldown_until` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `stats_update_buffer`
--

CREATE TABLE `stats_update_buffer` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `target_table` varchar(50) NOT NULL,
  `target_id` char(36) NOT NULL,
  `column_name` varchar(50) NOT NULL,
  `increment` int(11) DEFAULT 1,
  `processed` tinyint(1) DEFAULT 0,
  `batch_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `campaign_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `subscribers`
--

CREATE TABLE `subscribers` (
  `id` char(36) NOT NULL,
  `email` varchar(191) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'active',
  `source` varchar(100) DEFAULT 'Manual',
  `salesperson` varchar(255) DEFAULT NULL,
  `phone_number` varchar(50) DEFAULT NULL,
  `job_title` varchar(100) DEFAULT NULL,
  `company_name` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `timezone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `anniversary_date` date DEFAULT NULL,
  `notes` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '[]' CHECK (json_valid(`notes`)),
  `last_activity_at` datetime DEFAULT NULL,
  `tags` longtext DEFAULT NULL CHECK (json_valid(`tags`)),
  `custom_attributes` longtext DEFAULT NULL CHECK (json_valid(`custom_attributes`)),
  `stats_sent` int(11) DEFAULT 0,
  `stats_opened` int(11) DEFAULT 0,
  `stats_clicked` int(11) DEFAULT 0,
  `last_open_at` datetime DEFAULT NULL,
  `last_click_at` datetime DEFAULT NULL,
  `joined_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `zalo_user_id` varchar(100) DEFAULT NULL,
  `is_zalo_follower` tinyint(1) DEFAULT 0,
  `meta_psid` varchar(100) DEFAULT NULL,
  `lead_score` int(11) DEFAULT 0,
  `verified` tinyint(1) DEFAULT 0,
  `avatar` varchar(500) DEFAULT NULL,
  `last_os` varchar(50) DEFAULT NULL,
  `last_device` varchar(50) DEFAULT NULL,
  `last_browser` varchar(50) DEFAULT NULL,
  `last_city` varchar(100) DEFAULT NULL,
  `last_country` varchar(100) DEFAULT NULL,
  `property_id` char(36) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `last_ip` varchar(64) DEFAULT NULL,
  `workspace_id` int(11) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci KEY_BLOCK_SIZE=8 ROW_FORMAT=COMPRESSED;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `subscriber_activity`
--

CREATE TABLE `subscriber_activity` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `workspace_id` varchar(36) DEFAULT NULL,
  `subscriber_id` char(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `reference_id` char(36) DEFAULT NULL,
  `flow_id` char(36) DEFAULT NULL,
  `campaign_id` char(36) DEFAULT NULL,
  `reminder_id` char(36) DEFAULT NULL,
  `reference_name` varchar(255) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `device_type` varchar(50) DEFAULT 'desktop',
  `os` varchar(50) DEFAULT NULL,
  `browser` varchar(50) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `points_awarded` int(11) DEFAULT 0,
  `variation` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `subscriber_flow_states`
--

CREATE TABLE `subscriber_flow_states` (
  `id` int(11) NOT NULL,
  `subscriber_id` char(36) NOT NULL,
  `flow_id` char(36) NOT NULL,
  `step_id` char(36) NOT NULL,
  `step_type` varchar(50) DEFAULT NULL,
  `status` enum('waiting','processing','completed','failed','unsubscribed','cancelled') DEFAULT 'waiting',
  `scheduled_at` datetime NOT NULL,
  `last_error` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_step_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `subscriber_lists`
--

CREATE TABLE `subscriber_lists` (
  `subscriber_id` char(36) NOT NULL,
  `list_id` char(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Bẫy `subscriber_lists`
--
DELIMITER $$
CREATE TRIGGER `after_subscriber_list_delete` AFTER DELETE ON `subscriber_lists` FOR EACH ROW BEGIN
    UPDATE lists SET subscriber_count = subscriber_count - 1 WHERE id = OLD.list_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `after_subscriber_list_insert` AFTER INSERT ON `subscriber_lists` FOR EACH ROW BEGIN
    UPDATE lists SET subscriber_count = subscriber_count + 1 WHERE id = NEW.list_id;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `subscriber_notes`
--

CREATE TABLE `subscriber_notes` (
  `id` char(36) NOT NULL,
  `subscriber_id` char(36) NOT NULL,
  `content` text DEFAULT NULL,
  `created_by` varchar(100) DEFAULT 'System',
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `subscriber_tags`
--

CREATE TABLE `subscriber_tags` (
  `subscriber_id` char(36) NOT NULL,
  `tag_id` char(36) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `surveys`
--

CREATE TABLE `surveys` (
  `id` char(36) NOT NULL,
  `workspace_id` int(11) NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `slug` varchar(128) NOT NULL,
  `status` enum('draft','active','paused','closed') DEFAULT 'draft',
  `cover_style` longtext DEFAULT NULL CHECK (json_valid(`cover_style`)),
  `blocks_json` longtext DEFAULT NULL CHECK (json_valid(`blocks_json`)),
  `settings_json` longtext DEFAULT NULL CHECK (json_valid(`settings_json`)),
  `thank_you_page` longtext DEFAULT NULL CHECK (json_valid(`thank_you_page`)),
  `target_list_id` char(36) DEFAULT NULL,
  `flow_trigger_id` char(36) DEFAULT NULL,
  `response_limit` int(11) DEFAULT NULL,
  `close_at` datetime DEFAULT NULL,
  `require_login` tinyint(1) DEFAULT 0,
  `allow_anonymous` tinyint(1) DEFAULT 1,
  `one_per_email` tinyint(1) DEFAULT 0,
  `created_by` char(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `survey_answer_details`
--

CREATE TABLE `survey_answer_details` (
  `id` char(36) NOT NULL,
  `response_id` char(36) NOT NULL,
  `survey_id` char(36) NOT NULL,
  `question_id` char(36) NOT NULL,
  `answer_text` text DEFAULT NULL,
  `answer_num` decimal(10,2) DEFAULT NULL,
  `answer_json` longtext DEFAULT NULL CHECK (json_valid(`answer_json`)),
  `submitted_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `survey_questions`
--

CREATE TABLE `survey_questions` (
  `id` char(36) NOT NULL,
  `survey_id` char(36) NOT NULL,
  `block_id` char(36) NOT NULL,
  `type` varchar(64) NOT NULL,
  `label` text NOT NULL,
  `options_json` longtext DEFAULT NULL CHECK (json_valid(`options_json`)),
  `required` tinyint(1) DEFAULT 0,
  `order_index` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `survey_responses`
--

CREATE TABLE `survey_responses` (
  `id` char(36) NOT NULL,
  `survey_id` char(36) NOT NULL,
  `subscriber_id` char(36) DEFAULT NULL,
  `session_token` char(64) NOT NULL,
  `answers_json` longtext NOT NULL CHECK (json_valid(`answers_json`)),
  `completion_rate` tinyint(3) DEFAULT 100,
  `time_spent_sec` int(11) DEFAULT NULL,
  `claimed_voucher_code` varchar(50) DEFAULT NULL,
  `source_channel` enum('direct_link','qr_code','email_embed','widget','api') DEFAULT 'direct_link',
  `utm_source` varchar(255) DEFAULT NULL,
  `utm_medium` varchar(255) DEFAULT NULL,
  `utm_campaign` varchar(255) DEFAULT NULL,
  `ip_hash` char(64) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `device_type` enum('desktop','tablet','mobile','unknown') DEFAULT 'unknown',
  `referrer_url` varchar(1024) DEFAULT NULL,
  `geo_country` varchar(64) DEFAULT NULL,
  `geo_city` varchar(128) DEFAULT NULL,
  `total_score` float DEFAULT NULL,
  `max_score` float DEFAULT NULL,
  `end_screen_id` varchar(100) DEFAULT 'default',
  `submitted_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `system_audit_logs`
--

CREATE TABLE `system_audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` varchar(100) NOT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `module` varchar(50) NOT NULL COMMENT 'e.g. campaigns, flows, audience',
  `action` varchar(50) NOT NULL COMMENT 'e.g. create, update, delete, play, pause',
  `target_id` varchar(100) DEFAULT NULL,
  `target_name` varchar(255) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `system_logs`
--

CREATE TABLE `system_logs` (
  `id` char(36) NOT NULL,
  `action` varchar(100) DEFAULT NULL,
  `details` mediumtext DEFAULT NULL,
  `user` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `level` varchar(255) DEFAULT NULL,
  `message` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `system_settings`
--

CREATE TABLE `system_settings` (
  `workspace_id` int(11) NOT NULL DEFAULT 0,
  `key` varchar(255) NOT NULL,
  `value` mediumtext DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tags`
--

CREATE TABLE `tags` (
  `id` char(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `workspace_id` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `templates`
--

CREATE TABLE `templates` (
  `id` char(36) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `thumbnail` varchar(500) DEFAULT NULL,
  `category` varchar(50) DEFAULT 'promotional',
  `group_id` char(36) DEFAULT NULL,
  `blocks` longtext DEFAULT NULL CHECK (json_valid(`blocks`)),
  `body_style` longtext DEFAULT NULL CHECK (json_valid(`body_style`)),
  `html_content` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `type` varchar(255) DEFAULT NULL,
  `subject` varchar(255) DEFAULT NULL,
  `workspace_id` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `template_groups`
--

CREATE TABLE `template_groups` (
  `id` char(36) NOT NULL,
  `workspace_id` varchar(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `timestamp_buffer`
--

CREATE TABLE `timestamp_buffer` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subscriber_id` char(36) NOT NULL,
  `column_name` varchar(50) NOT NULL,
  `timestamp_value` datetime NOT NULL,
  `processed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tracking_unique_cache`
--

CREATE TABLE `tracking_unique_cache` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subscriber_id` char(36) NOT NULL,
  `target_type` enum('campaign','flow','reminder') NOT NULL,
  `target_id` char(36) NOT NULL,
  `event_type` enum('open','click') NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `reference_key` varchar(500) NOT NULL DEFAULT 'general'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `users`
--

CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `email` varchar(255) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `picture` text DEFAULT NULL,
  `status` enum('pending','approved') DEFAULT 'pending',
  `google_id` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `voucher_campaigns`
--

CREATE TABLE `voucher_campaigns` (
  `id` varchar(36) NOT NULL,
  `workspace_id` int(11) NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL,
  `rewards` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rewards`)),
  `code_type` enum('dynamic','static') DEFAULT 'dynamic',
  `static_code` varchar(100) DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `status` enum('draft','active','expired') DEFAULT 'draft',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `expiration_days` int(11) DEFAULT NULL,
  `is_claimable` tinyint(1) DEFAULT 0,
  `claim_approval_required` tinyint(1) DEFAULT 0,
  `claim_approval_type` varchar(20) DEFAULT 'auto',
  `claim_email_template_id` varchar(36) DEFAULT NULL,
  `claim_target_form_id` varchar(36) DEFAULT NULL,
  `flow_trigger_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `voucher_claims`
--

CREATE TABLE `voucher_claims` (
  `id` varchar(36) NOT NULL,
  `voucher_id` varchar(36) NOT NULL,
  `subscriber_id` varchar(36) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `source_channel` varchar(50) DEFAULT NULL,
  `source_id` varchar(36) DEFAULT NULL,
  `assigned_code_id` varchar(36) DEFAULT NULL,
  `claimed_at` datetime DEFAULT current_timestamp(),
  `resolved_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `voucher_codes`
--

CREATE TABLE `voucher_codes` (
  `id` varchar(36) NOT NULL,
  `campaign_id` varchar(36) NOT NULL,
  `code` varchar(100) NOT NULL,
  `reward_item_id` varchar(100) DEFAULT NULL,
  `subscriber_id` varchar(36) DEFAULT NULL,
  `status` enum('unused','used') DEFAULT 'unused',
  `sent_at` datetime DEFAULT NULL,
  `used_at` datetime DEFAULT NULL,
  `claimed_at` datetime DEFAULT NULL COMMENT 'Timestamp when subscriber claimed/was assigned this code',
  `created_at` datetime NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `claimed_source` varchar(50) DEFAULT NULL,
  `claimed_source_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `web_blacklist`
--

CREATE TABLE `web_blacklist` (
  `id` int(11) NOT NULL,
  `ip_address` varchar(64) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `web_daily_stats`
--

CREATE TABLE `web_daily_stats` (
  `date` date NOT NULL,
  `property_id` char(36) NOT NULL,
  `url_hash` varchar(32) NOT NULL,
  `device_type` enum('mobile','desktop','tablet','bot') NOT NULL DEFAULT 'desktop',
  `page_views` int(10) UNSIGNED DEFAULT 0,
  `visitors` int(10) UNSIGNED DEFAULT 0,
  `sessions` int(10) UNSIGNED DEFAULT 0,
  `bounces` int(10) UNSIGNED DEFAULT 0,
  `total_duration` bigint(20) UNSIGNED DEFAULT 0,
  `total_scroll` bigint(20) UNSIGNED DEFAULT 0,
  `scroll_samples` int(10) UNSIGNED DEFAULT 0,
  `id` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `web_events`
--

CREATE TABLE `web_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `session_id` bigint(20) UNSIGNED NOT NULL,
  `page_view_id` bigint(20) UNSIGNED DEFAULT NULL,
  `visitor_id` char(36) NOT NULL,
  `property_id` char(36) NOT NULL,
  `workspace_id` varchar(36) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `target_selector` varchar(255) DEFAULT NULL,
  `target_text` varchar(255) DEFAULT NULL,
  `meta_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`meta_data`)),
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci KEY_BLOCK_SIZE=8 ROW_FORMAT=COMPRESSED;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `web_page_views`
--

CREATE TABLE `web_page_views` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `session_id` bigint(20) UNSIGNED NOT NULL,
  `property_id` char(36) NOT NULL,
  `workspace_id` varchar(36) DEFAULT NULL,
  `visitor_id` char(36) NOT NULL,
  `url_hash` varchar(32) NOT NULL,
  `url` varchar(768) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `referrer` varchar(500) DEFAULT NULL,
  `loaded_at` datetime DEFAULT current_timestamp(),
  `load_time_ms` int(10) UNSIGNED DEFAULT 0,
  `is_entrance` tinyint(1) DEFAULT 0,
  `time_on_page` int(10) UNSIGNED DEFAULT 0,
  `scroll_depth` tinyint(3) UNSIGNED DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci KEY_BLOCK_SIZE=8 ROW_FORMAT=COMPRESSED;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `web_properties`
--

CREATE TABLE `web_properties` (
  `id` char(36) NOT NULL,
  `workspace_id` int(10) UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Workspace isolation — added P34',
  `name` varchar(255) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `settings` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` varchar(255) DEFAULT NULL,
  `api_key` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `web_sessions`
--

CREATE TABLE `web_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `visitor_id` char(36) NOT NULL,
  `property_id` char(36) NOT NULL,
  `workspace_id` varchar(36) DEFAULT NULL,
  `started_at` datetime NOT NULL,
  `last_active_at` datetime NOT NULL,
  `ended_at` datetime DEFAULT NULL,
  `entry_url` varchar(768) DEFAULT NULL,
  `referrer_source` varchar(100) DEFAULT NULL,
  `utm_source` varchar(100) DEFAULT NULL,
  `utm_medium` varchar(100) DEFAULT NULL,
  `utm_campaign` varchar(255) DEFAULT NULL,
  `utm_content` varchar(255) DEFAULT NULL,
  `utm_term` varchar(255) DEFAULT NULL,
  `page_count` smallint(5) UNSIGNED DEFAULT 0,
  `duration_seconds` int(10) UNSIGNED DEFAULT 0,
  `is_bounce` tinyint(1) DEFAULT 1,
  `device_type` enum('mobile','desktop','tablet','bot') DEFAULT 'desktop',
  `browser` varchar(50) DEFAULT NULL,
  `os` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci KEY_BLOCK_SIZE=8 ROW_FORMAT=COMPRESSED;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `web_visitors`
--

CREATE TABLE `web_visitors` (
  `id` char(36) NOT NULL,
  `visitor_id` varchar(100) DEFAULT NULL,
  `property_id` char(36) NOT NULL,
  `subscriber_id` char(36) DEFAULT NULL,
  `zalo_user_id` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `first_visit_at` datetime DEFAULT NULL,
  `last_visit_at` datetime DEFAULT NULL,
  `visit_count` int(10) UNSIGNED DEFAULT 0,
  `device_fingerprint` varchar(64) DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `last_seen_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci KEY_BLOCK_SIZE=8 ROW_FORMAT=COMPRESSED;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `workspaces`
--

CREATE TABLE `workspaces` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `workspace_users`
--

CREATE TABLE `workspace_users` (
  `id` int(11) NOT NULL,
  `workspace_id` int(11) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_activity_buffer`
--

CREATE TABLE `zalo_activity_buffer` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subscriber_id` char(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `reference_id` varchar(100) DEFAULT NULL,
  `reference_name` varchar(255) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `zalo_msg_id` varchar(100) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_automation_scenarios`
--

CREATE TABLE `zalo_automation_scenarios` (
  `id` varchar(36) NOT NULL,
  `oa_config_id` varchar(36) NOT NULL,
  `type` enum('keyword','welcome','first_message','ai_reply','holiday') NOT NULL DEFAULT 'keyword',
  `trigger_text` varchar(255) DEFAULT NULL,
  `match_type` enum('exact','contains') DEFAULT 'exact',
  `title` varchar(255) NOT NULL,
  `content` text DEFAULT NULL,
  `message_type` enum('text','image') DEFAULT 'text',
  `image_url` text DEFAULT NULL,
  `attachment_id` varchar(255) DEFAULT NULL,
  `buttons` longtext DEFAULT NULL CHECK (json_valid(`buttons`)),
  `status` enum('active','inactive') DEFAULT 'active',
  `ai_chatbot_id` varchar(50) DEFAULT NULL,
  `schedule_type` enum('full','custom') DEFAULT 'full',
  `start_time` time DEFAULT '00:00:00',
  `end_time` time DEFAULT '23:59:59',
  `active_days` text DEFAULT NULL,
  `priority_override` tinyint(1) DEFAULT 0,
  `holiday_start_at` datetime DEFAULT NULL,
  `holiday_end_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_broadcasts`
--

CREATE TABLE `zalo_broadcasts` (
  `id` varchar(32) NOT NULL,
  `oa_config_id` varchar(36) NOT NULL COMMENT 'Reference to zalo_oa_configs.id',
  `title` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `message_type` enum('text','image') DEFAULT 'text',
  `attachment_id` varchar(255) DEFAULT NULL,
  `buttons` longtext DEFAULT NULL CHECK (json_valid(`buttons`)),
  `target_group` varchar(50) DEFAULT 'all',
  `target_filter` longtext DEFAULT NULL CHECK (json_valid(`target_filter`)),
  `schedule_time` datetime DEFAULT NULL,
  `status` enum('draft','scheduled','sending','sent','failed') DEFAULT 'draft',
  `stats_sent` int(11) DEFAULT 0,
  `stats_delivered` int(11) DEFAULT 0,
  `stats_seen` int(11) DEFAULT 0,
  `stats_reacted` int(11) DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `scheduled_at` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_broadcast_tracking`
--

CREATE TABLE `zalo_broadcast_tracking` (
  `id` varchar(32) NOT NULL,
  `broadcast_id` varchar(32) NOT NULL,
  `zalo_user_id` varchar(50) NOT NULL,
  `zalo_msg_id` varchar(64) DEFAULT NULL,
  `status` enum('sent','delivered','seen','reacted') DEFAULT 'sent',
  `sent_at` datetime DEFAULT current_timestamp(),
  `delivered_at` datetime DEFAULT NULL,
  `seen_at` datetime DEFAULT NULL,
  `reacted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_delivery_logs`
--

CREATE TABLE `zalo_delivery_logs` (
  `id` varchar(36) NOT NULL,
  `flow_id` varchar(36) DEFAULT NULL COMMENT 'Reference to flow',
  `step_id` varchar(36) DEFAULT NULL COMMENT 'Reference to flow step',
  `subscriber_id` varchar(36) NOT NULL COMMENT 'Reference to subscriber',
  `oa_config_id` varchar(36) NOT NULL COMMENT 'Reference to OA config',
  `template_id` varchar(255) DEFAULT NULL COMMENT 'Zalo template ID used',
  `phone_number` varchar(20) DEFAULT NULL COMMENT 'Recipient phone number',
  `template_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Actual data sent in the message' CHECK (json_valid(`template_data`)),
  `status` enum('pending','sent','failed','invalid_phone','quota_exceeded','time_restricted','delivered','seen') DEFAULT 'pending',
  `zalo_msg_id` varchar(255) DEFAULT NULL COMMENT 'Zalo message ID from API response',
  `error_code` varchar(50) DEFAULT NULL COMMENT 'Error code from Zalo API',
  `error_message` text DEFAULT NULL COMMENT 'Error message details',
  `sent_at` timestamp NULL DEFAULT NULL COMMENT 'When message was successfully sent',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `campaign_id` varchar(36) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_lists`
--

CREATE TABLE `zalo_lists` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `oa_config_id` char(36) NOT NULL,
  `subscriber_count` int(11) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_message_queue`
--

CREATE TABLE `zalo_message_queue` (
  `id` int(11) NOT NULL,
  `zalo_user_id` varchar(255) NOT NULL,
  `message_text` mediumtext DEFAULT NULL,
  `processed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_oa_configs`
--

CREATE TABLE `zalo_oa_configs` (
  `id` varchar(36) NOT NULL,
  `workspace_id` varchar(50) DEFAULT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Friendly name for the OA',
  `avatar` varchar(255) DEFAULT NULL,
  `oa_id` varchar(255) DEFAULT NULL COMMENT 'Zalo Official Account ID',
  `app_id` varchar(255) NOT NULL COMMENT 'Zalo App ID',
  `app_secret` text NOT NULL COMMENT 'Zalo App Secret (encrypted)',
  `pkce_verifier` varchar(255) DEFAULT NULL,
  `access_token` text DEFAULT NULL COMMENT 'Current access token',
  `refresh_token` text DEFAULT NULL COMMENT 'Refresh token for renewing access',
  `token_expires_at` datetime DEFAULT NULL COMMENT 'When the access token expires',
  `token_status` varchar(20) DEFAULT 'unknown' COMMENT 'Token health status: healthy, expiring, expired, unknown',
  `last_token_check` datetime DEFAULT NULL COMMENT 'Last time token was checked/refreshed',
  `daily_quota` int(11) DEFAULT 5000 COMMENT 'Daily message quota',
  `quota_used_today` int(11) DEFAULT 0 COMMENT 'Messages sent today',
  `quota_reset_date` date DEFAULT NULL COMMENT 'Last quota reset date',
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `remaining_quota` int(11) DEFAULT 0,
  `quality_48h` varchar(50) DEFAULT 'UNDEFINED',
  `quality_7d` varchar(50) DEFAULT 'UNDEFINED',
  `updated_at_quota` timestamp NULL DEFAULT NULL,
  `monthly_promo_quota` int(11) DEFAULT 0,
  `remaining_promo_quota` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_subscribers`
--

CREATE TABLE `zalo_subscribers` (
  `id` char(36) NOT NULL,
  `zalo_list_id` char(36) NOT NULL,
  `zalo_user_id` varchar(100) NOT NULL,
  `oa_id` varchar(100) DEFAULT NULL,
  `subscriber_id` char(36) DEFAULT NULL,
  `display_name` varchar(100) DEFAULT 'Zalo User',
  `avatar` varchar(500) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `birthday` varchar(20) DEFAULT NULL,
  `special_day` varchar(50) DEFAULT NULL,
  `manual_email` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'active',
  `lead_score` int(11) DEFAULT 0,
  `is_follower` tinyint(1) DEFAULT 0,
  `last_interaction_at` datetime DEFAULT NULL,
  `joined_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ai_paused_until` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_subscriber_activity`
--

CREATE TABLE `zalo_subscriber_activity` (
  `id` int(11) NOT NULL,
  `subscriber_id` char(36) NOT NULL,
  `type` varchar(50) NOT NULL,
  `reference_id` varchar(100) DEFAULT NULL,
  `reference_name` varchar(255) DEFAULT NULL,
  `zalo_msg_id` varchar(100) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_templates`
--

CREATE TABLE `zalo_templates` (
  `id` varchar(36) NOT NULL,
  `oa_config_id` varchar(36) NOT NULL COMMENT 'Reference to OA config',
  `template_id` varchar(255) NOT NULL COMMENT 'Zalo template ID',
  `template_name` varchar(255) NOT NULL COMMENT 'Template display name',
  `template_type` enum('transaction','promotion','customer_care') DEFAULT 'transaction',
  `template_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Template structure and parameters' CHECK (json_valid(`template_data`)),
  `preview_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Sample data for preview' CHECK (json_valid(`preview_data`)),
  `status` enum('pending','approved','rejected','disabled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `zalo_user_messages`
--

CREATE TABLE `zalo_user_messages` (
  `id` int(11) NOT NULL,
  `zalo_user_id` varchar(100) NOT NULL,
  `direction` enum('inbound','outbound') NOT NULL,
  `message_text` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `activity_buffer`
--
ALTER TABLE `activity_buffer`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_processed` (`processed`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_subscriber_id` (`subscriber_id`),
  ADD KEY `idx_flow_id` (`flow_id`),
  ADD KEY `idx_processed_created` (`processed`,`created_at`),
  ADD KEY `idx_ab_processed_created` (`processed`,`created_at`);

--
-- Chỉ mục cho bảng `admin_logs`
--
ALTER TABLE `admin_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_admin_id` (`admin_id`);

--
-- Chỉ mục cho bảng `ai_allowed_emails`
--
ALTER TABLE `ai_allowed_emails`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Chỉ mục cho bảng `ai_chatbots`
--
ALTER TABLE `ai_chatbots`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_slug` (`slug`),
  ADD KEY `idx_enabled` (`is_enabled`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `idx_category` (`category_id`),
  ADD KEY `idx_status` (`status`);

--
-- Chỉ mục cho bảng `ai_chatbot_categories`
--
ALTER TABLE `ai_chatbot_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_slug_admin` (`slug`,`admin_id`),
  ADD KEY `idx_admin` (`admin_id`);

--
-- Chỉ mục cho bảng `ai_chatbot_meta_settings`
--
ALTER TABLE `ai_chatbot_meta_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_prop_key` (`property_id`,`settings_key`);

--
-- Chỉ mục cho bảng `ai_chatbot_scenarios`
--
ALTER TABLE `ai_chatbot_scenarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_property` (`property_id`),
  ADD KEY `idx_active` (`property_id`,`is_active`,`priority`);

--
-- Chỉ mục cho bảng `ai_chatbot_settings`
--
ALTER TABLE `ai_chatbot_settings`
  ADD PRIMARY KEY (`property_id`),
  ADD KEY `idx_acs_property_enabled` (`property_id`,`is_enabled`);

--
-- Chỉ mục cho bảng `ai_chat_queries`
--
ALTER TABLE `ai_chat_queries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_property` (`property_id`),
  ADD KEY `idx_session` (`session_id`);

--
-- Chỉ mục cho bảng `ai_conversations`
--
ALTER TABLE `ai_conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `visitor_id` (`visitor_id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `idx_conv_last_msg` (`property_id`,`last_message_at`),
  ADD KEY `idx_conv_visitor` (`visitor_id`,`property_id`),
  ADD KEY `idx_prop_updated` (`property_id`,`updated_at`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_last_message_at` (`last_message_at`),
  ADD KEY `idx_visitor_prop_status` (`visitor_id`,`property_id`,`status`),
  ADD KEY `idx_conv_updated` (`updated_at`),
  ADD KEY `idx_prop_visitor` (`property_id`,`visitor_id`),
  ADD KEY `idx_conv_prop_time` (`property_id`,`created_at`),
  ADD KEY `idx_prop_last_msg_visitor` (`property_id`,`last_message_at`,`visitor_id`),
  ADD KEY `idx_visitor_prefix` (`visitor_id`(10)),
  ADD KEY `idx_ac_prop_status_updated` (`property_id`,`status`,`updated_at`);
ALTER TABLE `ai_conversations` ADD FULLTEXT KEY `ft_conv_search` (`last_message`);

--
-- Chỉ mục cho bảng `ai_feedback`
--
ALTER TABLE `ai_feedback`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_category` (`category_id`),
  ADD KEY `idx_org_user` (`org_user_id`),
  ADD KEY `idx_created` (`created_at`);

--
-- Chỉ mục cho bảng `ai_group_permissions`
--
ALTER TABLE `ai_group_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_group_bot` (`group_id`,`chatbot_id`),
  ADD KEY `idx_chatbot` (`chatbot_id`,`permission_type`);

--
-- Chỉ mục cho bảng `ai_messages`
--
ALTER TABLE `ai_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sender` (`sender`),
  ADD KEY `idx_conv_sender_created` (`conversation_id`,`sender`,`created_at`),
  ADD KEY `idx_conv_created` (`conversation_id`,`created_at`),
  ADD KEY `idx_msg_created` (`created_at`),
  ADD KEY `idx_conversation_id_desc` (`conversation_id`,`id`),
  ADD KEY `idx_am_conv_created` (`conversation_id`,`created_at`);

--
-- Chỉ mục cho bảng `ai_org_access_tokens`
--
ALTER TABLE `ai_org_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `idx_user_active` (`user_id`,`is_active`),
  ADD KEY `idx_aoat_user_active_exp` (`user_id`,`is_active`,`expires_at`);

--
-- Chỉ mục cho bảng `ai_org_conversations`
--
ALTER TABLE `ai_org_conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `visitor_id` (`visitor_id`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `idx_user_email` (`user_email`),
  ADD KEY `idx_user_time` (`user_id`,`last_message_at`),
  ADD KEY `idx_property_time` (`property_id`,`last_message_at`),
  ADD KEY `idx_prop_updated` (`property_id`,`updated_at`),
  ADD KEY `idx_updated_at` (`updated_at`),
  ADD KEY `idx_user_updated` (`user_id`,`updated_at`),
  ADD KEY `idx_prop_status` (`property_id`,`status`),
  ADD KEY `idx_status_updated` (`status`,`updated_at`),
  ADD KEY `idx_org_conv_prop_time` (`property_id`,`created_at`),
  ADD KEY `idx_user_prop_time` (`user_id`,`property_id`,`last_message_at`),
  ADD KEY `idx_aoc_uid_status_date` (`user_id`,`status`,`created_at`),
  ADD KEY `idx_visitor_only` (`visitor_id`),
  ADD KEY `idx_user_id` (`user_id`);
ALTER TABLE `ai_org_conversations` ADD FULLTEXT KEY `ft_org_conv_search` (`title`,`last_message`);

--
-- Chỉ mục cho bảng `ai_org_messages`
--
ALTER TABLE `ai_org_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `conversation_id` (`conversation_id`),
  ADD KEY `idx_conv_created` (`conversation_id`,`created_at`),
  ADD KEY `idx_conversation_id_desc` (`conversation_id`,`id`),
  ADD KEY `idx_conv_sender` (`conversation_id`,`sender`,`created_at`);
ALTER TABLE `ai_org_messages` ADD FULLTEXT KEY `ft_message_search` (`message`);

--
-- Chỉ mục cho bảng `ai_org_refresh_tokens`
--
ALTER TABLE `ai_org_refresh_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `token` (`token`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_expires_at` (`expires_at`),
  ADD KEY `idx_user_active` (`user_id`,`is_active`);

--
-- Chỉ mục cho bảng `ai_org_users`
--
ALTER TABLE `ai_org_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_admin_id` (`admin_id`),
  ADD KEY `idx_admin_role` (`admin_id`,`role`,`status`),
  ADD KEY `idx_last_login` (`last_login`),
  ADD KEY `idx_aou_admin_status` (`admin_id`,`status`);

--
-- Chỉ mục cho bảng `ai_org_user_categories`
--
ALTER TABLE `ai_org_user_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_user_cat` (`user_id`,`category_id`),
  ADD UNIQUE KEY `uq_user_category` (`user_id`,`category_id`);

--
-- Chỉ mục cho bảng `ai_pdf_chunk_results`
--
ALTER TABLE `ai_pdf_chunk_results`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_doc_chunk` (`doc_id`,`chunk_index`),
  ADD KEY `idx_doc_id` (`doc_id`),
  ADD KEY `idx_status_updated` (`status`,`updated_at`),
  ADD KEY `idx_doc_status` (`doc_id`,`status`);

--
-- Chỉ mục cho bảng `ai_rag_search_cache`
--
ALTER TABLE `ai_rag_search_cache`
  ADD PRIMARY KEY (`query_hash`),
  ADD KEY `property_id` (`property_id`),
  ADD KEY `idx_rag_perf` (`property_id`,`created_at`);

--
-- Chỉ mục cho bảng `ai_suggested_links`
--
ALTER TABLE `ai_suggested_links`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_url` (`property_id`,`url`) USING HASH,
  ADD KEY `property_id` (`property_id`);

--
-- Chỉ mục cho bảng `ai_term_stats`
--
ALTER TABLE `ai_term_stats`
  ADD PRIMARY KEY (`term`,`property_id`),
  ADD KEY `property_id` (`property_id`);

--
-- Chỉ mục cho bảng `ai_training_chunks`
--
ALTER TABLE `ai_training_chunks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_doc_id` (`doc_id`),
  ADD KEY `idx_property_chunks` (`property_id`),
  ADD KEY `idx_book_meta` (`page_start`,`chapter_index`),
  ADD KEY `idx_prop_doc` (`property_id`,`doc_id`),
  ADD KEY `idx_atc_prop_status` (`property_id`,`status`);
ALTER TABLE `ai_training_chunks` ADD FULLTEXT KEY `content_fts` (`content`);
ALTER TABLE `ai_training_chunks` ADD FULLTEXT KEY `ft_chunk_search` (`content`,`metadata_text`);

--
-- Chỉ mục cho bảng `ai_training_docs`
--
ALTER TABLE `ai_training_docs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_parent` (`parent_id`),
  ADD KEY `idx_chatbot_id` (`chatbot_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_global_workspace` (`property_id`,`is_global_workspace`,`is_active`),
  ADD KEY `idx_atd_property_source` (`property_id`,`source_type`),
  ADD KEY `idx_prop_status_updated` (`property_id`,`status`,`updated_at`),
  ADD KEY `idx_atd_prop_status_active` (`property_id`,`status`,`is_active`);
ALTER TABLE `ai_training_docs` ADD FULLTEXT KEY `ft_content` (`name`,`content`);

--
-- Chỉ mục cho bảng `ai_usage_logs`
--
ALTER TABLE `ai_usage_logs`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `ai_user_drive_permissions`
--
ALTER TABLE `ai_user_drive_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_email` (`user_email`);

--
-- Chỉ mục cho bảng `ai_vector_cache`
--
ALTER TABLE `ai_vector_cache`
  ADD PRIMARY KEY (`hash`),
  ADD UNIQUE KEY `idx_chunk` (`chunk_id`),
  ADD KEY `created_at` (`created_at`),
  ADD KEY `idx_vector_hash` (`hash`),
  ADD KEY `idx_avc_created` (`created_at`);

--
-- Chỉ mục cho bảng `ai_workspace_files`
--
ALTER TABLE `ai_workspace_files`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_conv_file` (`conversation_id`,`file_name`),
  ADD KEY `idx_conv` (`conversation_id`),
  ADD KEY `idx_property` (`property_id`),
  ADD KEY `idx_admin` (`admin_id`),
  ADD KEY `idx_work_prop_name` (`property_id`,`file_name`),
  ADD KEY `idx_admin_prop` (`admin_id`,`property_id`,`created_at`);

--
-- Chỉ mục cho bảng `ai_workspace_versions`
--
ALTER TABLE `ai_workspace_versions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_file` (`workspace_file_id`);

--
-- Chỉ mục cho bảng `api_rate_limits`
--
ALTER TABLE `api_rate_limits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ip_action` (`ip_address`,`action`),
  ADD KEY `idx_last_attempt` (`last_attempt_at`);

--
-- Chỉ mục cho bảng `campaigns`
--
ALTER TABLE `campaigns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_campaigns_stats` (`status`,`count_unique_opened`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_sent_at` (`sent_at`),
  ADD KEY `idx_scheduled_at` (`scheduled_at`),
  ADD KEY `idx_camp_type` (`type`),
  ADD KEY `idx_camp_created` (`created_at`),
  ADD KEY `idx_camp_template` (`template_id`),
  ADD KEY `idx_updated_at` (`updated_at`),
  ADD KEY `idx_workspace_deleted` (`workspace_id`,`is_deleted`,`created_at`),
  ADD KEY `idx_camp_status_sched` (`status`,`scheduled_at`),
  ADD KEY `idx_camp_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `campaign_reminders`
--
ALTER TABLE `campaign_reminders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `campaign_reminders_ibfk_1` (`campaign_id`);

--
-- Chỉ mục cho bảng `custom_events`
--
ALTER TABLE `custom_events`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `email_sections`
--
ALTER TABLE `email_sections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `flows`
--
ALTER TABLE `flows`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_trigger_type` (`trigger_type`,`status`),
  ADD KEY `trigger_type` (`trigger_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_flows_workspace_status` (`workspace_id`,`status`),
  ADD KEY `idx_flows_workspace_created` (`workspace_id`,`created_at`),
  ADD KEY `idx_flows_workspace_status_created` (`workspace_id`,`status`,`created_at`);

--
-- Chỉ mục cho bảng `flow_enrollments`
--
ALTER TABLE `flow_enrollments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_next_run` (`status`,`next_run_at`),
  ADD KEY `subscriber_id` (`subscriber_id`),
  ADD KEY `idx_flow_enrollment_lookup` (`flow_id`,`subscriber_id`),
  ADD KEY `idx_sub_flow` (`subscriber_id`,`flow_id`),
  ADD KEY `idx_sub_flow_status` (`subscriber_id`,`flow_id`,`status`),
  ADD KEY `idx_current_step` (`current_step_id`);

--
-- Chỉ mục cho bảng `flow_event_queue`
--
ALTER TABLE `flow_event_queue`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `fk_feq_subscriber` (`subscriber_id`),
  ADD KEY `idx_target_id_type` (`target_id`,`type`);

--
-- Chỉ mục cho bảng `flow_snapshots`
--
ALTER TABLE `flow_snapshots`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_flow_snapshots_flow` (`flow_id`),
  ADD KEY `idx_flow_snapshots_created` (`created_at`);

--
-- Chỉ mục cho bảng `forms`
--
ALTER TABLE `forms`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `geoip_blocks`
--
ALTER TABLE `geoip_blocks`
  ADD PRIMARY KEY (`ip_from`,`ip_to`),
  ADD KEY `idx_ip_range` (`ip_from`,`ip_to`);

--
-- Chỉ mục cho bảng `global_assets`
--
ALTER TABLE `global_assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_unique_url` (`url`(255)),
  ADD KEY `idx_source` (`source`),
  ADD KEY `idx_type` (`type`),
  ADD KEY `idx_bot` (`chatbot_id`),
  ADD KEY `idx_property` (`property_id`),
  ADD KEY `idx_deleted` (`is_deleted`),
  ADD KEY `idx_admin` (`admin_id`),
  ADD KEY `idx_property_deleted` (`property_id`,`is_deleted`),
  ADD KEY `idx_conv_deleted` (`conversation_id`,`is_deleted`),
  ADD KEY `idx_assets_conv` (`conversation_id`);

--
-- Chỉ mục cho bảng `integrations`
--
ALTER TABLE `integrations`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `link_clicks`
--
ALTER TABLE `link_clicks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_link_time` (`short_link_id`,`clicked_at`),
  ADD KEY `idx_short_link_time` (`short_link_id`,`clicked_at`);

--
-- Chỉ mục cho bảng `lists`
--
ALTER TABLE `lists`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ws_name_unique` (`workspace_id`,`name`),
  ADD KEY `idx_subscriber_count` (`subscriber_count`);

--
-- Chỉ mục cho bảng `login_attempts`
--
ALTER TABLE `login_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_la_ip_time` (`ip_hash`,`attempted_at`),
  ADD KEY `idx_la_time` (`attempted_at`);

--
-- Chỉ mục cho bảng `mail_delivery_logs`
--
ALTER TABLE `mail_delivery_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reminder_delivery` (`reminder_id`),
  ADD KEY `idx_mail_logs_campaign_status` (`campaign_id`,`status`,`sent_at`),
  ADD KEY `idx_mail_logs_recipient` (`recipient`,`campaign_id`),
  ADD KEY `idx_mail_logs_reminder` (`campaign_id`,`reminder_id`,`status`),
  ADD KEY `idx_mail_log_recipient_sent` (`recipient`,`sent_at`),
  ADD KEY `idx_perf_campaign_sub` (`campaign_id`,`recipient`,`status`),
  ADD KEY `idx_lookup_speed` (`campaign_id`,`sent_at`),
  ADD KEY `idx_delivery_logs_flow` (`flow_id`),
  ADD KEY `idx_subscriber_id` (`subscriber_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_sent_at` (`sent_at`),
  ADD KEY `idx_recipient` (`recipient`),
  ADD KEY `idx_campaign_status` (`campaign_id`,`status`),
  ADD KEY `idx_mdl_status_sent` (`status`,`sent_at`),
  ADD KEY `idx_mdl_sub_camp` (`subscriber_id`,`campaign_id`),
  ADD KEY `idx_mdl_camp_status_created` (`campaign_id`,`status`,`created_at`);

--
-- Chỉ mục cho bảng `meta_app_configs`
--
ALTER TABLE `meta_app_configs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_page_id` (`page_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_mac_status` (`status`),
  ADD KEY `idx_mac_page_id` (`page_id`);

--
-- Chỉ mục cho bảng `meta_automation_scenarios`
--
ALTER TABLE `meta_automation_scenarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_meta_config` (`meta_config_id`),
  ADD KEY `idx_type_status` (`type`,`status`),
  ADD KEY `idx_config_status` (`meta_config_id`,`status`),
  ADD KEY `idx_mas_config_status_type` (`meta_config_id`,`status`,`type`);

--
-- Chỉ mục cho bảng `meta_conversations`
--
ALTER TABLE `meta_conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_page_psid` (`page_id`,`psid`),
  ADD KEY `idx_last_message_time` (`last_message_time`),
  ADD KEY `idx_status` (`status`);

--
-- Chỉ mục cho bảng `meta_customer_journey`
--
ALTER TABLE `meta_customer_journey`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_page_psid` (`page_id`,`psid`),
  ADD KEY `idx_event_type` (`event_type`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Chỉ mục cho bảng `meta_message_logs`
--
ALTER TABLE `meta_message_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_mid` (`mid`),
  ADD UNIQUE KEY `uq_mid` (`mid`),
  ADD KEY `idx_conversation` (`page_id`,`psid`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_direction` (`direction`),
  ADD KEY `idx_report_opt` (`page_id`,`direction`,`created_at`,`psid`),
  ADD KEY `idx_psid_page_created` (`psid`,`page_id`,`created_at`),
  ADD KEY `idx_psid` (`psid`),
  ADD KEY `idx_status` (`status`);

--
-- Chỉ mục cho bảng `meta_subscribers`
--
ALTER TABLE `meta_subscribers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_page_psid` (`page_id`,`psid`),
  ADD KEY `idx_psid` (`psid`),
  ADD KEY `idx_last_active` (`last_active_at`),
  ADD KEY `idx_ai_paused` (`ai_paused_until`),
  ADD KEY `idx_page_created` (`page_id`,`created_at`),
  ADD KEY `idx_psid_page` (`psid`,`page_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_phone` (`phone`),
  ADD KEY `idx_ms_psid_page` (`psid`,`page_id`),
  ADD KEY `idx_ms_page_active` (`page_id`,`last_active_at`);

--
-- Chỉ mục cho bảng `otp_codes`
--
ALTER TABLE `otp_codes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_profile_email` (`profile_id`,`receiver_email`),
  ADD KEY `idx_expires` (`expires_at`);

--
-- Chỉ mục cho bảng `otp_profiles`
--
ALTER TABLE `otp_profiles`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug_unique` (`slug`);

--
-- Chỉ mục cho bảng `purchase_events`
--
ALTER TABLE `purchase_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pe_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `queue_jobs`
--
ALTER TABLE `queue_jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status_cleanup` (`status`,`created_at`),
  ADD KEY `idx_queue_run` (`status`,`queue`,`available_at`),
  ADD KEY `idx_retry_pending` (`status`,`available_at`,`attempts`),
  ADD KEY `idx_status_available_id` (`status`,`available_at`,`id`),
  ADD KEY `idx_qj_status_available` (`status`,`available_at`),
  ADD KEY `idx_qj_queue_status` (`queue`,`status`),
  ADD KEY `idx_qj_status_reserved` (`status`,`reserved_at`);

--
-- Chỉ mục cho bảng `queue_throttle`
--
ALTER TABLE `queue_throttle`
  ADD PRIMARY KEY (`throttle_key`);

--
-- Chỉ mục cho bảng `raw_event_buffer`
--
ALTER TABLE `raw_event_buffer`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_processing` (`processed`,`created_at`),
  ADD KEY `idx_processed` (`processed`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_reb_type_created` (`type`,`created_at`),
  ADD KEY `idx_reb_processed_created` (`processed`,`created_at`);

--
-- Chỉ mục cho bảng `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name_unique` (`name`);

--
-- Chỉ mục cho bảng `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_slug`),
  ADD KEY `permission_slug` (`permission_slug`);

--
-- Chỉ mục cho bảng `segments`
--
ALTER TABLE `segments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subscriber_count` (`subscriber_count`),
  ADD KEY `idx_seg_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `segment_count_update_queue`
--
ALTER TABLE `segment_count_update_queue`
  ADD PRIMARY KEY (`segment_id`),
  ADD KEY `idx_queued` (`queued_at`);

--
-- Chỉ mục cho bảng `segment_exclusions`
--
ALTER TABLE `segment_exclusions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_exclusion` (`segment_id`,`subscriber_id`),
  ADD KEY `fk_se_subscriber` (`subscriber_id`),
  ADD KEY `idx_seg_exclusions_seg` (`segment_id`);

--
-- Chỉ mục cho bảng `short_links`
--
ALTER TABLE `short_links`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_slug` (`slug`);

--
-- Chỉ mục cho bảng `spam_cooldown`
--
ALTER TABLE `spam_cooldown`
  ADD PRIMARY KEY (`ip_address`);

--
-- Chỉ mục cho bảng `stats_update_buffer`
--
ALTER TABLE `stats_update_buffer`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_processing` (`processed`,`target_table`,`target_id`),
  ADD KEY `idx_proc_batch` (`processed`,`batch_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_batch` (`batch_id`),
  ADD KEY `idx_processed` (`processed`),
  ADD KEY `idx_sub_camp_proc` (`campaign_id`,`processed`);

--
-- Chỉ mục cho bảng `subscribers`
--
ALTER TABLE `subscribers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ws_email_unique` (`workspace_id`,`email`),
  ADD KEY `idx_last_activity` (`last_activity_at`),
  ADD KEY `idx_subscribers_joined_at` (`joined_at`),
  ADD KEY `idx_subscribers_status_joined` (`status`,`joined_at`),
  ADD KEY `idx_dob` (`date_of_birth`),
  ADD KEY `idx_anniversary` (`anniversary_date`),
  ADD KEY `idx_sub_stats_opened` (`stats_opened`),
  ADD KEY `idx_sub_stats_clicked` (`stats_clicked`),
  ADD KEY `idx_subscribers_lead_score` (`lead_score`),
  ADD KEY `idx_salesperson` (`salesperson`),
  ADD KEY `idx_date_triggers` (`status`,`date_of_birth`,`anniversary_date`,`joined_at`),
  ADD KEY `idx_sub_status_source` (`status`,`source`),
  ADD KEY `idx_sub_zalo` (`zalo_user_id`),
  ADD KEY `idx_prop_email` (`property_id`,`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_meta_psid` (`meta_psid`),
  ADD KEY `idx_is_zalo_follower` (`is_zalo_follower`),
  ADD KEY `idx_phone` (`phone_number`),
  ADD KEY `idx_workspace_status` (`workspace_id`,`status`),
  ADD KEY `idx_sub_email` (`email`),
  ADD KEY `idx_sub_workspace_score` (`workspace_id`,`lead_score`),
  ADD KEY `idx_sub_ws_status_created` (`workspace_id`,`status`,`created_at`),
  ADD KEY `idx_sub_zalo_uid` (`zalo_user_id`),
  ADD KEY `idx_sub_meta_psid` (`meta_psid`),
  ADD KEY `idx_sub_workspace_status` (`workspace_id`,`status`),
  ADD KEY `idx_sub_workspace_email` (`workspace_id`,`email`(32)),
  ADD KEY `idx_sub_workspace_phone` (`workspace_id`,`phone_number`);
ALTER TABLE `subscribers` ADD FULLTEXT KEY `ft_subscriber_search` (`email`,`first_name`,`last_name`,`phone_number`,`company_name`);

--
-- Chỉ mục cho bảng `subscriber_activity`
--
ALTER TABLE `subscriber_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_flow_activity` (`flow_id`,`created_at`),
  ADD KEY `idx_campaign_activity` (`campaign_id`,`created_at`),
  ADD KEY `idx_reminder_activity` (`reminder_id`,`created_at`),
  ADD KEY `idx_subscriber_activity_created` (`created_at`),
  ADD KEY `idx_sa_flow_sub_type` (`flow_id`,`subscriber_id`,`type`),
  ADD KEY `idx_camp_type_var` (`campaign_id`,`type`,`variation`),
  ADD KEY `idx_flow_type_var` (`flow_id`,`type`,`variation`),
  ADD KEY `idx_flow_type_ref` (`flow_id`,`type`,`reference_id`,`created_at`),
  ADD KEY `idx_subact_type_ref` (`type`,`reference_id`),
  ADD KEY `idx_spam_debounce` (`subscriber_id`,`type`,`created_at`),
  ADD KEY `idx_subid_type_ref` (`subscriber_id`,`type`,`reference_id`),
  ADD KEY `idx_worker_check` (`subscriber_id`,`type`,`flow_id`,`created_at`),
  ADD KEY `idx_sub_created` (`subscriber_id`,`created_at`),
  ADD KEY `idx_campaign_sub_type` (`campaign_id`,`subscriber_id`,`type`),
  ADD KEY `idx_type_created` (`type`,`created_at`),
  ADD KEY `idx_campaign_type` (`campaign_id`,`type`),
  ADD KEY `idx_activity_flow_ref_type` (`flow_id`,`reference_id`,`type`),
  ADD KEY `idx_sa_flow_type` (`flow_id`,`type`),
  ADD KEY `idx_sa_sub_type` (`subscriber_id`,`type`),
  ADD KEY `idx_sa_subscriber` (`subscriber_id`),
  ADD KEY `idx_sa_type_created` (`type`,`created_at`),
  ADD KEY `idx_sub_type_date` (`subscriber_id`,`type`,`created_at`),
  ADD KEY `idx_sa_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `subscriber_flow_states`
--
ALTER TABLE `subscriber_flow_states`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_scheduled` (`scheduled_at`),
  ADD KEY `idx_flow_states_flow_status_created` (`flow_id`,`status`,`created_at`),
  ADD KEY `idx_flow_states_processing_opt` (`status`,`scheduled_at`,`updated_at`),
  ADD KEY `idx_sub_flow_status` (`subscriber_id`,`flow_id`,`status`),
  ADD KEY `idx_flow_state_step` (`flow_id`,`step_id`,`status`),
  ADD KEY `idx_flow_status_step` (`flow_id`,`status`,`step_id`),
  ADD KEY `idx_updated_at` (`updated_at`),
  ADD KEY `idx_flow_status_scheduled` (`flow_id`,`status`,`scheduled_at`),
  ADD KEY `idx_status_updated` (`status`,`updated_at`),
  ADD KEY `idx_status_created` (`status`,`created_at`),
  ADD KEY `idx_sub_flow_step` (`subscriber_id`,`flow_id`,`step_id`),
  ADD KEY `idx_flow_sub_status` (`flow_id`,`subscriber_id`,`status`),
  ADD KEY `idx_status_scheduled_created` (`status`,`scheduled_at`,`created_at`),
  ADD KEY `idx_sub_flow_created` (`subscriber_id`,`flow_id`,`created_at`),
  ADD KEY `idx_status_sched_flow` (`status`,`scheduled_at`,`flow_id`,`created_at`),
  ADD KEY `idx_priority_lookup` (`id`,`subscriber_id`,`flow_id`,`status`),
  ADD KEY `idx_sub_waiting` (`subscriber_id`,`status`),
  ADD KEY `idx_flow_status` (`flow_id`,`status`),
  ADD KEY `idx_sfs_sub_flow` (`subscriber_id`,`flow_id`),
  ADD KEY `idx_sfs_status_sched` (`status`,`scheduled_at`);

--
-- Chỉ mục cho bảng `subscriber_lists`
--
ALTER TABLE `subscriber_lists`
  ADD PRIMARY KEY (`subscriber_id`,`list_id`),
  ADD UNIQUE KEY `unique_subscriber_list` (`subscriber_id`,`list_id`),
  ADD KEY `idx_subscriber_lists_list` (`list_id`,`subscriber_id`),
  ADD KEY `idx_sl_subscriber` (`subscriber_id`);

--
-- Chỉ mục cho bảng `subscriber_notes`
--
ALTER TABLE `subscriber_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subscriber_notes_ibfk_1` (`subscriber_id`);

--
-- Chỉ mục cho bảng `subscriber_tags`
--
ALTER TABLE `subscriber_tags`
  ADD PRIMARY KEY (`subscriber_id`,`tag_id`),
  ADD UNIQUE KEY `uq_sub_tag` (`subscriber_id`,`tag_id`),
  ADD KEY `idx_tag_lookup` (`tag_id`,`subscriber_id`),
  ADD KEY `idx_subtags_tag` (`tag_id`);

--
-- Chỉ mục cho bảng `surveys`
--
ALTER TABLE `surveys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_survey_slug` (`slug`),
  ADD KEY `idx_surveys_workspace` (`workspace_id`),
  ADD KEY `idx_surveys_status` (`status`);

--
-- Chỉ mục cho bảng `survey_answer_details`
--
ALTER TABLE `survey_answer_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_answer_response` (`response_id`),
  ADD KEY `idx_answer_question` (`question_id`),
  ADD KEY `idx_answer_survey` (`survey_id`);

--
-- Chỉ mục cho bảng `survey_questions`
--
ALTER TABLE `survey_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_survey_questions_survey` (`survey_id`);

--
-- Chỉ mục cho bảng `survey_responses`
--
ALTER TABLE `survey_responses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_session_token` (`session_token`),
  ADD KEY `idx_survey_responses_survey` (`survey_id`),
  ADD KEY `idx_survey_responses_subscriber` (`subscriber_id`),
  ADD KEY `idx_survey_responses_submitted` (`submitted_at`),
  ADD KEY `idx_survey_time` (`survey_id`,`submitted_at`);

--
-- Chỉ mục cho bảng `system_audit_logs`
--
ALTER TABLE `system_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_user_created` (`user_id`,`created_at`);

--
-- Chỉ mục cho bảng `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_level` (`level`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Chỉ mục cho bảng `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`workspace_id`,`key`);

--
-- Chỉ mục cho bảng `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_tag_name` (`name`),
  ADD UNIQUE KEY `ws_name_unique` (`workspace_id`,`name`),
  ADD KEY `idx_tag_name_workspace` (`name`,`workspace_id`);

--
-- Chỉ mục cho bảng `templates`
--
ALTER TABLE `templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_type` (`type`);

--
-- Chỉ mục cho bảng `template_groups`
--
ALTER TABLE `template_groups`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `timestamp_buffer`
--
ALTER TABLE `timestamp_buffer`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_processed` (`processed`),
  ADD KEY `idx_sub_col` (`subscriber_id`,`column_name`);

--
-- Chỉ mục cho bảng `tracking_unique_cache`
--
ALTER TABLE `tracking_unique_cache`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_track_cache` (`subscriber_id`,`target_type`,`target_id`,`event_type`,`reference_key`(200));

--
-- Chỉ mục cho bảng `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_email` (`email`),
  ADD UNIQUE KEY `google_id` (`google_id`),
  ADD KEY `idx_username` (`username`);

--
-- Chỉ mục cho bảng `voucher_campaigns`
--
ALTER TABLE `voucher_campaigns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_voucher_campaigns_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `voucher_claims`
--
ALTER TABLE `voucher_claims`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_voucher_email` (`voucher_id`,`email`),
  ADD KEY `idx_voucher_status` (`voucher_id`,`status`),
  ADD KEY `idx_source` (`source_channel`,`source_id`);

--
-- Chỉ mục cho bảng `voucher_codes`
--
ALTER TABLE `voucher_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_campaign_code` (`campaign_id`,`code`),
  ADD KEY `idx_voucher_camp_stat` (`campaign_id`,`status`),
  ADD KEY `idx_claimed_source` (`claimed_source`,`claimed_source_id`),
  ADD KEY `idx_subscriber` (`subscriber_id`);

--
-- Chỉ mục cho bảng `web_blacklist`
--
ALTER TABLE `web_blacklist`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ip_address` (`ip_address`);

--
-- Chỉ mục cho bảng `web_daily_stats`
--
ALTER TABLE `web_daily_stats`
  ADD PRIMARY KEY (`date`,`property_id`,`url_hash`,`device_type`),
  ADD UNIQUE KEY `idx_prop_date` (`property_id`,`date`);

--
-- Chỉ mục cho bảng `web_events`
--
ALTER TABLE `web_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_idx` (`session_id`),
  ADD KEY `idx_ev_prop_time` (`property_id`,`created_at`),
  ADD KEY `idx_ev_heatmap` (`property_id`,`event_type`),
  ADD KEY `idx_ev_visitor` (`visitor_id`,`property_id`,`created_at`),
  ADD KEY `idx_evt_pv_type` (`page_view_id`,`event_type`),
  ADD KEY `idx_evt_vis_time` (`visitor_id`,`created_at`),
  ADD KEY `idx_event_type` (`event_type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_visitor_evt` (`visitor_id`),
  ADD KEY `idx_we_visitor_created` (`visitor_id`,`created_at`),
  ADD KEY `idx_we_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `web_page_views`
--
ALTER TABLE `web_page_views`
  ADD PRIMARY KEY (`id`),
  ADD KEY `prop_hash_idx` (`property_id`,`url_hash`),
  ADD KEY `idx_pv_prop_time` (`property_id`,`loaded_at`),
  ADD KEY `idx_pv_sess_time` (`session_id`,`loaded_at`),
  ADD KEY `idx_pv_vis_prop` (`visitor_id`,`property_id`,`loaded_at`),
  ADD KEY `idx_entrance` (`property_id`,`is_entrance`),
  ADD KEY `idx_session_id` (`session_id`),
  ADD KEY `idx_visitor_id` (`visitor_id`),
  ADD KEY `idx_url_hash` (`url_hash`),
  ADD KEY `idx_loaded_at` (`loaded_at`),
  ADD KEY `idx_wpv_visitor_prop` (`visitor_id`,`property_id`),
  ADD KEY `idx_web_pv_session_visitor` (`session_id`,`visitor_id`),
  ADD KEY `idx_wpv_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `web_properties`
--
ALTER TABLE `web_properties`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_api_key` (`api_key`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_prop_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `web_sessions`
--
ALTER TABLE `web_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `prop_time_idx` (`property_id`,`started_at`),
  ADD KEY `bounce_idx` (`is_bounce`),
  ADD KEY `idx_utm_source` (`utm_source`,`utm_medium`),
  ADD KEY `idx_last_active_at` (`last_active_at`),
  ADD KEY `idx_live_traffic` (`property_id`,`last_active_at`,`visitor_id`),
  ADD KEY `idx_prop_visitor` (`property_id`,`visitor_id`),
  ADD KEY `idx_visitor_id` (`visitor_id`),
  ADD KEY `idx_property_id` (`property_id`),
  ADD KEY `idx_started_at` (`started_at`),
  ADD KEY `idx_sess_prop_active` (`property_id`,`last_active_at`),
  ADD KEY `idx_ws_prop_created` (`property_id`,`created_at`),
  ADD KEY `idx_ws_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `web_visitors`
--
ALTER TABLE `web_visitors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_vid` (`visitor_id`),
  ADD KEY `idx_vis_prop_last` (`property_id`,`last_visit_at`),
  ADD KEY `idx_zalo_user_id` (`zalo_user_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_phone` (`phone`),
  ADD KEY `idx_visitors_sub` (`subscriber_id`),
  ADD KEY `idx_vis_ip` (`ip_address`),
  ADD KEY `idx_last_seen_at` (`last_seen_at`),
  ADD KEY `idx_wv_id` (`id`),
  ADD KEY `idx_wv_prop_sub` (`property_id`,`subscriber_id`);

--
-- Chỉ mục cho bảng `workspaces`
--
ALTER TABLE `workspaces`
  ADD PRIMARY KEY (`id`);

--
-- Chỉ mục cho bảng `workspace_users`
--
ALTER TABLE `workspace_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ws_user_unique` (`workspace_id`,`user_id`),
  ADD KEY `role_id` (`role_id`);

--
-- Chỉ mục cho bảng `zalo_activity_buffer`
--
ALTER TABLE `zalo_activity_buffer`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_processed` (`processed`);

--
-- Chỉ mục cho bảng `zalo_automation_scenarios`
--
ALTER TABLE `zalo_automation_scenarios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_oa_type` (`oa_config_id`,`type`),
  ADD KEY `idx_trigger` (`trigger_text`),
  ADD KEY `idx_zas_type` (`type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_zas_config_status_type` (`oa_config_id`,`status`,`type`),
  ADD KEY `idx_zas_oa_type_status` (`oa_config_id`,`type`,`status`);

--
-- Chỉ mục cho bảng `zalo_broadcasts`
--
ALTER TABLE `zalo_broadcasts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_oa_config` (`oa_config_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_scheduled_at` (`scheduled_at`);

--
-- Chỉ mục cho bảng `zalo_broadcast_tracking`
--
ALTER TABLE `zalo_broadcast_tracking`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_broadcast` (`broadcast_id`),
  ADD KEY `idx_user` (`zalo_user_id`),
  ADD KEY `idx_msg` (`zalo_msg_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_zbt_msg_id` (`zalo_msg_id`),
  ADD KEY `idx_zbt_broadcast_id` (`broadcast_id`);

--
-- Chỉ mục cho bảng `zalo_delivery_logs`
--
ALTER TABLE `zalo_delivery_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `oa_config_id` (`oa_config_id`),
  ADD KEY `idx_flow_step` (`flow_id`,`step_id`),
  ADD KEY `idx_subscriber` (`subscriber_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_sent_at` (`sent_at`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_zalo_msg_id` (`zalo_msg_id`),
  ADD KEY `idx_flow_id` (`flow_id`),
  ADD KEY `idx_flow_status` (`flow_id`,`status`),
  ADD KEY `idx_zdl_sub_camp` (`subscriber_id`,`campaign_id`),
  ADD KEY `idx_zdl_msg_id` (`zalo_msg_id`);

--
-- Chỉ mục cho bảng `zalo_lists`
--
ALTER TABLE `zalo_lists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_oa_config` (`oa_config_id`);

--
-- Chỉ mục cho bảng `zalo_message_queue`
--
ALTER TABLE `zalo_message_queue`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_zalo_user_processed` (`zalo_user_id`,`processed`),
  ADD KEY `idx_zmq_processed_created` (`processed`,`created_at`),
  ADD KEY `idx_zmq_user_processed` (`zalo_user_id`,`processed`);

--
-- Chỉ mục cho bảng `zalo_oa_configs`
--
ALTER TABLE `zalo_oa_configs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_oa_id` (`oa_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_token_status` (`token_status`,`token_expires_at`),
  ADD KEY `idx_zoa_workspace` (`workspace_id`);

--
-- Chỉ mục cho bảng `zalo_subscribers`
--
ALTER TABLE `zalo_subscribers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_list` (`zalo_list_id`,`zalo_user_id`),
  ADD KEY `idx_zalo_user` (`zalo_user_id`),
  ADD KEY `idx_lead_score` (`lead_score`),
  ADD KEY `idx_subscriber_id` (`subscriber_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_last_interaction_at` (`last_interaction_at`),
  ADD KEY `idx_oa_id` (`oa_id`),
  ADD KEY `idx_zalo_joined` (`joined_at`),
  ADD KEY `idx_list_interaction` (`zalo_list_id`,`last_interaction_at`),
  ADD KEY `idx_user_oa` (`zalo_user_id`,`oa_id`),
  ADD KEY `idx_zs_oa_follower` (`oa_id`,`is_follower`),
  ADD KEY `idx_zs_list_id` (`zalo_list_id`);

--
-- Chỉ mục cho bảng `zalo_subscriber_activity`
--
ALTER TABLE `zalo_subscriber_activity`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subscriber` (`subscriber_id`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `idx_zalo_msg_id` (`zalo_msg_id`),
  ADD KEY `idx_zsa_sub_type_ref` (`subscriber_id`,`type`,`reference_id`),
  ADD KEY `idx_sub_type` (`subscriber_id`,`type`),
  ADD KEY `idx_type_ref` (`type`,`reference_id`),
  ADD KEY `idx_sub_type_created` (`subscriber_id`,`type`,`created_at`),
  ADD KEY `idx_zsa_sub_type_created` (`subscriber_id`,`type`,`created_at`);

--
-- Chỉ mục cho bảng `zalo_templates`
--
ALTER TABLE `zalo_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_template` (`oa_config_id`,`template_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_oa_config_id` (`oa_config_id`);

--
-- Chỉ mục cho bảng `zalo_user_messages`
--
ALTER TABLE `zalo_user_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user` (`zalo_user_id`),
  ADD KEY `idx_created` (`created_at`),
  ADD KEY `idx_direction` (`direction`),
  ADD KEY `idx_zum_user_dir_created` (`zalo_user_id`,`direction`,`created_at`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `activity_buffer`
--
ALTER TABLE `activity_buffer`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `admin_logs`
--
ALTER TABLE `admin_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_allowed_emails`
--
ALTER TABLE `ai_allowed_emails`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_chatbot_meta_settings`
--
ALTER TABLE `ai_chatbot_meta_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_feedback`
--
ALTER TABLE `ai_feedback`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_group_permissions`
--
ALTER TABLE `ai_group_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_messages`
--
ALTER TABLE `ai_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_org_access_tokens`
--
ALTER TABLE `ai_org_access_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_org_messages`
--
ALTER TABLE `ai_org_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_org_refresh_tokens`
--
ALTER TABLE `ai_org_refresh_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_org_users`
--
ALTER TABLE `ai_org_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_org_user_categories`
--
ALTER TABLE `ai_org_user_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_suggested_links`
--
ALTER TABLE `ai_suggested_links`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_usage_logs`
--
ALTER TABLE `ai_usage_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_user_drive_permissions`
--
ALTER TABLE `ai_user_drive_permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_workspace_files`
--
ALTER TABLE `ai_workspace_files`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `ai_workspace_versions`
--
ALTER TABLE `ai_workspace_versions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `api_rate_limits`
--
ALTER TABLE `api_rate_limits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `flow_event_queue`
--
ALTER TABLE `flow_event_queue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `login_attempts`
--
ALTER TABLE `login_attempts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `mail_delivery_logs`
--
ALTER TABLE `mail_delivery_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `meta_customer_journey`
--
ALTER TABLE `meta_customer_journey`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `meta_message_logs`
--
ALTER TABLE `meta_message_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `raw_event_buffer`
--
ALTER TABLE `raw_event_buffer`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `segment_exclusions`
--
ALTER TABLE `segment_exclusions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `stats_update_buffer`
--
ALTER TABLE `stats_update_buffer`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `subscriber_activity`
--
ALTER TABLE `subscriber_activity`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `subscriber_flow_states`
--
ALTER TABLE `subscriber_flow_states`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `system_audit_logs`
--
ALTER TABLE `system_audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `timestamp_buffer`
--
ALTER TABLE `timestamp_buffer`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `tracking_unique_cache`
--
ALTER TABLE `tracking_unique_cache`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `web_blacklist`
--
ALTER TABLE `web_blacklist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `web_events`
--
ALTER TABLE `web_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `web_page_views`
--
ALTER TABLE `web_page_views`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `web_sessions`
--
ALTER TABLE `web_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `workspaces`
--
ALTER TABLE `workspaces`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `workspace_users`
--
ALTER TABLE `workspace_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `zalo_activity_buffer`
--
ALTER TABLE `zalo_activity_buffer`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `zalo_message_queue`
--
ALTER TABLE `zalo_message_queue`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `zalo_subscriber_activity`
--
ALTER TABLE `zalo_subscriber_activity`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `zalo_user_messages`
--
ALTER TABLE `zalo_user_messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Ràng buộc đối với các bảng kết xuất
--

--
-- Ràng buộc cho bảng `campaign_reminders`
--
ALTER TABLE `campaign_reminders`
  ADD CONSTRAINT `campaign_reminders_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `flow_enrollments`
--
ALTER TABLE `flow_enrollments`
  ADD CONSTRAINT `fk_fe_flow` FOREIGN KEY (`flow_id`) REFERENCES `flows` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_fe_subscriber` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `flow_event_queue`
--
ALTER TABLE `flow_event_queue`
  ADD CONSTRAINT `fk_feq_subscriber` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_slug`) REFERENCES `permissions` (`slug`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `segment_exclusions`
--
ALTER TABLE `segment_exclusions`
  ADD CONSTRAINT `fk_se_segment` FOREIGN KEY (`segment_id`) REFERENCES `segments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_se_subscriber` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `subscriber_activity`
--
ALTER TABLE `subscriber_activity`
  ADD CONSTRAINT `fk_sa_subscriber` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subscriber_activity_ibfk_1` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `subscriber_flow_states`
--
ALTER TABLE `subscriber_flow_states`
  ADD CONSTRAINT `fk_sfs_flow` FOREIGN KEY (`flow_id`) REFERENCES `flows` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sfs_subscriber` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subscriber_flow_states_ibfk_1` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subscriber_flow_states_ibfk_2` FOREIGN KEY (`flow_id`) REFERENCES `flows` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `subscriber_lists`
--
ALTER TABLE `subscriber_lists`
  ADD CONSTRAINT `fk_sl_list` FOREIGN KEY (`list_id`) REFERENCES `lists` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sl_subscriber` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subscriber_lists_ibfk_1` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subscriber_lists_ibfk_2` FOREIGN KEY (`list_id`) REFERENCES `lists` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `subscriber_notes`
--
ALTER TABLE `subscriber_notes`
  ADD CONSTRAINT `fk_sn_subscriber` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subscriber_notes_ibfk_1` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `subscriber_tags`
--
ALTER TABLE `subscriber_tags`
  ADD CONSTRAINT `fk_st_subscriber` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_st_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sub_tags_subscriber` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sub_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `voucher_codes`
--
ALTER TABLE `voucher_codes`
  ADD CONSTRAINT `voucher_codes_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `voucher_campaigns` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `workspace_users`
--
ALTER TABLE `workspace_users`
  ADD CONSTRAINT `workspace_users_ibfk_1` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `workspace_users_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `zalo_automation_scenarios`
--
ALTER TABLE `zalo_automation_scenarios`
  ADD CONSTRAINT `fk_zalo_automation_oa` FOREIGN KEY (`oa_config_id`) REFERENCES `zalo_oa_configs` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `zalo_broadcast_tracking`
--
ALTER TABLE `zalo_broadcast_tracking`
  ADD CONSTRAINT `fk_tracking_broadcast` FOREIGN KEY (`broadcast_id`) REFERENCES `zalo_broadcasts` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `zalo_delivery_logs`
--
ALTER TABLE `zalo_delivery_logs`
  ADD CONSTRAINT `zalo_delivery_logs_ibfk_1` FOREIGN KEY (`flow_id`) REFERENCES `flows` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `zalo_delivery_logs_ibfk_2` FOREIGN KEY (`subscriber_id`) REFERENCES `subscribers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `zalo_delivery_logs_ibfk_3` FOREIGN KEY (`oa_config_id`) REFERENCES `zalo_oa_configs` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `zalo_subscribers`
--
ALTER TABLE `zalo_subscribers`
  ADD CONSTRAINT `zalo_subscribers_ibfk_1` FOREIGN KEY (`zalo_list_id`) REFERENCES `zalo_lists` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `zalo_subscriber_activity`
--
ALTER TABLE `zalo_subscriber_activity`
  ADD CONSTRAINT `zalo_subscriber_activity_ibfk_1` FOREIGN KEY (`subscriber_id`) REFERENCES `zalo_subscribers` (`id`) ON DELETE CASCADE;

--
-- Ràng buộc cho bảng `zalo_templates`
--
ALTER TABLE `zalo_templates`
  ADD CONSTRAINT `zalo_templates_ibfk_1` FOREIGN KEY (`oa_config_id`) REFERENCES `zalo_oa_configs` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
