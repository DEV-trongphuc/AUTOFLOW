<?php
/**
 * Debug script to check subscriber count discrepancy
 * Usage: /api/debug_list_count.php?list_id=YOUR_LIST_ID
 */

require_once 'db_connect.php';
apiHeaders();

$listId = $_GET['list_id'] ?? null;

if (!$listId) {
    jsonResponse(false, null, 'Missing list_id parameter');
}

try {
    // 1. Get list info from lists table
    $stmt = $pdo->prepare("SELECT id, name, source, subscriber_count FROM lists WHERE id = ?");
    $stmt->execute([$listId]);
    $listInfo = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$listInfo) {
        jsonResponse(false, null, 'List not found');
    }

    // 2. Count actual subscribers in subscriber_lists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?");
    $stmt->execute([$listId]);
    $actualCount = (int) $stmt->fetchColumn();

    // 3. Count subscribers by status
    $stmt = $pdo->prepare("
        SELECT s.status, COUNT(*) as count 
        FROM subscriber_lists sl 
        JOIN subscribers s ON sl.subscriber_id = s.id 
        WHERE sl.list_id = ? 
        GROUP BY s.status
    ");
    $stmt->execute([$listId]);
    $statusBreakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Get sample of subscribers (first 10)
    $stmt = $pdo->prepare("
        SELECT s.id, s.email, s.first_name, s.last_name, s.status 
        FROM subscriber_lists sl 
        JOIN subscribers s ON sl.subscriber_id = s.id 
        WHERE sl.list_id = ? 
        LIMIT 10
    ");
    $stmt->execute([$listId]);
    $sampleSubscribers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 5. Check if there are orphaned records (subscribers in list but deleted from subscribers table)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM subscriber_lists sl 
        LEFT JOIN subscribers s ON sl.subscriber_id = s.id 
        WHERE sl.list_id = ? AND s.id IS NULL
    ");
    $stmt->execute([$listId]);
    $orphanedCount = (int) $stmt->fetchColumn();

    jsonResponse(true, [
        'list_info' => $listInfo,
        'stored_count' => (int) $listInfo['subscriber_count'],
        'actual_count' => $actualCount,
        'difference' => $actualCount - (int) $listInfo['subscriber_count'],
        'status_breakdown' => $statusBreakdown,
        'orphaned_records' => $orphanedCount,
        'sample_subscribers' => $sampleSubscribers
    ]);

} catch (Exception $e) {
    jsonResponse(false, null, 'Error: ' . $e->getMessage());
}
?>