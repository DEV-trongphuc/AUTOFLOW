<?php
/**
 * Fix Stuck Subscribers in "Chào mừng gửi Form" Flow
 * Issue: Subscribers completed at Step #2 (Email Phản hồi Form) 
 * instead of moving to Step #3 (Condition - Kiểm tra)
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
require_once 'db_connect.php';

$flowId = '6200f46f-7349-4fa2-a65d-889abe63c25d';
$currentStepId = '3ee6d9f1-ee1b-449e-80be-ca4ab6327645'; // Step #2: Email Phản hồi Form
$nextStepId = '5254dbfa-7657-4375-a7a8-3930f948f775';    // Step #3: Kiểm tra (condition)

echo "=== FIX STUCK SUBSCRIBERS ===\n";
echo "Flow ID: $flowId\n";
echo "Current Step: $currentStepId (Email Phản hồi Form)\n";
echo "Target Step: $nextStepId (Kiểm tra - Condition)\n\n";

try {
    // 1. Find all stuck subscribers
    $stmt = $pdo->prepare("
        SELECT 
            id as queue_id,
            subscriber_id,
            step_id,
            status,
            created_at,
            updated_at
        FROM subscriber_flow_states
        WHERE flow_id = ?
        AND step_id = ?
        AND status = 'completed'
        ORDER BY updated_at DESC
    ");
    $stmt->execute([$flowId, $currentStepId]);
    $stuckSubscribers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $count = count($stuckSubscribers);
    echo "Found $count stuck subscribers\n\n";

    if ($count === 0) {
        echo "No subscribers to migrate.\n";
        exit;
    }

    // 2. Show preview
    echo "--- PREVIEW (First 5) ---\n";
    foreach (array_slice($stuckSubscribers, 0, 5) as $sub) {
        $stmtSub = $pdo->prepare("SELECT email, first_name, last_name FROM subscribers WHERE id = ?");
        $stmtSub->execute([$sub['subscriber_id']]);
        $subInfo = $stmtSub->fetch(PDO::FETCH_ASSOC);

        echo "  Queue ID: {$sub['queue_id']}\n";
        echo "  Subscriber: {$subInfo['email']} ({$subInfo['first_name']} {$subInfo['last_name']})\n";
        echo "  Completed At: {$sub['updated_at']}\n\n";
    }

    // 3. Migrate subscribers
    echo "--- MIGRATING $count SUBSCRIBERS ---\n";

    $updated = 0;
    foreach ($stuckSubscribers as $sub) {
        // Move to condition step with 'waiting' status
        // Set scheduled_at to NOW so worker processes immediately
        $updateStmt = $pdo->prepare("
            UPDATE subscriber_flow_states 
            SET 
                step_id = ?,
                status = 'waiting',
                scheduled_at = NOW(),
                created_at = NOW(),
                updated_at = NOW()
            WHERE id = ?
        ");

        if ($updateStmt->execute([$nextStepId, $sub['queue_id']])) {
            $updated++;

            // Log the migration
            $pdo->prepare("
                INSERT INTO subscriber_activity 
                (subscriber_id, type, reference_id, flow_id, reference_name, details, created_at)
                VALUES (?, 'enter_flow', ?, ?, 'Migration Fix', 'Migrated from stuck Step #2 to Step #3', NOW())
            ")->execute([$sub['subscriber_id'], $nextStepId, $flowId]);
        }
    }

    // 4. Update flow stats
    $pdo->prepare("
        UPDATE flows 
        SET stat_completed = (
            SELECT COUNT(DISTINCT subscriber_id) 
            FROM subscriber_flow_states 
            WHERE flow_id = ? AND status = 'completed'
        )
        WHERE id = ?
    ")->execute([$flowId, $flowId]);

    echo "\n=== MIGRATION COMPLETE ===\n";
    echo "Successfully migrated: $updated subscribers\n";
    echo "They are now in Step #3 (Condition - Kiểm tra) with 'waiting' status\n";
    echo "Worker will process them within the next few minutes\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
