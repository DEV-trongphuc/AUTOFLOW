<?php
// api/debug_others.php
require_once 'db_connect.php';

echo "<pre>--- DEBUGGING OTHERS --- \n";

$emails = ['huyenmay11@gmail.com', 'Nmh1202@gmail.com', 'phamthihuyenmktg@gmail.com'];
$targetCampaignId = '6985cffc6c490';

foreach ($emails as $email) {
    echo "\nChecking $email:\n";
    $stmt = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmt->execute([$email]);
    $subId = $stmt->fetchColumn();

    if (!$subId) {
        echo "  - Subscriber not found.\n";
        continue;
    }

    // Check activities
    $stmt = $pdo->prepare("SELECT type, campaign_id, reference_id, created_at FROM subscriber_activity WHERE subscriber_id = ? AND type = 'open_email' ORDER BY created_at DESC LIMIT 5");
    $stmt->execute([$subId]);
    $acts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($acts)) {
        echo "  - No open_email activities found.\n";
    } else {
        foreach ($acts as $a) {
            $match = ($a['campaign_id'] === $targetCampaignId) ? "MATCHED" : "MISMATCH (found: {$a['campaign_id']}, target: $targetCampaignId)";
            echo "  - Found: {$a['type']} | Campaign: {$a['campaign_id']} | At: {$a['created_at']} | Result: $match\n";
        }
    }
}

echo "\n--- Batch Status in subscriber_flow_states ---\n";
$stmt = $pdo->prepare("SELECT status, COUNT(*) as count FROM subscriber_flow_states WHERE flow_id = 'ad16ed97-06b8-49a6-a8da-222c93191db0' GROUP BY status");
$stmt->execute();
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));

echo "</pre>";
