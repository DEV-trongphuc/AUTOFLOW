<?php
// api/api_finalize_campaign.php
require_once 'db_connect.php';
require_once 'auth_middleware.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "--- FINALIZING CAMPAIGN 6985cffc6c490 ---\n";

try {
    $cid = '6985cffc6c490';

    // 1. Ch?t s? li?u v? dúng 1,529 và d?i tr?ng thái thành hoàn thành
    $pdo->prepare("UPDATE campaigns SET count_sent = total_target_audience, status = 'sent', updated_at = NOW() WHERE id = ?")->execute([$cid]);
    echo "[OK] Campaign status set to SENT. Progress fixed to 100%.\n";

    // 2. D?n d?p các Job th?a còn sót l?i trong hàng d?i c?a chi?n d?ch này
    $stmt = $pdo->prepare("DELETE FROM queue_jobs WHERE payload LIKE ? AND status = 'pending'");
    $stmt->execute(['%' . $cid . '%']);
    echo "[OK] Deleted " . $stmt->rowCount() . " redundant jobs from queue.\n";

    // 3. T?ng h?p l?i stats l?n cu?i
    if (file_exists('worker_tracking_aggregator.php')) {
        include_once 'worker_tracking_aggregator.php';
        if (function_exists('syncStatsBuffer')) {
            syncStatsBuffer($pdo);
            echo "[OK] Final statistics aggregated.\n";
        }
    }

    echo "\n--- ALL DONE. YOU CAN CLOSE THIS TAB ---\n";

} catch (Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
}
