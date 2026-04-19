<?php
// api/sync_flow_stats.php
require_once 'db_connect.php';

echo "<pre>--- SYNCING FLOW STATISTICS (FIXED) ---\n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';

    // 1. Count actual unique subscribers for this flow
    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT subscriber_id) FROM subscriber_flow_states WHERE flow_id = ?");
    $stmt->execute([$fid]);
    $actualCount = $stmt->fetchColumn();

    echo "Actual unique subscribers in database: $actualCount\n";

    // 2. Update the correct column 'stat_enrolled'
    $stmt = $pdo->prepare("UPDATE flows SET stat_enrolled = ? WHERE id = ?");
    $stmt->execute([$actualCount, $fid]);

    echo "Statistics updated successfully!\n";
    echo "New enrolled count in dashboard: " . $actualCount . "\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
