<?php
/**
 * Script to sync list subscriber counts
 * This fixes the discrepancy between lists.subscriber_count and actual subscriber_lists count
 */

require_once 'db_connect.php';
apiHeaders();

try {
    $pdo->beginTransaction();

    // Get all lists
    $stmt = $pdo->query("SELECT id, name, subscriber_count FROM lists");
    $lists = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $results = [];
    $totalFixed = 0;

    foreach ($lists as $list) {
        // Get actual count from subscriber_lists
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?");
        $countStmt->execute([$list['id']]);
        $actualCount = (int) $countStmt->fetchColumn();

        $oldCount = (int) $list['subscriber_count'];

        if ($actualCount !== $oldCount) {
            // Update the count
            $updateStmt = $pdo->prepare("UPDATE lists SET subscriber_count = ? WHERE id = ?");
            $updateStmt->execute([$actualCount, $list['id']]);

            $results[] = [
                'list_id' => $list['id'],
                'list_name' => $list['name'],
                'old_count' => $oldCount,
                'new_count' => $actualCount,
                'difference' => $actualCount - $oldCount
            ];

            $totalFixed++;
        }
    }

    $pdo->commit();

    jsonResponse(true, [
        'total_lists_checked' => count($lists),
        'total_lists_fixed' => $totalFixed,
        'details' => $results
    ], "Đã đồng bộ thành công {$totalFixed} danh sách");

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, null, 'Lỗi khi đồng bộ: ' . $e->getMessage());
}
?>