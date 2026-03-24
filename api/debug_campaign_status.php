<?php
// api/debug_campaign_status.php
require_once 'db_connect.php';

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "--- CAMPAIGN SYSTEM STATUS & RESCUE ---\n";

try {
    // [1] AUTO-RESCUE QUEUE: Giải cứu các Job bị kẹt > 5 phút
    $stmtRescue = $pdo->prepare("UPDATE queue_jobs SET status = 'pending', reserved_at = NULL WHERE status = 'processing' AND reserved_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
    $stmtRescue->execute();
    $rescuedCount = $stmtRescue->rowCount();
    if ($rescuedCount > 0) {
        echo "[ACTION] Rescued " . $rescuedCount . " stuck queue jobs.\n";
    }

    // [2] AUTO-AGGREGATE: Cập nhật chỉ số Opens/Clicks (Surgical Call)
    // Chúng ta gọi thẳng hàm syncStatsBuffer thay vì include file để tránh bị exit()
    if (file_exists('worker_tracking_aggregator.php')) {
        include_once 'worker_tracking_aggregator.php';
        if (function_exists('syncStatsBuffer')) {
            syncStatsBuffer($pdo);
            echo "[ACTION] Statistics updated from buffer.\n";
        }
    }

    // [3] HIỂN THỊ TRẠNG THÁI CHIẾN DỊCH
    $stmt = $pdo->query("SELECT id, name, status, count_sent, total_target_audience, count_opened, count_clicked, updated_at FROM campaigns ORDER BY updated_at DESC LIMIT 5");
    $camps = $stmt->fetchAll();

    foreach ($camps as $c) {
        // RESET chiến dịch nếu bị dừng sớm hoặc bị stuck
        if ($c['id'] === '6985cffc6c490' && ($c['status'] === 'sent' || $c['status'] === 'draft') && $c['count_sent'] < 1500 && $c['count_sent'] > 0) {
            $pdo->prepare("UPDATE campaigns SET status = 'sending' WHERE id = ?")->execute([$c['id']]);
            $c['status'] = 'sending (RE-ACTIVATED)';
        }

        $progress = $c['total_target_audience'] > 0 ? round(($c['count_sent'] / $c['total_target_audience']) * 100, 2) : 0;
        echo "ID: {$c['id']} | Status: {$c['status']} | Progress: {$c['count_sent']}/{$c['total_target_audience']} ({$progress}%) | Opens: {$c['count_opened']} | Clicks: {$c['count_clicked']} | Name: {$c['name']}\n";
    }

} catch (Exception $e) {
    echo "ERROR (Main): " . $e->getMessage() . "\n";
}

echo "\n--- SYSTEM ACTIVITY ---\n";
try {
    $stmt = $pdo->query("SELECT status, COUNT(*) as total FROM queue_jobs WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) GROUP BY status");
    echo "Recent Queue (1h): ";
    $qStats = [];
    foreach ($stmt->fetchAll() as $row)
        $qStats[] = "{$row['status']}: {$row['total']}";
    echo count($qStats) ? implode(", ", $qStats) : "Clean";
    echo "\n";

    $stmt = $pdo->query("SELECT processed, COUNT(*) as total FROM raw_event_buffer WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR) GROUP BY processed");
    echo "Tracking Events (1h): ";
    $tStats = [];
    foreach ($stmt->fetchAll() as $row)
        $tStats[] = ($row['processed'] ? "Processed" : "Pending") . ": {$row['total']}";
    echo count($tStats) ? implode(", ", $tStats) : "None";
    echo "\n";
} catch (Exception $e) {
    echo "ERROR (Activity): " . $e->getMessage() . "\n";
}

echo "\n--- DIAGNOSTICS ---\n";
echo "API_BASE_URL: " . (defined('API_BASE_URL') ? API_BASE_URL : 'NOT_DEFINED') . "\n";
echo "Server Time: " . date('Y-m-d H:i:s') . "\n";

if (file_exists('worker_campaign.log')) {
    echo "\n--- worker_campaign.log (Last 300 chars) ---\n";
    echo substr(file_get_contents('worker_campaign.log'), -300);
}
