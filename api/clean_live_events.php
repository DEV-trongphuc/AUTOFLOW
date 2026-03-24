<?php
// api/clean_live_events.php
require_once 'db_connect.php';

echo "<pre>--- CLEANING LIVE EVENTS LOGS (HARD RESET) --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $logicStepId = '80966800-d4c1-4afd-9393-4290aceb9fc1';

    // 1. Xác định danh tính 12 người tương tác thật
    $stmtLegit = $pdo->prepare("SELECT DISTINCT subscriber_id FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type = 'condition_true'");
    $stmtLegit->execute([$fid, $logicStepId]);
    $legitIds = $stmtLegit->fetchAll(PDO::FETCH_COLUMN);

    echo "Found " . count($legitIds) . " legitimate subscribers. Keeping their logs.\n";

    // 2. Xóa TOÀN BỘ các log liên quan đến Flow này trong 1 giờ qua mà KHÔNG thuộc về 12 người trên
    if (!empty($legitIds)) {
        $placeholders = implode(',', array_fill(0, count($legitIds), '?'));
        $sql = "DELETE FROM subscriber_activity 
                WHERE flow_id = ? 
                AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                AND subscriber_id NOT IN ($placeholders)
                AND type IN ('complete_flow', 'update_tag', 'wait_processed', 'condition_true', 'condition_false')";
        $params = array_merge([$fid], $legitIds);
    } else {
        $sql = "DELETE FROM subscriber_activity 
                WHERE flow_id = ? 
                AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                AND type IN ('complete_flow', 'update_tag', 'condition_true')";
        $params = [$fid];
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $deleted = $stmt->rowCount();

    echo "Deleted $deleted noisy log entries from Live Events list.\n";

    // 3. Dọn dẹp cả bản ghi trùng lặp cho 12 người thật (nếu có 2 log cùng loại, chỉ giữ 1)
    if (!empty($legitIds)) {
        foreach ($legitIds as $sid) {
            foreach (['complete_flow', 'update_tag', 'condition_true'] as $type) {
                // Xóa tất cả trừ bản ghi mới nhất của mỗi loại
                $pdo->prepare("DELETE FROM subscriber_activity 
                              WHERE subscriber_id = ? AND flow_id = ? AND type = ? 
                              AND id NOT IN (SELECT id FROM (SELECT id FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1) as tmp)")
                    ->execute([$sid, $fid, $type, $sid, $fid, $type]);
            }
        }
        echo "Deduplicated logs for legitimate subscribers.\n";
    }

    echo "\n✅ DONE! Live Events của anh đã sạch bóng. Anh hãy F5 Dashboard nhé.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
echo "</pre>";
