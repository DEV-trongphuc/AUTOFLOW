<?php
require_once 'api/db_connect.php';

echo "--- RESCUING QUEUE & AGGREGATING STATS ---\n";

try {
    // 1. Giải cứu các Job bị kẹt (Quá 5 phút ở trạng thái processing)
    $stmt = $pdo->prepare("UPDATE queue_jobs SET status = 'pending', reserved_at = NULL WHERE status = 'processing' AND reserved_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)");
    $stmt->execute();
    $rescued = $stmt->rowCount();
    echo "Rescued $rescued stuck jobs.\n";

    // 2. Kích hoạt Aggregator để cập nhật Opens/Clicks
    require_once 'api/worker_tracking_aggregator.php';
    echo "Tracking Aggregator triggered.\n";

    // 3. Kích hoạt Worker Campaign để tiếp tục gửi tốc độ cao
    $cid = '6985cffc6c490';
    $workerParams = http_build_query(['campaign_id' => $cid]);
    $url = API_BASE_URL . '/worker_campaign.php?' . $workerParams;

    // Trigger async
    $parts = parse_url($url);
    $host = $parts['host'];
    $fp = @fsockopen($parts['scheme'] === 'https' ? "ssl://$host" : $host, $parts['port'] ?? ($parts['scheme'] === 'https' ? 443 : 80), $errno, $errstr, 0.5);
    if ($fp) {
        $out = "GET {$parts['path']}?{$parts['query']} HTTP/1.1\r\n";
        $out .= "Host: $host\r\nConnection: Close\r\n\r\n";
        fwrite($fp, $out);
        fclose($fp);
        echo "Campaign Worker re-triggered.\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
