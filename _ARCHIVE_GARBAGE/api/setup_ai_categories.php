<?php
header('Content-Type: text/plain; charset=utf-8');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db_connect.php';

// Check if $pdo exists (from db_connect.php)
if (!isset($pdo)) {
    die("Error: Database connection variable \$pdo not found. Please check db_connect.php");
}

try {
    echo "Starting migration (PDO Mode)...\n";

    // 1. Create ai_chatbot_categories table
    $sql1 = "CREATE TABLE IF NOT EXISTS `ai_chatbot_categories` (
      `id` varchar(100) NOT NULL,
      `name` varchar(255) NOT NULL,
      `description` text,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $pdo->exec($sql1);
    echo "[OK] Table 'ai_chatbot_categories' checked/created.\n";

    // 2. Check and add category_id column to ai_chatbots
    // Need to confirm table ai_chatbots exists first
    $stmtCheckTable = $pdo->query("SHOW TABLES LIKE 'ai_chatbots'");
    if ($stmtCheckTable->rowCount() == 0) {
        // Create table first if not exists (fallback)
        echo "Table 'ai_chatbots' missing. Creating it...\n";
        $sqlCreateChatbot = "CREATE TABLE IF NOT EXISTS `ai_chatbots` (
          `id` varchar(100) NOT NULL,
          `name` varchar(255) NOT NULL,
          `description` text,
          `is_enabled` tinyint(1) DEFAULT 0,
          `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
          `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (`id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
        $pdo->exec($sqlCreateChatbot);
    }

    $stmt = $pdo->query("SHOW COLUMNS FROM `ai_chatbots` LIKE 'category_id'");
    $col = $stmt->fetch();

    if ($col) {
        echo "[OK] Column 'category_id' already exists in 'ai_chatbots'.\n";
    } else {
        echo "Column 'category_id' missing. Adding it...\n";
        $sql2 = "ALTER TABLE `ai_chatbots` ADD `category_id` varchar(100) DEFAULT NULL AFTER `description`, ADD INDEX `idx_category` (`category_id`)";
        $pdo->exec($sql2);
        echo "[SUCCESS] Added 'category_id' column to 'ai_chatbots'.\n";
    }

    echo "\nMigration completed successfully!";

} catch (PDOException $e) {
    echo "\n[ERROR] Database error: " . $e->getMessage();
    http_response_code(500);
} catch (Exception $e) {
    echo "\n[ERROR] General error: " . $e->getMessage();
    http_response_code(500);
}
?>