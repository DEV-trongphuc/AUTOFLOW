<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$cid = '6985cffc6c490';
echo "AUDIT V3 - DEEP DIVE\n";
echo "====================\n\n";

try {
    // 1. Check a few successful recipients from mail_delivery_logs
    echo "Sample 5 successful recipients from mail_delivery_logs for CID $cid:\n";
    $stmt = $pdo->prepare("SELECT subscriber_id, recipient, sent_at FROM mail_delivery_logs WHERE campaign_id = ? AND status = 'success' LIMIT 5");
    $stmt->execute([$cid]);
    $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($samples as $s) {
        echo " - Sub ID: {$s['subscriber_id']} | Email: {$s['recipient']} | Sent At: {$s['sent_at']}\n";

        // Check for ANY activity for this subscriber in the last 48h
        $stmtAct = $pdo->prepare("SELECT type, campaign_id, flow_id, reference_name, created_at FROM subscriber_activity WHERE subscriber_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 2 DAY) ORDER BY created_at ASC");
        $stmtAct->execute([$s['subscriber_id']]);
        $acts = $stmtAct->fetchAll(PDO::FETCH_ASSOC);
        if (empty($acts)) {
            echo "   -> No activities found in subscriber_activity.\n";
        } else {
            foreach ($acts as $a) {
                echo "   -> " . $a['type'] . " | CID: " . ($a['campaign_id'] ?: 'NULL') . " | FID: " . ($a['flow_id'] ?: 'NULL') . " | Ref: " . $a['reference_name'] . " | At: " . $a['created_at'] . "\n";
            }
        }
    }

    // 2. Check for ANY 'open_email' in the last 24 hours (Detailed)
    echo "\nAll 'open_email' activities in the last 24 hours:\n";
    $stmt = $pdo->query("SELECT campaign_id, flow_id, reference_name, details, COUNT(*) as count FROM subscriber_activity WHERE type = 'open_email' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) GROUP BY campaign_id, flow_id, reference_name, details");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo " - CID: " . ($row['campaign_id'] ?: 'NULL') . " | FID: " . ($row['flow_id'] ?: 'NULL') . " | Name: " . $row['reference_name'] . " | Details: " . $row['details'] . " | Count: " . $row['count'] . "\n";
    }

    // 3. Inspect Flow Steps for 808da9d3-dca9-475b-844f-5df52ac0508b (The one with 47 opens)
    $fid_suspicious = '808da9d3-dca9-475b-844f-5df52ac0508b';
    $stmt = $pdo->prepare("SELECT steps FROM flows WHERE id = ?");
    $stmt->execute([$fid_suspicious]);
    $steps = json_decode($stmt->fetchColumn(), true) ?: [];
    echo "\nSteps in suspiciously active Flow ($fid_suspicious):\n";
    foreach ($steps as $s) {
        echo " - Type: {$s['type']} | Label: " . ($s['label'] ?? 'N/A') . "\n";
        if ($s['type'] === 'action' && isset($s['config']['subject'])) {
            echo "   -> Subject: " . $s['config']['subject'] . "\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
