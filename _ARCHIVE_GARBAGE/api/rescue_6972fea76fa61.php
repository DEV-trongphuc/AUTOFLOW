<?php
// rescue_6972fea76fa61.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Path Detection
if (file_exists('db_connect.php')) {
    require 'db_connect.php';
} elseif (file_exists('api/db_connect.php')) {
    require 'api/db_connect.php';
} else {
    die("Error: Could not find db_connect.php");
}

// Clear any buffers or JSON headers from db_connect.php
if (ob_get_length())
    ob_clean();
header('Content-Type: text/html; charset=UTF-8');

$flowId = '6972fea76fa61';
$unknownStepId = 'e8ae40c1-7cee-4215-8b2b-eb686ecf4ae4';
$targetStepId = '063f9d18-dd82-40a2-a613-8bcddef34502'; // Junction: Rẽ nhánh Logic

echo "<h2>Executing Rescue for Campaign $flowId</h2>";

try {
    if (!$pdo->inTransaction()) {
        $pdo->beginTransaction();
    }

    // 1. Move the 22 users from unknown step to a valid Junction
    $stmt1 = $pdo->prepare("UPDATE subscriber_flow_states 
                            SET step_id = ?, status = 'waiting', scheduled_at = NOW(), updated_at = NOW() 
                            WHERE flow_id = ? AND step_id = ?");
    $stmt1->execute([$targetStepId, $flowId, $unknownStepId]);
    $count1 = $stmt1->rowCount();
    echo "Successfully moved <b>$count1</b> users from unknown step to Junction logic.<br>";

    // 2. Refresh the 1 user who is overdue (update scheduled_at to now so worker picks up)
    $stmt2 = $pdo->prepare("UPDATE subscriber_flow_states 
                            SET status = 'waiting', scheduled_at = NOW(), updated_at = NOW() 
                            WHERE flow_id = ? AND status = 'waiting' AND scheduled_at <= NOW()");
    $stmt2->execute([$flowId]);
    $count2 = $stmt2->rowCount();
    echo "Refreshed <b>$count2</b> overdue users to process immediately.<br>";

    // 3. Optional: Set Campaign to Active automatically? 
    // I will leave this as a suggestion or do it if you want.

    $pdo->commit();
    echo "<h3 style='color:green;'>Rescue Complete!</h3>";
    echo "<p><a href='check_campaign_6972fea76fa61.php'>Go back to Diagnostic Tool</a></p>";
    echo "<p>Please ensure the Campaign is set to <b>Active</b> in the UI and the Worker is running.</p>";

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo "<h3 style='color:red;'>Error during rescue: " . htmlspecialchars($e->getMessage()) . "</h3>";
}
