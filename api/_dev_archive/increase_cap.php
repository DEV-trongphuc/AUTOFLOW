<?php
// api/increase_cap.php
require_once 'db_connect.php';

$flowId = 'af4895e2-ce65-4c6a-902c-229fda80b93f';

echo "<h2>Updating Frequency Cap</h2>";

// 1. Fetch current config
$stmt = $pdo->prepare("SELECT config FROM flows WHERE id = ?");
$stmt->execute([$flowId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$config = json_decode($row['config'] ?? '{}', true);

// 2. Update Cap
$oldCap = $config['frequencyCap'] ?? 3;
$config['frequencyCap'] = 100; // Unlimited power!

// 3. Save back
$stmtUpdate = $pdo->prepare("UPDATE flows SET config = ? WHERE id = ?");
$stmtUpdate->execute([json_encode($config), $flowId]);

echo "Old Cap: $oldCap<br>";
echo "New Cap: 100<br>";
echo "<h3 style='color:green'>Success! You can now send up to 100 emails per day for this flow.</h3>";

echo "<hr>";
echo "Reviving queued items that were delayed due to cap...<br>";

// 4. Force revive any items waiting due to cap (usually rescheduled to +1 hour)
// We look for waiting items updated recently that are waiting for this flow
$stmtRevive = $pdo->prepare("UPDATE subscriber_flow_states SET scheduled_at = NOW(), last_error = NULL WHERE flow_id = ? AND status = 'waiting' AND scheduled_at > NOW()");
$stmtRevive->execute([$flowId]);
echo "Updated " . $stmtRevive->rowCount() . " waiting items to run immediately.";

