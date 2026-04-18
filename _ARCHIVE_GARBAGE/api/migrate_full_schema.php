<?php
// api/migrate_full_schema.php
require_once 'db_connect.php';

header('Content-Type: text/plain; charset=utf-8');

function addColumnIfNotExists($pdo, $table, $column, $definition)
{
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
        if ($stmt->rowCount() == 0) {
            echo " -> Adding column '$column' to table '$table'...\n";
            $pdo->exec("ALTER TABLE `$table` ADD COLUMN $column $definition");
            echo "    [OK] Added.\n";
        } else {
            echo " -> Column '$column' already exists in '$table'.\n";
        }
    } catch (Exception $e) {
        echo "    [ERROR] Failed to add column '$column': " . $e->getMessage() . "\n";
    }
}

echo "========== STARTING FULL SCHEMA MIGRATION ==========\n\n";

// 1. ai_chatbot_settings
echo "[CHECKING] ai_chatbot_settings...\n";
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_chatbot_settings (
        property_id VARCHAR(50) PRIMARY KEY,
        is_enabled TINYINT(1) DEFAULT 1
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (Exception $e) {
}

addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'bot_name', "VARCHAR(100) DEFAULT 'AI Assistant'");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'company_name', "VARCHAR(100) DEFAULT 'My Company'");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'brand_color', "VARCHAR(20) DEFAULT '#ffa900'");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'bot_avatar', "TEXT DEFAULT NULL");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'welcome_msg', "TEXT DEFAULT NULL");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'persona_prompt', "TEXT DEFAULT NULL");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'gemini_api_key', "TEXT DEFAULT NULL");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'quick_actions', "JSON DEFAULT NULL");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'system_instruction', "TEXT DEFAULT NULL");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'fast_replies', "JSON DEFAULT NULL");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'similarity_threshold', "FLOAT DEFAULT 0.65");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'top_k', "INT DEFAULT 5");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'history_limit', "INT DEFAULT 10");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'chunk_size', "INT DEFAULT 400");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'chunk_overlap', "INT DEFAULT 60");
// New Columns
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'widget_position', "VARCHAR(50) DEFAULT 'bottom-right'");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'excluded_pages', "JSON DEFAULT NULL");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'excluded_paths', "JSON DEFAULT NULL");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'auto_open', "TINYINT(1) DEFAULT 0");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'temperature', "FLOAT DEFAULT 1.0");
addColumnIfNotExists($pdo, 'ai_chatbot_settings', 'max_output_tokens', "INT DEFAULT 2048");


// 2. subscribers
echo "\n[CHECKING] subscribers...\n";
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS subscribers (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(191)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
} catch (Exception $e) {
}

