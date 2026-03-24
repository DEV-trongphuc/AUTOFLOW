<?php
// api/rescue_flow_final.php
require_once 'db_connect.php';

echo "--- RESCUING FLOW JOURNEY ---\n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    // 1. Xóa các bản ghi lặp của cùng 1 người trong 1 Flow (Chỉ giữ lại bản ghi mới nhất)
    $stmt = $pdo->prepare("
        DELETE fs1 FROM subscriber_flow_states fs1
        INNER JOIN subscriber_flow_states fs2 
        WHERE fs1.id < fs2.id 
          AND fs1.subscriber_id = fs2.subscriber_id 
          AND fs1.flow_id = fs2.flow_id
          AND fs1.flow_id = ?
    ");
    $stmt->execute([$fid]);
    echo "Removed " . $stmt->rowCount() . " duplicate flow entries.\n";

    // 2. Ép toàn bộ những người đang 'waiting' phải được kiểm tra ngay
    $stmt = $pdo->prepare("UPDATE subscriber_flow_states SET scheduled_at = NOW(), status = 'waiting' WHERE flow_id = ? AND status = 'waiting'");
    $stmt->execute([$fid]);
    echo "Scheduled " . $stmt->rowCount() . " subscribers for immediate processing.\n";

    // 3. Kích hoạt Worker Flow
    $url = API_BASE_URL . '/worker_flow.php';
    $parts = parse_url($url);
    $host = $parts['host'];
    $fp = @fsockopen($parts['scheme'] === 'https' ? "ssl://$host" : $host, $parts['port'] ?? ($parts['scheme'] === 'https' ? 443 : 80), $errno, $errstr, 1);
    if ($fp) {
        $out = "GET {$parts['path']} HTTP/1.1\r\nHost: $host\r\nConnection: Close\r\n\r\n";
        fwrite($fp, $out);
        fclose($fp);
        echo "Flow worker triggered.\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
