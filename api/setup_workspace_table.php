<?php
require_once 'db_connect.php';

echo "<h2>Workspace Table Setup</h2>";

try {
    $sql = "CREATE TABLE IF NOT EXISTS ai_workspace_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id VARCHAR(100) NOT NULL,
        property_id VARCHAR(100) NOT NULL,
        admin_id VARCHAR(100) DEFAULT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size INT NOT NULL,
        file_url TEXT NOT NULL,
        source VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conv (conversation_id),
        INDEX idx_property (property_id),
        INDEX idx_admin (admin_id),
        UNIQUE KEY uk_conv_file (conversation_id, file_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $pdo->exec($sql);

    // Migration: Add admin_id if missing
    $stmt = $pdo->query("SHOW COLUMNS FROM ai_workspace_files LIKE 'admin_id'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE ai_workspace_files ADD COLUMN admin_id VARCHAR(100) DEFAULT NULL AFTER property_id");
        $pdo->exec("CREATE INDEX idx_admin ON ai_workspace_files (admin_id)");
        echo "<li>Added admin_id column to ai_workspace_files.</li>";
    }

    // Migration: Add source if missing
    $stmt = $pdo->query("SHOW COLUMNS FROM ai_workspace_files LIKE 'source'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE ai_workspace_files ADD COLUMN source VARCHAR(50) DEFAULT NULL AFTER file_url");
        echo "<li>Added source column to ai_workspace_files.</li>";
    }
    echo "<div style='color: green; font-weight: bold;'>[SUCCESS] Table 'ai_workspace_files' is ready.</div>";

    // Verify columns
    $stmt = $pdo->query("DESCRIBE ai_workspace_files");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "<h3>Current Schema:</h3><pre>";
    print_r($columns);
    echo "</pre>";

    // Migration: Add summary to ai_org_conversations if missing
    $stmt = $pdo->query("SHOW COLUMNS FROM ai_org_conversations LIKE 'summary'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE ai_org_conversations ADD COLUMN summary TEXT DEFAULT NULL AFTER title");
        echo "<li>Added summary column to ai_org_conversations.</li>";
    }

} catch (Exception $e) {
    echo "<div style='color: red; font-weight: bold;'>[ERROR] " . $e->getMessage() . "</div>";
}
?>