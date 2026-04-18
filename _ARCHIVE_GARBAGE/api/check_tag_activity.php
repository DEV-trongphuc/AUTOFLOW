<?php
// api/check_tag_activity.php
require_once 'db_connect.php';

echo "<pre>--- CHECKING TAG ACTIVITY --- \n";

try {
    $fid = 'ad16ed97-06b8-49a6-a8da-222c93191db0';
    $stepId = 'd327fe62-c975-4bbe-bb3a-a352c409de86';

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? AND type = 'update_tag'");
    $stmt->execute([$fid, $stepId]);
    $count = $stmt->fetchColumn();
    echo "Activity count (update_tag) for this step: $count\n";

    if ($count > 0) {
        $stmt = $pdo->prepare("SELECT sa.*, s.email FROM subscriber_activity sa JOIN subscribers s ON sa.subscriber_id = s.id WHERE sa.flow_id = ? AND sa.reference_id = ? AND sa.type = 'update_tag' LIMIT 5");
        $stmt->execute([$fid, $stepId]);
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        echo "No activity found in database for update_tag / $stepId.\n";

        // Check if maybe it was logged with different type?
        $stmt = $pdo->prepare("SELECT type, COUNT(*) as c FROM subscriber_activity WHERE flow_id = ? AND reference_id = ? GROUP BY type");
        $stmt->execute([$fid, $stepId]);
        echo "\nOther activities for this step:\n";
        print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";
