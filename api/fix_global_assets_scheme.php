<?php
// api/fix_global_assets_scheme.php
require_once 'db_connect.php';

header('Content-Type: application/json');

try {
    // Note: DDL statements like ALTER TABLE cause an implicit commit in MySQL
    // so we don't use a transaction here as it would be closed prematurely.

    echo "Changing admin_id column type to VARCHAR(100) in global_assets...\n";
    // 1. Change column type
    $pdo->exec("ALTER TABLE global_assets MODIFY admin_id VARCHAR(100) DEFAULT NULL");

    echo "Migrating admin ID 1 to 'admin-001'...\n";
    // 2. Refresh migration logic
    $pdo->exec("UPDATE global_assets SET admin_id = 'admin-001' WHERE admin_id = '1' OR admin_id = 1");
    $pdo->exec("UPDATE ai_workspace_files SET admin_id = 'admin-001' WHERE admin_id = '1' OR admin_id = 1");

    // 3. Optional: Assign orphans to admin-001 if they were clearly from the main admin
    $pdo->exec("UPDATE global_assets SET admin_id = 'admin-001' WHERE admin_id IS NULL OR admin_id = 0 OR admin_id = ''");
    $pdo->exec("UPDATE ai_workspace_files SET admin_id = 'admin-001' WHERE admin_id IS NULL OR admin_id = 0 OR admin_id = ''");

    echo json_encode(['success' => true, 'message' => 'Schema and data updated successfully!']);

} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Fix failed: ' . $e->getMessage()]);
}
