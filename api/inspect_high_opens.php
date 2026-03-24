<?php
header('Content-Type: text/plain; charset=utf-8');
require_once 'db_connect.php';

$emails = ['phucht@ideas.edu.vn', 'turniodev@gmail.com'];
echo "INSPECTING HIGH OPEN COUNTS\n";
echo "============================\n\n";

try {
    foreach ($emails as $email) {
        echo "Email: $email\n";
        // Get Subscriber ID
        $stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
        $stmt->execute([$email]);
        $sid = $stmt->fetchColumn();

        if (!$sid) {
            echo " - Subscriber not found.\n\n";
            continue;
        }

        echo " - Subscriber ID: $sid\n";

        // Count Opens by Campaign
        $stmt = $pdo->prepare("SELECT campaign_id, flow_id, COUNT(*) as count, MIN(created_at) as first, MAX(created_at) as last 
                              FROM subscriber_activity 
                              WHERE subscriber_id = ? AND type = 'open_email' 
                              GROUP BY campaign_id, flow_id");
        $stmt->execute([$sid]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as $r) {
            echo "   -> CID: " . ($r['campaign_id'] ?: 'NULL') . " | FID: " . ($r['flow_id'] ?: 'NULL') . " | Total Opens: {$r['count']}\n";
            echo "      (First: {$r['first']} | Last: {$r['last']})\n";
        }

        // Check for duplicates in tracing cache
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM tracking_unique_cache WHERE subscriber_id = ? AND event_type = 'open'");
        $stmt->execute([$sid]);
        echo "   -> Unique Cache Entries: " . $stmt->fetchColumn() . "\n";

        echo "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
