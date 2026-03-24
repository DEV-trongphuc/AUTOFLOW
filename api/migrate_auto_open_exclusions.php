<?php
// api/migrate_auto_open_exclusions.php
require_once 'db_connect.php';

try {
    // Add auto_open_excluded_pages column if it doesn't exist
    $pdo->exec("
        ALTER TABLE `ai_chatbot_settings` 
        ADD COLUMN IF NOT EXISTS `auto_open_excluded_pages` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`auto_open_excluded_pages`))
        AFTER `excluded_paths`;
    ");

    // Add auto_open_excluded_paths column if it doesn't exist
    $pdo->exec("
        ALTER TABLE `ai_chatbot_settings` 
        ADD COLUMN IF NOT EXISTS `auto_open_excluded_paths` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`auto_open_excluded_paths`))
        AFTER `auto_open_excluded_pages`;
    ");

    echo json_encode(['success' => true, 'message' => 'Columns auto_open_excluded_pages and auto_open_excluded_paths added successfully']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
