<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

/**
 * OPTIMIZED WEB TRACKING SCHEMA v2
 * Focus: High Performance on Writes, Pre-aggregated Stats for fast reads, Storage Efficiency.
 * 
 * optimizations:
 * 1. BIGINT for transactional tables (sessions, views, events).
 * 2. URL Hashing (CRC32/MD5) for high-speed grouping/indexing of URLs.
 * 3. Daily Aggregate Table (web_daily_stats) to prevent scanning millions of rows for reports.
 * 4. 'is_bounce' flag pre-calculated on sessions.
 */

$commands = [
    // 1. Properties (Metadata - Low Volume)
    "CREATE TABLE IF NOT EXISTS `web_properties` (
        `id` char(36) NOT NULL,
        `name` varchar(255) NOT NULL,
        `domain` varchar(255) NOT NULL,
        `settings` text DEFAULT NULL,
        `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 2. Visitors (Identity - Medium Volume)
    "CREATE TABLE IF NOT EXISTS `web_visitors` (
        `id` char(36) NOT NULL,
        `property_id` char(36) NOT NULL,
        `subscriber_id` char(36) DEFAULT NULL,
        `first_visit_at` datetime DEFAULT NULL,
        `last_visit_at` datetime DEFAULT NULL,
        `visit_count` int UNSIGNED DEFAULT 0,
        `device_fingerprint` varchar(64) DEFAULT NULL,
        `data` json DEFAULT NULL, -- Attributes like name, email cache
        PRIMARY KEY (`id`),
        KEY `property_idx` (`property_id`),
        KEY `sub_idx` (`subscriber_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 3. Sessions (Transactional - High Volume - Optimized)
    "CREATE TABLE IF NOT EXISTS `web_sessions` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
        `visitor_id` char(36) NOT NULL,
        `property_id` char(36) NOT NULL,
        `started_at` datetime NOT NULL,
        `last_active_at` datetime NOT NULL,
        `ended_at` datetime DEFAULT NULL, -- Null until closed/timeout
        `entry_url` varchar(768) DEFAULT NULL,
        `referrer_source` varchar(100) DEFAULT NULL, -- google, facebook, direct
        `page_count` smallint UNSIGNED DEFAULT 0,
        `duration_seconds` int UNSIGNED DEFAULT 0,
        `is_bounce` tinyint(1) DEFAULT 1, -- Defaults to true, set to false on 2nd pageview/scroll
        `device_type` enum('mobile','desktop','tablet','bot') DEFAULT 'desktop',
        `browser` varchar(50) DEFAULT NULL,
        `os` varchar(50) DEFAULT NULL,
        PRIMARY KEY (`id`),
        KEY `visitor_idx` (`visitor_id`),
        KEY `prop_time_idx` (`property_id`, `started_at`), -- Core reporting index
        KEY `bounce_idx` (`is_bounce`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 4. Page Views (Transactional - Very High Volume)
    "CREATE TABLE IF NOT EXISTS `web_page_views` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
        `session_id` bigint UNSIGNED NOT NULL,
        `property_id` char(36) NOT NULL,
        `visitor_id` char(36) NOT NULL,
        `url_hash` varchar(32) NOT NULL, -- MD5 of URL for fast grouping
        `url` text NOT NULL, -- Full URL storage
        `title` varchar(500) DEFAULT NULL,
        `referrer` text DEFAULT NULL,
        `loaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
        `time_on_page` int UNSIGNED DEFAULT 0,
        `scroll_depth` tinyint UNSIGNED DEFAULT 0,
        PRIMARY KEY (`id`),
        KEY `session_idx` (`session_id`),
        KEY `prop_hash_idx` (`property_id`, `url_hash`) -- For fast 'Top Pages' queries
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // 5. Events (Transactional - High Volume - Lean)
    "CREATE TABLE IF NOT EXISTS `web_events` (
        `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
        `session_id` bigint UNSIGNED NOT NULL,
        `page_view_id` bigint UNSIGNED DEFAULT NULL,
        `visitor_id` char(36) NOT NULL, -- Added for fast interaction lookups by user
        `property_id` char(36) NOT NULL,
        `event_type` varchar(50) NOT NULL, -- click, form, custom
        `target_selector` varchar(255) DEFAULT NULL, -- .btn-primary
        `target_text` varchar(255) DEFAULT NULL, -- 'Buy Now'
        `meta_data` json DEFAULT NULL, -- {x:100, y:200, val:50}
        `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `session_idx` (`session_id`),
        KEY `pv_idx` (`page_view_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=COMPRESSED;",

    // 6. Daily Aggregated Stats (Reporting - Ultra Fast)
    "CREATE TABLE IF NOT EXISTS `web_daily_stats` (
        `date` date NOT NULL,
        `property_id` char(36) NOT NULL,
        `url_hash` varchar(32) NOT NULL, -- 'GLOBAL' for site-wide, MD5 for specific pages
        `device_type` enum('mobile','desktop','tablet','bot') NOT NULL DEFAULT 'desktop',
        `page_views` int UNSIGNED DEFAULT 0,
        `visitors` int UNSIGNED DEFAULT 0,
        `sessions` int UNSIGNED DEFAULT 0,
        `bounces` int UNSIGNED DEFAULT 0,
        `total_duration` bigint UNSIGNED DEFAULT 0,
        `total_scroll` bigint UNSIGNED DEFAULT 0,
        `scroll_samples` int UNSIGNED DEFAULT 0, -- To calc avg scroll
        PRIMARY KEY (`date`, `property_id`, `url_hash`, `device_type`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",

    // Migration for existing table
    "ALTER TABLE `web_daily_stats` ADD COLUMN IF NOT EXISTS `device_type` enum('mobile','desktop','tablet','bot') NOT NULL DEFAULT 'desktop' AFTER `url_hash` ",
    "ALTER TABLE `web_daily_stats` DROP PRIMARY KEY, ADD PRIMARY KEY (`date`, `property_id`, `url_hash`, `device_type`)",

    // 7. PERFORMANCE INDEXES (Applied after table creation)

    // Fix: Ensure visitor_id exists in events if table was already created
    // We try to add the column. If it exists, this might fail or be ignored depending on driver, 
    // but the loop catches specific errors.
    // For safer updates, we can use a separate block logic, but here we rely on the loop.
    "ALTER TABLE `web_events` ADD COLUMN `visitor_id` char(36) NOT NULL AFTER `page_view_id`",

    // Using ALTER IGNORE pattern usually not supported in PDO directly for errors, 
    // so we rely on the loop's try/catch to skip if index exists.
    "CREATE INDEX `idx_pv_visitor` ON `web_page_views` (`visitor_id`, `property_id`, `loaded_at`)",
    "CREATE INDEX `idx_pv_prop_time` ON `web_page_views` (`property_id`, `loaded_at`)",

    "CREATE INDEX `idx_ev_prop_time` ON `web_events` (`property_id`, `created_at`)",
    "CREATE INDEX `idx_ev_visitor` ON `web_events` (`visitor_id`, `property_id`, `created_at`)",
    "CREATE INDEX `idx_ev_heatmap` ON `web_events` (`property_id`, `event_type`)",

    // UTM Tracking Columns
    "ALTER TABLE `web_sessions` ADD COLUMN `utm_source` varchar(100) DEFAULT NULL AFTER `referrer_source`",
    "ALTER TABLE `web_sessions` ADD COLUMN `utm_medium` varchar(100) DEFAULT NULL AFTER `utm_source`",
    "ALTER TABLE `web_sessions` ADD COLUMN `utm_campaign` varchar(255) DEFAULT NULL AFTER `utm_medium`",
    "ALTER TABLE `web_sessions` ADD COLUMN `utm_content` varchar(255) DEFAULT NULL AFTER `utm_campaign`",
    "ALTER TABLE `web_sessions` ADD COLUMN `utm_term` varchar(255) DEFAULT NULL AFTER `utm_content`",
    "CREATE INDEX `idx_utm_source` ON `web_sessions` (`utm_source`, `utm_medium`)",

    // Visitor IP & Location
    "ALTER TABLE `web_visitors` ADD COLUMN `ip_address` varchar(45) DEFAULT NULL AFTER `device_fingerprint`",
    "ALTER TABLE `web_visitors` ADD COLUMN `country` varchar(100) DEFAULT NULL AFTER `ip_address`",
    "ALTER TABLE `web_visitors` ADD COLUMN `city` varchar(100) DEFAULT NULL AFTER `country`",
    "CREATE INDEX `idx_vis_prop_last` ON `web_visitors` (`property_id`, `last_visit_at`)",

    // 8. Blacklist (Security)
    "CREATE TABLE IF NOT EXISTS `web_blacklist` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `ip_address` VARCHAR(45) NOT NULL UNIQUE,
        `reason` VARCHAR(255),
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
];

$results = [];
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

foreach ($commands as $sql) {
    try {
        $pdo->exec($sql);
        $results[] = "Success: " . substr($sql, 0, 50) . "...";
    } catch (PDOException $e) {
        $results[] = "Error: " . $e->getMessage();
    }
}

echo json_encode(['success' => true, 'message' => 'Optimized Tracking Schema Applied', 'details' => $results]);
?>