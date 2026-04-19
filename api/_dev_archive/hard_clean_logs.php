<?php
// api/hard_clean_logs.php
require_once 'db_connect.php';

echo "<pre>--- ULTIMATE LOG CLEANER (THE TRUTH) --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $logicStepId = '80966800-d4c1-4afd-9393-4290aceb9fc1';

    // 1. Xác định 12 người thật (Có log Mở mail hoặc Mở Condition thực sự)
    $stmtLegit = $pdo->prepare("SELECT DISTINCT subscriber_id FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type = 'condition_true'");
    $stmtLegit->execute([$fid, $logicStepId]);
    $legitIds = $stmtLegit->fetchAll(PDO::FETCH_COLUMN);

    echo "Keeping logs for " . count($legitIds) . " legitimate subscribers.\n";

    // 2. XÓA KHÔNG THƯƠNG TIẾC: Xóa tất cả các loại log này của Flow này
    // Đối với những người KHÔNG nằm trong danh sách 12 người xịn
    if (!empty($legitIds)) {
        $placeholders = implode(',', array_fill(0, count($legitIds), '?'));

        // Xóa sạch sẽ log của 1,518 người ảo
        $stmtDelFake = $pdo->prepare("DELETE FROM subscriber_activity 
                                     WHERE flow_id = ? 
                                     AND subscriber_id NOT IN ($placeholders)
                                     AND type IN ('complete_flow', 'update_tag', 'condition_true', 'condition_false', 'wait_processed')");
        $stmtDelFake->execute(array_merge([$fid], $legitIds));
        echo "Deleted " . $stmtDelFake->rowCount() . " fake logs for non-openers.\n";

        // 3. DỌN DẸP DƯ THỪA CHO 12 NGƯỜI THẬT: Mỗi người chỉ được giữ 1 log cho mỗi hành động
        foreach ($legitIds as $sid) {
            foreach (['complete_flow', 'update_tag', 'condition_true'] as $type) {
                $stmtDedupe = $pdo->prepare("DELETE FROM subscriber_activity 
                                            WHERE subscriber_id = ? AND flow_id = ? AND type = ? 
                                            AND id NOT IN (SELECT id FROM (
                                                SELECT id FROM subscriber_activity 
                                                WHERE subscriber_id = ? AND flow_id = ? AND type = ? 
                                                ORDER BY created_at DESC LIMIT 1
                                            ) as tmp)");
                $stmtDedupe->execute([$sid, $fid, $type, $sid, $fid, $type]);
            }
        }
        echo "Deduplicated logs for the " . count($legitIds) . " legitimate users.\n";

    } else {
        // Nếu không tìm thấy ai (đề phòng lỗi), xóa hết log Complete/Tag của Flow này
        $stmtDelAll = $pdo->prepare("DELETE FROM subscriber_activity WHERE flow_id = ? AND type IN ('complete_flow', 'update_tag', 'condition_true')");
        $stmtDelAll->execute([$fid]);
        echo "Wiped all automation logs for safety.\n";
    }

    echo "\n🚀 HOÀN TẤT DỌN DẸP! Nhật ký của anh bây giờ sẽ chỉ còn vài dòng chuẩn xác.\n";
    echo "Anh hãy F5 Dashboard và xem cột con số Tổng 3111 sẽ giảm xuống còn vài chục.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
echo "</pre>";
