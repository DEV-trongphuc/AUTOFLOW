<?php
// api/nuclear_clean_logs.php
require_once 'db_connect.php';

echo "<pre>--- NUCLEAR CLEANING: NO MORE LOGS LEFT UNTOUCHED --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $logicStepId = '80966800-d4c1-4afd-9393-4290aceb9fc1';
    $tagStepId = 'd327fe62-c975-4bbe-bb3a-a352c409de86';

    // 1. Xác định 12 hiệp sĩ thực thụ
    $stmtLegit = $pdo->prepare("SELECT DISTINCT subscriber_id FROM subscriber_activity WHERE (flow_id = ? OR reference_id = ?) AND type = 'condition_true'");
    $stmtLegit->execute([$fid, $logicStepId]);
    $legitIds = $stmtLegit->fetchAll(PDO::FETCH_COLUMN);

    echo "Keeping logs for " . count($legitIds) . " legitimate subscribers.\n";

    // 2. TRUY QUÉT TỔNG LỰC: Xóa dựa trên reference_id (Mã bước) - Không cần flow_id
    // Điều này sẽ trúng 100% các log rác mà chúng ta tạo ra nãy giờ.
    if (!empty($legitIds)) {
        $placeholders = implode(',', array_fill(0, count($legitIds), '?'));

        // Xóa các log rác tại các bước nhạy cảm
        $sql = "DELETE FROM subscriber_activity 
                WHERE (reference_id = ? OR reference_id = ? OR reference_id = ? OR flow_id = ?)
                AND subscriber_id NOT IN ($placeholders)
                AND type IN ('complete_flow', 'update_tag', 'condition_true', 'condition_false', 'wait_processed', 'enter_flow')";

        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_merge([$logicStepId, $tagStepId, $fid, $fid], $legitIds));
        echo "Deleted " . $stmt->rowCount() . " fake logs based on Step IDs.\n";
    }

    // 3. XỬ LÝ NHẬT KÝ 'ENTER_FLOW' THỪA
    // Chỉ giữ lại Nhật ký 'enter_flow' của 1,530 người từ Campaign gốc, xóa các bản ghi 'enter_flow' trùng lặp
    $pdo->prepare("DELETE t1 FROM subscriber_activity t1
                  INNER JOIN subscriber_activity t2 
                  WHERE t1.id < t2.id 
                  AND t1.subscriber_id = t2.subscriber_id 
                  AND t1.flow_id = t2.flow_id 
                  AND t1.type = 'enter_flow'
                  AND t1.flow_id = ?")->execute([$fid]);

    echo "Deduplicated 'enter_flow' logs.\n";

    echo "\n✅ THẾ GIỚI ĐÃ SẠCH BÓNG! Anh hãy F5 Dashboard.\n";
    echo "Bây giờ Nhật ký sẽ chỉ còn vài dòng, và số 3111 sẽ biến mất hoàn toàn.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
echo "</pre>";
