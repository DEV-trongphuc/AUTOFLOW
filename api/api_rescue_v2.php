<?php
// api/api_rescue_v2.php
require_once 'db_connect.php';

echo "--- EMERGENCY SYSTEM RESCUE ---\n";

try {
    // 1. Giải cứu các Job bị kẹt
    $stmt = $pdo->prepare("UPDATE queue_jobs SET status = 'pending', reserved_at = NULL WHERE status = 'processing' AND reserved_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
    $stmt->execute();
    echo "Rescued " . $stmt->rowCount() . " stuck jobs.\n";

    // 2. Chạy Aggregator để cập nhật số liệu Opens/Clicks
    require_once 'worker_tracking_aggregator.php';
    echo "Tracking stats aggregated.\n";

    // 3. Kiểm tra số lượng người còn lại thực sự
    $cid = '6985cffc6c490';
    $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM subscribers s WHERE s.status IN ('active', 'lead', 'customer') AND NOT EXISTS (SELECT 1 FROM subscriber_activity sa WHERE sa.subscriber_id = s.id AND sa.campaign_id = ? AND sa.type IN ('receive_email', 'failed_email'))");
    $stmtCount->execute([$cid]);
    $remaining = $stmtCount->fetchColumn();
    echo "Real remaining subscribers: $remaining\n";

    if ($remaining > 0) {
        $pdo->prepare("UPDATE campaigns SET status = 'sending' WHERE id = ?")->execute([$cid]);
        echo "Campaign set back to 'sending'.\n";
    }

} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
}
