<?php
// api/setup_ai_db.php – MASTER AI DATABASE SETUP & SYNCHRONIZATION
// Consolidates all AI-related tables, standardizes IDs, and ensures schema integrity.

require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');

// Helper: Log setup status
function logSetup($msg, $success = true)
{
    if (PHP_SAPI === 'cli') {
        echo ($success ? "[OK] " : "[ERROR] ") . strip_tags($msg) . "\n";
    } else {
        $color = $success ? 'green' : 'red';
        echo "<li><span style='color: $color; font-weight: bold;'>[" . ($success ? "OK" : "ERROR") . "]</span> $msg</li>";
    }
}

// Helper: Ensure a column exists with specific definition
function ensureColumn($pdo, $table, $column, $definition)
{
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
            logSetup("Added missing column `$column` to table `$table`.");
            return true;
        }
    } catch (Exception $e) {
        logSetup("Failed to ensure column `$column` in `$table`: " . $e->getMessage(), false);
    }
    return false;
}

// Helper: Standardize ID Column to VARCHAR(100)
function standardizeIdColumn($pdo, $table, $column, $isNull = 'NULL')
{
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'");
        $colInfo = $stmt->fetch();
        if ($colInfo && strtolower($colInfo['Type']) !== 'varchar(100)') {
            $default = $colInfo['Default'] !== null ? "DEFAULT '" . $colInfo['Default'] . "'" : ($colInfo['Null'] === 'YES' ? "DEFAULT NULL" : "");
            $pdo->exec("ALTER TABLE `$table` MODIFY COLUMN `$column` VARCHAR(100) $isNull $default");
            logSetup("Standardized `$table`.`$column` to VARCHAR(100) (was " . $colInfo['Type'] . ").");
        }
    } catch (Exception $e) {
        logSetup("Failed to standardize `$table`.`$column`: " . $e->getMessage(), false);
    }
}

