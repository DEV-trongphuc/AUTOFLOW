<?php
/**
 * Fix Stuck Subscribers in "Chào mừng gửi Form" Flow
 * Migrates users stuck at Step #2 (Action) to Step #3 (Condition)
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once 'db_connect.php';

$flowId = '6200f46f-7349-4fa2-a65d-889abe63c25d';
$step2Id = '3ee6d9f1-ee1b-449e-80be-ca4ab6327645'; // Email Phản hồi Form
$step3Id = '5254dbfa-7657-4375-a7a8-3930f948f775'; // Kiểm tra (Condition)

echo "=== EMERGENCY FIX: MIGRATING STUCK SUBSCRIBERS ===\n";

try {
    // Find all subscribers stuck at Step #2 with 'completed' status
    $stmt = $pdo->prepare("
        SELECT id, subscriber_id 
        FROM subscriber_flow_states 
        WHERE flow_id = ? AND step_id = ? AND status = 'completed'
    ");
    $stmt->execute([$flowId, $step2Id]);
    $stuck = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $count = count($stuck);
    echo "Found $count stuck subscribers.\n";

    if ($count > 0) {
        $updateStmt = $pdo->prepare("
            UPDATE subscriber_flow_states 
            SET 
                step_id = ?, 
                status = 'waiting', 
                scheduled_at = DATE_ADD(NOW(), INTERVAL 3 DAY), 
                updated_at = NOW(), 
                created_at = NOW() 
            WHERE id = ?
        ");

        $fixed = 0;
        foreach ($stuck as $row) {
            if ($updateStmt->execute([$step3Id, $row['id']])) {
                $fixed++;
            }
        }
        echo "Successfully migrated $fixed subscribers to Step #3 with 3-day timeout.\n";

        // Recalculate flow stats
        $pdo->prepare("UPDATE flows SET stat_completed = (SELECT COUNT(*) FROM subscriber_flow_states WHERE flow_id = ? AND status = 'completed') WHERE id = ?")
            ->execute([$flowId, $flowId]);

        echo "Flow statistics updated.\n";
    }

    echo "Done.\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