addColumnIfNotExists($pdo, 'subscribers', 'property_id', "VARCHAR(50) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'phone', "VARCHAR(20) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'first_name', "VARCHAR(100) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'last_name', "VARCHAR(100) DEFAULT NULL");

// 2.2 subscribers - Additional tracking columns
addColumnIfNotExists($pdo, 'subscribers', 'last_os', "VARCHAR(50) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'last_browser', "VARCHAR(50) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'last_device', "VARCHAR(50) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'last_city', "VARCHAR(100) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'last_country', "VARCHAR(100) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'last_ip', "VARCHAR(45) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'zalo_user_id', "VARCHAR(100) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'address', "TEXT DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'phone_number', "VARCHAR(20) DEFAULT NULL");
addColumnIfNotExists($pdo, 'subscribers', 'source', "VARCHAR(100) DEFAULT NULL");

// 2.3 subscribers - Performance Indexes
echo " -> Adding indexes to subscribers...\n";
try {
    $stmt = $pdo->query("SHOW INDEX FROM subscribers WHERE Key_name = 'idx_sub_email'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("CREATE INDEX idx_sub_email ON subscribers (email)");
        echo "    [OK] Added idx_sub_email.\n";
    }
    $stmt = $pdo->query("SHOW INDEX FROM subscribers WHERE Key_name = 'idx_sub_phone'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("CREATE INDEX idx_sub_phone ON subscribers (phone_number)");
        echo "    [OK] Added idx_sub_phone.\n";
    }
    $stmt = $pdo->query("SHOW INDEX FROM subscribers WHERE Key_name = 'idx_sub_property'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("CREATE INDEX idx_sub_property ON subscribers (property_id)");
        echo "    [OK] Added idx_sub_property.\n";
    }
    $stmt = $pdo->query("SHOW INDEX FROM subscribers WHERE Key_name = 'idx_sub_zalo'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("CREATE INDEX idx_sub_zalo ON subscribers (zalo_user_id)");
        echo "    [OK] Added idx_sub_zalo.\n";
    }
} catch (Exception $e) {
    echo "    [ERROR] Indexing subscribers failed: " . $e->getMessage() . "\n";
}


// 3. web_page_views
echo "\n[CHECKING] web_page_views...\n";
addColumnIfNotExists($pdo, 'web_page_views', 'load_time_ms', "INT UNSIGNED DEFAULT 0 AFTER loaded_at");
addColumnIfNotExists($pdo, 'web_page_views', 'is_entrance', "TINYINT(1) DEFAULT 0 AFTER load_time_ms");

try {
    $stmt = $pdo->query("SHOW INDEX FROM web_page_views WHERE Key_name = 'idx_entrance'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("CREATE INDEX idx_entrance ON web_page_views (property_id, is_entrance)");
        echo " -> Added index 'idx_entrance' to web_page_views.\n";
    }
} catch (Exception $e) {
}

// 4. web_blacklist
echo "\n[CHECKING] web_blacklist...\n";
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS web_blacklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL UNIQUE,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo " -> Table 'web_blacklist' checked.\n";
} catch (Exception $e) {
}

// 5. web_events Optimization
echo "\n[CHECKING] web_events...\n";
try {
    $stmt = $pdo->query("SHOW INDEX FROM web_events WHERE Key_name = 'idx_flood_control'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("CREATE INDEX idx_flood_control ON web_events (visitor_id, created_at)");
        echo " -> Added index 'idx_flood_control' to web_events.\n";
    }
} catch (Exception $e) {
}


// 6. subscriber_activity Optimization (For Flow branching)
echo "\n[CHECKING] subscriber_activity index...\n";
try {
    $stmt = $pdo->query("SHOW INDEX FROM subscriber_activity WHERE Key_name = 'idx_flow_branching'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("CREATE INDEX idx_flow_branching ON subscriber_activity (subscriber_id, type, created_at)");
        echo " -> Added index 'idx_flow_branching' to subscriber_activity.\n";
    }
} catch (Exception $e) {
}


// 7. web_visitors Optimization
echo "\n[CHECKING] web_visitors...\n";
addColumnIfNotExists($pdo, 'web_visitors', 'email', "VARCHAR(191) DEFAULT NULL AFTER id");

try {
    $stmt = $pdo->query("SHOW INDEX FROM web_visitors WHERE Key_name = 'idx_vis_email'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("CREATE INDEX idx_vis_email ON web_visitors (email)");
        echo " -> Added index 'idx_vis_email' to web_visitors.\n";
    }
    $stmt = $pdo->query("SHOW INDEX FROM web_visitors WHERE Key_name = 'idx_vis_ip'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("CREATE INDEX idx_vis_ip ON web_visitors (ip_address)");
        echo " -> Added index 'idx_vis_ip' to web_visitors.\n";
    }
} catch (Exception $e) {
    echo "    [ERROR] Indexing web_visitors failed: " . $e->getMessage() . "\n";
}

echo "\n[CHECKING] Collation Fixes...\n";
try {
    $pdo->exec("ALTER TABLE ai_conversations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("ALTER TABLE ai_messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("ALTER TABLE ai_chatbot_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo " -> Converted AI tables to utf8mb4_unicode_ci.\n";
} catch (Exception $e) {
    echo "    [ERROR] Collation fix failed: " . $e->getMessage() . "\n";
}

echo "\n========== MIGRATION COMPLETE ==========\n";
