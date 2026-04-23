<?php
require_once 'db_connect.php';
// Auth check bypass for local/admin
$headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
$token = $headers['x-admin-token'] ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';

if ($token !== 'autoflow-admin-001' && php_sapi_name() !== 'cli') {
    die("Unauthorized");
}

try {
    echo "RECONCILIATION START (GLOBAL)\n";
    
    // 1. Get all unique workspaces
    $stmtWs = $pdo->query("SELECT DISTINCT id FROM workspaces");
    $workspaces = $stmtWs->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($workspaces as $workspace_id) {
        echo "Processing Workspace: $workspace_id\n";
        
        // 2. Get all lists for this workspace
        $stmt = $pdo->prepare("SELECT id, name FROM lists WHERE workspace_id = ?");
        $stmt->execute([$workspace_id]);
        $lists = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($lists as $list) {
            $listId = $list['id'];
            $name = $list['name'];
            
            // 3. Count actual subscribers in this list belonging to this workspace
            // Use JOIN to ensure we only count subscribers that actually belong to this workspace
            $stmtCount = $pdo->prepare("
                SELECT COUNT(*) 
                FROM subscriber_lists sl
                JOIN subscribers s ON sl.subscriber_id = s.id
                WHERE sl.list_id = ? AND s.workspace_id = ?
            ");
            $stmtCount->execute([$listId, $workspace_id]);
            $actualCount = (int)$stmtCount->fetchColumn();
            
            // 4. Update the lists table
            $pdo->prepare("UPDATE lists SET subscriber_count = ? WHERE id = ?")
                ->execute([$actualCount, $listId]);
                
            echo "  - Updated List: $name ($listId) -> New Count: $actualCount\n";
        }
    }
    
    echo "RECONCILIATION COMPLETE.\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
