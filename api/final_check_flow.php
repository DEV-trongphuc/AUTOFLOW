<?php
// api/final_check_flow.php
require_once 'db_connect.php';

echo "<pre>--- FINAL SYNC & CLEANUP ---\n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    // 1. Dọn dẹp chính xác những bản ghi dư thừa (ID: 1530 -> 1529)
    $pdo->prepare("DELETE FROM subscriber_flow_states WHERE flow_id = ? AND subscriber_id NOT IN (SELECT id FROM subscribers)")->execute([$fid]);

    // Tìm các ID trùng lắp
    $stmt = $pdo->prepare("SELECT subscriber_id, COUNT(*) as c FROM subscriber_flow_states WHERE flow_id = ? GROUP BY subscriber_id HAVING c > 1");
    $stmt->execute([$fid]);
    $dupes = $stmt->fetchAll();
    foreach ($dupes as $d) {
        $pdo->prepare("DELETE FROM subscriber_flow_states WHERE flow_id = ? AND subscriber_id = ? LIMIT " . ($d['c'] - 1))->execute([$fid, $d['subscriber_id']]);
    }
    echo "Cleaned up duplicates. Current count: " . $pdo->query("SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = '$fid'")->fetchColumn() . "\n";

    // 2. Ép chạy lượt Click của turniodev@gmail.com
    $stmt = $pdo->prepare("UPDATE subscriber_flow_states SET scheduled_at = NOW(), status = 'waiting' WHERE flow_id = ?");
    $stmt->execute([$fid]);

    // 3. Gọi worker CHẠY THỰC TẾ (Sẽ mất vài giây)
    $url = API_BASE_URL . '/worker_flow.php';
    echo "Triggering worker: $url\n";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $res = curl_exec($ch);
    echo "Worker Output Snapshot: " . substr($res, 0, 200) . "...\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
