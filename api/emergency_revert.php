<?php
// api/emergency_revert.php
require_once 'db_connect.php';

echo "<pre>--- EMERGENCY REVERT: FIXING THE 1530 MESS --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $logicStepId = '80966800-d4c1-4afd-9393-4290aceb9fc1';
    $tagStepId = 'd327fe62-c975-4bbe-bb3a-a352c409de86';

    // 1. Tìm danh tính 12 người "xịn" thực sự đã mở mail
    $stmtLegit = $pdo->prepare("SELECT DISTINCT subscriber_id FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type = 'condition_true'");
    $stmtLegit->execute([$fid, $logicStepId]);
    $legitSubIds = $stmtLegit->fetchAll(PDO::FETCH_COLUMN);

    echo "Found " . count($legitSubIds) . " legitimate openers.\n";

    // 2. Đưa tất cả những người CÒN LẠI quay về bước Logic và đặt trạng thái là 'waiting'
    if (!empty($legitSubIds)) {
        $placeholders = implode(',', array_fill(0, count($legitSubIds), '?'));
        $sqlRevert = "UPDATE subscriber_flow_states 
                      SET step_id = ?, status = 'waiting', updated_at = NOW() 
                      WHERE flow_id = ? AND subscriber_id NOT IN ($placeholders)";
        $params = array_merge([$logicStepId, $fid], $legitSubIds);
    } else {
        // Trường hợp xấu nhất không tìm thấy ai (không xảy ra)
        $sqlRevert = "UPDATE subscriber_flow_states SET step_id = ?, status = 'waiting', updated_at = NOW() WHERE flow_id = ?";
        $params = [$logicStepId, $fid];
    }

    $stmt = $pdo->prepare($sqlRevert);
    $stmt->execute($params);
    $revertedCount = $stmt->rowCount();
    echo "Reverted $revertedCount subscribers back to Logic Step (Waiting).\n";

    // 3. Đảm bảo 12 người xịn nằm ở bước cuối (Tag) và status là 'completed'
    if (!empty($legitSubIds)) {
        $placeholders = implode(',', array_fill(0, count($legitSubIds), '?'));
        $stmtFixLegit = $pdo->prepare("UPDATE subscriber_flow_states SET step_id = ?, status = 'completed', updated_at = NOW() WHERE flow_id = ? AND subscriber_id IN ($placeholders)");
        $stmtFixLegit->execute(array_merge([$tagStepId, $fid], $legitSubIds));
        echo "Confirmed " . count($legitSubIds) . " legitimate subscribers at the Finish Line.\n";
    }

    // 4. Xóa các nhật ký hoàn thành "ảo" của những người bị Revert
    $stmtDelLogs = $pdo->prepare("DELETE FROM subscriber_activity WHERE flow_id = ? AND type = 'complete_flow' AND subscriber_id NOT IN (" . ($placeholders ?? '0') . ")");
    $stmtDelLogs->execute(!empty($legitSubIds) ? array_merge([$fid], $legitSubIds) : [$fid]);

    // 5. Cập nhật lại stats chuẩn
    $pdo->prepare("UPDATE flows SET stat_completed = ? WHERE id = ?")->execute([count($legitSubIds), $fid]);

    echo "\n✅ CỨU HỘ THÀNH CÔNG! Đã đưa mọi thứ về đúng quỹ đạo (12 người hoàn thành).\n";
    echo "Anh hãy F5 Dashboard, con số sẽ quay về 12/1518 như cũ.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
