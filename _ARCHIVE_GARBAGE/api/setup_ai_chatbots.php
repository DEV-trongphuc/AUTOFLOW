<?php
header('Content-Type: text/plain; charset=utf-8');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/db_connect.php';

// Check PDO
if (!isset($pdo)) {
  die("Error: Database connection variable \$pdo not found in db_connect.php");
}

try {
  echo "Starting AI Chatbots Setup (PDO)...\n";

  // 1. Create table ai_chatbot_categories
  $sqlCategories = "CREATE TABLE IF NOT EXISTS `ai_chatbot_categories` (
        `id` varchar(100) NOT NULL,
        `name` varchar(255) NOT NULL,
        `description` text,
        `brand_color` varchar(50) DEFAULT '#ffa900',
        `gemini_api_key` varchar(255) DEFAULT '',
        `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
        `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
  $pdo->exec($sqlCategories);
  echo "[OK] Table 'ai_chatbot_categories' checked/created successfully.\n";

  // Add columns if missing
  $stmt = $pdo->query("SHOW COLUMNS FROM `ai_chatbot_categories` LIKE 'brand_color'");
  if (!$stmt->fetch()) {
    $pdo->exec("ALTER TABLE `ai_chatbot_categories` ADD `brand_color` varchar(50) DEFAULT '#ffa900' AFTER `description`");
    echo "[OK] Added brand_color to categories.\n";
  }
  $stmt = $pdo->query("SHOW COLUMNS FROM `ai_chatbot_categories` LIKE 'gemini_api_key'");
  if (!$stmt->fetch()) {
    $pdo->exec("ALTER TABLE `ai_chatbot_categories` ADD `gemini_api_key` varchar(255) DEFAULT '' AFTER `brand_color`");
    echo "[OK] Added gemini_api_key to categories.\n";
  }
  $stmt = $pdo->query("SHOW COLUMNS FROM `ai_chatbot_categories` LIKE 'bot_avatar'");
  if (!$stmt->fetch()) {
    $pdo->exec("ALTER TABLE `ai_chatbot_categories` ADD `bot_avatar` text AFTER `gemini_api_key`");
    echo "[OK] Added bot_avatar to categories.\n";
  }

  // 2. Create table ai_chatbots
  $sql = "CREATE TABLE IF NOT EXISTS `ai_chatbots` (
      `id` varchar(100) NOT NULL,
      `name` varchar(255) NOT NULL,
      `description` text,
      `category_id` varchar(100) DEFAULT NULL, 
      `is_enabled` tinyint(1) DEFAULT 0,
      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_enabled` (`is_enabled`),
      KEY `idx_created` (`created_at`),
      KEY `idx_category` (`category_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

  $pdo->exec($sql);
  echo "[OK] Table 'ai_chatbots' checked/created successfully.\n";

  // Check if category_id exists (backward compatibility)
  $stmt = $pdo->query("SHOW COLUMNS FROM `ai_chatbots` LIKE 'category_id'");
  if (!$stmt->fetch()) {
    echo "Adding missing column 'category_id'...\n";
    $pdo->exec("ALTER TABLE `ai_chatbots` ADD `category_id` varchar(100) DEFAULT NULL AFTER `description`, ADD INDEX `idx_category` (`category_id`)");
    echo "[OK] Column added.\n";
  }

  // 3. Create table ai_chatbot_settings
  $sqlSettings = "CREATE TABLE IF NOT EXISTS `ai_chatbot_settings` (
        `property_id` varchar(100) NOT NULL,
        `is_enabled` tinyint(1) DEFAULT 0,
        `bot_name` varchar(255) DEFAULT '',
        `company_name` varchar(255) DEFAULT '',
        `brand_color` varchar(50) DEFAULT '#ffa900',
        `bot_avatar` text,
        `welcome_msg` text,
        `persona_prompt` text,
        `gemini_api_key` varchar(255) DEFAULT '',
        `quick_actions` json DEFAULT NULL,
        `system_instruction` text,
        `fast_replies` json DEFAULT NULL,
        `similarity_threshold` float DEFAULT 0.55,
        `top_k` int DEFAULT 12,
        `history_limit` int DEFAULT 15,
        `chunk_size` int DEFAULT 1000,
        `chunk_overlap` int DEFAULT 120,
        `gemini_cache_name` varchar(255) DEFAULT NULL,
        `gemini_cache_expires_at` datetime DEFAULT NULL,
        PRIMARY KEY (`property_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

  $pdo->exec($sqlSettings);
  echo "[OK] Table 'ai_chatbot_settings' checked/created successfully.\n";

  // 4. Create table ai_training_docs IF NOT EXISTS
  $sqlDocs = "CREATE TABLE IF NOT EXISTS `ai_training_docs` (
        `id` varchar(100) NOT NULL,
        `property_id` varchar(255) NOT NULL,
        `parent_id` varchar(255) DEFAULT NULL,
        `type` enum('url','text','file','folder','sitemap') NOT NULL,
        `name` varchar(255) NOT NULL,
        `content` longtext,
        `url` varchar(500) Default NULL,
        `status` enum('pending','processing','trained','error') DEFAULT 'pending',
        `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
        `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        `error_message` text,
        `file_path` varchar(255) DEFAULT NULL,
        `character_count` int DEFAULT 0,
        PRIMARY KEY (`id`),
        KEY `idx_property` (`property_id`),
        KEY `idx_parent` (`parent_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
  $pdo->exec($sqlDocs);
  echo "[OK] Table 'ai_training_docs' checked/created successfully.\n";

  // 5. Create table ai_chat_queries IF NOT EXISTS
  $sqlQueries = "CREATE TABLE IF NOT EXISTS `ai_chat_queries` (
        `id` varchar(100) NOT NULL,
        `property_id` varchar(100) NOT NULL,
        `session_id` varchar(100) DEFAULT NULL,
        `query_text` text,
        `response_text` text,
        `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_property` (`property_id`),
        KEY `idx_session` (`session_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
  $pdo->exec($sqlQueries);
  echo "[OK] Table 'ai_chat_queries' checked/created successfully.\n";

  echo "\nSetup completed! All necessary tables are ready.";

} catch (PDOException $e) {
  http_response_code(500);
  echo "\n[ERROR] Database error: " . $e->getMessage();
} catch (Exception $e) {
  http_response_code(500);
  echo "\n[ERROR] Error: " . $e->getMessage();
}
?>