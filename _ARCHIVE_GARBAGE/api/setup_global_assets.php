<?php
require_once 'db_connect.php';

header('Content-Type: text/html; charset=utf-8');
echo "<h2>Global Assets Schema Optimization</h2>";

try {
    // 1. Create or Update global_assets table
    $sql = "
    CREATE TABLE IF NOT EXISTS global_assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        unique_name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        type VARCHAR(100),
        extension VARCHAR(10),
        size BIGINT DEFAULT 0,
        source VARCHAR(50) DEFAULT 'workspace',
        chatbot_id VARCHAR(100) DEFAULT NULL,
        property_id VARCHAR(100) DEFAULT NULL,
        conversation_id VARCHAR(100) DEFAULT NULL,
        session_id VARCHAR(100) DEFAULT NULL,
        metadata JSON DEFAULT NULL,
        admin_id VARCHAR(100) DEFAULT NULL,
        is_deleted TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Essential Indexes for Fast Retrieval
        INDEX idx_property_deleted (property_id, is_deleted),
        INDEX idx_conv_deleted (conversation_id, is_deleted),
        INDEX idx_source (source),
        INDEX idx_type (type),
        INDEX idx_admin (admin_id),
        INDEX idx_created (created_at DESC),
        
        -- Constraint to prevent duplicates by URL
        UNIQUE KEY uk_url (url(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $pdo->exec($sql);
    echo "<div style='color: green;'>[SUCCESS] Table 'global_assets' is optimized with indexes.</div>";

    // 2. Add missing columns or modify types if they don't exist (Migration)
    // IMPORTANT: admin_id MUST be VARCHAR(100) to support string IDs like 'admin-001'
    $pdo->exec("ALTER TABLE global_assets MODIFY COLUMN admin_id VARCHAR(100) DEFAULT NULL");

    $columnsToAdd = [
        'metadata' => "JSON DEFAULT NULL AFTER session_id",
        'is_deleted' => "TINYINT(1) DEFAULT 0 AFTER admin_id"
    ];

    foreach ($columnsToAdd as $col => $definition) {
        $stmt = $pdo->query("SHOW COLUMNS FROM global_assets LIKE '$col'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE global_assets ADD COLUMN $col $definition");
            echo "<li>Added missing column: $col</li>";
        }
    }

    // 3. Ensure proper indexing on existing columns if table was created earlier
    $existingIndexes = $pdo->query("SHOW INDEX FROM global_assets")->fetchAll(PDO::FETCH_ASSOC);
    $indexNames = array_column($existingIndexes, 'Key_name');

    if (!in_array('idx_property_deleted', $indexNames)) {
        $pdo->exec("CREATE INDEX idx_property_deleted ON global_assets (property_id, is_deleted)");
    }
    if (!in_array('idx_conv_deleted', $indexNames)) {
        $pdo->exec("CREATE INDEX idx_conv_deleted ON global_assets (conversation_id, is_deleted)");
    }

    echo "<h3>Data Integrity Sync</h3>";
    echo "<li>Checking for files in ai_workspace_files missing in global_assets...</li>";

    $sqlSync = "
        INSERT IGNORE INTO global_assets (name, unique_name, url, type, extension, size, source, property_id, conversation_id, created_at)
        SELECT file_name, file_name, file_url, file_type, SUBSTRING_INDEX(file_name, '.', -1), file_size, 
               CASE WHEN conversation_id IS NOT NULL AND conversation_id != '' THEN 'chat_user' ELSE 'workspace' END,
               property_id, conversation_id, created_at
        FROM ai_workspace_files
    ";
    $affected = $pdo->exec($sqlSync);
    echo "<li>Synced $affected new records from Workspace.</li>";

    echo "<div style='color: blue; margin-top: 20px;'>Done. Systems are ready for fast asset retrieval.</div>";

} catch (Exception $e) {
    echo "<div style='color: red;'>[ERROR] " . $e->getMessage() . "</div>";
}
?>