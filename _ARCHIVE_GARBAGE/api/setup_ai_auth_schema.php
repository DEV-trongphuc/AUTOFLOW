<?php
// api/setup_ai_auth_schema.php
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');

function logSchema($msg)
{
    echo $msg . "\n";
}

try {
    logSchema("Starting AI Auth Schema Update...");

    // 1. ai_allowed_emails
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_allowed_emails (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(191) NOT NULL UNIQUE,
        group_id VARCHAR(100) DEFAULT 'default',
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    logSchema("Table `ai_allowed_emails` checked/created.");

    // 2. ai_usage_logs
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(191) NOT NULL,
        chatbot_id VARCHAR(100) NOT NULL,
        message_count INT DEFAULT 0,
        prompt_tokens INT DEFAULT 0,
        completion_tokens INT DEFAULT 0,
        duration_seconds INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    logSchema("Table `ai_usage_logs` checked/created.");

    // 3. ai_group_permissions
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_group_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id VARCHAR(100) NOT NULL,
        chatbot_id VARCHAR(100) NOT NULL,
        permission_type ENUM('view', 'chat', 'admin') DEFAULT 'chat',
        UNIQUE KEY `unique_group_bot` (group_id, chatbot_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    logSchema("Table `ai_group_permissions` checked/created.");

    // 4. ai_user_drive_permissions
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_user_drive_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(191) NOT NULL UNIQUE,
        access_token TEXT,
        refresh_token TEXT,
        expires_at DATETIME,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
    logSchema("Table `ai_user_drive_permissions` checked/created.");

    // 5. Modify ai_org_conversations to include user_email
    $columns = $pdo->query("SHOW COLUMNS FROM ai_org_conversations LIKE 'user_email'")->fetchAll();
    if (empty($columns)) {
        $pdo->exec("ALTER TABLE ai_org_conversations ADD COLUMN user_email VARCHAR(191) AFTER visitor_id;");
        $pdo->exec("CREATE INDEX idx_user_email ON ai_org_conversations(user_email);");
        logSchema("Column `user_email` added to `ai_org_conversations`.");
    } else {
        logSchema("Column `user_email` already exists in `ai_org_conversations`.");
    }

    logSchema("AI Auth Schema Update completed successfully.");

} catch (Exception $e) {
    logSchema("ERROR: " . $e->getMessage());
}
