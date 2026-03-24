<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "OPEN EMAIL ANALYSIS\n";
echo "===================\n\n";

try {
    // 1. All opens in the last 24h
    echo "Opens in the last 24 hours:\n";
    $stmt = $pdo->query("SELECT campaign_id, flow_id, reference_name, COUNT(*) as count FROM subscriber_activity WHERE type = 'open_email' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) GROUP BY campaign_id, flow_id, reference_name");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - CID: " . ($row['campaign_id'] ?: 'NULL') . " | FID: " . ($row['flow_id'] ?: 'NULL') . " | Subj/Step: " . $row['reference_name'] . " | Count: " . $row['count'] . "\n";
    }

    // 2. Check for ANY activity for the Campaign CID that isn't 'complete_flow'
    echo "\nNon-progression activities for CID 6985cffc6c490:\n";
    $stmt = $pdo->prepare("SELECT type, reference_name, COUNT(*) as count FROM subscriber_activity WHERE campaign_id = ? AND type NOT IN ('complete_flow', 'condition_false', 'condition_true') GROUP BY type, reference_name");
    $stmt->execute(['6985cffc6c490']);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - {$row['type']} | {$row['reference_name']} | Count: {$row['count']}\n";
    }

    // 3. Look for the 1531 missing 'receive_email' records by searching for the subject
    $subject = "Nâng tầm sự nghiệp cùng chương trình Thạc Sĩ Quốc Tế";
    echo "\nSearching for 'receive_email' by Subject Snippet:\n";
    $stmt = $pdo->prepare("SELECT campaign_id, flow_id, reference_name, COUNT(*) as count FROM subscriber_activity WHERE type = 'receive_email' AND reference_name LIKE ? GROUP BY campaign_id, flow_id, reference_name");
    $stmt->execute(["%$subject%"]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - CID: " . ($row['campaign_id'] ?: 'NULL') . " | FID: " . ($row['flow_id'] ?: 'NULL') . " | Name: " . $row['reference_name'] . " | Count: " . $row['count'] . "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
