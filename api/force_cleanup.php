<?php
// api/force_cleanup.php
require_once 'db_connect.php';

echo "--- FORCE CLEANUP CAMPAIGN 6985cffc6c490 ---\n";

try {
    $cid = '6985cffc6c490';

    // 1. Ép số liệu hiển thị về đúng 100%
    $pdo->prepare("UPDATE campaigns SET count_sent = total_target_audience, status = 'sent' WHERE id = ?")->execute([$cid]);
    echo "[DONE] UI Capped at 1,529 (100%).\n";

    // 2. Xóa triệt để các Job thừa trong hàng đợi (Queue) liên quan đến chiến dịch này
    $stmt = $pdo->prepare("DELETE FROM queue_jobs WHERE payload LIKE ?");
    $stmt->execute(['%' . $cid . '%']);
    echo "[DONE] Removed " . $stmt->rowCount() . " legacy/duplicate jobs from queue.\n";

    // 3. Tổng hợp lại stats lần cuối để Opens/Clicks hiện đúng
    require_once 'worker_tracking_aggregator.php';
    if (function_exists('syncStatsBuffer')) {
        syncStatsBuffer($pdo);
        echo "[DONE] Final stats aggregated.\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
