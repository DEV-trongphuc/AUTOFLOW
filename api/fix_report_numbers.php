<?php
// api/fix_report_numbers.php
require_once 'db_connect.php';

echo "--- CLEANING UP DUPLICATE LOGS FOR CAMPAIGN 6985cffc6c490 ---\n";

try {
    $cid = '6985cffc6c490';

    // 1. Xóa các bản ghi hoạt động trùng lặp (chỉ giữ lại 1 bản ghi nhận email duy nhất cho mỗi subscriber trong 1 campaign)
    $pdo->exec("
        DELETE sa1 FROM subscriber_activity sa1
        INNER JOIN subscriber_activity sa2 
        WHERE sa1.id > sa2.id 
          AND sa1.subscriber_id = sa2.subscriber_id 
          AND sa1.campaign_id = sa2.campaign_id 
          AND sa1.type = 'receive_email'
          AND sa1.campaign_id = '$cid'
    ");
    echo "[OK] Cleaned duplicate subscriber_activity records.\n";

    // 2. Xóa các bản ghi logs trùng lặp trong bảng mail_delivery_logs
    $pdo->exec("
        DELETE m1 FROM mail_delivery_logs m1
        INNER JOIN mail_delivery_logs m2 
        WHERE m1.id > m2.id 
          AND m1.subscriber_id = m2.subscriber_id 
          AND m1.campaign_id = m2.campaign_id
          AND m1.campaign_id = '$cid'
    ");
    echo "[OK] Cleaned duplicate mail_delivery_logs records.\n";

    // 3. Cập nhật lại couter trong bảng campaigns về đúng số lượng thực tế sau khi đã xóa trùng
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE campaign_id = ? AND type = 'receive_email'");
    $stmt->execute([$cid]);
    $count = $stmt->fetchColumn();

    $pdo->prepare("UPDATE campaigns SET count_sent = ?, status = 'sent' WHERE id = ?")->execute([$count, $cid]);
    echo "[OK] Final count optimized to: $count\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
