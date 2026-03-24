<?php
/**
 * Cleanup Workspace API
 * API endpoint for the web-based cleanup tool
 */

require_once 'db_connect.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$action = $_GET['action'] ?? '';

try {
    if ($action === 'analyze') {
        // Analyze duplicates
        $analyzeQuery = "
            SELECT 
                conversation_id,
                file_name,
                file_url,
                COUNT(*) as duplicate_count,
                GROUP_CONCAT(id ORDER BY created_at ASC) as all_ids
            FROM ai_workspace_files
            GROUP BY conversation_id, file_name, file_url
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC
        ";

        $stmt = $pdo->query($analyzeQuery);
        $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalDuplicateGroups = count($duplicates);
        $totalRecordsToDelete = 0;

        foreach ($duplicates as $dup) {
            $totalRecordsToDelete += ($dup['duplicate_count'] - 1);
        }

        // Get total records
        $totalRecords = $pdo->query("SELECT COUNT(*) FROM ai_workspace_files")->fetchColumn();

        echo json_encode([
            'success' => true,
            'duplicate_groups' => $totalDuplicateGroups,
            'records_to_delete' => $totalRecordsToDelete,
            'total_records' => $totalRecords,
            'top_duplicates' => array_slice($duplicates, 0, 10)
        ]);
        exit;
    }

    if ($action === 'cleanup' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        // Get duplicates again
        $analyzeQuery = "
            SELECT 
                conversation_id,
                file_name,
                file_url,
                COUNT(*) as duplicate_count,
                GROUP_CONCAT(id ORDER BY created_at ASC) as all_ids
            FROM ai_workspace_files
            GROUP BY conversation_id, file_name, file_url
            HAVING COUNT(*) > 1
        ";

        $stmt = $pdo->query($analyzeQuery);
        $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($duplicates)) {
            echo json_encode([
                'success' => true,
                'message' => 'No duplicates found',
                'deleted_count' => 0
            ]);
            exit;
        }

        $pdo->beginTransaction();

        $deletedCount = 0;

        foreach ($duplicates as $dup) {
            $ids = explode(',', $dup['all_ids']);
            $keepId = $ids[0]; // Keep the first (oldest) one
            $deleteIds = array_slice($ids, 1); // Delete the rest

            if (!empty($deleteIds)) {
                $placeholders = implode(',', array_fill(0, count($deleteIds), '?'));
                $deleteQuery = "DELETE FROM ai_workspace_files WHERE id IN ($placeholders)";
                $deleteStmt = $pdo->prepare($deleteQuery);
                $deleteStmt->execute($deleteIds);

                $deletedCount += $deleteStmt->rowCount();
            }
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => "Successfully deleted $deletedCount duplicate records",
            'deleted_count' => $deletedCount
        ]);
        exit;
    }

    echo json_encode([
        'success' => false,
        'message' => 'Invalid action'
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
