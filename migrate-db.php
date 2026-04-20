<?php
require 'api/db_connect.php';
$sql = "
CREATE TABLE IF NOT EXISTS `email_sections` (
  `id` char(36) NOT NULL,
  `workspace_id` int(11) DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `data_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`data_json`)),
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_workspace` (`workspace_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
";
$pdo->exec($sql);
echo "DB Updated successfully!";
?>
