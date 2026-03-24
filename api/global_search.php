<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

echo "GLOBAL SUBJECT SEARCH\n";
echo "=====================\n\n";

try {
    $subject = "Nâng tầm sự nghiệp cùng chương trình Thạc Sĩ Quốc Tế";

    // Search in subscriber_activity reference_name or details
    $stmt = $pdo->prepare("SELECT type, campaign_id, flow_id, COUNT(*) as count FROM subscriber_activity WHERE reference_name LIKE ? OR details LIKE ? GROUP BY type, campaign_id, flow_id");
    $stmt->execute(["%$subject%", "%$subject%"]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($results)) {
        echo "No records found matching subject.\n";
    } else {
        foreach ($results as $r) {
            echo " - Type: {$r['type']} | CID: " . ($r['campaign_id'] ?: 'NULL') . " | FID: " . ($r['flow_id'] ?: 'NULL') . " | Count: {$r['count']}\n";
        }
    }

    // Search in mail_delivery_logs
    $stmt = $pdo->prepare("SELECT status, campaign_id, COUNT(*) as count FROM mail_delivery_logs WHERE subject LIKE ? GROUP BY status, campaign_id");
    $stmt->execute(["%$subject%"]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "\nResults from mail_delivery_logs:\n";
    foreach ($results as $r) {
        echo " - Status: {$r['status']} | CID: " . ($r['campaign_id'] ?: 'NULL') . " | Count: {$r['count']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
