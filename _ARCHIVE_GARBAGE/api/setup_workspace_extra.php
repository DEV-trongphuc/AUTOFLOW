<?php
require_once 'db_connect.php';

try {
    // 1. Create ai_workspace_versions table
    $sqlVersions = "CREATE TABLE IF NOT EXISTS ai_workspace_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        workspace_file_id INT NOT NULL,
        content LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_file (workspace_file_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    $pdo->exec($sqlVersions);

    // 2. Add source_metadata column to ai_org_messages if it doesn't exist (for PDF highlighting)
    $stmt = $pdo->query("SHOW COLUMNS FROM ai_org_messages LIKE 'source_metadata'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE ai_org_messages ADD COLUMN source_metadata TEXT NULL AFTER metadata");
    }

    echo "<h3>Workspace Context & Versioning Setup</h3>";
    echo "<div style='color: green; font-weight: bold;'>[SUCCESS] Database updated successfully.</div>";

} catch (PDOException $e) {
    die("<div style='color: red; font-weight: bold;'>[ERROR] " . $e->getMessage() . "</div>");
}
?>