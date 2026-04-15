CREATE TABLE IF NOT EXISTS `system_audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) NOT NULL,
  `user_name` varchar(255) DEFAULT NULL,
  `module` varchar(50) NOT NULL COMMENT 'e.g. campaigns, flows, audience',
  `action` varchar(50) NOT NULL COMMENT 'e.g. create, update, delete, play, pause',
  `target_id` varchar(100) DEFAULT NULL,
  `target_name` varchar(255) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
