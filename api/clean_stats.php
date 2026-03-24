<?php
// api/clean_stats.php
require_once 'db_connect.php';

echo "<pre>--- CLEANING DUPLICATE STATS --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $stepId = '80966800-d4c1-4afd-9393-4290aceb9fc1';
    $mySubId = 'c66905dcb4c1964953a63d36719e4d9b';

    // 1. Delete duplicate condition_true for me (Keep only one)
    $stmt = $pdo->prepare("DELETE FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND reference_id = ? AND type = 'condition_true' LIMIT 1");
    $stmt->execute([$mySubId, $fid, $stepId]);

    echo "Removed duplicate progress log for your test account.\n";

    // 2. Clear out any other minor inconsistencies
    $pdo->prepare("DELETE FROM subscriber_activity WHERE subscriber_id = ? AND flow_id = ? AND type = 'update_tag' AND details LIKE '%Recovery%'")->execute([$mySubId, $fid]);
    echo "Cleaned up recovery logs.\n";

    echo "\nStats cleaned! Now go back to Dashboard and F5. You should see 11 everywhere.";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