function checkChatbotSchema($pdo)
{
    if (!isset($_GET['silent']))
        echo "<h3>1. Chatbot Configuration (ai_chatbot_settings)</h3>";
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_chatbot_settings (
        property_id VARCHAR(100) PRIMARY KEY,
        bot_name VARCHAR(255) DEFAULT '',
        company_name VARCHAR(255) DEFAULT '',
        brand_color VARCHAR(50) DEFAULT '#ffa900',
        bot_avatar TEXT,
        welcome_msg TEXT,
        persona_prompt TEXT,
        gemini_api_key VARCHAR(255) DEFAULT '',
        quick_actions JSON DEFAULT NULL,
        system_instruction TEXT,
        fast_replies JSON DEFAULT NULL,
        similarity_threshold FLOAT DEFAULT 0.55,
        top_k INT DEFAULT 12,
        history_limit INT DEFAULT 15,
        temperature FLOAT DEFAULT 1.0,
        max_output_tokens INT DEFAULT 4096,
        widget_position VARCHAR(20) DEFAULT 'bottom-right',
        excluded_pages JSON DEFAULT NULL,
        excluded_paths JSON DEFAULT NULL,
        auto_open TINYINT(1) DEFAULT 0,
        notification_emails TEXT DEFAULT NULL,
        notification_cc_emails TEXT DEFAULT NULL,
        notification_subject VARCHAR(255) DEFAULT NULL,
        is_enabled TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $toAdd = [
        'widget_position' => "VARCHAR(20) DEFAULT 'bottom-right'",
        'excluded_pages' => "JSON DEFAULT NULL",
        'excluded_paths' => "JSON DEFAULT NULL",
        'auto_open' => "TINYINT(1) DEFAULT 0",
        'temperature' => "FLOAT DEFAULT 1.0",
        'max_output_tokens' => "INT DEFAULT 4096",
        'history_limit' => "INT DEFAULT 15",
        'similarity_threshold' => "FLOAT DEFAULT 0.55",
        'top_k' => "INT DEFAULT 12",
        'is_enabled' => "TINYINT(1) DEFAULT 1",
        'gemini_cache_name' => "VARCHAR(255) DEFAULT NULL",
        'gemini_cache_expires_at' => "DATETIME DEFAULT NULL",
        'intent_configs' => "JSON DEFAULT NULL",
        'notification_emails' => "TEXT DEFAULT NULL",
        'notification_cc_emails' => "TEXT DEFAULT NULL",
        'notification_subject' => "VARCHAR(255) DEFAULT NULL"
    ];
    foreach ($toAdd as $col => $def) {
        ensureColumn($pdo, 'ai_chatbot_settings', $col, $def);
    }
}

function checkBotTableSchema($pdo)
{
    if (!isset($_GET['silent']))
        echo "<h3>1a. Chatbots Registry (ai_chatbots)</h3>";
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_chatbots (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id VARCHAR(100) DEFAULT NULL,
        is_enabled TINYINT(1) DEFAULT 0,
        slug VARCHAR(100) UNIQUE DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_enabled (is_enabled),
        INDEX idx_category (category_id),
        INDEX idx_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $toAdd = [
        'category_id' => "VARCHAR(100) DEFAULT NULL",
        'slug' => "VARCHAR(100) UNIQUE DEFAULT NULL",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];
    foreach ($toAdd as $col => $def) {
        ensureColumn($pdo, 'ai_chatbots', $col, $def);
    }
}

function checkOrgChatSchema($pdo)
{
    if (!isset($_GET['silent']))
        echo "<h3>2. Organization Chat (ai_org_conversations & ai_org_messages)</h3>";
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_org_conversations (
        id VARCHAR(100) PRIMARY KEY,
        visitor_id VARCHAR(100) DEFAULT NULL,
        user_id VARCHAR(100) DEFAULT NULL,
        user_email VARCHAR(191) DEFAULT NULL,
        property_id VARCHAR(100) DEFAULT NULL,
        title VARCHAR(255) DEFAULT NULL,
        status ENUM('ai','human','closed') DEFAULT 'ai',
        is_public TINYINT(1) NOT NULL DEFAULT 0,
        is_pinned TINYINT(1) DEFAULT 0,
        tags JSON DEFAULT NULL,
        sentiment ENUM('positive','neutral','negative') DEFAULT NULL,
        last_message TEXT DEFAULT NULL,
        last_message_at TIMESTAMP NULL DEFAULT NULL,
        metadata JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_property (property_id),
        INDEX idx_visitor (visitor_id),
        INDEX idx_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $toAddConv = [
        'user_id' => "VARCHAR(100) DEFAULT NULL",
        'user_email' => "VARCHAR(191) DEFAULT NULL",
        'is_public' => "TINYINT(1) NOT NULL DEFAULT 0",
        'is_pinned' => "TINYINT(1) DEFAULT 0",
        'tags' => "JSON DEFAULT NULL",
        'sentiment' => "ENUM('positive','neutral','negative') DEFAULT NULL",
        'title' => "VARCHAR(255) DEFAULT NULL"
    ];
    foreach ($toAddConv as $col => $def) {
        ensureColumn($pdo, 'ai_org_conversations', $col, $def);
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_org_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id VARCHAR(100) NOT NULL,
        sender ENUM('visitor','ai','human','system') NOT NULL,
        message TEXT DEFAULT NULL,
        model VARCHAR(100) DEFAULT NULL,
        tokens INT DEFAULT 0,
        processing_time FLOAT DEFAULT NULL,
        rating TINYINT DEFAULT NULL,
        source_metadata TEXT NULL,
        metadata JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conv (conversation_id),
        INDEX idx_sender (sender)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $toAddMsg = [
        'model' => "VARCHAR(100) DEFAULT NULL",
        'tokens' => "INT DEFAULT 0",
        'rating' => "TINYINT DEFAULT NULL",
        'source_metadata' => "TEXT NULL",
        'processing_time' => "FLOAT DEFAULT NULL"
    ];
    foreach ($toAddMsg as $col => $def) {
        ensureColumn($pdo, 'ai_org_messages', $col, $def);
    }
}

function checkCategorySchema($pdo)
{
    if (!isset($_GET['silent']))
        echo "<h3>2a. Chatbot Categories (ai_chatbot_categories)</h3>";
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_chatbot_categories (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE DEFAULT NULL,
        description TEXT,
        brand_color VARCHAR(50) DEFAULT '#ffa900',
        gemini_api_key VARCHAR(255) DEFAULT '',
        bot_avatar TEXT,
        admin_id VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_admin (admin_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $toAdd = [
        'slug' => "VARCHAR(100) UNIQUE DEFAULT NULL",
        'brand_color' => "VARCHAR(50) DEFAULT '#ffa900'",
        'gemini_api_key' => "VARCHAR(255) DEFAULT ''",
        'bot_avatar' => "TEXT",
        'admin_id' => "VARCHAR(100) DEFAULT NULL",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];
    foreach ($toAdd as $col => $def) {
        ensureColumn($pdo, 'ai_chatbot_categories', $col, $def);
    }
}

function checkTrainingSchema($pdo)
{
    if (!isset($_GET['silent']))
        echo "<h3>3. Training Data (ai_training_docs & ai_training_chunks)</h3>";
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_training_docs (
        id VARCHAR(100) PRIMARY KEY,
        property_id VARCHAR(100) NOT NULL,
        chatbot_id VARCHAR(100) DEFAULT NULL,
        parent_id VARCHAR(100) DEFAULT NULL,
        type ENUM('url','text','file','folder','sitemap') NOT NULL,
        name VARCHAR(255) NOT NULL,
        filename VARCHAR(255) DEFAULT NULL,
        content LONGTEXT,
        status ENUM('pending','processing','trained','error') DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_property (property_id),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $toAddDoc = [
        'chatbot_id' => "VARCHAR(100) DEFAULT NULL",
        'filename' => "VARCHAR(255) DEFAULT NULL"
    ];
    foreach ($toAddDoc as $col => $def) {
        ensureColumn($pdo, 'ai_training_docs', $col, $def);
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_training_chunks (
        id VARCHAR(100) PRIMARY KEY,
        property_id VARCHAR(100) NOT NULL,
        doc_id VARCHAR(100) NOT NULL,
        content LONGTEXT NOT NULL,
        embedding JSON DEFAULT NULL,
        embedding_binary LONGBLOB DEFAULT NULL,
        vector_norm FLOAT DEFAULT 0,
        relevance_boost INT DEFAULT 0,
        token_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_property (property_id),
        INDEX idx_doc (doc_id),
        INDEX idx_norm (vector_norm)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $toAddChunk = [
        'relevance_boost' => "INT DEFAULT 0",
        'token_count' => "INT DEFAULT 0",
        'vector_norm' => "FLOAT DEFAULT 0",
        'embedding_binary' => "LONGBLOB DEFAULT NULL"
    ];
    foreach ($toAddChunk as $col => $def) {
        ensureColumn($pdo, 'ai_training_chunks', $col, $def);
    }

    // Ensure Fulltext Indexes
    try {
        $pdo->exec("ALTER TABLE ai_training_chunks ADD FULLTEXT INDEX IF NOT EXISTS content_fts (content)");
        $pdo->exec("ALTER TABLE ai_training_docs ADD FULLTEXT INDEX IF NOT EXISTS ft_content (name, content)");
    } catch (Exception $e) {
    }
}

function checkWorkspaceSchema($pdo)
{
    if (!isset($_GET['silent']))
        echo "<h3>4. Workspace & Global Assets</h3>";
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_workspace_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id VARCHAR(100) NOT NULL,
        property_id VARCHAR(100) NOT NULL,
        admin_id VARCHAR(100) DEFAULT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        file_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conv (conversation_id),
        INDEX idx_property (property_id),
        INDEX idx_admin (admin_id),
        UNIQUE KEY uk_conv_file (conversation_id, file_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_workspace_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workspace_file_id INT NOT NULL,
        content LONGTEXT,
        version_name VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_file (workspace_file_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS global_assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        unique_name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        type VARCHAR(100) DEFAULT NULL,
        extension VARCHAR(10) DEFAULT NULL,
        size BIGINT DEFAULT 0,
        source VARCHAR(50) DEFAULT 'workspace',
        admin_id VARCHAR(100) DEFAULT NULL,
        property_id VARCHAR(100) DEFAULT NULL,
        conversation_id VARCHAR(100) DEFAULT NULL,
        is_deleted TINYINT(1) DEFAULT 0,
        metadata JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin (admin_id),
        INDEX idx_property (property_id),
        INDEX idx_conv (conversation_id),
        UNIQUE KEY uk_url (url(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    standardizeIdColumn($pdo, 'global_assets', 'admin_id');
    standardizeIdColumn($pdo, 'global_assets', 'property_id');
    standardizeIdColumn($pdo, 'global_assets', 'conversation_id');
}

function checkRAGCacheSchema($pdo)
{
    if (!isset($_GET['silent']))
        echo "<h3>5. RAG & Vector Cache</h3>";
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_vector_cache (
        hash VARCHAR(32) PRIMARY KEY,
        vector LONGTEXT DEFAULT NULL,
        vector_binary LONGBLOB DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_rag_search_cache (
        query_hash CHAR(32) PRIMARY KEY,
        property_id VARCHAR(100) DEFAULT NULL,
        results LONGTEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_property (property_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_suggested_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        property_id VARCHAR(100) DEFAULT NULL,
        url TEXT DEFAULT NULL,
        source_url TEXT DEFAULT NULL,
        title TEXT DEFAULT NULL,
        status ENUM('pending','crawled','skipped') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_property (property_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    standardizeIdColumn($pdo, 'ai_suggested_links', 'property_id');
}

function checkAnalyticsSchema($pdo)
{
    if (!isset($_GET['silent']))
        echo "<h3>6. Usage & Analytics</h3>";
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(191) NOT NULL,
        chatbot_id VARCHAR(100) NOT NULL,
        message_count INT DEFAULT 0,
        prompt_tokens INT DEFAULT 0,
        completion_tokens INT DEFAULT 0,
        duration_seconds INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_email (user_email),
        INDEX idx_chatbot (chatbot_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_term_stats (
        term VARCHAR(100) NOT NULL,
        property_id VARCHAR(100) NOT NULL,
        df INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (term, property_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
}

function checkAuthSchema($pdo)
{
    if (!isset($_GET['silent']))
        echo "<h3>7. Authentication (ai_org_users)</h3>";
    $pdo->exec("CREATE TABLE IF NOT EXISTS ai_org_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100) DEFAULT NULL,
        email VARCHAR(191) NOT NULL,
        password_hash VARCHAR(255) DEFAULT NULL,
        full_name VARCHAR(255) DEFAULT NULL,
        role ENUM('admin', 'assistant', 'user') DEFAULT 'user',
        status ENUM('active', 'banned', 'warning') DEFAULT 'active',
        permissions JSON DEFAULT NULL,
        last_login DATETIME DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY email (email),
        INDEX idx_user_id (user_id),
        INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    standardizeIdColumn($pdo, 'ai_org_users', 'user_id');

    $toAdd = [
        'last_login' => "DATETIME DEFAULT NULL",
        'updated_at' => "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
    ];
    foreach ($toAdd as $col => $def) {
        ensureColumn($pdo, 'ai_org_users', $col, $def);
    }

    // Backfill virtual admin if needed
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM ai_org_users WHERE user_id = 'admin-001'");
        $stmt->execute();
        if ($stmt->fetchColumn() == 0) {
            $pdo->prepare("INSERT IGNORE INTO ai_org_users (user_id, email, full_name, role, status, permissions) 
                           VALUES ('admin-001', 'admin@autoflow.vn', 'Super Admin', 'admin', 'active', '[\"*\"]')")
                ->execute();
            logSetup("Virtual 'admin-001' account initialized.");
        }
    } catch (Exception $e) {
    }
}

function backfillVectorNorms($pdo)
{
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM ai_training_chunks WHERE (vector_norm = 0 OR vector_norm IS NULL) AND embedding IS NOT NULL LIMIT 1");
    $stmt->execute();
    if ($stmt->fetchColumn() > 0) {
        logSetup("Scaling vector norms for RAG performance...");
        $limit = 500;
        $total = 0;
        do {
            $stmtFetch = $pdo->prepare("SELECT id, embedding FROM ai_training_chunks WHERE (vector_norm = 0 OR vector_norm IS NULL) AND embedding IS NOT NULL LIMIT $limit");
            $stmtFetch->execute();
            $rows = $stmtFetch->fetchAll(PDO::FETCH_ASSOC);
            if (empty($rows))
                break;

            foreach ($rows as $row) {
                $vec = json_decode($row['embedding'], true);
                if (is_array($vec)) {
                    $norm = 0;
                    foreach ($vec as $v)
                        $norm += $v * $v;
                    $norm = sqrt($norm);
                    $pdo->prepare("UPDATE ai_training_chunks SET vector_norm = ? WHERE id = ?")->execute([$norm, $row['id']]);
                }
            }
            $total += count($rows);
        } while (count($rows) >= $limit);
        logSetup("Processed $total vector norms.");
    }
}

// MAIN EXECUTION
try {
    if (!isset($_GET['silent']))
        echo "<h1>AI Core Database Master Setup</h1><ul>";

    checkChatbotSchema($pdo);
    checkBotTableSchema($pdo);
    checkCategorySchema($pdo);
    checkOrgChatSchema($pdo);
    checkTrainingSchema($pdo);
    checkWorkspaceSchema($pdo);
    checkRAGCacheSchema($pdo);
    checkAnalyticsSchema($pdo);
    checkAuthSchema($pdo);
    backfillVectorNorms($pdo);

    if (!isset($_GET['silent'])) {
        echo "</ul>";
        echo "<h2 style='color: green;'>✅ All Systems Synchronized & Optimized</h2>";
        echo "<p><a href='check_ai_schema.php'>Verify All Tables</a></p>";
    } else {
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'AI Database Synchronized']);
    }

} catch (Throwable $e) {
    if (!isset($_GET['silent'])) {
        echo "<h2 style='color: red;'>❌ Setup Failed</h2>";
        echo "<pre>" . $e->getMessage() . "\n" . $e->getTraceAsString() . "</pre>";
    } else {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
