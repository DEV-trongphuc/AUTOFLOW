<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "TEST RECEIVE_EMAIL INSERT\n";
echo "========================\n\n";

try {
    $sid = 'c66905dcb4c1964953a63d36719e4d9b';
    $cid = '6985cffc6c490';
    $cName = 'Nâng tầm sự nghiệp cùng chương trình Thạc Sĩ Quốc Tế';

    $stmt = $pdo->prepare("INSERT INTO subscriber_activity (subscriber_id, type, reference_id, flow_id, campaign_id, reference_name, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");
    $res = $stmt->execute([$sid, 'receive_email', $cid, null, $cid, $cName, 'Campaign Sent Manual Test']);

    if ($res) {
        echo "Successfully inserted receive_email.\n";
        // Check if it exists now
        $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE type = 'receive_email' AND campaign_id = ?");
        $stmtCheck->execute([$cid]);
        echo "Current receive_email count for this CID: " . $stmtCheck->fetchColumn() . "\n";
    } else {
        echo "Failed.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
