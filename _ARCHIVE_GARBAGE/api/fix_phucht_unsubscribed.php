<?php
require_once 'db_connect.php';

$email = 'phucht@ideas.edu.vn';
$flowId = '6972fea76fa61';
$targetStepId = '08542221-c4da-4249-9b2b-2feb8f300581';
$scheduledAt = '2026-01-26 17:00:00';

try {
    $pdo->beginTransaction();

    // 1. Re-activate the subscriber in the main subscribers table
    $stmtSub = $pdo->prepare("UPDATE subscribers SET status = 'active' WHERE email = ?");
    $stmtSub->execute([$email]);
    $affectedSub = $stmtSub->rowCount();

    // 2. Get the subscriber ID
    $stmtGetId = $pdo->prepare("SELECT id FROM subscribers WHERE email = ?");
    $stmtGetId->execute([$email]);
    $subscriberId = $stmtGetId->fetchColumn();

    if (!$subscriberId) {
        throw new Exception("Subscriber not found.");
    }

    // 3. Fix the flow state
    $stmtFlow = $pdo->prepare("
        UPDATE subscriber_flow_states 
        SET step_id = ?, 
            status = 'waiting', 
            scheduled_at = ?, 
            updated_at = NOW(),
            last_error = NULL
        WHERE subscriber_id = ? AND flow_id = ?
    ");
    $stmtFlow->execute([$targetStepId, $scheduledAt, $subscriberId, $flowId]);
    $affectedFlow = $stmtFlow->rowCount();

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "Đã xử lý xong cho $email",
        'details' => [
            'subscribers_updated' => $affectedSub,
            'flow_states_updated' => $affectedFlow
        ]
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
