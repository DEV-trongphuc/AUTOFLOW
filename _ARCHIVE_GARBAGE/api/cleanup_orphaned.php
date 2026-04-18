<?php
/**
 * Cleanup orphaned records in subscriber_lists
 * These are records where the subscriber has been deleted but the list association remains
 */

require_once 'db_connect.php';
apiHeaders();

$listId = $_GET['list_id'] ?? null;
$execute = $_GET['execute'] ?? 'false'; // Safety: require explicit execute=true

try {
    $pdo->beginTransaction();

    if ($listId) {
        // Cleanup specific list
        // 1. Find orphaned records
        $stmt = $pdo->prepare("
            SELECT sl.subscriber_id 
            FROM subscriber_lists sl 
            LEFT JOIN subscribers s ON sl.subscriber_id = s.id 
            WHERE sl.list_id = ? AND s.id IS NULL
        ");
        $stmt->execute([$listId]);
        $orphanedIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if ($execute === 'true' && count($orphanedIds) > 0) {
            // Delete orphaned records
            $placeholders = implode(',', array_fill(0, count($orphanedIds), '?'));
            $deleteStmt = $pdo->prepare("
                DELETE FROM subscriber_lists 
                WHERE list_id = ? AND subscriber_id IN ($placeholders)
            ");
            $deleteStmt->execute(array_merge([$listId], $orphanedIds));

            // Update list count
            $pdo->prepare("
                UPDATE lists 
                SET subscriber_count = (SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?) 
                WHERE id = ?
            ")->execute([$listId, $listId]);

            $pdo->commit();

            jsonResponse(true, [
                'list_id' => $listId,
                'orphaned_removed' => count($orphanedIds),
                'orphaned_ids_sample' => array_slice($orphanedIds, 0, 10)
            ], "Đã dọn dẹp {count($orphanedIds)} bản ghi mồ côi");
        } else {
            $pdo->rollBack();
            jsonResponse(true, [
                'list_id' => $listId,
                'orphaned_count' => count($orphanedIds),
                'orphaned_ids_sample' => array_slice($orphanedIds, 0, 10),
                'note' => 'Add &execute=true to actually delete these records'
            ], "Tìm thấy " . count($orphanedIds) . " bản ghi mồ côi (chưa xóa)");
        }
    } else {
        // Cleanup ALL lists
        $stmt = $pdo->query("
            SELECT sl.list_id, COUNT(*) as orphaned_count
            FROM subscriber_lists sl 
            LEFT JOIN subscribers s ON sl.subscriber_id = s.id 
            WHERE s.id IS NULL
            GROUP BY sl.list_id
        ");
        $orphanedByList = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($execute === 'true') {
            // Delete all orphaned records
            $totalDeleted = 0;
            foreach ($orphanedByList as $item) {
                $deleteStmt = $pdo->prepare("
                    DELETE FROM subscriber_lists 
                    WHERE list_id = ? AND subscriber_id NOT IN (SELECT id FROM subscribers)
                ");
                $deleteStmt->execute([$item['list_id']]);
                $totalDeleted += $deleteStmt->rowCount();

                // Update list count
                $pdo->prepare("
                    UPDATE lists 
                    SET subscriber_count = (SELECT COUNT(*) FROM subscriber_lists WHERE list_id = ?) 
                    WHERE id = ?
                ")->execute([$item['list_id'], $item['list_id']]);
            }

            $pdo->commit();

            jsonResponse(true, [
                'total_deleted' => $totalDeleted,
                'lists_affected' => count($orphanedByList),
                'details' => $orphanedByList
            ], "Đã dọn dẹp {$totalDeleted} bản ghi mồ côi từ " . count($orphanedByList) . " danh sách");
        } else {
            $pdo->rollBack();

            $totalOrphaned = array_sum(array_column($orphanedByList, 'orphaned_count'));
            jsonResponse(true, [
                'total_orphaned' => $totalOrphaned,
                'lists_affected' => count($orphanedByList),
                'details' => $orphanedByList,
                'note' => 'Add &execute=true to actually delete these records'
            ], "Tìm thấy {$totalOrphaned} bản ghi mồ côi trong " . count($orphanedByList) . " danh sách (chưa xóa)");
        }
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(false, null, 'Error: ' . $e->getMessage());
}
?>